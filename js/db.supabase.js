/*
 * Capa de datos — versión COMPARTIDA (Supabase).
 *
 * Se carga solo si js/config.js tiene la URL y la clave de Supabase.
 * Reemplaza al objeto `Api` de db.js con las mismas funciones, así que el
 * resto de la app funciona igual. Usa las tablas de supabase/esquema.sql.
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

  /* ---------- Conversión filas ⇄ objetos de la app ---------- */
  const mapPerson = (r) => ({ id: r.id, name: r.name, email: r.email, deleted: !!r.deleted, created_at: toLocal(r.created_at) });
  const mapProject = (r) => ({ id: r.id, name: r.name, position: r.position, archived: !!r.archived, created_at: toLocal(r.created_at) });
  const mapTask = (r, assignees = [], deps = []) => ({
    id: r.id, project_id: r.project_id, position: r.position, title: r.title || '', description: r.description || '',
    status: r.status, priority: r.priority, due_at: r.due_at, created_by: r.created_by, created_at: toLocal(r.created_at),
    assignees, depends_on: deps,
  });
  const taskRow = (t) => ({
    project_id: t.project_id, position: t.position ?? null, title: t.title || '', description: t.description || '',
    status: t.status || 'todo', priority: t.priority || null, due_at: t.due_at || null, created_by: t.created_by || null,
  });
  const mapComment = (r) => ({ id: r.id, task_id: r.task_id, author: r.author, body: r.body, created_at: toLocal(r.created_at) });
  const numericEntity = (e) => e === 'task' || e === 'project';
  const mapActivity = (r) => ({
    id: r.id, ts: Number(r.ts), at: toLocal(r.at), user: r.user_id, entity: r.entity,
    entity_id: r.entity_id != null && numericEntity(r.entity) ? Number(r.entity_id) : r.entity_id,
    entity_name: r.entity_name, action: r.action, field: r.field, from: r.from, to: r.to, extra: r.extra,
  });

  async function loadTask(id) {
    const row = ok(await sb.from('tasks').select('*').eq('id', id))[0];
    if (!row) return null;
    const a = ok(await sb.from('task_assignees').select('person_id').eq('task_id', id)).map((x) => x.person_id);
    const d = ok(await sb.from('task_dependencies').select('depends_on_id').eq('task_id', id)).map((x) => x.depends_on_id);
    return mapTask(row, a, d);
  }
  // Ajusta responsables y dependencias de una tarea según las listas nuevas
  async function syncLinks(id, prev, next) {
    const diff = (a = [], b = []) => [a.filter((x) => !b.includes(x)), b.filter((x) => !a.includes(x))];
    const [rmA, addA] = diff(prev.assignees, next.assignees);
    if (rmA.length) ok(await sb.from('task_assignees').delete().eq('task_id', id).in('person_id', rmA));
    if (addA.length) ok(await sb.from('task_assignees').insert(addA.map((p) => ({ task_id: id, person_id: p }))));
    const [rmD, addD] = diff(prev.depends_on, next.depends_on);
    if (rmD.length) ok(await sb.from('task_dependencies').delete().eq('task_id', id).in('depends_on_id', rmD));
    if (addD.length) ok(await sb.from('task_dependencies').insert(addD.map((d) => ({ task_id: id, depends_on_id: d }))));
  }
  const projName = async (id) => (id ? (ok(await sb.from('projects').select('name').eq('id', id))[0] || {}).name || null : null);
  const nextPosition = async (table) => {
    const r = ok(await sb.from(table).select('position').not('position', 'is', null).order('position', { ascending: false }).limit(1))[0];
    return (r ? r.position : 0) + 1;
  };
  async function removeFiles(paths) {
    for (const part of chunks(paths.filter(Boolean), 100)) if (part.length) ok(await sb.storage.from(BUCKET).remove(part));
  }

  /* ---------- Bitácora ---------- */
  async function logActivity(entry, { coalesce = false } = {}) {
    const e = { ts: Date.now(), user: SupaApi.currentUser, ...entry };
    const eid = e.entity_id == null ? null : String(e.entity_id);
    if (coalesce) {
      const last = ok(await sb.from('activity').select('*').order('id', { ascending: false }).limit(1))[0];
      if (last && last.action === 'update' && last.entity === e.entity && last.entity_id === eid &&
          last.field === e.field && last.user_id === e.user && e.ts - Number(last.ts) < COALESCE_MS) {
        ok(await sb.from('activity').update({ to: e.to ?? null, entity_name: e.entity_name ?? null, ts: e.ts, at: new Date().toISOString() }).eq('id', last.id));
        return;
      }
    }
    ok(await sb.from('activity').insert({
      ts: e.ts, at: new Date().toISOString(), user_id: e.user ?? null, entity: e.entity, entity_id: eid,
      entity_name: e.entity_name ?? null, action: e.action, field: e.field ?? null,
      from: e.from ?? null, to: e.to ?? null, extra: e.extra ?? null,
    }));
  }

  const SupaApi = {
    mode: 'supabase',
    supportsUndo: false,
    currentUser: null,

    /* ---------- Sesión ---------- */
    auth: {
      allowedDomain: (cfg.allowedEmailDomain || '').replace(/^@/, '').toLowerCase(),
      async email() {
        const { data } = await sb.auth.getSession();
        return data.session ? (data.session.user.email || '').toLowerCase() : null;
      },
      async sendCode(email) { ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })); },
      async verifyCode(email, token) { ok(await sb.auth.verifyOtp({ email, token, type: 'email' })); },
      async signOut() { await sb.auth.signOut(); },
    },
    async personForEmail(email) {
      const r = ok(await sb.from('people').select('*').eq('email', email.toLowerCase()))[0];
      return r ? mapPerson(r) : null;
    },
    async linkPerson(id, email) { ok(await sb.from('people').update({ email: email.toLowerCase(), deleted: false }).eq('id', id)); },

    // Avisa cuando otra persona cambia algo (se agrupan los avisos seguidos)
    onRemoteChange(cb) {
      let timer;
      const fire = () => { clearTimeout(timer); timer = setTimeout(cb, 400); };
      const ch = sb.channel('cambios');
      for (const t of ['people', 'projects', 'tasks', 'task_assignees', 'task_dependencies', 'comments', 'attachments']) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire);
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
      const rows = ok(await sb.from('activity').select('*').order('id', { ascending: false }).limit(2000));
      return rows.map(mapActivity);
    },

    /* ---------- Personas ---------- */
    async listPeople() {
      const rows = await fetchAll('people', (q) => q.order('created_at'));
      return rows.map(mapPerson);
    },
    async createPerson(name, email = null) {
      const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'persona';
      const existing = new Set((await fetchAll('people', (q) => q, 'id')).map((u) => u.id));
      let id = base, n = 2;
      while (existing.has(id)) id = `${base}-${n++}`;
      const row = ok(await sb.from('people').insert({ id, name, email: email ? email.toLowerCase() : null }).select())[0];
      await logActivity({ entity: 'person', entity_id: id, entity_name: name, action: 'create' });
      return mapPerson(row);
    },
    async renamePerson(id, name) {
      const before = (ok(await sb.from('people').select('name').eq('id', id))[0] || {}).name;
      ok(await sb.from('people').update({ name }).eq('id', id));
      await logActivity({ entity: 'person', entity_id: id, entity_name: name, action: 'rename', from: before, to: name });
    },
    async deletePerson(id) {
      const p = ok(await sb.from('people').select('name').eq('id', id))[0] || {};
      ok(await sb.from('people').update({ deleted: true }).eq('id', id));
      ok(await sb.from('task_assignees').delete().eq('person_id', id));
      await logActivity({ entity: 'person', entity_id: id, entity_name: p.name, action: 'delete' });
    },

    /* ---------- Proyectos ---------- */
    async listProjects() {
      const rows = await fetchAll('projects', (q) => q.order('position', { ascending: true, nullsFirst: false }).order('id'));
      return rows.map(mapProject);
    },
    async createProject(name, archived = false) {
      const position = await nextPosition('projects');
      const row = ok(await sb.from('projects').insert({ name, position, archived }).select())[0];
      await logActivity({ entity: 'project', entity_id: row.id, entity_name: name, action: 'create' });
      return mapProject(row);
    },
    async renameProject(id, name) {
      const before = await projName(id);
      ok(await sb.from('projects').update({ name }).eq('id', id));
      await logActivity({ entity: 'project', entity_id: id, entity_name: name, action: 'rename', from: before, to: name });
    },
    async setProjectArchived(id, archived) {
      ok(await sb.from('projects').update({ archived }).eq('id', id));
      await logActivity({ entity: 'project', entity_id: id, entity_name: await projName(id), action: archived ? 'archive' : 'unarchive' });
    },
    async saveProjectOrder(ids) {
      for (const [i, id] of ids.entries()) ok(await sb.from('projects').update({ position: i }).eq('id', id));
    },
    // Elimina el proyecto con todas sus tareas (y sus comentarios y archivos)
    async deleteProject(id) {
      const name = await projName(id);
      const tasks = await fetchAll('tasks', (q) => q.eq('project_id', id), 'id,title');
      const taskIds = tasks.map((t) => t.id);
      for (const part of chunks(taskIds, 200)) {
        const atts = ok(await sb.from('attachments').select('storage_path').in('task_id', part));
        await removeFiles(atts.map((a) => a.storage_path));
      }
      ok(await sb.from('projects').delete().eq('id', id)); // borra en cascada tareas, comentarios, etc.
      for (const t of tasks) await logActivity({ entity: 'task', entity_id: t.id, entity_name: t.title, action: 'delete', extra: name });
      await logActivity({ entity: 'project', entity_id: id, entity_name: name, action: 'delete' });
    },

    /* ---------- Tareas ---------- */
    async listTasks() {
      const [rows, assignees, deps] = await Promise.all([
        fetchAll('tasks', (q) => q.order('id')),
        fetchAll('task_assignees'),
        fetchAll('task_dependencies'),
      ]);
      const byTask = (list, key, val) => list.reduce((m, r) => ((m[r[key]] = m[r[key]] || []).push(r[val]), m), {});
      const A = byTask(assignees, 'task_id', 'person_id');
      const D = byTask(deps, 'task_id', 'depends_on_id');
      return rows.map((r) => mapTask(r, A[r.id] || [], D[r.id] || []));
    },
    async createTask(fields) {
      const t = { status: 'todo', assignees: [], depends_on: [], ...fields };
      t.position = await nextPosition('tasks');
      const row = ok(await sb.from('tasks').insert(taskRow(t)).select())[0];
      await syncLinks(row.id, { assignees: [], depends_on: [] }, t);
      await logActivity({ entity: 'task', entity_id: row.id, entity_name: row.title, action: 'create', extra: await projName(row.project_id) });
      return mapTask(row, t.assignees, t.depends_on);
    },
    // Guarda la tarea y registra en la bitácora cada campo que cambió (igual que la versión local)
    async saveTask(task, opts = {}) {
      const prev = await loadTask(task.id);
      if (!prev) return;
      ok(await sb.from('tasks').update(taskRow(task)).eq('id', task.id));
      await syncLinks(task.id, prev, task);
      if (opts.silent) return;
      for (const f of TRACKED) {
        const a = prev[f] ?? null, b = task[f] ?? null;
        const same = Array.isArray(a) || Array.isArray(b)
          ? JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort())
          : JSON.stringify(a) === JSON.stringify(b);
        if (same) continue;
        const entry = { entity: 'task', entity_id: task.id, entity_name: task.title, action: 'update', field: f, from: a, to: b };
        if (opts.auto) entry.user = 'auto';
        if (f === 'description') { entry.from = null; entry.to = null; }
        if (f === 'project_id') entry.extra = { from: await projName(a), to: await projName(b) };
        await logActivity(entry, { coalesce: f === 'title' || f === 'description' });
      }
    },
    async deleteTask(id) {
      const prev = await loadTask(id);
      const atts = ok(await sb.from('attachments').select('storage_path').eq('task_id', id));
      await removeFiles(atts.map((a) => a.storage_path));
      ok(await sb.from('tasks').delete().eq('id', id)); // dependencias, comentarios y adjuntos se borran en cascada
      if (prev) await logActivity({ entity: 'task', entity_id: id, entity_name: prev.title, action: 'delete', extra: await projName(prev.project_id) });
    },

    /* ---------- Comentarios ---------- */
    async listComments(taskId) {
      return ok(await sb.from('comments').select('*').eq('task_id', taskId).order('created_at')).map(mapComment);
    },
    async addComment(taskId, author, body) {
      ok(await sb.from('comments').insert({ task_id: taskId, author, body }));
      const t = ok(await sb.from('tasks').select('title').eq('id', taskId))[0];
      await logActivity({ entity: 'task', entity_id: taskId, entity_name: t ? t.title : '', action: 'comment', extra: body.slice(0, 120) });
    },
    async deleteComment(id) {
      const c = ok(await sb.from('comments').select('*').eq('id', id))[0];
      if (!c) return;
      ok(await sb.from('comments').delete().eq('id', id));
      const t = ok(await sb.from('tasks').select('title').eq('id', c.task_id))[0];
      await logActivity({ entity: 'task', entity_id: c.task_id, entity_name: t ? t.title : '', action: 'uncomment', extra: c.body.slice(0, 120) });
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
      const t = ok(await sb.from('tasks').select('title').eq('id', taskId))[0];
      await logActivity({ entity: 'task', entity_id: taskId, entity_name: t ? t.title : '', action: 'attach', extra: file.name });
    },
    async deleteAttachment(id) {
      const a = ok(await sb.from('attachments').select('*').eq('id', id))[0];
      if (!a) return;
      await removeFiles([a.storage_path]);
      ok(await sb.from('attachments').delete().eq('id', id));
      const t = ok(await sb.from('tasks').select('title').eq('id', a.task_id))[0];
      await logActivity({ entity: 'task', entity_id: a.task_id, entity_name: t ? t.title : '', action: 'detach', extra: a.name });
    },

    /* ---------- Respaldo (mismo formato que la versión local) ---------- */
    async exportAll() {
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
      await insertMany('activity', (data.activity || []).map((e) => ({
        id: e.id, ts: e.ts || Date.now(), at: fromLocal(e.at), user_id: e.user ?? null, entity: e.entity,
        entity_id: e.entity_id == null ? null : String(e.entity_id), entity_name: e.entity_name ?? null, action: e.action,
        field: e.field ?? null, from: e.from ?? null, to: e.to ?? null, extra: e.extra ?? null,
      })));

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
      await logActivity({ entity: 'app', action: 'import', extra: data.exported_at || null });
    },
  };

  Api = SupaApi; // reemplaza la versión local definida en db.js
})();
