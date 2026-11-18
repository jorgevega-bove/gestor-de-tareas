/*
 * Capa de datos — versión LOCAL (IndexedDB del navegador).
 *
 * Todo el resto de la app solo habla con el objeto `Api` de este archivo.
 * Cuando pasemos a Supabase, se reemplaza este archivo por uno que implemente
 * las mismas funciones contra Supabase, y el resto de la app no cambia.
 *
 * Modelo de datos (pensado para que calce con tablas de Supabase):
 *   people      { id, name, created_at }   (personas que pueden ser responsables)
 *   projects    { id, name, position, archived, created_at }
 *   tasks       { id, project_id, title, description, status, priority, project, assignees: [ids],
 *                 created_by, created_at, due_at, depends_on: [ids] }
 *   comments    { id, task_id, author, body, created_at }
 *   attachments { id, task_id, kind: 'photo'|'file', name, type, size, blob,
 *                 uploaded_by, created_at }
 */

const LocalDB = (() => {
  const NAME = 'gestor-de-tareas';
  const VERSION = 3;
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
  };
})();

const nowISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const Api = {
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

  async resetAll(seed) {
    for (const s of ['people', 'projects', 'tasks', 'comments', 'attachments', 'meta']) await LocalDB.clear(s);
    await this.ensureSeed(seed);
  },

  async listProjects() {
    const list = await LocalDB.all('projects');
    return list.sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id) || a.id - b.id);
  },
  async saveProjectOrder(ids) {
    for (const [i, id] of ids.entries()) {
      const p = await LocalDB.get('projects', id);
      p.position = i;
      await LocalDB.put('projects', p);
    }
  },
  async createProject(name) {
    const position = (await LocalDB.all('projects')).reduce((m, p) => Math.max(m, p.position ?? p.id), 0) + 1;
    const id = await LocalDB.put('projects', { name, position, created_at: nowISO() });
    return { id, name };
  },

  async listPeople() {
    const list = await LocalDB.all('people');
    return list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.name.localeCompare(b.name, 'es'));
  },
  async createPerson(name) {
    const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'persona';
    const existing = new Set((await LocalDB.all('people')).map((u) => u.id));
    let id = base, n = 2;
    while (existing.has(id)) id = `${base}-${n++}`;
    const person = { id, name, created_at: nowISO() };
    await LocalDB.put('people', person);
    return person;
  },

  // Elimina el proyecto con todas sus tareas (y sus comentarios y archivos)
  async deleteProject(id) {
    for (const t of await LocalDB.all('tasks')) {
      if (t.project_id === id) await this.deleteTask(t.id);
    }
    await LocalDB.del('projects', id);
  },

  async setProjectArchived(id, archived) {
    const p = await LocalDB.get('projects', id);
    p.archived = archived;
    await LocalDB.put('projects', p);
  },

  async renameProject(id, name) {
    const p = await LocalDB.get('projects', id);
    p.name = name;
    await LocalDB.put('projects', p);
  },

  listTasks: () => LocalDB.all('tasks'),

  async createTask(fields) {
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
    return task;
  },

  saveTask: (task) => LocalDB.put('tasks', task),

  async deleteTask(id) {
    await LocalDB.del('tasks', id);
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
  addComment: (taskId, author, body) =>
    LocalDB.put('comments', { task_id: taskId, author, body, created_at: nowISO() }),

  listAttachments: (taskId) => LocalDB.byTask('attachments', taskId),
  addAttachment: (taskId, file, kind, user) =>
    LocalDB.put('attachments', {
      task_id: taskId,
      kind,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      uploaded_by: user,
      created_at: nowISO(),
    }),
  deleteAttachment: (id) => LocalDB.del('attachments', id),
};
