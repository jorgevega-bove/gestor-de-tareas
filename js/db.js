/*
 * Capa de datos — versión LOCAL (IndexedDB del navegador).
 *
 * Todo el resto de la app solo habla con el objeto `Api` de este archivo.
 * Cuando pasemos a Supabase, se reemplaza este archivo por uno que implemente
 * las mismas funciones contra Supabase, y el resto de la app no cambia.
 *
 * Modelo de datos (pensado para que calce con tablas de Supabase):
 *   people      { id, name, created_at }   (personas que pueden ser responsables)
 *   activity    { id, ts, at, user, entity, entity_id, entity_name, action, field, from, to, extra }  (bitácora)
 *   projects    { id, name, position, archived, created_at }
 *   tasks       { id, project_id, title, description, status, priority, project, assignees: [ids],
 *                 created_by, created_at, due_at, depends_on: [ids] }
 *   comments    { id, task_id, author, body, created_at }
 *   attachments { id, task_id, kind: 'photo'|'file', name, type, size, blob,
 *                 uploaded_by, created_at }
 */

const LocalDB = (() => {
  const NAME = 'gestor-de-tareas';
  const VERSION = 4;
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = (e) => {
          const db = req.result;
          if (e.oldVersion < 1) {
            db.createObjectStore('tasks', { keyPath: 'id' });
            const c = db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
            c.createIndex('task_id', 'task_id');
            const a = db.createObjectStore('attachments', { keyPath: 'id', autoIncrement: true });
            a.createIndex('task_id', 'task_id');
            db.createObjectStore('meta', { keyPath: 'key' });
          }
          if (e.oldVersion < 2) {
            db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
          }
          if (e.oldVersion < 3) {
            db.createObjectStore('people', { keyPath: 'id' });
          }
          if (e.oldVersion < 4) {
            db.createObjectStore('activity', { keyPath: 'id', autoIncrement: true });
          }
        };
        // Otra pestaña con una versión anterior de la app tiene la base abierta y bloquea la actualización
        req.onblocked = () => {
          document.body.innerHTML = '<div style="padding:60px;font-family:-apple-system,sans-serif;color:#37352f;max-width:560px">' +
            '<h2>Cierra las otras pestañas de la app</h2>' +
            '<p>Hay otra pestaña abierta con una versión anterior del gestor de tareas. ' +
            'Ciérrala y esta página se cargará sola.</p></div>';
          req.onsuccess = () => location.reload();
        };
        req.onsuccess = () => {
          const db = req.result;
          // Si una versión más nueva de la app se abre en otra pestaña, esta cede la base y se recarga
          db.onversionchange = () => { db.close(); location.reload(); };
          resolve(db);
        };
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function run(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      let result;
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    all: (store) => run(store, 'readonly', (s) => s.getAll()),
    get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
    put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
    del: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
    byTask: (store, taskId) => run(store, 'readonly', (s) => s.index('task_id').getAll(taskId)),
    clear: (store) => run(store, 'readwrite', (s) => s.clear()),
    // Último registro de un almacén (el de id más alto)
    last: (store) => run(store, 'readonly', (s) => s.openCursor(null, 'prev')).then((c) => (c ? c.value : null)),
  };
})();

const nowISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Conversión de archivos adjuntos para el respaldo (JSON no guarda archivos binarios)
const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});
function dataURLToBlob(url) {
  const [head, b64] = url.split(',');
  const type = (head.match(/data:([^;]*)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
const BACKUP_APP = 'gestor-de-tareas-bove';
const DATA_STORES = ['people', 'projects', 'tasks', 'comments', 'meta', 'activity'];

/* ---------- Bitácora ---------- */
// Campos de la tarea que se registran cuando cambian
const TRACKED = ['title', 'status', 'priority', 'assignees', 'project_id', 'due_at', 'depends_on', 'description'];
// Al escribir, el título y la descripción se guardan varias veces: se agrupan en un solo registro
const COALESCE_MS = 2 * 60 * 1000;
async function logActivity(entry, { coalesce = false } = {}) {
  const e = { ts: Date.now(), at: nowISO(), user: Api.currentUser, ...entry };
  if (coalesce) {
    const last = await LocalDB.last('activity');
    if (last && last.action === 'update' && last.entity === e.entity && last.entity_id === e.entity_id &&
        last.field === e.field && last.user === e.user && e.ts - last.ts < COALESCE_MS) {
      await LocalDB.put('activity', { ...last, to: e.to, entity_name: e.entity_name, ts: e.ts, at: e.at });
      return;
    }
  }
  await LocalDB.put('activity', e);
}
/* ---------- Deshacer / rehacer ----------
 * Antes de cada cambio se guarda una copia de los datos. Los cambios hechos
 * casi al mismo tiempo (p. ej. completar una tarea y que otra se libere sola)
 * quedan agrupados en un solo paso. La bitácora no se deshace: registra el deshacer. */
const SNAP_STORES = ['people', 'projects', 'tasks', 'comments', 'attachments'];
const History = {
  undo: [], redo: [], open: false, pending: null, timer: null, paused: false,
  async snapshot() {
    const snap = {};
    for (const st of SNAP_STORES) snap[st] = await LocalDB.all(st);
    return snap;
  },
  async before() {
    if (this.paused) return;
    if (!this.open) {
      this.open = true;
      this.pending = this.snapshot();
      this.undo.push(await this.pending);
      if (this.undo.length > 50) this.undo.shift();
      this.redo = [];
    } else {
      await this.pending;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.open = false; }, 700);
  },
  async restore(snap) {
    this.paused = true;
    try {
      for (const st of SNAP_STORES) {
        await LocalDB.clear(st);
        for (const row of snap[st]) await LocalDB.put(st, row);
      }
    } finally { this.paused = false; }
  },
  close() { this.open = false; clearTimeout(this.timer); },
  clear() { this.undo = []; this.redo = []; this.close(); },
};

const projName = async (id) => ((await LocalDB.get('projects', id)) || {}).name || null;

const Api = {
  // ---------- Respaldo ----------
  async exportAll() {
    const out = { app: BACKUP_APP, version: 1, exported_at: nowISO() };
    for (const st of DATA_STORES) out[st] = await LocalDB.all(st);
    const atts = await LocalDB.all('attachments');
    out.attachments = [];
    for (const a of atts) {
      const { blob, ...rest } = a;
      out.attachments.push({ ...rest, data: await blobToDataURL(blob) });
    }
    return out;
  },

  async importAll(data) {
    if (!data || data.app !== BACKUP_APP || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
      throw new Error('El archivo no es un respaldo válido del gestor de tareas.');
    }
    for (const st of [...DATA_STORES, 'attachments']) await LocalDB.clear(st);
    for (const st of DATA_STORES) for (const row of data[st] || []) await LocalDB.put(st, row);
    History.clear();
    await logActivity({ entity: 'app', action: 'import', extra: data.exported_at || null });
    for (const a of data.attachments || []) {
      const { data: url, ...rest } = a;
      await LocalDB.put('attachments', { ...rest, blob: dataURLToBlob(url) });
    }
  },

  async ensureSeed(seed) {
    if (!(await LocalDB.all('people')).length) {
      for (const u of seed.people) await LocalDB.put('people', u);
    }
    if (!(await LocalDB.all('projects')).length) {
      for (const p of seed.projects) await LocalDB.put('projects', p);
    }
    const flag = await LocalDB.get('meta', 'seeded');
    if (flag) return;
    for (const t of seed.tasks) await LocalDB.put('tasks', t);
    for (const c of seed.comments) await LocalDB.put('comments', c);
    await LocalDB.put('meta', { key: 'next_id', value: seed.tasks.length + 1 });
    await LocalDB.put('meta', { key: 'seeded', value: true });
  },

  currentUser: null,

  async undo() {
    History.close();
    if (!History.undo.length) return false;
    History.redo.push(await History.snapshot());
    await History.restore(History.undo.pop());
    await logActivity({ entity: 'app', action: 'undo' });
    return true;
  },
  async redo() {
    History.close();
    if (!History.redo.length) return false;
    History.undo.push(await History.snapshot());
    await History.restore(History.redo.pop());
    await logActivity({ entity: 'app', action: 'redo' });
    return true;
  },
  listActivity: () => LocalDB.all('activity'),

  async resetAll(seed) {
    for (const s of ['people', 'projects', 'tasks', 'comments', 'attachments', 'meta', 'activity']) await LocalDB.clear(s);
    await this.ensureSeed(seed);
    History.clear();
    await logActivity({ entity: 'app', action: 'reset' });
  },

  async listProjects() {
    const list = await LocalDB.all('projects');
    return list.sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id) || a.id - b.id);
  },
  async saveProjectOrder(ids) {
    await History.before();
    for (const [i, id] of ids.entries()) {
      const p = await LocalDB.get('projects', id);
      p.position = i;
      await LocalDB.put('projects', p);
    }
  },
  async createProject(name) {
    await History.before();
    const position = (await LocalDB.all('projects')).reduce((m, p) => Math.max(m, p.position ?? p.id), 0) + 1;
    const id = await LocalDB.put('projects', { name, position, created_at: nowISO() });
    await logActivity({ entity: 'project', entity_id: id, entity_name: name, action: 'create' });
    return { id, name };
  },

  async listPeople() {
    const list = await LocalDB.all('people');
    return list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.name.localeCompare(b.name, 'es'));
  },
  async createPerson(name) {
    await History.before();
    const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'persona';
    const existing = new Set((await LocalDB.all('people')).map((u) => u.id));
    let id = base, n = 2;
    while (existing.has(id)) id = `${base}-${n++}`;
    const person = { id, name, created_at: nowISO() };
    await LocalDB.put('people', person);
    await logActivity({ entity: 'person', entity_id: id, entity_name: name, action: 'create' });
    return person;
  },

  // Elimina el proyecto con todas sus tareas (y sus comentarios y archivos)
  async deleteProject(id) {
    await History.before();
    const name = await projName(id);
    for (const t of await LocalDB.all('tasks')) {
      if (t.project_id === id) await this.deleteTask(t.id);
    }
    await LocalDB.del('projects', id);
    await logActivity({ entity: 'project', entity_id: id, entity_name: name, action: 'delete' });
  },

  async setProjectArchived(id, archived) {
    await History.before();
    const p = await LocalDB.get('projects', id);
    p.archived = archived;
    await LocalDB.put('projects', p);
    await logActivity({ entity: 'project', entity_id: id, entity_name: p.name, action: archived ? 'archive' : 'unarchive' });
  },

  async renameProject(id, name) {
    await History.before();
    const p = await LocalDB.get('projects', id);
    const before = p.name;
    p.name = name;
    await LocalDB.put('projects', p);
    await logActivity({ entity: 'project', entity_id: id, entity_name: name, action: 'rename', from: before, to: name });
  },

  listTasks: () => LocalDB.all('tasks'),

  async createTask(fields) {
    await History.before();
    const meta = (await LocalDB.get('meta', 'next_id')) || { key: 'next_id', value: 1 };
    const task = {
      id: meta.value,
      title: '',
      description: '',
      status: 'todo',
      priority: null,
      project_id: null,
      assignees: [],
      created_by: null,
      created_at: nowISO(),
      due_at: null,
      depends_on: [],
      ...fields,
    };
    await LocalDB.put('meta', { key: 'next_id', value: meta.value + 1 });
    await LocalDB.put('tasks', task);
    await logActivity({ entity: 'task', entity_id: task.id, entity_name: task.title, action: 'create', extra: await projName(task.project_id) });
    return task;
  },

  // Guarda la tarea y registra en la bitácora cada campo que cambió.
  // opts.silent: no registra (migraciones). opts.auto: cambio automático (regla de dependencias).
  async saveTask(task, opts = {}) {
    if (!opts.silent) await History.before();
    const prev = await LocalDB.get('tasks', task.id);
    await LocalDB.put('tasks', task);
    if (!prev || opts.silent) return;
    for (const f of TRACKED) {
      const a = prev[f] ?? null, b = task[f] ?? null;
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const entry = { entity: 'task', entity_id: task.id, entity_name: task.title, action: 'update', field: f, from: a, to: b };
      if (opts.auto) entry.user = 'auto';
      if (f === 'description') { entry.from = null; entry.to = null; }
      if (f === 'project_id') entry.extra = { from: await projName(a), to: await projName(b) };
      await logActivity(entry, { coalesce: f === 'title' || f === 'description' });
    }
  },

  async deleteTask(id) {
    await History.before();
    const prev = await LocalDB.get('tasks', id);
    await LocalDB.del('tasks', id);
    if (prev) await logActivity({ entity: 'task', entity_id: id, entity_name: prev.title, action: 'delete', extra: await projName(prev.project_id) });
    for (const c of await LocalDB.byTask('comments', id)) await LocalDB.del('comments', c.id);
    for (const a of await LocalDB.byTask('attachments', id)) await LocalDB.del('attachments', a.id);
    for (const t of await LocalDB.all('tasks')) {
      if (t.depends_on.includes(id)) {
        t.depends_on = t.depends_on.filter((x) => x !== id);
        await LocalDB.put('tasks', t);
      }
    }
  },

  listComments: (taskId) => LocalDB.byTask('comments', taskId),
  async addComment(taskId, author, body) {
    await History.before();
    await LocalDB.put('comments', { task_id: taskId, author, body, created_at: nowISO() });
    const t = await LocalDB.get('tasks', taskId);
    await logActivity({ entity: 'task', entity_id: taskId, entity_name: t ? t.title : '', action: 'comment', extra: body.slice(0, 120) });
  },

  async deleteComment(id) {
    const c = await LocalDB.get('comments', id);
    if (!c) return;
    await History.before();
    await LocalDB.del('comments', id);
    const t = await LocalDB.get('tasks', c.task_id);
    await logActivity({ entity: 'task', entity_id: c.task_id, entity_name: t ? t.title : '', action: 'uncomment', extra: c.body.slice(0, 120) });
  },

  listAttachments: (taskId) => LocalDB.byTask('attachments', taskId),
  async addAttachment(taskId, file, kind, user) {
    await History.before();
    await LocalDB.put('attachments', {
      task_id: taskId,
      kind,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      uploaded_by: user,
      created_at: nowISO(),
    });
    const t = await LocalDB.get('tasks', taskId);
    await logActivity({ entity: 'task', entity_id: taskId, entity_name: t ? t.title : '', action: 'attach', extra: file.name });
  },
  async deleteAttachment(id) {
    await History.before();
    const a = await LocalDB.get('attachments', id);
    await LocalDB.del('attachments', id);
    if (a) {
      const t = await LocalDB.get('tasks', a.task_id);
      await logActivity({ entity: 'task', entity_id: a.task_id, entity_name: t ? t.title : '', action: 'detach', extra: a.name });
    }
  },
};
