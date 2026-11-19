/*
 * Capa de datos — versión COMPARTIDA (Supabase).
 *
 * Se carga solo si js/config.js tiene la URL y la clave de Supabase.
 * Reemplaza al objeto `Api` de db.js con las mismas funciones, así que el
 * resto de la app funciona igual. Usa las tablas de supabase/esquema.sql.
 *
 * Cómo se mueven los datos (idea tomada de planner7):
 *  - Al entrar se descargan los datos una sola vez y se guarda una "foto" de lo
 *    último sincronizado (personas, proyectos y tareas con sus responsables y dependencias).
 *  - Al guardar se compara contra esa foto: solo viajan los campos y filas que cambiaron,
 *    sin volver a leer nada antes. Si en el mismo instante cambian varias tareas
 *    (reordenar, selección múltiple), se envían juntas en un solo lote.
 *  - Los cambios de otras personas llegan en tiempo real fila por fila y se aplican a
 *    la foto: nunca se vuelve a descargar todo. Así el costo de cada acción no crece
 *    con la cantidad de datos acumulados.
 *  - Si un envío falla se reintenta (3 veces); si aun así falla, se avisa y se vuelve
 *    a descargar para no quedar con datos distintos a la nube.
 *
 * Diferencias con la versión local:
 *  - Hay inicio de sesión (código enviado al correo) y cada cuenta se vincula con una persona.
 *  - Deshacer / rehacer no está disponible (con varias personas editando, deshacer
 *    "todo" podría borrar cambios de otros). Queda como mejora futura.
 *  - "Restablecer datos de ejemplo" no está disponible (borraría los datos de la empresa).
 *  - Los archivos adjuntos se guardan en Storage y se muestran con enlaces temporales.
 */
(() => {
  const cfg = window.APP_CONFIG || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const BUCKET = 'adjuntos';
  const PAGE = 1000; // Supabase entrega como máximo 1000 filas por consulta

  /* ---------- Utilidades ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  // Fecha de la base (UTC) → formato local que usa la app: 'AAAA-MM-DDTHH:MM'
  const toLocal = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // Formato local de la app → fecha para la base
  const fromLocal = (s) => (s ? new Date(s).toISOString() : new Date().toISOString());
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const chunks = (arr, n = 500) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sameList = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

  // Reintenta una escritura (hasta 3 veces, con espera creciente) antes de darla por fallida
  async function retry(fn) {
    for (let i = 1; ; i++) {
      try { return await fn(); } catch (err) {
        if (i >= 3) throw err;
        await new Promise((r) => setTimeout(r, 400 * i));
      }
    }
  }

  async function fetchAll(table, build = (q) => q, columns = '*') {
    const out = [];
    for (let from = 0; ; from += PAGE) {
      const rows = ok(await build(sb.from(table).select(columns)).range(from, from + PAGE - 1));
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  }
  async function insertMany(table, rows) {
    for (const part of chunks(rows)) if (part.length) ok(await sb.from(table).insert(part));
  }
  async function removeFiles(paths) {
    for (const part of chunks(paths.filter(Boolean), 100)) if (part.length) ok(await sb.storage.from(BUCKET).remove(part));
  }

  /* ---------- Conversión filas ⇄ objetos de la app ---------- */
  const mapPerson = (r) => ({ id: r.id, name: r.name, email: r.email, deleted: !!r.deleted, created_at: toLocal(r.created_at) });
  const mapProject = (r) => ({ id: r.id, name: r.name, position: r.position, archived: !!r.archived, created_at: toLocal(r.created_at) });
  const mapTask = (r, assignees = [], deps = []) => ({
    id: r.id, project_id: r.project_id, position: r.position, title: r.title || '', description: r.description || '',
    status: r.status, priority: r.priority, due_at: r.due_at, created_by: r.created_by, created_at: toLocal(r.created_at),
    assignees, depends_on: deps,
  });
  // Columnas de la tabla tasks que la app puede modificar
  const TASK_COLS = ['project_id', 'position', 'title', 'description', 'status', 'priority', 'due_at', 'created_by'];
  const taskRow = (t) => ({
    project_id: t.project_id, position: t.position ?? null, title: t.title || '', description: t.description || '',
    status: t.status || 'todo', priority: t.priority || 'baja', due_at: t.due_at || null, created_by: t.created_by || null,
  });
  const mapComment = (r) => ({ id: r.id, task_id: r.task_id, author: r.author, body: r.body, created_at: toLocal(r.created_at) });
  const numericEntity = (e) => e === 'task' || e === 'project';
  const mapActivity = (r) => ({
    id: r.id, ts: Number(r.ts), at: toLocal(r.at), user: r.user_id, entity: r.entity,
    entity_id: r.entity_id != null && numericEntity(r.entity) ? Number(r.entity_id) : r.entity_id,
    entity_name: r.entity_name, action: r.action, field: r.field, from: r.from, to: r.to, extra: r.extra,
  });
  const activityRow = (e) => ({
    ts: e.ts, at: new Date(e.ts).toISOString(), user_id: e.user ?? null, entity: e.entity,
    entity_id: e.entity_id == null ? null : String(e.entity_id), entity_name: e.entity_name ?? null, action: e.action,
    field: e.field ?? null, from: e.from ?? null, to: e.to ?? null, extra: e.extra ?? null,
  });

  /* ============================================================
   *  Foto de lo último sincronizado (se llena al entrar y se mantiene al día)
   * ============================================================ */
  const cache = { loaded: false, people: new Map(), projects: new Map(), tasks: new Map() };
  async function loadAll(force = false) {
    if (cache.loaded && !force) return;
    const [people, projects, tasks, assignees, deps] = await Promise.all([
      fetchAll('people'), fetchAll('projects'), fetchAll('tasks', (q) => q.order('id')),
      fetchAll('task_assignees'), fetchAll('task_dependencies'),
    ]);
    cache.people = new Map(people.map((r) => [r.id, mapPerson(r)]));
    cache.projects = new Map(projects.map((r) => [r.id, mapProject(r)]));
    const A = {}, D = {};
    for (const r of assignees) (A[r.task_id] = A[r.task_id] || []).push(r.person_id);
    for (const r of deps) (D[r.task_id] = D[r.task_id] || []).push(r.depends_on_id);
    cache.tasks = new Map(tasks.map((r) => [r.id, mapTask(r, A[r.id] || [], D[r.id] || [])]));
    cache.loaded = true;
  }
  const cachedName = {
    project: (id) => (cache.projects.get(Number(id)) || {}).name || null,
    task: (id) => (cache.tasks.get(Number(id)) || {}).title || '',
  };

  /* ---------- Bitácora (en lotes; las ediciones seguidas de un mismo campo se agrupan) ---------- */
  let lastOwnActivity = null; // último registro propio, para agrupar ediciones de título/descripción
  async function logMany(entries) {
    const fresh = [];
    for (const raw of entries) {
      const e = { ts: Date.now(), user: SupaApi.currentUser, ...raw };
      const l = lastOwnActivity;
      if (e.coalesce && l && l.action === 'update' && l.entity === e.entity && String(l.entity_id) === String(e.entity_id) &&
          l.field === e.field && l.user === e.user && e.ts - l.ts < COALESCE_MS && l.id) {
        await retry(async () => ok(await sb.from('activity').update({ to: e.to ?? null, entity_name: e.entity_name ?? null, ts: e.ts, at: new Date(e.ts).toISOString() }).eq('id', l.id)));
        Object.assign(l, { to: e.to, ts: e.ts });
        continue;
      }
      fresh.push(e);
    }
    if (!fresh.length) return;
    const rows = await retry(async () => ok(await sb.from('activity').insert(fresh.map(activityRow)).select('id')));
    const last = fresh[fresh.length - 1];
    lastOwnActivity = { ...last, id: rows && rows.length ? rows[rows.length - 1].id : null };
  }
  const logActivity = (entry, { coalesce = false } = {}) => logMany([{ ...entry, coalesce }]);

  /* ============================================================
   *  Cola de guardado de tareas: se juntan los cambios del mismo instante
   * ============================================================ */
  const queue = new Map(); // id → { task, opts }
  let flushTimer = null;
  let flushing = Promise.resolve();
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => { flushTimer = null; flushing = flushing.then(flushTasks).catch(onSyncError); }, 0);
  }
  // Espera a que se envíe todo lo pendiente (antes de otras escrituras, para respetar el orden)
  async function flushNow() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; flushing = flushing.then(flushTasks).catch(onSyncError); }
    await flushing;
  }
  async function onSyncError(err) {
    console.error('Error al sincronizar con Supabase:', err);
    if (SupaApi.onError) SupaApi.onError(err);
    try { await loadAll(true); } catch {}
    if (remoteCb) remoteCb();
  }

  async function flushTasks() {
    const items = [...queue.values()];
    queue.clear();
    if (!items.length) return;
    const updates = [];   // { id, cols: {...} } — solo los campos que cambiaron
    const addA = [], addD = [];
    const rmA = new Map(), rmD = new Map();
    const logs = [];
    for (const { task, opts } of items) {
      const prev = cache.tasks.get(task.id);
      if (!prev) continue;
      const now = taskRow(task), before = taskRow(prev);
      const cols = {};
      for (const c of TASK_COLS) if (JSON.stringify(now[c]) !== JSON.stringify(before[c])) cols[c] = now[c];
      if (Object.keys(cols).length) updates.push({ id: task.id, cols, row: now });
      for (const p of task.assignees.filter((x) => !prev.assignees.includes(x))) addA.push({ task_id: task.id, person_id: p });
      const goneA = prev.assignees.filter((x) => !task.assignees.includes(x));
      if (goneA.length) rmA.set(task.id, goneA);
      for (const d of task.depends_on.filter((x) => !prev.depends_on.includes(x))) addD.push({ task_id: task.id, depends_on_id: d });
      const goneD = prev.depends_on.filter((x) => !task.depends_on.includes(x));
      if (goneD.length) rmD.set(task.id, goneD);
      if (!opts.silent) {
        for (const f of TRACKED) {
          const a = prev[f] ?? null, b = task[f] ?? null;
          const same = Array.isArray(a) || Array.isArray(b) ? sameList(a || [], b || []) : JSON.stringify(a) === JSON.stringify(b);
          if (same) continue;
          const entry = { entity: 'task', entity_id: task.id, entity_name: task.title, action: 'update', field: f, from: a, to: b, coalesce: f === 'title' || f === 'description' };
          if (opts.auto) entry.user = 'auto';
          if (f === 'description') { entry.from = null; entry.to = null; }
          if (f === 'project_id') entry.extra = { from: cachedName.project(a), to: cachedName.project(b) };
          logs.push(entry);
        }
      }
      cache.tasks.set(task.id, clone(task)); // la foto pasa a ser el estado nuevo
    }
    // 1. Tareas: una sola tarea → solo sus campos cambiados; varias → un solo lote
    if (updates.length === 1) {
      const u = updates[0];
      await retry(async () => ok(await sb.from('tasks').update(u.cols).eq('id', u.id)));
    } else if (updates.length > 1) {
      const rows = updates.map((u) => ({ id: u.id, ...u.row }));
      for (const part of chunks(rows)) await retry(async () => ok(await sb.from('tasks').upsert(part, { onConflict: 'id' })));
    }
    // 2. Responsables y dependencias: solo lo que se agregó o quitó
    for (const [id, list] of rmA) await retry(async () => ok(await sb.from('task_assignees').delete().eq('task_id', id).in('person_id', list)));
    for (const [id, list] of rmD) await retry(async () => ok(await sb.from('task_dependencies').delete().eq('task_id', id).in('depends_on_id', list)));
    if (addA.length) await retry(async () => ok(await sb.from('task_assignees').insert(addA)));
    if (addD.length) await retry(async () => ok(await sb.from('task_dependencies').insert(addD)));
    // 3. Bitácora en un solo envío
    if (logs.length) await logMany(logs);
  }

  /* ============================================================
   *  Tiempo real: se aplican a la foto solo las filas que cambiaron
   * ============================================================ */
  let remoteCb = null;
  let remoteTimer = null;
  const notify = () => { clearTimeout(remoteTimer); remoteTimer = setTimeout(() => remoteCb && remoteCb(), 300); };
  function applyRemote(table, ev) {
    const n = ev.new || {}, o = ev.old || {};
    const del = ev.eventType === 'DELETE';
    if (table === 'people') { if (del) cache.people.delete(o.id); else cache.people.set(n.id, mapPerson(n)); }
    if (table === 'projects') { if (del) cache.projects.delete(o.id); else cache.projects.set(n.id, mapProject(n)); }
    if (table === 'tasks') {
      if (del) {
        cache.tasks.delete(o.id);
        for (const t of cache.tasks.values()) t.depends_on = t.depends_on.filter((x) => x !== o.id);
      } else if (!queue.has(n.id)) { // si hay un cambio propio pendiente, manda el propio
        const cur = cache.tasks.get(n.id);
        cache.tasks.set(n.id, mapTask(n, cur ? cur.assignees : [], cur ? cur.depends_on : []));
      }
    }
    if (table === 'task_assignees') {
      const t = cache.tasks.get((del ? o : n).task_id);
      if (t) {
        const p = (del ? o : n).person_id;
        t.assignees = del ? t.assignees.filter((x) => x !== p) : [...new Set([...t.assignees, p])];
      }
    }
    if (table === 'task_dependencies') {
      const t = cache.tasks.get((del ? o : n).task_id);
      if (t) {
        const d = (del ? o : n).depends_on_id;
        t.depends_on = del ? t.depends_on.filter((x) => x !== d) : [...new Set([...t.depends_on, d])];
      }
    }
    notify(); // comentarios y adjuntos se consultan solo para la tarea abierta
  }

  const SupaApi = {
    mode: 'supabase',
    supportsUndo: false,
    currentUser: null,
    onError: null, // la app muestra un aviso si una escritura falla

    /* ---------- Sesión ---------- */
    auth: {
      allowedDomain: (cfg.allowedEmailDomain || '').replace(/^@/, '').toLowerCase(),
      async email() {
        const { data } = await sb.auth.getSession();
        return data.session ? (data.session.user.email || '').toLowerCase() : null;
      },
      // Entrar con la cuenta de Google de la empresa. "hd" hace que Google muestre solo cuentas del dominio;
      // la base además rechaza cualquier correo que no sea del dominio (hook "Before User Created" y RLS).
      async signInWithGoogle() {
        const back = location.origin + location.pathname;
        const dom = (cfg.allowedEmailDomain || '').replace(/^@/, '');
        ok(await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: back, queryParams: { prompt: 'select_account', ...(dom ? { hd: dom } : {}) } },
        }));
      },
      // Envía un correo para entrar: trae un enlace (y un código si la plantilla lo incluye)
      async sendCode(email) {
        const back = location.origin + location.pathname;
        ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: back } }));
      },
      // Avisa cuando se inicia sesión (por ejemplo, al abrir el enlace del correo en otra pestaña)
      onSignIn(cb) {
        const { data } = sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_IN' && session) cb(); });
        return () => data.subscription.unsubscribe();
      },
      async verifyCode(email, token) { ok(await sb.auth.verifyOtp({ email, token, type: 'email' })); },
      async signOut() { await flushNow(); await sb.auth.signOut(); },
    },
    async personForEmail(email) {
      await loadAll();
      return [...cache.people.values()].find((p) => (p.email || '') === email.toLowerCase()) || null;
    },
    async linkPerson(id, email) {
      ok(await sb.from('people').update({ email: email.toLowerCase(), deleted: false }).eq('id', id));
      const p = cache.people.get(id);
      if (p) Object.assign(p, { email: email.toLowerCase(), deleted: false });
    },

    // Avisa cuando otra persona cambia algo (los avisos seguidos se agrupan)
    onRemoteChange(cb) {
      remoteCb = cb;
      const ch = sb.channel('cambios');
      for (const t of ['people', 'projects', 'tasks', 'task_assignees', 'task_dependencies', 'comments', 'attachments']) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (ev) => applyRemote(t, ev));
      }
      ch.subscribe();
    },

    /* ---------- Sin equivalente en modo compartido ---------- */
    async ensureSeed() {},
    async resetAll() { throw new Error('No disponible en la versión compartida.'); },
    async undo() { return false; },
    async redo() { return false; },

    /* ---------- Bitácora ---------- */
    async listActivity() {
      await flushNow();
      const rows = ok(await sb.from('activity').select('*').order('id', { ascending: false }).limit(2000));
      return rows.map(mapActivity);
    },

    // Registros de una tarea: los suyos y los cambios de dependencias (pueden nombrarla desde otra tarea)
    async listTaskActivity(id) {
      await flushNow();
      const rows = ok(await sb.from('activity').select('*').eq('entity', 'task')
        .or(`entity_id.eq.${id},field.eq.depends_on`).order('id', { ascending: false }).limit(500));
      return rows.map(mapActivity);
    },

    /* ---------- Personas ---------- */
    async listPeople() {
      await loadAll();
      return [...cache.people.values()].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')).map(clone);
    },
    async createPerson(name, email = null) {
      await loadAll();
      const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'persona';
      let id = base, n = 2;
      while (cache.people.has(id)) id = `${base}-${n++}`;
      const row = ok(await sb.from('people').insert({ id, name, email: email ? email.toLowerCase() : null }).select())[0];
      cache.people.set(id, mapPerson(row));
      await logActivity({ entity: 'person', entity_id: id, entity_name: name, action: 'create' });
      return mapPerson(row);
    },
    async renamePerson(id, name) {
      const before = (cache.people.get(id) || {}).name;
      ok(await sb.from('people').update({ name }).eq('id', id));
      if (cache.people.get(id)) cache.people.get(id).name = name;
      await logActivity({ entity: 'person', entity_id: id, entity_name: name, action: 'rename', from: before, to: name });
    },
    async deletePerson(id) {
      await flushNow();
      const p = cache.people.get(id) || {};
      ok(await sb.from('people').update({ deleted: true }).eq('id', id));
      ok(await sb.from('task_assignees').delete().eq('person_id', id));
      if (cache.people.get(id)) cache.people.get(id).deleted = true;
      for (const t of cache.tasks.values()) t.assignees = t.assignees.filter((x) => x !== id);
      await logActivity({ entity: 'person', entity_id: id, entity_name: p.name, action: 'delete' });
    },

    /* ---------- Proyectos ---------- */
    async listProjects() {
      await loadAll();
      return [...cache.projects.values()]
        .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.id - b.id).map(clone);
    },
    async createProject(name, archived = false) {
      await loadAll();
      const position = Math.max(0, ...[...cache.projects.values()].map((p) => p.position ?? 0)) + 1;
      const row = ok(await sb.from('projects').insert({ name, position, archived }).select())[0];
      cache.projects.set(row.id, mapProject(row));
      await logActivity({ entity: 'project', entity_id: row.id, entity_name: name, action: 'create' });
      return mapProject(row);
    },
    async renameProject(id, name) {
      const before = cachedName.project(id);
      ok(await sb.from('projects').update({ name }).eq('id', id));
      if (cache.projects.get(id)) cache.projects.get(id).name = name;
      await logActivity({ entity: 'project', entity_id: id, entity_name: name, action: 'rename', from: before, to: name });
    },
    async setProjectArchived(id, archived) {
      ok(await sb.from('projects').update({ archived }).eq('id', id));
      if (cache.projects.get(id)) cache.projects.get(id).archived = archived;
      await logActivity({ entity: 'project', entity_id: id, entity_name: cachedName.project(id), action: archived ? 'archive' : 'unarchive' });
    },
    // Un solo envío con los proyectos cuya posición cambió
    async saveProjectOrder(ids) {
      const rows = [];
      ids.forEach((id, i) => {
        const p = cache.projects.get(id);
        if (p && p.position !== i) { p.position = i; rows.push({ id, name: p.name, position: i, archived: p.archived }); }
      });
      if (rows.length) await retry(async () => ok(await sb.from('projects').upsert(rows, { onConflict: 'id' })));
    },
    // Elimina el proyecto con todas sus tareas (y sus comentarios y archivos)
    async deleteProject(id) {
      await flushNow();
      const name = cachedName.project(id);
      const tasks = [...cache.tasks.values()].filter((t) => t.project_id === id);
      for (const part of chunks(tasks.map((t) => t.id), 200)) {
        const atts = ok(await sb.from('attachments').select('storage_path').in('task_id', part));
        await removeFiles(atts.map((a) => a.storage_path));
      }
      ok(await sb.from('projects').delete().eq('id', id)); // borra en cascada tareas, comentarios, etc.
      cache.projects.delete(id);
      const gone = new Set(tasks.map((t) => t.id));
      for (const t of tasks) cache.tasks.delete(t.id);
      for (const t of cache.tasks.values()) t.depends_on = t.depends_on.filter((x) => !gone.has(x));
      await logMany([
        ...tasks.map((t) => ({ entity: 'task', entity_id: t.id, entity_name: t.title, action: 'delete', extra: name })),
        { entity: 'project', entity_id: id, entity_name: name, action: 'delete' },
      ]);
    },

    /* ---------- Tareas ---------- */
    async listTasks() {
      await loadAll();
      return [...cache.tasks.values()].map(clone);
    },
    async createTask(fields) {
      await flushNow();
      await loadAll();
      const t = { status: 'todo', assignees: [], depends_on: [], ...fields };
      t.position = Math.max(0, ...[...cache.tasks.values()].map((x) => x.position ?? x.id)) + 1;
      const row = ok(await sb.from('tasks').insert(taskRow(t)).select())[0];
      if (t.assignees.length) ok(await sb.from('task_assignees').insert(t.assignees.map((p) => ({ task_id: row.id, person_id: p }))));
      if (t.depends_on.length) ok(await sb.from('task_dependencies').insert(t.depends_on.map((d) => ({ task_id: row.id, depends_on_id: d }))));
      const task = mapTask(row, t.assignees, t.depends_on);
      cache.tasks.set(row.id, clone(task));
      await logActivity({ entity: 'task', entity_id: row.id, entity_name: row.title, action: 'create', extra: cachedName.project(row.project_id) });
      return task;
    },
    // Se anota el cambio y se envía en el siguiente instante, junto con los demás cambios
    // del mismo momento (como guardar primero y sincronizar después, al estilo planner7).
    async saveTask(task, opts = {}) {
      const prevQueued = queue.get(task.id);
      queue.set(task.id, { task: clone(task), opts: prevQueued ? { ...prevQueued.opts, ...opts } : opts });
      scheduleFlush();
    },
    async deleteTask(id) {
      await flushNow();
      const prev = cache.tasks.get(id);
      const atts = ok(await sb.from('attachments').select('storage_path').eq('task_id', id));
      await removeFiles(atts.map((a) => a.storage_path));
      ok(await sb.from('tasks').delete().eq('id', id)); // dependencias, comentarios y adjuntos se borran en cascada
      cache.tasks.delete(id);
      for (const t of cache.tasks.values()) t.depends_on = t.depends_on.filter((x) => x !== id);
      if (prev) await logActivity({ entity: 'task', entity_id: id, entity_name: prev.title, action: 'delete', extra: cachedName.project(prev.project_id) });
    },

    /* ---------- Comentarios (se consultan solo para la tarea abierta) ---------- */
    async listComments(taskId) {
      return ok(await sb.from('comments').select('*').eq('task_id', taskId).order('created_at')).map(mapComment);
    },
    async addComment(taskId, author, body) {
      ok(await sb.from('comments').insert({ task_id: taskId, author, body }));
      await logActivity({ entity: 'task', entity_id: taskId, entity_name: cachedName.task(taskId), action: 'comment', extra: body.slice(0, 120) });
    },
    async deleteComment(id) {
      const c = ok(await sb.from('comments').select('task_id,body').eq('id', id))[0];
      if (!c) return;
      ok(await sb.from('comments').delete().eq('id', id));
      await logActivity({ entity: 'task', entity_id: c.task_id, entity_name: cachedName.task(c.task_id), action: 'uncomment', extra: c.body.slice(0, 120) });
    },

    /* ---------- Archivos adjuntos ---------- */
    async listAttachments(taskId) {
      const rows = ok(await sb.from('attachments').select('*').eq('task_id', taskId).order('id'));
      if (!rows.length) return [];
      // Enlaces temporales (1 hora) para ver y descargar los archivos privados
      const signed = ok(await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 3600));
      const urlOf = Object.fromEntries(signed.map((s) => [s.path, s.signedUrl]));
      return rows.map((r) => ({
        id: r.id, task_id: r.task_id, kind: 'file', name: r.name, type: r.type, size: Number(r.size),
        uploaded_by: r.uploaded_by, created_at: toLocal(r.created_at), storage_path: r.storage_path, url: urlOf[r.storage_path],
      }));
    },
    async addAttachment(taskId, file, kind, user) {
      const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
      const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      ok(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false }));
      ok(await sb.from('attachments').insert({ task_id: taskId, name: file.name, type: file.type, size: file.size, storage_path: path, uploaded_by: user }));
      await logActivity({ entity: 'task', entity_id: taskId, entity_name: cachedName.task(taskId), action: 'attach', extra: file.name });
    },
    async deleteAttachment(id) {
      const a = ok(await sb.from('attachments').select('*').eq('id', id))[0];
      if (!a) return;
      await removeFiles([a.storage_path]);
      ok(await sb.from('attachments').delete().eq('id', id));
      await logActivity({ entity: 'task', entity_id: a.task_id, entity_name: cachedName.task(a.task_id), action: 'detach', extra: a.name });
    },

    /* ---------- Respaldo (mismo formato que la versión local) ---------- */
    async exportAll() {
      await flushNow();
      await loadAll(true);
      const [people, projects, tasks] = await Promise.all([this.listPeople(), this.listProjects(), this.listTasks()]);
      const comments = (await fetchAll('comments', (q) => q.order('id'))).map(mapComment);
      const activity = (await fetchAll('activity', (q) => q.order('id'))).map(mapActivity);
      const out = {
        app: BACKUP_APP, version: 1, exported_at: nowISO(),
        people, projects, tasks, comments, activity,
        meta: [{ key: 'next_id', value: tasks.reduce((m, t) => Math.max(m, t.id), 0) + 1 }, { key: 'seeded', value: true }],
        attachments: [],
      };
      for (const r of await fetchAll('attachments', (q) => q.order('id'))) {
        const blob = ok(await sb.storage.from(BUCKET).download(r.storage_path));
        out.attachments.push({
          id: r.id, task_id: r.task_id, kind: 'file', name: r.name, type: r.type, size: Number(r.size),
          uploaded_by: r.uploaded_by, created_at: toLocal(r.created_at), data: await blobToDataURL(blob),
        });
      }
      return out;
    },

    // Reemplaza proyectos, tareas, comentarios, archivos y bitácora por los del respaldo.
    // Las personas se agregan o actualizan (se conservan las cuentas ya vinculadas).
    async importAll(data) {
      if (!data || data.app !== BACKUP_APP || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
        throw new Error('El archivo no es un respaldo válido del gestor de tareas.');
      }
      await flushNow();
      // 1. Borrar lo actual
      const oldAtts = await fetchAll('attachments', (q) => q, 'storage_path');
      await removeFiles(oldAtts.map((a) => a.storage_path));
      ok(await sb.from('activity').delete().gte('id', 0));
      ok(await sb.from('projects').delete().gte('id', 0)); // en cascada: tareas, responsables, dependencias, comentarios, adjuntos

      // 2. Personas
      const people = (data.people || []).map((p) => ({ id: p.id, name: p.name, deleted: !!p.deleted, created_at: fromLocal(p.created_at) }));
      for (const part of chunks(people)) if (part.length) ok(await sb.from('people').upsert(part, { onConflict: 'id' }));
      const known = new Set(people.map((p) => p.id).concat((await fetchAll('people', (q) => q, 'id')).map((p) => p.id)));
      const person = (id) => (id && known.has(id) ? id : null);

      // 3. Proyectos y tareas (con sus ID originales)
      await insertMany('projects', data.projects.map((p) => ({
        id: p.id, name: p.name, position: p.position ?? null, archived: !!p.archived, created_at: fromLocal(p.created_at),
      })));
      const projectIds = new Set(data.projects.map((p) => p.id));
      const tasks = data.tasks.filter((t) => projectIds.has(t.project_id));
      await insertMany('tasks', tasks.map((t) => ({
        id: t.id, ...taskRow({ ...t, created_by: person(t.created_by) }), created_at: fromLocal(t.created_at),
      })));
      const taskIds = new Set(tasks.map((t) => t.id));
      await insertMany('task_assignees', tasks.flatMap((t) => (t.assignees || []).filter((p) => known.has(p)).map((p) => ({ task_id: t.id, person_id: p }))));
      await insertMany('task_dependencies', tasks.flatMap((t) => (t.depends_on || []).filter((d) => taskIds.has(d) && d !== t.id).map((d) => ({ task_id: t.id, depends_on_id: d }))));

      // 4. Comentarios y bitácora
      await insertMany('comments', (data.comments || []).filter((c) => taskIds.has(c.task_id)).map((c) => ({
        id: c.id, task_id: c.task_id, author: person(c.author), body: c.body, created_at: fromLocal(c.created_at),
      })));
      await insertMany('activity', (data.activity || []).map((e) => ({ id: e.id, ...activityRow({ ...e, ts: e.ts || Date.now() }), at: fromLocal(e.at) })));

      // 5. Archivos adjuntos
      for (const a of (data.attachments || []).filter((x) => taskIds.has(x.task_id))) {
        const blob = dataURLToBlob(a.data);
        const safe = (a.name || 'archivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
        const path = `${a.task_id}/${a.id}-${safe}`;
        ok(await sb.storage.from(BUCKET).upload(path, blob, { contentType: a.type || blob.type || 'application/octet-stream', upsert: true }));
        ok(await sb.from('attachments').insert({
          id: a.id, task_id: a.task_id, name: a.name, type: a.type, size: a.size ?? blob.size, storage_path: path,
          uploaded_by: person(a.uploaded_by), created_at: fromLocal(a.created_at),
        }));
      }

      // 6. Ajustar contadores para que los registros nuevos no choquen con los importados
      ok(await sb.rpc('sincronizar_secuencias'));
      lastOwnActivity = null;
      await logActivity({ entity: 'app', action: 'import', extra: data.exported_at || null });
      await loadAll(true); // nueva foto con los datos restaurados
    },
  };

  Api = SupaApi; // reemplaza la versión local definida en db.js
})();
