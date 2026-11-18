/*
 * Capa de datos — versión LOCAL (IndexedDB del navegador).
 *
 * Todo el resto de la app solo habla con el objeto `Api` de este archivo.
 * Cuando pasemos a Supabase, se reemplaza este archivo por uno que implemente
 * las mismas funciones contra Supabase, y el resto de la app no cambia.
 *
 * Modelo de datos (pensado para que calce con tablas de Supabase):
 *   tasks       { id, title, description, status, priority, project, assignee,
 *                 created_by, created_at, due_at, depends_on: [ids] }
 *   comments    { id, task_id, author, body, created_at }
 *   attachments { id, task_id, kind: 'photo'|'file', name, type, size, blob,
 *                 uploaded_by, created_at }
 */

const LocalDB = (() => {
  const NAME = 'gestor-de-tareas';
  const VERSION = 1;
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore('tasks', { keyPath: 'id' });
          const c = db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
          c.createIndex('task_id', 'task_id');
          const a = db.createObjectStore('attachments', { keyPath: 'id', autoIncrement: true });
          a.createIndex('task_id', 'task_id');
          db.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
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
    const flag = await LocalDB.get('meta', 'seeded');
    if (flag) return;
    for (const t of seed.tasks) await LocalDB.put('tasks', t);
    for (const c of seed.comments) await LocalDB.put('comments', c);
    await LocalDB.put('meta', { key: 'next_id', value: seed.tasks.length + 1 });
    await LocalDB.put('meta', { key: 'seeded', value: true });
  },

  async resetAll(seed) {
    for (const s of ['tasks', 'comments', 'attachments', 'meta']) await LocalDB.clear(s);
    await this.ensureSeed(seed);
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
      project: null,
      assignee: null,
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
