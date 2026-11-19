/* ============================================================
 *  Gestor de tareas — lógica de la interfaz
 * ============================================================ */

// Personas (se cargan desde la base de datos al iniciar)
let PEOPLE = []; // todas, incluidas las eliminadas (para mostrar nombres en el historial)
let USERS = [];  // solo las activas: las que se pueden asignar
async function loadPeople() {
  PEOPLE = await Api.listPeople();
  USERS = PEOPLE.filter((p) => !p.deleted);
}

const STATUS = {
  todo:    { label: 'No completada',       cls: 'c-red',    order: 0 },
  doing:   { label: 'En curso',            cls: 'c-blue',   order: 1 },
  wait:    { label: 'En espera',           cls: 'c-yellow', order: 2 },
  done:    { label: 'Completada',          cls: 'c-green',  order: 5 },
};

const PRIORITY = {
  alta:  { label: 'Alta',  cls: 'c-red',    order: 0 },
  media: { label: 'Media', cls: 'c-yellow', order: 1 },
  baja:  { label: 'Baja',  cls: 'c-green',  order: 2 },
};

/* ---------- Iconos (SVG mínimos estilo Notion) ---------- */
const P = {
  id: 'M3 5.5h10v1.5H3zM3 9h10v1.5H3zM6 2l1.4.2-1.6 11.6L4.4 13.6zM10.2 2l1.4.2-1.6 11.6-1.4-.2z',
  text: 'M2 3h12v1.6H2zM2 7.2h12v1.6H2zM2 11.4h8v1.6H2z',
  status: 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 1.5v10a5 5 0 0 0 0-10z',
  select: 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM5 7l3 3 3-3z',
  person: 'M8 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 7.5c3 0 5.5 1.5 5.5 3.5V14h-11v-1c0-2 2.5-3.5 5.5-3.5z',
  cal: 'M4 1h1.5v1.5h5V1H12v1.5h1.5A1.5 1.5 0 0 1 15 4v9.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5V4a1.5 1.5 0 0 1 1.5-1.5H4zM2.5 6.5v7h11v-7z',
  clock: 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 1.5a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm-.75 1.5h1.5v3.2l2.3 1.4-.8 1.3-3-1.8z',
  rel: 'M9.5 2H14v4.5h-1.5V4.6L8.3 8.8 7.2 7.7l4.2-4.2H9.5zM2 4.5A1.5 1.5 0 0 1 3.5 3H7v1.5H3.5v8h8V9H13v3.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5z',
  doc: 'M4 1.5h5.5L13 5v9.5H4zM5.5 3v10h6V6H8.5V3z',
  lock: 'M5 7V5a3 3 0 0 1 6 0v2h1v7H4V7zm1.5 0h3V5a1.5 1.5 0 0 0-3 0z',
  eye: 'M8 3.5c3.5 0 6 3 6.5 4.5-.5 1.5-3 4.5-6.5 4.5S2 9.5 1.5 8C2 6.5 4.5 3.5 8 3.5zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  trash: 'M6 1.5h4V3h3.5v1.5h-11V3H6zM3.5 5.5h9l-.7 9h-7.6z',
  x: 'M4 3l4 4 4-4 1 1-4 4 4 4-1 1-4-4-4 4-1-1 4-4-4-4z',
  plus: 'M7.25 2h1.5v5.25H14v1.5H8.75V14h-1.5V8.75H2v-1.5h5.25z',
  table: 'M2 2.5h12v11H2zm1.5 1.5v2.5h9V4zm0 4v4h3.5V8zm5 0v4h4V8z',
};
// Íconos de línea para Ordenar (dos flechas) y Filtro (embudo)
const SORT_ICON = '<svg class="i line-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13V3M2.75 5.25 5 3l2.25 2.25M11 3v10M8.75 10.75 11 13l2.25-2.25"/></svg>';
const FUNNEL_ICON = '<svg class="i line-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 3h11.5L9.25 8.6v4.4l-2.5-1.25V8.6z"/></svg>';
// Ícono de enlace (cadena) para "Depende de"
const LINK_ICON = '<svg class="i line-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.75 9.25a2.75 2.75 0 0 0 3.9 0l2.35-2.35a2.75 2.75 0 0 0-3.9-3.9l-.85.85"/><path d="M9.25 6.75a2.75 2.75 0 0 0-3.9 0L3 9.1a2.75 2.75 0 0 0 3.9 3.9l.85-.85"/></svg>';
const TOGGLE_ICON = '<svg class="i" viewBox="0 0 16 16"><path d="M5 3.5h6a4.5 4.5 0 0 1 0 9H5a4.5 4.5 0 0 1 0-9zm0 1.5a3 3 0 0 0 0 6h6a3 3 0 0 0 0-6zm6 .75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5z"/></svg>';
const BOARD_ICON = '<svg class="i line-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2"/><path d="M5.9 2.75v10.5M10.1 2.75v10.5"/></svg>';
// Clip para adjuntar archivos
const CLIP_ICON = '<svg class="i line-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13.25 7.5 8 12.75a3.4 3.4 0 0 1-4.8-4.8l5.4-5.4a2.25 2.25 0 0 1 3.2 3.2L6.4 11.15a1.1 1.1 0 0 1-1.55-1.55L9.9 4.55"/></svg>';
const PENCIL_ICON = '<svg class="i line-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.75 2.75a1.77 1.77 0 0 1 2.5 2.5L5.5 13 2.5 13.5 3 10.5z"/><path d="M9.5 4l2.5 2.5"/></svg>';
const icon = (name) => name === 'link' ? LINK_ICON : `<svg class="i" viewBox="0 0 16 16"><path d="${P[name]}"/></svg>`;

/* ---------- Columnas ---------- */
const COLUMNS = [
  { key: 'title',      label: 'Tarea',             icon: 'text',   fixed: true,   sort: (t) => t.title || null },
  { key: 'status',     label: 'Estado',            icon: 'status',                sort: (t) => STATUS[t.status].order },
  { key: 'assignees',  label: 'Responsable',       icon: 'person',                sort: (t) => assigneeNames(t) || null },
  { key: 'priority',   label: 'Prioridad',         icon: 'select',                sort: (t) => (t.priority ? PRIORITY[t.priority].order : null) },
  { key: 'due_at',     label: 'Fecha límite',      icon: 'cal',                   sort: (t) => (t.due_at ? dueSortKey(t.due_at) : null) },
  { key: 'code',       label: 'ID',                icon: 'id',     hidden: true,  sort: (t) => t.id },
  { key: 'project_id', label: 'Proyecto',          icon: 'select', hidden: true,  sort: (t) => projectName(t.project_id) },
  { key: 'depends_on', label: 'Depende de',        icon: 'link',    hidden: true,  sort: (t) => t.depends_on.length || null },
  { key: 'created_by', label: 'Creado por',        icon: 'person', hidden: true,  sort: (t) => userName(t.created_by) },
  { key: 'created_at', label: 'Fecha de creación', icon: 'clock',  hidden: true,  sort: (t) => t.created_at },
];

/* ---------- Estado de la app ---------- */
const state = {
  tasks: [],
  projects: [],
  openId: null,
  comments: [],
  attachments: [],
  query: '',
  selected: new Set(), // IDs de tareas seleccionadas con Ctrl/⌘ + clic
};

const prefs = (() => {
  try { return JSON.parse(localStorage.getItem('gt-prefs-v2')) || {}; } catch { return {}; }
})();
// Usuario actual: por ahora la maqueta la usa solo Jorge (el sistema de cuentas viene después)
// Usuario actual. En modo local es Jorge; en modo compartido (Supabase) es la persona vinculada a la cuenta.
let CURRENT_USER = 'jorge';
const SHARED = () => Api.mode === 'supabase';
const UNDO_HINT = () => (Api.supportsUndo ? ' Puedes deshacerlo con Ctrl/⌘ + Z.' : '');
delete CURRENT_USER;
prefs.sort = prefs.sort || { key: null, dir: null };
prefs.view = prefs.view || 'table';
prefs.filters = prefs.filters || {};
prefs.laneOrder = prefs.laneOrder || {}; // orden de las columnas del Kanban, por propiedad
// Secciones abiertas en la barra lateral (pueden estar las dos abiertas a la vez)
if (!Array.isArray(prefs.openSections)) prefs.openSections = prefs.openSection === undefined ? ['active'] : [prefs.openSection].filter(Boolean);
delete prefs.openSection;
if (prefs.filters.status) prefs.filters.status = prefs.filters.status.filter((v) => v in STATUS);
prefs.hidden = prefs.hidden || COLUMNS.filter((c) => c.hidden).map((c) => c.key);
// Orden de columnas: se respeta el guardado y se agregan al final columnas nuevas
prefs.order = [
  ...(prefs.order || []).filter((k) => COLUMNS.some((c) => c.key === k)),
  ...COLUMNS.map((c) => c.key).filter((k) => !(prefs.order || []).includes(k)),
];
// Anchos de columna (px). Se pueden cambiar arrastrando el borde del encabezado.
const DEFAULT_WIDTHS = { title: 320, status: 170, assignees: 190, priority: 120, due_at: 160,
  code: 90, project_id: 140, depends_on: 150, created_by: 140, created_at: 160 };
prefs.widths = { ...DEFAULT_WIDTHS, ...(prefs.widths || {}) };
const ID_WIDTH = 58; // "# ID" y números de hasta 4 cifras
prefs.widths.code = ID_WIDTH; // ancho fijo: lo justo para un ID de 4 cifras
const MIN_WIDTH = 60;
const GUTTER = 56; // espacio a la izquierda de la tabla: asa para arrastrar + basurero
const orderedColumns = () => prefs.order.map((k) => COLUMNS.find((c) => c.key === k));
function savePrefs() { try { localStorage.setItem('gt-prefs-v2', JSON.stringify(prefs)); } catch {} }

/* ---------- Utilidades ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const code = (t) => String(t.id);
const byId = (id) => state.tasks.find((t) => t.id === id);
const user = (id) => PEOPLE.find((u) => u.id === id);
const userName = (id) => (user(id) ? user(id).name : null);
const p2 = (n) => String(n).padStart(2, '0');
function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
function fmtSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${(b / 1024 ** 3).toFixed(2).replace('.', ',')} GB`;
}
// La fecha límite puede ser solo fecha ('2026-11-20') o fecha y hora ('2026-11-20T18:00').
const hasTime = (v) => !!v && v.includes('T');
const dueSortKey = (v) => (hasTime(v) ? v : `${v}T23:59`);
function fmtDue(v) {
  if (!v) return '';
  const [y, m, d] = v.split('T')[0].split('-');
  return `${d}/${m}/${y}` + (hasTime(v) ? ` ${v.split('T')[1]}` : '');
}
function hashIdx(s, n) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % n; }

const blockedBy = (t) => t.depends_on.map(byId).filter((x) => x && x.status !== 'done');
const blocking = (t) => state.tasks.filter((x) => x.depends_on.includes(t.id));

// ¿`a` depende (directa o indirectamente) de `target`?
function dependsOn(a, targetId, seen = new Set()) {
  if (seen.has(a.id)) return false;
  seen.add(a.id);
  return a.depends_on.some((id) => id === targetId || (byId(id) && dependsOn(byId(id), targetId, seen)));
}

/* ---------- Componentes HTML ---------- */
const pill = (map, key) => (key && map[key]
  ? `<span class="pill ${map[key].cls}">${map[key].label}</span>` : '');
const avatar = (u) => `<span class="avatar" style="background:${u.color}">${u.name[0]}</span>`;
const person = (id) => (user(id) ? `<span class="tag c-gray person">${esc(user(id).name)}</span>` : '');
const people = (ids) => (ids || []).filter(user).map(person).join('');
const assigneeNames = (t) => (t.assignees || []).map(userName).filter(Boolean).join(', ');
const projectById = (id) => state.projects.find((p) => p.id === Number(id));
const projectName = (id) => (projectById(id) ? projectById(id).name : null);
// Los proyectos no llevan color: todos usan el mismo contenedor gris
const projectTag = (id) => (projectById(id) ? `<span class="tag c-gray">${esc(projectName(id))}</span>` : '');
const EMPTY = '<span class="empty">Vacío</span>';

/* ---------- Filtros (solo columnas con opciones definidas) ---------- */
const FILTERS = {
  status: {
    options: () => Object.keys(STATUS),
    show: (v) => pill(STATUS, v), text: (v) => STATUS[v].label,
    values: (t) => [t.status],
  },
  priority: {
    options: () => [...Object.keys(PRIORITY), ''],
    show: (v) => (v ? pill(PRIORITY, v) : EMPTY), text: (v) => (v ? PRIORITY[v].label : 'Vacío'),
    values: (t) => [t.priority || ''],
  },
  assignees: {
    options: () => [...USERS.map((u) => u.id), ''],
    show: (v) => (v ? person(v) : EMPTY), text: (v) => (v ? userName(v) : 'Vacío'),
    values: (t) => (t.assignees.length ? t.assignees : ['']),
  },
  project_id: {
    options: () => state.projects.map((p) => String(p.id)),
    show: (v) => projectTag(v), text: (v) => projectName(v) || '',
    values: (t) => [String(t.project_id || '')],
  },
  created_by: {
    options: () => USERS.map((u) => u.id),
    show: (v) => person(v), text: (v) => userName(v),
    values: (t) => [t.created_by],
  },
};
const activeFilters = () => Object.entries(prefs.filters).filter(([k, v]) => FILTERS[k] && v.length);
const matchesFilters = (t) => activeFilters().every(([k, sel]) => FILTERS[k].values(t).some((v) => sel.includes(v)));
const isFiltering = () => !!state.query.trim() || activeFilters().length > 0;
// Contenedor con flecha e ID; su color es el del estado de la tarea referenciada
const depChip = (t, removable = false, link = true, reverse = false) =>
  `<span class="dep tag ${STATUS[t.status].cls}" ${link ? `data-open="${t.id}"` : ''} title="${esc(t.title)} · ${STATUS[t.status].label}">` +
  `<span class="dep-arrow">↗</span>${code(t)}` +
  (removable ? `<button class="tag-x" ${reverse ? 'data-remove-rdep' : 'data-remove-dep'}="${t.id}" title="Quitar">×</button>` : '') + '</span>';

/* ============================================================
 *  Regla automática de dependencias
 *  - Cuando todas las tareas de las que depende X están completadas:
 *      En espera → No completada
 *  - Al agregar una dependencia sin completar:
 *      No completada / En curso → En espera
 * ============================================================ */
// hadDeps: la tarea tenía dependencias justo antes (cuando se quita una o se elimina la tarea de la que dependía)
async function releaseIfFree(t, hadDeps = false) {
  if (!t || t.status !== 'wait') return;
  if (!t.depends_on.length && !hadDeps) return; // espera algo externo: no se libera sola
  if (blockedBy(t).length) return;
  t.status = 'todo';
  await Api.saveTask(t, { auto: true });
  toast(`La tarea ${t.id} ya no espera otras tareas → ${STATUS.todo.label}`);
}
async function onTaskCompleted(t) {
  for (const dep of blocking(t)) await releaseIfFree(dep);
}
async function onDependencyAdded(t, depTask) {
  if (depTask.status === 'done') return;
  if (['todo', 'doing'].includes(t.status)) {
    t.status = 'wait';
    toast(`La tarea ${t.id} ahora espera a la ${depTask.id} → ${STATUS.wait.label}`);
  }
}

/* ============================================================
 *  Tabla
 * ============================================================ */
// Vista "Mostrar todos": tareas de todos los proyectos en curso (prefs.project === 'all')
const isAllView = () => prefs.project === 'all';
const inView = (t) => (isAllView() ? !(projectById(t.project_id) || {}).archived : t.project_id === prefs.project);
// En "Mostrar todos" la columna Proyecto se muestra siempre
const isForcedColumn = (key) => isAllView() && key === 'project_id';

// La columna ID, si está visible, va siempre primero (a la izquierda) y no se puede mover
const PINNED = 'code';
function visibleColumns() {
  const cols = orderedColumns().filter((c) => c.fixed || isForcedColumn(c.key) || !prefs.hidden.includes(c.key));
  const pinned = cols.filter((c) => c.key === PINNED);
  return [...pinned, ...cols.filter((c) => c.key !== PINNED)];
}

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function matchesQuery(t) {
  const q = norm(state.query).trim();
  if (!q) return true;
  const hay = norm([t.id, t.title, t.description, projectName(t.project_id), assigneeNames(t), STATUS[t.status].label].join(' '));
  return q.split(/\s+/).every((w) => hay.includes(w));
}

// Orden manual: cada tarea tiene una posición (si no, se usa su ID)
const pos = (t) => t.position ?? t.id;

// Mueve una tarea antes o después de otra en el orden manual y guarda las posiciones que cambian
async function moveTask(movedId, targetId, after) {
  if (movedId === targetId) return;
  const order = [...state.tasks].sort((a, b) => pos(a) - pos(b) || a.id - b.id).filter((t) => t.id !== movedId);
  const idx = order.findIndex((t) => t.id === targetId);
  order.splice(idx + (after ? 1 : 0), 0, byId(movedId));
  for (const [i, t] of order.entries()) {
    if (t.position !== i + 1) { t.position = i + 1; await Api.saveTask(t); }
  }
}

// Sin un orden elegido: la tabla muestra lo más reciente arriba (por fecha de creación);
// el Kanban mantiene el orden manual de las tarjetas.
function sortedTasks({ manual = false } = {}) {
  const list = state.tasks.filter((t) => inView(t) && matchesQuery(t) && matchesFilters(t));
  const { key, dir } = prefs.sort;
  const col = COLUMNS.find((c) => c.key === key);
  if (!col && manual) return list.sort((a, b) => pos(a) - pos(b) || a.id - b.id);
  if (!col) return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.id - a.id);
  return list.sort((a, b) => {
    const va = col.sort(a), vb = col.sort(b);
    const na = va === null || va === undefined || va === '';
    const nb = vb === null || vb === undefined || vb === '';
    if (na && nb) return a.id - b.id;
    if (na) return 1; // vacíos siempre al final
    if (nb) return -1;
    let r = typeof va === 'string'
      ? va.localeCompare(vb, 'es', { sensitivity: 'base', numeric: true })
      : va < vb ? -1 : va > vb ? 1 : 0;
    if (r === 0) return a.id - b.id;
    return dir === 'desc' ? -r : r;
  });
}

const EDITABLE = ['title', 'status', 'priority', 'assignees', 'project_id', 'due_at', 'depends_on'];
function cell(col, t) {
  const ed = EDITABLE.includes(col.key) ? ` data-cell="${col.key}"` : '';
  switch (col.key) {
    case 'code': return `<td class="c-code">${code(t)}</td>`;
    case 'title': {
      const title = t.title ? esc(t.title) : '<span class="untitled">Sin título</span>';
      return `<td class="c-title"${ed}><div class="t"><span class="t-text">${title}</span><button class="open" data-open="${t.id}" title="Abrir el panel de la tarea">ABRIR</button></div></td>`;
    }
    case 'status': return `<td${ed}>${pill(STATUS, t.status)}</td>`;
    case 'priority': return `<td${ed}>${pill(PRIORITY, t.priority)}</td>`;
    case 'assignees': return `<td${ed}><span class="people">${people(t.assignees)}</span></td>`;
    case 'project_id': return `<td${ed}>${projectTag(t.project_id)}</td>`;
    case 'due_at': return `<td${ed}>${fmtDue(t.due_at)}</td>`;
    case 'depends_on': return `<td${ed}>${t.depends_on.map(byId).filter(Boolean).map((d) => depChip(d, false, false)).join('')}</td>`;
    case 'created_by': return `<td>${person(t.created_by)}</td>`;
    case 'created_at': return `<td>${fmt(t.created_at)}</td>`;
  }
}

function renderTable() {
  if (state.projects.length) renderSidebar();
  renderTableView();
  renderSelectionBar();
  renderBoard();
  const v = prefs.view;
  document.querySelectorAll('.view-tab').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('#table-view').hidden = v !== 'table';
  $('#board-view').hidden = v !== 'board';
  $('#cols-tool').style.display = v === 'table' ? '' : 'none';
  $('#group-tool').style.display = v === 'board' ? '' : 'none';
}

/* ---------- Tablero (Kanban) ---------- */
/* ---------- Kanban: agrupar por un campo ---------- */
const GROUP_LABEL = { status: 'Estado', assignees: 'Responsable', priority: 'Prioridad' };
// Columnas del Kanban según el campo elegido: [valor, encabezado] (las columnas son neutras; el color va en las tarjetas)
// Encabezado de columna: siempre neutro (el color va en las tarjetas)
const laneHead = (label) => `<span class="tag c-gray">${esc(label)}</span>`;
function boardLanes(g) {
  const stSel = prefs.filters.status || [];
  switch (g) {
    case 'priority': return [...Object.keys(PRIORITY).map((k) => [k, laneHead(PRIORITY[k].label)]), ['', laneHead('Sin prioridad')]];
    case 'assignees': return [...USERS.map((u) => [u.id, person(u.id)]), ['', laneHead('Sin responsable')]];
    case 'created_by': return USERS.map((u) => [u.id, person(u.id)]);
    case 'project_id': return state.projects.filter((p) => !p.archived && (isAllView() || p.id === prefs.project)).map((p) => [String(p.id), projectTag(p.id)]);
    default: return Object.keys(STATUS).filter((k) => !stSel.length || stSel.includes(k)).map((k) => [k, laneHead(STATUS[k].label)]);
  }
}
// Valores de una tarea para el campo de agrupación (una tarea con varios responsables aparece en varias columnas)
function laneValues(t, g) {
  if (g === 'assignees') return t.assignees.length ? t.assignees : [''];
  if (g === 'project_id') return [String(t.project_id)];
  return [t[g] ?? ''];
}
// Cambia el campo de agrupación al mover una tarjeta de una columna a otra
async function moveToLane(t, g, from, to) {
  if (from === to) return;
  if (g === 'status') return setStatus(t, to);
  if (g === 'priority') t.priority = to || null;
  else if (g === 'project_id') t.project_id = Number(to);
  else if (g === 'assignees') {
    const list = to ? [...new Set([...t.assignees.filter((x) => x !== from), to])] : [];
    t.assignees = USERS.map((u) => u.id).filter((x) => list.includes(x));
  } else return; // "Creado por" no se modifica
  await Api.saveTask(t);
}

// Línea bajo el título de la tarjeta: el responsable, o el estado si se agrupa por responsable
function cardMeta(t, g) {
  if (g === 'assignees') return `<div class="card-meta">Estado: ${esc(STATUS[t.status].label)}</div>`;
  return `<div class="card-meta">Responsable: ${esc(assigneeNames(t) || 'Sin responsable')}</div>`;
}

// Color de la tarjeta: el de su prioridad al agrupar por Prioridad; el de su estado en los demás casos
const PRIORITY_CARD = { alta: 'st-todo', media: 'st-wait', baja: 'st-done' };
const cardColor = (t, g) => (g === 'priority' ? PRIORITY_CARD[t.priority] || '' : `st-${t.status}`);

// Columnas en el orden que eligió el usuario (las nuevas, como una persona recién creada, van al final)
function orderedLanes(g) {
  const lanes = boardLanes(g);
  const saved = prefs.laneOrder[g] || [];
  const pos = (k) => { const i = saved.indexOf(k); return i === -1 ? saved.length + lanes.findIndex((l) => l[0] === k) : i; };
  return [...lanes].sort((a, b) => pos(a[0]) - pos(b[0]));
}

function renderBoard() {
  if (!GROUP_LABEL[prefs.groupBy]) prefs.groupBy = 'status'; // opciones antiguas (Proyecto, Creado por) vuelven a Estado
  const g = prefs.groupBy;
  const list = sortedTasks({ manual: true });
  const readOnly = g === 'created_by';
  $('#group-tool').innerHTML = `${TOGGLE_ICON}Propiedades`;
  $('#board-view').innerHTML = orderedLanes(g).map(([k, head]) => {
    const items = list.filter((t) => laneValues(t, g).includes(k));
    return `<div class="lane" data-lane="${esc(k)}">
      <div class="lane-h" draggable="true" title="Arrastra para mover la columna">${head}<span class="n">${items.length}</span></div>
      <div class="cards">${items.map((t) => `
        <div class="card ${cardColor(t, g)}" ${readOnly ? '' : 'draggable="true"'} data-open="${t.id}" data-card="${t.id}">
          <div class="card-title">${t.title ? esc(t.title) : '<span class="untitled">Sin título</span>'}</div>
          ${cardMeta(t, g)}
        </div>`).join('')}</div>
      <div class="new-card" data-new-in="${esc(k)}">＋ Nueva</div>
    </div>`;
  }).join('');
}

function openGroupMenu(anchor) {
  const g = prefs.groupBy || 'status';
  openPopover(anchor, `<div class="title">Agrupar columnas por</div>` + Object.entries(GROUP_LABEL).map(([k, l]) =>
    `<div class="opt" data-group="${k}">${l}<span class="chk">${k === g ? '✓' : ''}</span></div>`).join(''));
  pop().dataset.kind = 'group';
  pop().style.minWidth = '220px';
}

async function setStatus(t, status) {
  if (t.status === status) return;
  const becameDone = status === 'done';
  t.status = status;
  await Api.saveTask(t);
  if (becameDone) { toast(`Tarea ${t.id} completada ✓`); await onTaskCompleted(t); }
}

function renderTableView() {
  const cols = visibleColumns();
  const { key, dir } = prefs.sort;
  $('#colgroup').innerHTML = `<col style="width:${GUTTER}px">` + cols.map((c) => `<col data-w="${c.key}" style="width:${prefs.widths[c.key]}px">`).join('');
  $('#task-table').style.width = `${GUTTER + cols.reduce((n, c) => n + prefs.widths[c.key], 0)}px`;
  $('#thead').innerHTML = `<tr><th class="gutter"></th>${cols.map((c) => `
    <th data-head="${c.key}" data-col="${c.key}" ${c.key === PINNED ? 'data-pinned' : 'draggable="true"'} class="${c.key === key ? 'sorted' : ''} ${(prefs.filters[c.key] || []).length ? 'filtered' : ''}" title="Clic para ordenar o filtrar · arrastra para mover">
      <div class="h">${icon(c.icon)}${c.label}<span class="arrow">${(prefs.filters[c.key] || []).length ? `<span class="funnel">${FUNNEL_ICON}</span>` : ''}${c.key === key ? (dir === 'asc' ? '↑' : '↓') : ''}</span></div>
    </th>`).join('')}</tr>`;
  const shown = sortedTasks();
  $('#rows').innerHTML = shown.length ? '' : `<tr class="no-results"><td></td><td colspan="${cols.length}">${state.tasks.some(inView) ? 'Ninguna tarea coincide con la búsqueda o los filtros' : (isAllView() ? 'No hay tareas en los proyectos en curso' : 'Este proyecto todavía no tiene tareas')}</td></tr>`;
  $('#rows').innerHTML += shown.map((t) =>
    `<tr data-row="${t.id}" class="${state.selected.has(t.id) ? 'selected' : ''}"><td class="gutter"><span class="row-drag" draggable="true" data-drag-row="${t.id}" title="Arrastra para mover la tarea">⋮⋮</span><button class="row-del" data-del-task="${t.id}" title="Eliminar tarea">${icon('trash')}</button></td>${cols.map((c) => cell(c, t)).join('')}</tr>`).join('');
  const total = state.tasks.filter(inView).length;
  $('#count').textContent = isFiltering() ? `${shown.length} de ${total}` : total;
  renderFilterBar();
  $('#sort-tool').classList.toggle('on', !!key);
  $('#sort-tool').hidden = !key;
  $('#sort-tool').innerHTML = key
    ? `${SORT_ICON} ${COLUMNS.find((c) => c.key === key).label} ${dir === 'asc' ? '↑' : '↓'}`
    : '';
  requestAnimationFrame(placeResizeGuides); // después de que la tabla se muestre (al volver del Kanban)
}

// Bordes para cambiar el ancho: una franja por columna que cubre todo el alto de la tabla
function placeResizeGuides() {
  const wrap = $('.table-wrap'), table = $('#task-table');
  let box = $('#col-guides');
  if (!box) { box = document.createElement('div'); box.id = 'col-guides'; wrap.appendChild(box); }
  box.innerHTML = [...$('#thead').querySelectorAll('th[data-col]:not([data-pinned])')].map((th) =>
    `<span class="col-resize" data-resize="${th.dataset.col}" title="Arrastra para cambiar el ancho · doble clic para restablecer"
      style="left:${table.offsetLeft + th.offsetLeft + th.offsetWidth - 4}px;top:${table.offsetTop}px;height:${table.offsetHeight}px"></span>`).join('');
}
window.addEventListener('resize', () => { if (prefs.view === 'table') placeResizeGuides(); });

function applySort(key) {
  // Primer clic: ascendente (A→Z, 0→9). Clics siguientes: invierte el orden.
  const s = prefs.sort;
  prefs.sort = s.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' };
  savePrefs();
  renderTable();
}

/* ---------- Menú del encabezado ---------- */
function openHeaderMenu(anchor, key) {
  const col = COLUMNS.find((c) => c.key === key);
  const s = prefs.sort;
  const sortLabel = s.key !== key ? '' : s.dir === 'asc' ? '<span class="hint-r">A → Z ↑</span>' : '<span class="hint-r">Z → A ↓</span>';
  const nFilter = (prefs.filters[key] || []).length;
  openPopover(anchor, `
    <div class="title">${col.label}</div>
    <div class="opt" data-hm-sort="${key}">${SORT_ICON}${s.key === key ? 'Invertir orden' : 'Ordenar'} ${sortLabel}</div>
    ${FILTERS[key] ? `<div class="opt" data-hm-filter="${key}">${FUNNEL_ICON}Filtro ${nFilter ? `<span class="hint-r">${nFilter} seleccionado${nFilter > 1 ? 's' : ''}</span>` : ''}</div>` : ''}
    ${s.key === key ? '<div class="opt muted-opt" data-hm-unsort>✕&nbsp; Quitar orden</div>' : ''}`);
  pop().dataset.kind = 'head';
  pop().style.minWidth = '220px';
}

function openFilter(anchor, key) {
  const col = COLUMNS.find((c) => c.key === key);
  openPopover(anchor, `
    <div class="title">${col.label} es</div>
    <input class="search" id="flt-search" placeholder="Seleccionar una o varias opciones…" autocomplete="off">
    <div class="opts" id="flt-opts"></div>
    <div id="flt-foot"></div>`);
  pop().dataset.kind = 'filter';
  pop().dataset.key = key;
  pop().style.minWidth = '260px';
  renderFilterOpts();
  const inp = $('#flt-search');
  inp.oninput = renderFilterOpts;
  inp.focus();
}

function renderFilterOpts() {
  const key = pop().dataset.key;
  const f = FILTERS[key];
  const sel = prefs.filters[key] || [];
  const q = norm($('#flt-search').value);
  const opts = f.options().filter((v) => norm(f.text(v)).includes(q));
  $('#flt-opts').innerHTML = opts.map((v) => `
    <div class="opt" data-flt-val="${esc(v)}"><span class="cb ${sel.includes(v) ? 'on' : ''}"></span>${f.show(v)}</div>`).join('')
    || '<div class="title">Sin opciones</div>';
  $('#flt-foot').innerHTML = sel.length ? '<div class="opt muted-opt" data-flt-clear>✕&nbsp; Quitar filtro</div>' : '';
}

function setFilter(key, values) {
  if (values.length) prefs.filters[key] = values; else delete prefs.filters[key];
  savePrefs();
  renderTable();
}

function renderFilterBar() {
  const af = activeFilters();
  const bar = $('#filter-bar');
  bar.hidden = !af.length;
  bar.innerHTML = af.map(([k, sel]) => {
    const col = COLUMNS.find((c) => c.key === k);
    const txt = sel.map((v) => FILTERS[k].text(v)).join(', ');
    return `<span class="fchip"><button class="fchip-b" data-fchip="${k}">${col.label}: <b>${esc(txt)}</b> ▾</button><button class="fchip-x" data-fclear="${k}" title="Quitar filtro">×</button></span>`;
  }).join('') + (af.length > 1 ? '<button class="mini" data-fclear-all>Quitar todos</button>' : '');
}

/* ============================================================
 *  Panel de la tarea
 * ============================================================ */
const blobUrls = new Map();
const urlFor = (a) => {
  if (a.url) return a.url; // modo compartido: enlace temporal de Supabase Storage
  if (!blobUrls.has(a.id)) blobUrls.set(a.id, URL.createObjectURL(a.blob));
  return blobUrls.get(a.id);
};

function extStyle(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const c = 'var(--hover-2)'; // sin color por tipo: el color queda reservado para los estados
  return { label: (ext || 'file').slice(0, 4).toUpperCase(), color: c };
}

function prop(iconName, label, value, editable = false) {
  return `<div class="p-label">${icon(iconName)}${label}</div><div class="p-val ${editable ? 'editable' : ''}">${value}</div>`;
}

function pickSelect(field, map, value, allowEmpty) {
  const shown = value ? pill(map, value) : '<span class="empty">Vacío</span>';
  const opts = (allowEmpty ? '<option value="">Vacío</option>' : '') +
    Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${v.label}</option>`).join('');
  return `<span class="pick">${shown}<select data-field="${field}">${opts}</select></span>`;
}
function pickUsers(ids) {
  return `<span class="people">${(ids || []).filter(user).map((id) =>
    `<span class="tag c-gray person">${esc(userName(id))}<button class="tag-x" data-remove-user="${id}" title="Quitar">×</button></span>`).join('')}</span>` +
    `<button class="mini" id="add-user">${(ids || []).length ? '+' : 'Vacío'}</button>`;
}

// Sección desplegable del panel: triangulito + título; se recuerda cuáles están plegadas
const CHEV = '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';
function psec(key, title, body, extra = '') {
  const closed = (prefs.panelClosed || []).includes(key);
  return `<div class="psec ${closed ? 'closed' : ''}" data-psec="${key}">
    <div class="section-h first psec-h"><button class="psec-toggle" data-ptoggle="${key}">${CHEV}${title}</button>${extra}</div>
    <div class="psec-body">${body}</div>
  </div>`;
}

function renderPanel() {
  const t = byId(state.openId);
  if (!t) return;
  const overlay = $('#overlay');
  const scroll = overlay.scrollTop;
  const deps = t.depends_on.map(byId).filter(Boolean);
  const files = state.attachments;
  const me = user(CURRENT_USER);

  $('#modal-body').innerHTML = `
    <div class="m-code">ID ${code(t)}</div>
    <textarea class="m-title" id="f-title" rows="1" placeholder="Sin título"></textarea>

    ${psec('fields', 'Campos', `
    <div class="props">
      ${prop('status', 'Estado', pickSelect('status', STATUS, t.status, false), true)}
      ${prop('person', 'Responsable', pickUsers(t.assignees), true)}
      ${prop('select', 'Prioridad', pickSelect('priority', PRIORITY, t.priority, true), true)}
      ${prop('cal', 'Fecha límite', `<button class="pick-btn" id="pick-due">${t.due_at ? fmtDue(t.due_at) : '<span class="empty">Sin definir</span>'}</button>`, true)}
      ${prop('select', 'Proyecto', `<button class="pick-btn" id="pick-project">${projectTag(t.project_id) || EMPTY}</button>`, true)}
      ${prop('link', 'Depende de', deps.map((d) => depChip(d, true)).join('') +
        `<button class="mini add-dep" id="add-dep">${deps.length ? '+' : 'Vacío'}</button>`, true)}
      ${prop('link', 'Condiciona a', blocking(t).map((d) => depChip(d, true, true, true)).join('') +
        `<button class="mini add-dep" id="add-rdep">${blocking(t).length ? '+' : 'Vacío'}</button>`, true)}
      ${prop('person', 'Creado por', person(t.created_by))}
      ${prop('clock', 'Fecha de creación', `<span class="ro">${fmt(t.created_at)}</span>`)}
    </div>`)}

    <div class="divider"></div>
    ${psec('comments', 'Comentarios', `
    <div class="comments">
      ${state.comments.map((c) => `
        <div class="comment">
          <div class="c-main"><div><span class="who">${esc(userName(c.author))}</span><span class="when">${fmt(c.created_at)}</span></div>
          <div class="body">${esc(c.body)}</div></div>
          ${c.author === CURRENT_USER ? `<button class="c-del" data-del-comment="${c.id}" title="Eliminar comentario">×</button>` : ''}
        </div>`).join('')}
    </div>
    <div class="comment-new"><span class="tag c-gray person">${esc(me.name)}</span><input id="f-comment" placeholder="Agregar un comentario… (Enter para enviar)"></div>`)}

    <div class="divider"></div>
    ${psec('desc', 'Descripción', `
    <textarea class="desc" id="f-desc" placeholder="Escribe aquí los detalles de la tarea…"></textarea>`)}

    <div class="divider"></div>
    ${psec('files', 'Archivos adjuntos', `
    ${files.length ? `<div class="files">${files.map((a) => {
      const e = extStyle(a.name);
      const img = (a.type || '').startsWith('image/');
      return `<a class="file" href="${urlFor(a)}" download="${esc(a.name)}" ${img ? `data-photo="${a.id}" title="Ver imagen"` : 'title="Descargar"'}>
        ${img ? `<img class="thumb" src="${urlFor(a)}" alt="">` : `<div class="ext" style="background:${e.color}">${e.label}</div>`}
        <div class="name">${esc(a.name)}</div>
        <div class="meta">${fmtSize(a.size)} · ${esc(userName(a.uploaded_by) || '')}</div>
        <button class="x" data-del-att="${a.id}" title="Eliminar">×</button></a>`;
    }).join('')}</div>` : '<div class="nothing">Sin archivos</div>'}`, `<label class="add attach-btn" title="Adjuntar archivos">${CLIP_ICON}<input type="file" id="up-file" multiple hidden></label>`)}

  `;

  // Valores de texto (se asignan por JS para no tener problemas con caracteres especiales)
  $('#f-title').value = t.title;
  $('#f-desc').value = t.description;
  autoGrow($('#f-title'));
  autoGrow($('#f-desc'));
  overlay.scrollTop = scroll;
}

function autoGrow(el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }

// Historial del panel: al ir de una tarea a otra (enlaces del panel) se puede volver con la flecha
const panelHistory = [];
function updateBackBtn() {
  while (panelHistory.length && !byId(panelHistory[panelHistory.length - 1])) panelHistory.pop();
  $('#panel-back').hidden = !panelHistory.length;
}

async function openTask(id, { back = false } = {}) {
  if (state.openId && state.openId !== id && !back) panelHistory.push(state.openId);
  if (state.openId !== id) {
    closePopover();
    revokeUrls();
  }
  state.openId = id;
  state.addingTime = false;
  [state.comments, state.attachments] = await Promise.all([Api.listComments(id), Api.listAttachments(id)]);
  state.comments.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  $('#overlay').classList.add('open');
  renderPanel();
  $('#overlay').scrollTop = 0; // cada tarea se abre desde arriba
  resetDeleteBtn();
  updateBackBtn();
}

function closeTask() {
  panelHistory.length = 0;
  $('#overlay').classList.remove('open');
  closePopover();
  state.openId = null;
  revokeUrls();
}
function revokeUrls() { blobUrls.forEach((u) => URL.revokeObjectURL(u)); blobUrls.clear(); }

async function updateTask(patch, { rerenderPanel = true } = {}) {
  const t = byId(state.openId);
  const { status, ...rest } = patch;
  Object.assign(t, rest);
  await Api.saveTask(t);
  if (status !== undefined) await setStatus(t, status);
  renderTable();
  if (rerenderPanel) renderPanel();
}

/* ---------- Adjuntos ---------- */
async function addFiles(fileList) {
  const t = byId(state.openId);
  if (!t || !fileList.length) return;
  for (const f of fileList) await Api.addAttachment(t.id, f, 'file', CURRENT_USER);
  state.attachments = await Api.listAttachments(t.id);
  renderPanel();
  toast(fileList.length === 1 ? 'Archivo agregado' : `${fileList.length} archivos agregados`);
}

/* ---------- Popover (dependencias y propiedades visibles) ---------- */
const pop = () => $('#popover');
// Los menús se posicionan junto a su ancla y siempre dentro de la ventana.
// Se recalcula después de que quien lo abre ajusta el ancho, y cuando cambia el contenido o el tamaño.
let popAnchorRect = null;
function placePopover() {
  const el = pop();
  if (!el.classList.contains('open') || !popAnchorRect) return;
  const r = popAnchorRect, M = 8;
  el.style.maxHeight = '';
  const w = Math.min(el.offsetWidth, innerWidth - 2 * M);
  const below = innerHeight - r.bottom - M - 4, above = r.top - M - 4;
  let h = el.offsetHeight;
  const goUp = h > below && above > below;
  const room = goUp ? above : below;
  if (h > room) { el.style.maxHeight = `${room}px`; h = room; }
  el.style.left = `${Math.max(M, Math.min(r.left, innerWidth - w - M))}px`;
  el.style.top = `${goUp ? r.top - h - 4 : r.bottom + 4}px`;
}
function openPopover(anchor, html) {
  const el = pop();
  el.style.maxWidth = '';
  el.style.minWidth = '';
  delete el.dataset.bulk;
  el.innerHTML = html;
  el.classList.add('open');
  popAnchorRect = anchor.getBoundingClientRect();
  placePopover();
  requestAnimationFrame(placePopover); // tras ajustar minWidth/maxWidth
}
new ResizeObserver(() => placePopover()).observe(pop());
window.addEventListener('resize', placePopover);
function closePopover() { pop().classList.remove('open'); pop().dataset.kind = ''; }

// reverse = false: "Depende de" (tareas de las que depende esta)
// reverse = true:  "Condiciona a" (tareas que dependen de esta). Es la misma relación vista desde el otro lado.
function openDepPicker(anchor, taskId = state.openId, reverse = false) {
  const t = byId(taskId);
  const candidates = () => state.tasks
    .filter((x) => x.id !== t.id && (reverse
      ? !x.depends_on.includes(t.id) && !dependsOn(t, x.id)
      : !t.depends_on.includes(x.id) && !dependsOn(x, t.id)))
    .sort((a, b) => a.id - b.id);
  // Búsqueda por ID ("3", "#3", "id 3") o por título; el ID exacto aparece primero
  const list = (q) => {
    const raw = q.trim();
    const idq = (raw.match(/^(?:id\s*|#)?(\d+)$/i) || [])[1];
    const items = candidates().filter((x) => (idq && String(x.id).startsWith(idq)) || norm(x.title).includes(norm(raw)))
      .sort((a, b) => (idq ? (String(b.id) === idq) - (String(a.id) === idq) : 0) || a.id - b.id);
    return items.length ? items.map((x) => `
      <div class="opt dep-opt" ${reverse ? 'data-add-rdep' : 'data-add-dep'}="${x.id}"><span class="code">${code(x)}</span><span class="ttl">${esc(x.title || 'Sin título')}</span>
      <span class="dep-status">${pill(STATUS, x.status)}</span></div>`).join('')
      : '<div class="title">No hay tareas disponibles</div>';
  };
  const current = reverse ? blocking(t) : t.depends_on.map(byId).filter(Boolean);
  openPopover(anchor, `<div class="title">${reverse ? 'Esta tarea condiciona a…' : 'Esta tarea depende de…'}</div>
    ${current.length ? `<div class="pop-current">${current.map((d) =>
      `<span class="tag c-gray person">${code(d)} · ${esc(d.title || 'Sin título')}<button class="tag-x" ${reverse ? 'data-pop-rm-rdep' : 'data-pop-rm-dep'}="${d.id}" title="Quitar">×</button></span>`).join('')}</div>` : ''}
    <input class="search" id="dep-search" placeholder="Buscar por ID o título">
    <div class="opts" id="dep-opts">${list('')}</div>`);
  pop().dataset.kind = 'deps';
  pop().dataset.task = t.id;
  pop().style.minWidth = '420px';
  pop().style.maxWidth = '460px';
  const s = $('#dep-search');
  s.focus();
  s.oninput = () => { $('#dep-opts').innerHTML = list(s.value); };
}

// Fila "Crear «texto»" cuando lo escrito no coincide exactamente con una opción
const createRow = (attr, q, names) => {
  const name = q.trim();
  if (!name || names.some((n) => norm(n) === norm(name))) return '';
  return `<div class="opt create-opt" data-${attr}="${esc(name)}">Crear <span class="tag c-gray">${esc(name)}</span></div>`;
};

function renderUserOpts() {
  const targets = popTargets();
  const t = { assignees: USERS.map((u) => u.id).filter((id) => targets.length && targets.every((x) => x.assignees.includes(id))) };
  const q = $('#um-search').value;
  const list = USERS.filter((u) => norm(u.name).includes(norm(q.trim())));
  $('#um-opts').innerHTML = list.map((u) => `
    <div class="opt" data-toggle-user="${u.id}"><span class="cb ${t.assignees.includes(u.id) ? 'on' : ''}"></span><span class="tag c-gray person">${esc(u.name)}</span>
      <button class="opt-edit" data-edit-user="${u.id}" title="Cambiar nombre o eliminar">${PENCIL_ICON}</button></div>`).join('') +
    createRow('create-user', q, USERS.map((u) => u.name)) ||
    '<div class="title">Escribe un nombre para crear una persona</div>';
}
const usersListHtml = () => `<div class="title">Responsables</div>
    <input class="search" id="um-search" placeholder="Busca o crea una persona…" autocomplete="off">
    <div class="opts" id="um-opts"></div>`;
function showUsersList() {
  pop().innerHTML = usersListHtml();
  delete pop().dataset.editing;
  renderUserOpts();
  $('#um-search').oninput = renderUserOpts;
  $('#um-search').focus();
}
function openUsersMenu(anchor, taskId = state.openId) {
  openPopover(anchor, usersListHtml());
  Object.assign(pop().dataset, { kind: 'users', task: taskId });
  pop().style.minWidth = '260px';
  showUsersList();
}

// Vista de edición de una persona dentro del mismo menú: cambiar nombre o eliminar
function showPersonEdit(id) {
  const u = user(id);
  pop().dataset.editing = id;
  pop().innerHTML = `
    <div class="pe-head"><button class="mini pe-back" data-pe-back title="Volver">←</button><span>Editar persona</span></div>
    <input class="search" id="pe-name" autocomplete="off" placeholder="Nombre">
    <div class="pe-hint">Enter para guardar · Esc para volver</div>
    <div class="pop-sep"></div>
    <div class="opt logout-opt" data-pe-delete="${id}">Eliminar persona</div>`;
  $('#pe-name').value = u.name;
  $('#pe-name').focus();
  $('#pe-name').select();
}
async function savePersonName() {
  const id = pop().dataset.editing;
  const name = $('#pe-name').value.replace(/\s+/g, ' ').trim();
  if (!name) { toast('El nombre no puede quedar vacío'); return; }
  if (USERS.some((u) => u.id !== id && norm(u.name) === norm(name))) { toast(`Ya existe una persona llamada ${name}`); return; }
  if (name !== user(id).name) {
    await Api.renamePerson(id, name);
    await loadPeople();
    renderAccount();
    renderTable();
    if (state.openId) renderPanel();
    toast('Nombre actualizado');
  }
  showUsersList();
}
function confirmDeletePerson(id) {
  if (id === CURRENT_USER) { toast('No puedes eliminar tu propia cuenta'); return; }
  const u = user(id);
  const n = state.tasks.filter((t) => t.assignees.includes(id)).length;
  closePopover();
  showConfirm({
    title: `¿Eliminar a «${esc(u.name)}»?`,
    body: `${n ? `Se quitará como responsable de <b>${n} tarea${n > 1 ? 's' : ''}</b>.` : 'No es responsable de ninguna tarea.'}
      Su nombre se mantiene en la bitácora y en los comentarios.${UNDO_HINT()}`,
    ok: 'Eliminar persona',
    onOk: async () => {
      await Api.deletePerson(id);
      await loadPeople();
      state.tasks = await Api.listTasks();
      prefs.filters.assignees = (prefs.filters.assignees || []).filter((x) => x !== id);
      savePrefs();
      renderTable();
      if (state.openId) renderPanel();
      toast(`${u.name} eliminado`);
    },
  });
}

/* ---------- Selección múltiple (Ctrl/⌘ + clic en las filas) ---------- */
function toggleSelect(id) {
  if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
  renderTable();
}
function clearSelection() {
  if (!state.selected.size) return;
  state.selected.clear();
  renderTable();
}
function renderSelectionBar() {
  // Solo cuentan las seleccionadas que siguen visibles
  const visible = new Set(sortedTasks().map((t) => t.id));
  for (const id of [...state.selected]) if (!byId(id) || !visible.has(id) || prefs.view !== 'table') state.selected.delete(id);
  const n = state.selected.size;
  const bar = $('#sel-bar');
  bar.hidden = !n;
  if (!n) return;
  bar.innerHTML = `<span class="sel-n">${n} seleccionada${n > 1 ? 's' : ''}</span>
    <button data-bulk="status">Estado</button>
    <button data-bulk="assignees">Responsable</button>
    <button data-bulk="priority">Prioridad</button>
    <button data-bulk="due_at">Fecha límite</button>
    <button data-bulk="project_id">Proyecto</button>
    <button data-bulk="delete" class="sel-del">Eliminar</button>
    <button data-bulk="clear" class="sel-x" title="Quitar selección (Esc)">✕</button>`;
}
function openBulk(anchor, field) {
  const first = [...state.selected][0];
  if (field === 'assignees') openUsersMenu(anchor, first);
  else if (field === 'due_at') openCellDate(anchor, first);
  else openCellSelect(anchor, first, field);
  pop().dataset.bulk = '1';
  if (field === 'assignees') renderUserOpts();
  if (field === 'due_at') renderDatePop();
}

/* ---------- Edición directa en la tabla ---------- */
const popTask = () => byId(Number(pop().dataset.task));
// Tareas sobre las que actúa el menú abierto: una sola, o todas las seleccionadas (selección múltiple)
const popTargets = () => (pop().dataset.bulk ? [...state.selected].map(byId).filter(Boolean) : [popTask()].filter(Boolean));
function refreshTask(id) {
  renderTable();
  if (state.openId === id) renderPanel();
}

function openCellSelect(anchor, taskId, field) {
  const t = byId(taskId);
  let opts = [];
  if (field === 'status') opts = Object.keys(STATUS).map((k) => [k, laneHead(STATUS[k].label)]);
  if (field === 'priority') opts = [...Object.keys(PRIORITY).map((k) => [k, pill(PRIORITY, k)]), ['', EMPTY]];
  if (field === 'project_id') opts = state.projects.filter((p) => !p.archived || p.id === t.project_id).map((p) => [String(p.id), projectTag(p.id)]);
  const cur = String(t[field] ?? '');
  const optsHtml = (q = '') => opts
    .filter(([v]) => field !== 'project_id' || norm(projectName(v)).includes(norm(q.trim())))
    .map(([v, h]) => `<div class="opt" data-set-val="${esc(v)}">${h}<span class="chk">${v === cur ? '✓' : ''}</span></div>`).join('') +
    (field === 'project_id' ? createRow('create-project', q, state.projects.map((p) => p.name)) : '');
  openPopover(anchor, (field === 'project_id'
    ? '<input class="search" id="cs-search" placeholder="Busca o crea un proyecto…" autocomplete="off">' : '') +
    `<div class="opts" id="cs-opts">${optsHtml()}</div>`);
  Object.assign(pop().dataset, { kind: 'cellselect', task: taskId, field });
  pop().style.minWidth = '240px';
  if (field === 'project_id') {
    $('#cs-search').oninput = () => { $('#cs-opts').innerHTML = optsHtml($('#cs-search').value); };
    $('#cs-search').focus();
  }
}

/* ---------- Selector de fecha límite: fecha arriba, hora abajo ---------- */
function openCellDate(anchor, taskId) {
  openPopover(anchor, '<div class="title">Fecha límite</div><div id="pd-body"></div>');
  Object.assign(pop().dataset, { kind: 'date', task: taskId });
  pop().style.minWidth = '260px';
  renderDatePop();
}

function renderDatePop() {
  const targets = popTargets();
  const same = targets.every((x) => x.due_at === targets[0].due_at);
  const t = { due_at: same && targets[0] ? targets[0].due_at : null };
  const date = t.due_at ? t.due_at.split('T')[0] : '';
  const time = hasTime(t.due_at) ? t.due_at.split('T')[1] : '';
  const row = (ico, kind, value, enabled, label) => `
    <div class="dp-row ${enabled ? '' : 'disabled'}">
      <span class="dp-ico">${icon(ico)}</span>
      ${value
        ? `<input type="${kind}" id="pd-${kind}" value="${value}">
           <button class="dp-x" data-pd-clear="${kind}" title="Quitar ${label}">×</button>`
        : `<button class="dp-undef" data-pd-set="${kind}" ${enabled ? '' : 'disabled title="Primero define una fecha"'}>Sin definir</button>`}
    </div>`;
  $('#pd-body').innerHTML = row('cal', 'date', date, true, 'fecha') + row('clock', 'time', time, !!date, 'hora');
}

// Muestra el campo y abre el selector nativo del navegador
function startDateInput(kind) {
  const btn = pop().querySelector(`[data-pd-set="${kind}"]`);
  const inp = document.createElement('input');
  inp.type = kind;
  inp.id = `pd-${kind}`;
  btn.replaceWith(inp);
  inp.focus();
  try { inp.showPicker(); } catch {}
  inp.addEventListener('blur', () => setTimeout(() => {
    if (pop().dataset.kind === 'date' && !inp.value && document.activeElement !== inp) renderDatePop();
  }, 150));
}

async function saveCellDate() {
  const targets = popTargets();
  const t = targets[0];
  const d = $('#pd-date') ? $('#pd-date').value : '';
  const tm = $('#pd-time') ? $('#pd-time').value : (hasTime(t.due_at) ? t.due_at.split('T')[1] : '');
  const before = [!!t.due_at, hasTime(t.due_at)];
  for (const x of targets) { x.due_at = d ? d + (tm ? `T${tm}` : '') : null; await Api.saveTask(x); }
  refreshTask(t.id);
  // Solo se redibuja si cambia qué filas tienen valor (así no se interrumpe la escritura)
  if (before[0] !== !!t.due_at || before[1] !== hasTime(t.due_at)) renderDatePop();
}

function editTitle(td, taskId) {
  const t = byId(taskId);
  const span = td.querySelector('.t-text');
  span.innerHTML = '<input class="cell-input" id="cell-title" placeholder="Sin título">';
  const inp = $('#cell-title');
  inp.value = t.title;
  inp.focus();
  inp.setSelectionRange(inp.value.length, inp.value.length);
  let done = false;
  const finish = async (save) => {
    if (done) return;
    done = true;
    if (save && inp.value.trim() !== t.title) {
      t.title = inp.value.trim();
      await Api.saveTask(t);
    }
    refreshTask(t.id);
  };
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
}

function editCell(td) {
  const id = Number(td.closest('tr').dataset.row);
  const key = td.dataset.cell;
  if (key === 'title') return editTitle(td, id);
  if (['status', 'priority', 'project_id'].includes(key)) return openCellSelect(td, id, key);
  if (key === 'assignees') return openUsersMenu(td, id);
  if (key === 'due_at') return openCellDate(td, id);
  if (key === 'depends_on') return openDepPicker(td, id);
}

function openColumnsMenu(anchor) {
  const render = () => `<div class="title">Propiedades visibles en la tabla</div>` +
    orderedColumns().filter((c) => !c.fixed).map((c) => isForcedColumn(c.key)
      ? `<div class="opt locked" title="En «Mostrar todos» la columna Proyecto siempre se muestra">${icon(c.icon)}${c.label}
          <span class="switch on locked"></span></div>`
      : `<div class="opt" data-toggle-col="${c.key}">${icon(c.icon)}${c.label}
        <span class="switch ${prefs.hidden.includes(c.key) ? '' : 'on'}"></span></div>`).join('');
  openPopover(anchor, render());
  pop().dataset.kind = 'cols';
  pop().style.minWidth = '260px';
}

/* ---------- Toast ---------- */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------- Eliminar tarea (confirmación en dos clics) ---------- */
let deleteArmed = false;
function resetDeleteBtn() {
  deleteArmed = false;
  $('#delete-task').innerHTML = `${icon('trash')}`;
  $('#delete-task').classList.remove('danger');
}

// Crea una tarea en el proyecto actual y abre su panel con el título listo para escribir
async function createNewTask(extra = {}) {
  const project_id = isAllView() ? (state.projects.find((p) => !p.archived) || state.projects[0]).id : prefs.project;
  const t = await Api.createTask({ project_id, created_by: CURRENT_USER, assignees: [CURRENT_USER], status: 'todo', ...extra });
  state.tasks.push(t);
  renderTable();
  await openTask(t.id);
  $('#f-title').focus();
}

async function deleteTask(id, quiet = false) {
  const t = byId(id);
  const dependents = blocking(t);
  await Api.deleteTask(id);
  state.tasks = await Api.listTasks();
  for (const d of dependents) await releaseIfFree(byId(d.id), true);
  if (state.openId === id) closeTask();
  if (quiet) return;
  renderTable();
  toast(`Tarea ${t.id} eliminada`);
}

/* ---------- Proyectos (barra lateral) ---------- */
const TRASH_ICON = '<svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.25h11M6.25 4.25V2.75h3.5v1.5M3.75 4.25l.6 8.6a1 1 0 0 0 1 .9h5.3a1 1 0 0 0 1-.9l.6-8.6M6.75 7v4M9.25 7v4"/></svg>';
const ARCHIVE_ICON = '<svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1.75" y="2.5" width="12.5" height="3.25" rx="1"/><path d="M2.75 5.75v6.75a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1V5.75M6.5 8.5h3"/></svg>';
function renderSidebar() {
  const item = (p) => `
    <div class="side-item proj ${p.id === prefs.project ? 'active' : ''}" data-project="${p.id}" draggable="true">
      <span class="proj-name">${esc(p.name)}</span>
      <button class="proj-archive" data-archive="${p.id}" title="${p.archived ? 'Desarchivar proyecto' : 'Archivar proyecto'}">${ARCHIVE_ICON}</button>
      <button class="proj-archive proj-delete" data-delete-project="${p.id}" title="Eliminar proyecto">${TRASH_ICON}</button>
    </div>`;
  const active = state.projects.filter((p) => !p.archived);
  const archived = state.projects.filter((p) => p.archived);
  $('#project-list').innerHTML = active.map(item).join('') +
    `<div class="side-item proj show-all ${isAllView() ? 'active' : ''}" data-show-all><span class="proj-name">Mostrar todos</span></div>`;
  $('#archived-list').innerHTML = archived.map(item).join('') || '<div class="side-empty">Ninguno</div>';
  const current = projectById(prefs.project);
  document.querySelectorAll('[data-section]').forEach((h) => h.classList.toggle('open', prefs.openSections.includes(h.dataset.section)));
  document.querySelectorAll('[data-body]').forEach((b) => { b.hidden = !prefs.openSections.includes(b.dataset.body); });
  const title = isAllView() ? 'Proyectos en curso' : current ? current.name : '';
  if (!$('#page-title').isContentEditable) $('#page-title').textContent = title;
  $('#page-title').classList.toggle('static', isAllView());
  document.title = title ? `${title} · BOVE` : 'BOVE';
}

function selectProject(id) {
  if (state.openId) closeTask();
  prefs.project = id;
  savePrefs();
  renderSidebar();
  renderTable();
}

/* ---------- Eliminar proyecto (con confirmación) ---------- */
/* ---------- Ventana de confirmación genérica ---------- */
let confirmAction = null;
function showConfirm({ title, body, ok, onOk }) {
  confirmAction = onOk;
  $('#confirm-body').innerHTML = `
    <h3>${title}</h3>
    <p>${body}</p>
    <div class="confirm-actions">
      <button class="btn-cancel" data-confirm-cancel>Cancelar</button>
      <button class="btn-danger" data-confirm-ok>${ok}</button>
    </div>`;
  $('#confirm').classList.add('open');
  $('[data-confirm-cancel]').focus();
}

function confirmDeleteProject(id) {
  const p = projectById(id);
  if (state.projects.length === 1) { toast('Debe quedar al menos un proyecto'); return; }
  const n = state.tasks.filter((t) => t.project_id === p.id).length;
  showConfirm({
    title: `¿Eliminar el proyecto «${esc(p.name)}»?`,
    body: `${n ? `Se eliminarán también sus <b>${n} tarea${n > 1 ? 's' : ''}</b>, con sus comentarios y archivos adjuntos.` : 'El proyecto no tiene tareas.'} Esta acción no se puede deshacer.`,
    ok: 'Eliminar proyecto',
    onOk: () => deleteProject(p.id),
  });
}
const closeConfirm = () => $('#confirm').classList.remove('open');

async function deleteProject(id) {
  const p = projectById(id);
  const removed = state.tasks.filter((t) => t.project_id === id).map((t) => t.id);
  // Tareas de otros proyectos que dependían de las que se eliminan
  const affected = state.tasks.filter((t) => t.project_id !== id && t.depends_on.some((d) => removed.includes(d)));
  await Api.deleteProject(id);
  state.projects = await Api.listProjects();
  state.tasks = await Api.listTasks();
  for (const t of affected) await releaseIfFree(byId(t.id), true);
  if (state.openId && removed.includes(state.openId)) closeTask();
  if (prefs.project === id) {
    prefs.project = (state.projects.find((x) => !x.archived) || state.projects[0]).id;
    savePrefs();
  }
  closeConfirm();
  renderTable();
  toast(`Proyecto ${p.name} eliminado`);
}

/* ---------- Diálogo genérico (Configuración, Atajos) ---------- */
function openDialog(title, html) {
  $('#dialog-body').classList.remove('wide');
  $('#dialog-body').onclick = null;
  $('#dialog-body').innerHTML = `
    <div class="dlg-head"><h3>${title}</h3><button class="icon-btn" data-dialog-close title="Cerrar (Esc)">✕</button></div>
    <div class="dlg-content">${html}</div>`;
  $('#dialog').classList.add('open');
}
const closeDialog = () => $('#dialog').classList.remove('open');

/* ---------- Cuenta ---------- */
function openAccountMenu(anchor) {
  openPopover(anchor, `
    <div class="title">${esc(userName(CURRENT_USER))}</div>
    <div class="opt" data-account="settings">Configuración</div>
    <div class="opt" data-account="log">Bitácora</div>
    <div class="opt" data-account="shortcuts">Atajos de teclado</div>
    <div class="pop-sep"></div>
    <div class="opt logout-opt" data-account="logout">Salir de la cuenta</div>`);
  pop().dataset.kind = 'account';
  pop().style.minWidth = '220px';
}

function openSettings() {
  openDialog('Configuración', `
    <div class="set-sec">
      <div class="set-txt"><b>Descargar respaldo</b><span>Guarda en un archivo todos los proyectos, tareas, comentarios y archivos adjuntos.</span></div>
      <button class="btn-cancel" id="export-data">Descargar</button>
    </div>
    <div class="set-sec">
      <div class="set-txt"><b>Restaurar respaldo</b><span>Reemplaza todos los datos actuales por los de un archivo de respaldo.</span></div>
      <label class="btn-cancel">Elegir archivo<input type="file" id="import-data" accept=".json,application/json" hidden></label>
    </div>
    ${SHARED() ? '' : `    <div class="set-sec">
      <div class="set-txt"><b>Datos de ejemplo</b><span>Borra todo y vuelve a cargar los proyectos y tareas de ejemplo.</span></div>
      <button class="btn-cancel danger-text" id="reset-data">Restablecer datos de ejemplo</button>
    </div>`}`);
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
function openShortcuts() {
  const k = (...keys) => keys.map((x) => `<kbd>${x}</kbd>`).join(' ');
  const rows = [
    [k('N'), 'Crear una tarea en el proyecto actual'],
    [k('X'), 'Alternar entre Tabla y Kanban'],
    [`${k(IS_MAC ? '⌘' : 'Ctrl')} + clic`, 'Selección múltiple: elige varias filas para cambiar un campo a todas a la vez'],
  ];
  openDialog('Atajos de teclado', `<table class="kbd-table">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`);
}

/* ---------- Bitácora ---------- */
const FIELD_LABEL = { title: 'el título', status: 'el estado', priority: 'la prioridad', assignees: 'los responsables',
  project_id: 'el proyecto', due_at: 'la fecha límite', depends_on: 'las dependencias', description: 'la descripción' };
let activityFilter = 'all';

function fmtValue(field, v, entry) {
  const none = '<span class="empty">Sin definir</span>';
  switch (field) {
    case 'status': return v && STATUS[v] ? pill(STATUS, v) : none;
    case 'priority': return v && PRIORITY[v] ? pill(PRIORITY, v) : none;
    case 'assignees': return (v || []).length ? v.map((id) => `<span class="tag c-gray">${esc(userName(id) || id)}</span>`).join(' ') : none;
    case 'due_at': return v ? esc(fmtDue(v)) : none;
    case 'depends_on': return (v || []).length ? v.map((id) => `<span class="tag c-gray">${id}</span>`).join(' ') : none;
    case 'project_id': return `<span class="tag c-gray">${esc((entry.extra || {})[v === entry.from ? 'from' : 'to'] || 'proyecto eliminado')}</span>`;
    case 'title': return `«${esc(v || 'Sin título')}»`;
    default: return esc(v ?? '');
  }
}

function activityText(e) {
  // El enlace muestra el título actual de la tarea (si aún existe)
  const name = (byId(e.entity_id) && e.entity === 'task' ? byId(e.entity_id).title : e.entity_name) || 'Sin título';
  const task = `<a class="log-link" data-log-task="${e.entity_id}">«${esc(name)}»</a>`;
  const proj = `<b>«${esc(e.entity_name || '')}»</b>`;
  if (e.entity === 'task') {
    switch (e.action) {
      case 'create': return `creó la tarea ${task}${e.extra ? ` en <b>${esc(e.extra)}</b>` : ''}`;
      case 'delete': return `eliminó la tarea <b>«${esc(e.entity_name || 'Sin título')}»</b>${e.extra ? ` de <b>${esc(e.extra)}</b>` : ''}`;
      case 'comment': return `comentó en ${task}: <span class="log-quote">“${esc(e.extra)}”</span>`;
      case 'uncomment': return `eliminó un comentario de ${task}: <span class="log-quote">“${esc(e.extra)}”</span>`;
      case 'attach': return `adjuntó <b>${esc(e.extra)}</b> en ${task}`;
      case 'detach': return `eliminó el archivo <b>${esc(e.extra)}</b> de ${task}`;
      case 'update':
        if (e.field === 'description') return `editó la descripción de ${task}`;
        if (e.field === 'title') return e.from ? `cambió el título ${fmtValue('title', e.from)} a ${fmtValue('title', e.to)}` : `le puso el título ${fmtValue('title', e.to)} a la tarea ${e.entity_id}`;
        return `cambió ${FIELD_LABEL[e.field] || e.field} de ${task}: ${fmtValue(e.field, e.from, e)} <span class="log-arrow">→</span> ${fmtValue(e.field, e.to, e)}`;
    }
  }
  if (e.entity === 'project') {
    switch (e.action) {
      case 'create': return `creó el proyecto ${proj}`;
      case 'rename': return `renombró el proyecto <b>«${esc(e.from)}»</b> a ${proj}`;
      case 'archive': return `archivó el proyecto ${proj}`;
      case 'unarchive': return `desarchivó el proyecto ${proj}`;
      case 'delete': return `eliminó el proyecto ${proj} y sus tareas`;
    }
  }
  if (e.entity === 'person' && e.action === 'rename') return `cambió el nombre de <b>${esc(e.from)}</b> a <b>${esc(e.to)}</b>`;
  if (e.entity === 'person' && e.action === 'delete') return `eliminó a <b>${esc(e.entity_name)}</b> de las personas`;
  if (e.entity === 'person') return `agregó a <b>${esc(e.entity_name)}</b> como persona`;
  if (e.entity === 'app' && e.action === 'reset') return 'restableció los datos de ejemplo';
  if (e.entity === 'app' && e.action === 'undo') return 'deshizo el último cambio';
  if (e.entity === 'app' && e.action === 'redo') return 'rehizo un cambio';
  if (e.entity === 'app' && e.action === 'import') return `restauró un respaldo${e.extra ? ` del ${esc(fmt(e.extra))}` : ''}`;
  return esc(e.action);
}

function dayLabel(iso) {
  const d = iso.slice(0, 10);
  const today = nowISO().slice(0, 10);
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${p2(y.getMonth() + 1)}-${p2(y.getDate())}`;
  if (d === today) return 'Hoy';
  if (d === yesterday) return 'Ayer';
  const [yy, mm, dd] = d.split('-');
  return `${dd}/${mm}/${yy}`;
}

async function openActivity() {
  const all = (await Api.listActivity()).sort((a, b) => b.ts - a.ts || b.id - a.id);
  const render = () => {
    const list = all.filter((e) => activityFilter === 'all' || e.entity === activityFilter).slice(0, 500);
    let html = '', lastDay = '';
    for (const e of list) {
      const day = dayLabel(e.at);
      if (day !== lastDay) { html += `<div class="log-day">${day}</div>`; lastDay = day; }
      const who = e.user === 'auto' ? '<span class="tag c-gray log-auto">Automático</span>' : `<span class="tag c-gray">${esc(userName(e.user) || e.user || '—')}</span>`;
      html += `<div class="log-row"><span class="log-time">${e.at.slice(11, 16)}</span><div class="log-text">${who} ${activityText(e)}</div></div>`;
    }
    const tabs = [['all', 'Todo'], ['task', 'Tareas'], ['project', 'Proyectos']].map(([k, l]) =>
      `<button class="log-tab ${activityFilter === k ? 'on' : ''}" data-log-filter="${k}">${l}</button>`).join('');
    $('#dialog-body .dlg-content').innerHTML = `<div class="log-tabs">${tabs}</div>
      <div class="log-list">${html || '<div class="nothing">Aún no hay actividad registrada.</div>'}</div>`;
  };
  openDialog('Bitácora', '');
  $('#dialog-body').classList.add('wide');
  render();
  $('#dialog-body').onclick = (ev) => {
    const f = ev.target.closest('[data-log-filter]');
    if (f) { activityFilter = f.dataset.logFilter; render(); }
  };
}

function setLoggedOut(v) {
  if (SHARED() && v) { Api.auth.signOut().then(() => location.reload()); return; }
  prefs.loggedOut = v;
  savePrefs();
  closeTask();
  $('#logged-out').hidden = !v;
}

async function exportData() {
  const data = await Api.exportAll();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bove-respaldo-${nowISO().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`Respaldo descargado (${fmtSize(blob.size)})`);
}

async function importData(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('El archivo no se pudo leer'); return; }
  if (!data || data.app !== 'gestor-de-tareas-bove') { toast('El archivo no es un respaldo del gestor de tareas'); return; }
  const when = data.exported_at ? fmt(data.exported_at) : 'fecha desconocida';
  showConfirm({
    title: '¿Restaurar este respaldo?',
    body: `Respaldo del <b>${esc(when)}</b> con ${data.projects.length} proyectos y ${data.tasks.length} tareas.
      Se reemplazarán <b>todos</b> los datos actuales. Esta acción no se puede deshacer.`,
    ok: 'Restaurar',
    onOk: async () => {
      try { await Api.importAll(data); } catch (err) { toast(err.message); return; }
      await reloadAll();
      toast('Respaldo restaurado');
    },
  });
}

// Vuelve a leer todo desde la base local y redibuja la app
async function reloadAll() {
  await loadPeople();
  state.tasks = await Api.listTasks();
  state.projects = await Api.listProjects();
  if (!isAllView() && !projectById(prefs.project)) prefs.project = state.projects[0].id;
  prefs.filters = {};
  savePrefs();
  closeDialog();
  closeTask();
  renderAccount();
  renderTable();
}

async function resetData() {
  await Api.resetAll(SEED);
  prefs.project = 1;
  await reloadAll();
  toast('Datos de ejemplo restablecidos');
}

function renderAccount() { $('#account-name').textContent = userName(CURRENT_USER) || 'Jorge'; }

/* ---------- Renombrar proyecto (clic en el título) ---------- */
function startRenameProject() {
  const h = $('#page-title');
  if (h.isContentEditable || isAllView()) return;
  h.contentEditable = 'plaintext-only';
  h.focus();
  const range = document.createRange();
  range.selectNodeContents(h);
  range.collapse(false);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
}
async function finishRenameProject(save) {
  const h = $('#page-title');
  if (!h.isContentEditable) return;
  h.contentEditable = 'false';
  const p = projectById(prefs.project);
  const name = h.textContent.replace(/\s+/g, ' ').trim();
  if (save && name && name !== p.name) {
    if (state.projects.some((x) => x.id !== p.id && norm(x.name) === norm(name))) {
      toast(`Ya existe un proyecto llamado ${name}`);
    } else {
      await Api.renameProject(p.id, name);
      p.name = name;
      toast('Proyecto renombrado');
    }
  }
  renderTable(); // actualiza barra lateral, tabla, tablero y filtros
  if (state.openId) renderPanel();
}

async function createProject(name, archived = false) {
  name = name.trim();
  if (!name) return;
  if (state.projects.some((p) => norm(p.name) === norm(name))) { toast(`Ya existe un proyecto llamado ${name}`); return; }
  const p = await Api.createProject(name, archived);
  state.projects = await Api.listProjects();
  selectProject(p.id);
  toast(`Proyecto ${name} creado${archived ? ' en archivados' : ''}`);
}

/* ============================================================
 *  Eventos
 * ============================================================ */
let titleTimer, descTimer;

document.addEventListener('click', async (e) => {
  const target = e.target;

  // Popover: clics dentro
  const sv = target.closest('[data-set-val]');
  if (sv) {
    const targets = popTargets();
    const field = pop().dataset.field;
    const v = sv.dataset.setVal;
    closePopover();
    for (const t of targets) {
      if (field === 'status') await setStatus(t, v);
      else if (field === 'project_id') { t.project_id = Number(v); await Api.saveTask(t); }
      else { t[field] = v || null; await Api.saveTask(t); }
    }
    if (field === 'project_id' && targets.some((t) => !inView(t))) toast(`${targets.length > 1 ? `${targets.length} tareas movidas` : 'Tarea movida'} a ${projectName(Number(v))}`);
    refreshTask(targets[0] && targets[0].id);
    return;
  }
  const pdc = target.closest('[data-pd-clear]');
  if (pdc) {
    const targets = popTargets();
    // Sin fecha no puede haber hora: quitar la fecha borra ambas
    for (const t of targets) {
      t.due_at = pdc.dataset.pdClear === 'date' || !t.due_at ? null : t.due_at.split('T')[0];
      await Api.saveTask(t);
    }
    refreshTask(targets[0] && targets[0].id);
    renderDatePop();
    return;
  }
  // Sin el ícono nativo, el selector se abre al hacer clic en el campo o en su ícono de la izquierda
  const dpRow = target.closest('.dp-row');
  if (dpRow && !target.closest('[data-pd-clear], [data-pd-set]')) {
    const inp = dpRow.querySelector('input');
    if (inp) { try { inp.showPicker(); } catch {} return; }
  }
  const pds = target.closest('[data-pd-set]');
  if (pds) { if (!pds.disabled) startDateInput(pds.dataset.pdSet); return; }
  const prd = target.closest('[data-pop-rm-dep]');
  if (prd) {
    const t = popTask();
    t.depends_on = t.depends_on.filter((x) => x !== Number(prd.dataset.popRmDep));
    await Api.saveTask(t);
    await releaseIfFree(t, true);
    closePopover(); refreshTask(t.id);
    return;
  }
  // "Condiciona a": se agrega/quita esta tarea en las dependencias de la otra
  const rdepOpt = target.closest('[data-add-rdep]');
  if (rdepOpt) {
    const t = popTask();
    const other = byId(Number(rdepOpt.dataset.addRdep));
    other.depends_on = [...other.depends_on, t.id];
    await onDependencyAdded(other, t);
    await Api.saveTask(other);
    closePopover();
    refreshTask(t.id);
    return;
  }
  const prrd = target.closest('[data-pop-rm-rdep]');
  if (prrd) {
    const t = popTask();
    const other = byId(Number(prrd.dataset.popRmRdep));
    other.depends_on = other.depends_on.filter((x) => x !== t.id);
    await Api.saveTask(other);
    await releaseIfFree(other, true);
    closePopover(); refreshTask(t.id);
    return;
  }
  const depOpt = target.closest('[data-add-dep]');
  if (depOpt) {
    const t = popTask();
    const dep = byId(Number(depOpt.dataset.addDep));
    t.depends_on = [...t.depends_on, dep.id];
    await onDependencyAdded(t, dep);
    await Api.saveTask(t);
    closePopover();
    refreshTask(t.id);
    return;
  }
  const eu = target.closest('[data-edit-user]');
  if (eu) { e.stopPropagation(); showPersonEdit(eu.dataset.editUser); return; }
  if (target.closest('[data-pe-back]')) { showUsersList(); return; }
  const pd = target.closest('[data-pe-delete]');
  if (pd) { confirmDeletePerson(pd.dataset.peDelete); return; }
  const cu = target.closest('[data-create-user]');
  if (cu) {
    const targets = popTargets();
    const person = await Api.createPerson(cu.dataset.createUser);
    await loadPeople();
    for (const t of targets) {
      t.assignees = USERS.map((u) => u.id).filter((x) => [...t.assignees, person.id].includes(x));
      await Api.saveTask(t);
    }
    $('#um-search').value = '';
    refreshTask(targets[0] && targets[0].id);
    renderUserOpts();
    $('#um-search').focus();
    toast(`${person.name} agregado como responsable`);
    return;
  }
  const cp = target.closest('[data-create-project]');
  if (cp) {
    const targets = popTargets();
    const p = await Api.createProject(cp.dataset.createProject);
    state.projects = await Api.listProjects();
    for (const t of targets) { t.project_id = p.id; await Api.saveTask(t); }
    closePopover();
    refreshTask(targets[0] && targets[0].id);
    toast(`Proyecto ${p.name} creado · ${targets.length > 1 ? `${targets.length} tareas movidas` : 'tarea movida'} ahí`);
    return;
  }
  const userOpt = target.closest('[data-toggle-user]');
  if (userOpt) {
    const targets = popTargets();
    const id = userOpt.dataset.toggleUser;
    // Si todas la tienen, se quita de todas; si no, se agrega a todas
    const allHave = targets.every((t) => t.assignees.includes(id));
    for (const t of targets) {
      const list = allHave ? t.assignees.filter((x) => x !== id) : [...new Set([...t.assignees, id])];
      t.assignees = USERS.map((u) => u.id).filter((x) => list.includes(x));
      await Api.saveTask(t);
    }
    refreshTask(targets[0] && targets[0].id);
    renderUserOpts();
    return;
  }
  const colOpt = target.closest('[data-toggle-col]');
  if (colOpt) {
    const k = colOpt.dataset.toggleCol;
    if (prefs.hidden.includes(k)) {
      // Al mostrar una columna, aparece al final (a la derecha) de las columnas visibles
      const lastVisible = visibleColumns().map((c) => c.key).pop();
      const order = prefs.order.filter((x) => x !== k);
      order.splice(order.indexOf(lastVisible) + 1, 0, k);
      prefs.order = order;
      prefs.hidden = prefs.hidden.filter((x) => x !== k);
    } else {
      prefs.hidden = [...prefs.hidden, k];
    }
    savePrefs();
    colOpt.querySelector('.switch').classList.toggle('on');
    renderTable();
    return;
  }
  const fv = target.closest('[data-flt-val]');
  if (fv) {
    const key = pop().dataset.key;
    const v = fv.dataset.fltVal;
    const sel = prefs.filters[key] || [];
    setFilter(key, sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
    renderFilterOpts();
    return;
  }
  if (target.closest('[data-flt-clear]')) { setFilter(pop().dataset.key, []); renderFilterOpts(); return; }
  const hs = target.closest('[data-hm-sort]');
  if (hs) { closePopover(); applySort(hs.dataset.hmSort); return; }
  const hf = target.closest('[data-hm-filter]');
  if (hf) {
    const r = pop().getBoundingClientRect();
    const anchor = { getBoundingClientRect: () => ({ left: r.left, top: r.top, bottom: r.top }) };
    openFilter(anchor, hf.dataset.hmFilter);
    return;
  }
  if (target.closest('[data-hm-unsort]')) { closePopover(); prefs.sort = { key: null, dir: null }; savePrefs(); renderTable(); return; }
  const am = target.closest('[data-account]');
  if (am) {
    closePopover();
    if (am.dataset.account === 'settings') openSettings();
    if (am.dataset.account === 'shortcuts') openShortcuts();
    if (am.dataset.account === 'log') openActivity();
    if (am.dataset.account === 'logout') setLoggedOut(true);
    return;
  }
  const gp = target.closest('[data-group]');
  if (gp) { prefs.groupBy = gp.dataset.group; savePrefs(); closePopover(); renderTable(); return; }
  if (pop().contains(target)) return;
  if (pop().classList.contains('open') && !target.closest('#add-dep, #add-rdep, #cols-tool, #group-tool, #add-user, #pick-project, #pick-due')) { closePopover(); }

  // Borrar adjunto (antes que el enlace de descarga)
  const delAtt = target.closest('[data-del-att]');
  if (delAtt) {
    e.preventDefault(); e.stopPropagation();
    await Api.deleteAttachment(Number(delAtt.dataset.delAtt));
    const u = blobUrls.get(Number(delAtt.dataset.delAtt));
    if (u) { URL.revokeObjectURL(u); blobUrls.delete(Number(delAtt.dataset.delAtt)); }
    state.attachments = await Api.listAttachments(state.openId);
    renderPanel();
    return;
  }

  // Eliminar comentario (solo quien lo escribió ve la ×)
  const dc = target.closest('[data-del-comment]');
  if (dc) {
    await Api.deleteComment(Number(dc.dataset.delComment));
    state.comments = await Api.listComments(state.openId);
    state.comments.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
    renderPanel();
    toast('Comentario eliminado');
    return;
  }

  // Quitar dependencia
  const rrm = target.closest('[data-remove-rdep]');
  if (rrm) {
    const t = byId(state.openId);
    const other = byId(Number(rrm.dataset.removeRdep));
    other.depends_on = other.depends_on.filter((x) => x !== t.id);
    await Api.saveTask(other);
    await releaseIfFree(other, true);
    renderTable(); renderPanel();
    return;
  }
  const rm = target.closest('[data-remove-dep]');
  if (rm) {
    const t = byId(state.openId);
    t.depends_on = t.depends_on.filter((x) => x !== Number(rm.dataset.removeDep));
    await Api.saveTask(t);
    await releaseIfFree(t, true);
    renderTable(); renderPanel();
    return;
  }

  if (target.closest('#add-time')) { state.addingTime = true; renderPanel(); $('#f-due-time').focus(); return; }
  if (target.closest('#clear-time')) {
    state.addingTime = false;
    await updateTask({ due_at: byId(state.openId).due_at.split('T')[0] });
    return;
  }
  if (target.closest('#clear-due')) { state.addingTime = false; await updateTask({ due_at: null }); return; }
  if (target.closest('#add-user')) { openUsersMenu(target.closest('#add-user')); return; }
  if (target.closest('#pick-due')) { openCellDate(target.closest('#pick-due'), state.openId); return; }
  if (target.closest('#pick-project')) { openCellSelect(target.closest('#pick-project'), state.openId, 'project_id'); return; }
  const rmUser = target.closest('[data-remove-user]');
  if (rmUser) {
    const t = byId(state.openId);
    t.assignees = t.assignees.filter((x) => x !== rmUser.dataset.removeUser);
    await Api.saveTask(t);
    renderTable(); renderPanel();
    return;
  }
  if (target.closest('#add-dep')) { openDepPicker(target.closest('#add-dep')); return; }
  if (target.closest('#add-rdep')) { openDepPicker(target.closest('#add-rdep'), state.openId, true); return; }
  if (target.closest('#group-tool')) { openGroupMenu(target.closest('#group-tool')); return; }
  if (target.closest('#cols-tool')) { openColumnsMenu(target.closest('#cols-tool')); return; }
  if (target.closest('#search-tool')) { $('#search-box').classList.add('open'); $('#search').focus(); return; }
  if (target.closest('#search-clear')) { clearSearch(); return; }
  if (target.closest('#sort-tool')) { prefs.sort = { key: null, dir: null }; savePrefs(); renderTable(); return; }

  // Ver foto en grande
  const ph = target.closest('[data-photo]');
  if (ph) {
    e.preventDefault();
    const a = state.attachments.find((x) => x.id === Number(ph.dataset.photo));
    $('#lightbox img').src = urlFor(a);
    $('#lightbox .cap').textContent = a.name;
    $('#lightbox').classList.add('open');
    return;
  }
  if (target.closest('#lightbox')) { $('#lightbox').classList.remove('open'); return; }

  // Basurero de la fila (dos clics para confirmar)
  const rowDel = target.closest('[data-del-task]');
  if (rowDel) {
    if (!rowDel.classList.contains('armed')) {
      document.querySelectorAll('.row-del.armed').forEach((b) => b.classList.remove('armed'));
      rowDel.classList.add('armed');
      rowDel.title = 'Clic de nuevo para eliminar';
      return;
    }
    await deleteTask(Number(rowDel.dataset.delTask));
    return;
  }

  // Selección múltiple: Ctrl + clic (⌘ + clic en Mac) en cualquier parte de la fila
  const selRow = target.closest('tr[data-row]');
  if (selRow && (IS_MAC ? e.metaKey : e.ctrlKey) && !target.closest('.row-del, .row-drag')) {
    e.preventDefault();
    closePopover();
    toggleSelect(Number(selRow.dataset.row));
    return;
  }
  const bk = target.closest('[data-bulk]');
  if (bk) {
    const f = bk.dataset.bulk;
    if (f === 'clear') { clearSelection(); return; }
    if (f === 'delete') {
      const ids = [...state.selected];
      showConfirm({
        title: `¿Eliminar ${ids.length} tarea${ids.length > 1 ? 's' : ''}?`,
        body: `Se eliminarán con sus comentarios y archivos adjuntos.${UNDO_HINT()}`,
        ok: 'Eliminar',
        onOk: async () => { for (const id of ids) await deleteTask(id, true); state.selected.clear(); renderTable(); toast(`${ids.length} tareas eliminadas`); },
      });
      return;
    }
    openBulk(bk, f);
    return;
  }

  // Editar celda directamente en la tabla
  const cellEl = target.closest('td[data-cell]');
  if (cellEl && !target.closest('[data-open]') && !target.closest('.cell-input')) { editCell(cellEl); return; }

  // Abrir tarea (botón ABRIR, tarjeta del tablero o chip de dependencia en el panel)
  const open = target.closest('[data-open]');
  if (open) { openTask(Number(open.dataset.open)); return; }

  // Ordenar por columna
  if (target.closest('.col-resize')) return;
  const th = target.closest('th[data-head]');
  if (th) { openHeaderMenu(th, th.dataset.head); return; }
  const fc = target.closest('[data-fchip]');
  if (fc) { openFilter(fc, fc.dataset.fchip); return; }
  const fx = target.closest('[data-fclear]');
  if (fx) { setFilter(fx.dataset.fclear, []); return; }
  if (target.closest('[data-fclear-all]')) { prefs.filters = {}; savePrefs(); renderTable(); return; }

  // Cambiar de vista
  const vt = target.closest('[data-view]');
  if (vt) { prefs.view = vt.dataset.view; savePrefs(); renderTable(); return; }

  // Nueva tarea
  const lane = target.closest('[data-new-in]');
  if (target.closest('#new-task, #add-row') || lane) {
    // "+ Nueva" en una columna del Kanban crea la tarea con el valor de esa columna
    const g = prefs.groupBy || 'status', v = lane ? lane.dataset.newIn : null;
    const extra = {};
    if (lane) {
      if (g === 'status') extra.status = v;
      if (g === 'priority') extra.priority = v || null;
      if (g === 'project_id') extra.project_id = Number(v);
      if (g === 'assignees') extra.assignees = v ? [v] : [];
      if (g === 'created_by') extra.created_by = v;
    }
    await createNewTask(extra);
    return;
  }

  // Eliminar tarea
  if (target.closest('#delete-task')) {
    if (!deleteArmed) {
      deleteArmed = true;
      $('#delete-task').innerHTML = `${icon('trash')} ¿Eliminar? Clic de nuevo`;
      $('#delete-task').classList.add('danger');
      return;
    }
    await deleteTask(state.openId);
    return;
  }

  // Proyectos
  if (target.closest('#page-title')) { startRenameProject(); return; }
  // Secciones desplegables (cada una se abre y cierra por separado)
  const sec = target.closest('[data-section]');
  if (sec) {
    const k = sec.dataset.section;
    prefs.openSections = prefs.openSections.includes(k) ? prefs.openSections.filter((x) => x !== k) : [...prefs.openSections, k];
    savePrefs();
    renderSidebar();
    return;
  }
  // Eliminar proyecto: primero se pide confirmación
  const dp = target.closest('[data-delete-project]');
  if (dp) { confirmDeleteProject(Number(dp.dataset.deleteProject)); return; }
  if (target.closest('[data-confirm-ok]')) { const fn = confirmAction; confirmAction = null; closeConfirm(); if (fn) await fn(); return; }
  if (target.closest('[data-confirm-cancel]') || target.id === 'confirm') { closeConfirm(); return; }

  // Cuenta: menú con Configuración, Atajos de teclado y Salir
  if (target.closest('#account')) { openAccountMenu(target.closest('#account')); return; }
  if (target.closest('#login-again')) { setLoggedOut(false); return; }
  if (target.closest('[data-dialog-close]') || target.id === 'dialog') { closeDialog(); return; }
  const lt = target.closest('[data-log-task]');
  if (lt) {
    const id = Number(lt.dataset.logTask);
    if (!byId(id)) { toast('Esa tarea ya no existe'); return; }
    closeDialog();
    await openTask(id);
    return;
  }
  if (target.closest('#export-data')) { await exportData(); return; }
  if (target.closest('#reset-data')) {
    showConfirm({
      title: '¿Restablecer los datos de ejemplo?',
      body: 'Se borrarán <b>todos</b> los proyectos, tareas, personas, comentarios y archivos, y se cargarán los datos de ejemplo. Esta acción no se puede deshacer.',
      ok: 'Restablecer',
      onOk: resetData,
    });
    return;
  }
  const ar = target.closest('[data-archive]');
  if (ar) {
    const p = projectById(ar.dataset.archive);
    await Api.setProjectArchived(p.id, !p.archived);
    state.projects = await Api.listProjects();
    renderTable(); // también actualiza la barra lateral y la vista "Mostrar todos"
    toast(projectById(p.id).archived ? `${p.name} archivado` : `${p.name} vuelve a proyectos en curso`);
    return;
  }
  if (target.closest('[data-show-all]')) { selectProject('all'); return; }
  const pj = target.closest('[data-project]');
  if (pj) { selectProject(Number(pj.dataset.project)); return; }
  // "+" junto a la sección: abre la sección y muestra el campo para escribir el nombre
  const ap = target.closest('[data-add-project]');
  if (ap) {
    const sec = ap.dataset.addProject;
    if (!prefs.openSections.includes(sec)) prefs.openSections = [...prefs.openSections, sec];
    savePrefs();
    renderSidebar();
    const inp = $(`[data-new-project="${sec}"]`);
    inp.hidden = false;
    inp.focus();
    return;
  }


  // Cerrar panel
  const pt = target.closest('[data-ptoggle]');
  if (pt) {
    const k = pt.dataset.ptoggle;
    const closed = new Set(prefs.panelClosed || []);
    if (closed.has(k)) closed.delete(k); else closed.add(k);
    prefs.panelClosed = [...closed];
    savePrefs();
    renderPanel();
    return;
  }
  if (target.closest('#panel-back')) { const prev = panelHistory.pop(); if (prev && byId(prev)) await openTask(prev, { back: true }); else updateBackBtn(); return; }
  if (target.id === 'overlay' || target.closest('#close')) { closeTask(); }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.matches('select[data-field="project_id"]')) {
    await updateTask({ project_id: Number(el.value) });
    toast(`Tarea movida a ${projectName(Number(el.value))}`);
  } else if (el.matches('select[data-field]')) {
    await updateTask({ [el.dataset.field]: el.value || null });
  } else if (el.id === 'pd-date' || el.id === 'pd-time') {
    await saveCellDate();
  } else if (el.id === 'f-due-date') {
    const t = byId(state.openId);
    const time = hasTime(t.due_at) ? `T${t.due_at.split('T')[1]}` : '';
    await updateTask({ due_at: el.value ? el.value + time : null });
  } else if (el.id === 'f-due-time') {
    const date = byId(state.openId).due_at.split('T')[0];
    state.addingTime = false;
    await updateTask({ due_at: el.value ? `${date}T${el.value}` : date });
  } else if (el.id === 'import-data') {
    if (el.files[0]) await importData(el.files[0]);
    el.value = '';
  } else if (el.id === 'up-file') {
    await addFiles([...el.files]);
  }
});

function clearSearch() {
  state.query = '';
  $('#search').value = '';
  $('#search-box').classList.remove('open');
  renderTable();
}

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'search') { state.query = el.value; renderTable(); return; }
  if (el.id === 'f-title') {
    autoGrow(el);
    byId(state.openId).title = el.value;
    clearTimeout(titleTimer);
    const id = state.openId; // se guarda aunque el panel se cierre antes de que pase el tiempo
    titleTimer = setTimeout(async () => { if (byId(id)) await Api.saveTask(byId(id)); renderTable(); }, 250);
  } else if (el.id === 'f-desc') {
    autoGrow(el);
    byId(state.openId).description = el.value;
    clearTimeout(descTimer);
    const id = state.openId;
    descTimer = setTimeout(() => Api.saveTask(byId(id)), 400);
  }
});

document.addEventListener('keydown', async (e) => {
  // Editor de persona: Enter guarda, Esc vuelve a la lista de responsables
  if (e.target.id === 'pe-name' && (e.key === 'Enter' || e.key === 'Escape')) {
    e.preventDefault();
    if (e.key === 'Enter') await savePersonName(); else showUsersList();
    return;
  }
  if (e.key === 'Escape' && $('#confirm').classList.contains('open')) { closeConfirm(); return; }
  if (e.key === 'Escape' && $('#dialog').classList.contains('open')) { closeDialog(); return; }
  if (e.key === 'Escape' && (e.target.matches('[data-new-project]') || e.target.id === 'page-title')) { /* lo maneja abajo */ }
  else if (e.key === 'Escape') {
    if (e.target.id === 'search') return clearSearch();
    if ($('#lightbox').classList.contains('open')) return $('#lightbox').classList.remove('open');
    if (pop().classList.contains('open')) return closePopover();
    if (state.openId) return closeTask();
    if (state.selected.size) return clearSelection();
  }
  if (e.target.matches('[data-new-project]') && (e.key === 'Enter' || e.key === 'Escape')) {
    const val = e.key === 'Enter' ? e.target.value : '';
    const archived = e.target.dataset.newProject === 'archived';
    e.target.value = ''; e.target.hidden = true;
    await createProject(val, archived);
    return;
  }
  if (e.target.id === 'page-title' && (e.key === 'Enter' || e.key === 'Escape')) {
    e.preventDefault();
    await finishRenameProject(e.key === 'Enter');
    e.target.blur();
    return;
  }
  if (['um-search', 'cs-search', 'dep-search'].includes(e.target.id) && e.key === 'Enter') {
    e.preventDefault();
    const first = pop().querySelector('.opts .opt');
    if (first) first.click();
    return;
  }
  if (e.target.id === 'f-title' && e.key === 'Enter') { e.preventDefault(); $('#f-desc').focus(); }
  if (e.target.id === 'f-comment' && e.key === 'Enter' && e.target.value.trim()) {
    await Api.addComment(state.openId, CURRENT_USER, e.target.value.trim());
    state.comments = await Api.listComments(state.openId);
    renderPanel();
    $('#f-comment').focus();
  }
});

// Arrastrar y soltar archivos en el panel
const modal = $('#modal');
let dragDepth = 0;
modal.addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { dragDepth++; modal.classList.add('dragging'); } });
modal.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; modal.classList.remove('dragging'); } });
modal.addEventListener('dragover', (e) => e.preventDefault());
modal.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; modal.classList.remove('dragging');
  addFiles([...e.dataTransfer.files]);
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Arrastrar proyectos en la barra lateral para cambiar su orden
const plist = $('#sidebar-projects');
let dragProj = null;
const clearProjMarks = () => plist.querySelectorAll('.proj').forEach((el) => el.classList.remove('drop-above', 'drop-below', 'dragging'));
plist.addEventListener('dragstart', (e) => {
  const el = e.target.closest('[data-project]');
  if (!el) return;
  dragProj = Number(el.dataset.project);
  e.dataTransfer.setData('text/x-project', String(dragProj));
  e.dataTransfer.effectAllowed = 'move';
  el.classList.add('dragging');
});
plist.addEventListener('dragover', (e) => {
  const el = e.target.closest('[data-project]');
  if (!el || dragProj === null) return;
  e.preventDefault();
  plist.querySelectorAll('.proj').forEach((x) => x !== el && x.classList.remove('drop-above', 'drop-below'));
  if (Number(el.dataset.project) === dragProj) return;
  if (!!projectById(el.dataset.project).archived !== !!projectById(dragProj).archived) return; // solo dentro de la misma sección
  const r = el.getBoundingClientRect();
  const below = e.clientY > r.top + r.height / 2;
  el.classList.toggle('drop-below', below);
  el.classList.toggle('drop-above', !below);
});
plist.addEventListener('drop', async (e) => {
  const el = e.target.closest('[data-project]');
  if (!el || dragProj === null) return;
  e.preventDefault();
  const target = Number(el.dataset.project);
  const below = el.classList.contains('drop-below');
  const sameSection = !!projectById(target).archived === !!projectById(dragProj).archived;
  if (target !== dragProj && sameSection) {
    const ids = state.projects.map((p) => p.id).filter((id) => id !== dragProj);
    ids.splice(ids.indexOf(target) + (below ? 1 : 0), 0, dragProj);
    await Api.saveProjectOrder(ids);
    state.projects = await Api.listProjects();
  }
  dragProj = null;
  renderSidebar();
});
plist.addEventListener('dragend', () => { dragProj = null; clearProjMarks(); });

// Atajos de una tecla: N crea una tarea, X alterna Tabla / Kanban.
// No actúan mientras se escribe, ni con el panel de una tarea, un menú o una ventana abiertos.
document.addEventListener('keydown', async (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const el = document.activeElement;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  if (state.openId || pop().classList.contains('open') || $('#dialog').classList.contains('open') ||
      $('#confirm').classList.contains('open') || !$('#logged-out').hidden) return;
  const k = e.key.toLowerCase();
  if (k === 'n') { e.preventDefault(); await createNewTask(); }
  else if (k === 'x') { e.preventDefault(); prefs.view = prefs.view === 'board' ? 'table' : 'board'; savePrefs(); renderTable(); }
});

// Deshacer y rehacer: ⌘Z / ⌘Y (o ⌘⇧Z) en Mac, Ctrl+Z / Ctrl+Y en Windows
document.addEventListener('keydown', async (e) => {
  const mod = IS_MAC ? e.metaKey : e.ctrlKey;
  if (!mod || e.altKey) return;
  const k = e.key.toLowerCase();
  const isUndo = k === 'z' && !e.shiftKey;
  const isRedo = k === 'y' || (k === 'z' && e.shiftKey);
  if (!isUndo && !isRedo) return;
  // Si se está escribiendo en un campo, se deja el deshacer normal del texto
  const el = document.activeElement;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  e.preventDefault();
  if (!Api.supportsUndo) { toast('Deshacer no está disponible en la versión compartida'); return; }
  const ok = isUndo ? await Api.undo() : await Api.redo();
  if (!ok) { toast(isUndo ? 'No hay nada que deshacer' : 'No hay nada que rehacer'); return; }
  await afterHistoryChange();
  toast(isUndo ? 'Cambio deshecho' : 'Cambio rehecho');
});

async function afterHistoryChange() {
  closePopover();
  await loadPeople();
  state.projects = await Api.listProjects();
  state.tasks = await Api.listTasks();
  if (!isAllView() && !projectById(prefs.project)) { prefs.project = state.projects[0].id; savePrefs(); }
  if (state.openId) {
    if (byId(state.openId)) {
      [state.comments, state.attachments] = await Promise.all([Api.listComments(state.openId), Api.listAttachments(state.openId)]);
      state.comments.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
      renderPanel();
    } else closeTask();
  }
  renderAccount();
  renderTable();
}

// Si se sale del campo de nuevo proyecto sin escribir, se esconde
document.addEventListener('focusout', (e) => {
  if (e.target.matches && e.target.matches('[data-new-project]') && !e.target.value.trim()) e.target.hidden = true;
});

// Al salir del título del proyecto, se guarda el nombre
$('#page-title').addEventListener('blur', () => finishRenameProject(true));

// Al salir del buscador vacío, se vuelve a esconder
$('#search').addEventListener('blur', () => { if (!state.query.trim()) $('#search-box').classList.remove('open'); });
// Atajo: Cmd/Ctrl + F abre la búsqueda (cuando no hay una tarea abierta)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && !state.openId) {
    e.preventDefault(); $('#search-box').classList.add('open'); $('#search').focus(); $('#search').select();
  }
});

// Si el mouse sale de la fila, el basurero vuelve a su estado normal
$('#rows').addEventListener('mouseout', (e) => {
  const tr = e.target.closest('tr');
  if (tr && !tr.contains(e.relatedTarget)) {
    const b = tr.querySelector('.row-del.armed');
    if (b) { b.classList.remove('armed'); b.title = 'Eliminar tarea'; }
  }
});

// Cambiar el ancho de una columna arrastrando su borde derecho
let resizing = null;
document.addEventListener('mousedown', (e) => {
  const h = e.target.closest('.col-resize');
  if (!h) return;
  e.preventDefault(); e.stopPropagation();
  const key = h.dataset.resize;
  resizing = { key, startX: e.clientX, startW: prefs.widths[key], col: $(`#colgroup col[data-w="${key}"]`) };
  document.body.classList.add('resizing-col');
  h.classList.add('active');
});
document.addEventListener('mousemove', (e) => {
  if (!resizing) return;
  const w = Math.max(MIN_WIDTH, Math.round(resizing.startW + e.clientX - resizing.startX));
  prefs.widths[resizing.key] = w;
  resizing.col.style.width = `${w}px`;
  const cols = visibleColumns();
  $('#task-table').style.width = `${GUTTER + cols.reduce((n, c) => n + prefs.widths[c.key], 0)}px`;
  placeResizeGuides();
  $(`#col-guides [data-resize="${resizing.key}"]`).classList.add('active');
});
document.addEventListener('mouseup', () => {
  if (!resizing) return;
  resizing = null;
  document.body.classList.remove('resizing-col');
  document.querySelectorAll('.col-resize.active').forEach((x) => x.classList.remove('active'));
  savePrefs();
});
// Doble clic en el borde: vuelve al ancho por defecto
document.addEventListener('dblclick', (e) => {
  const h = e.target.closest('.col-resize');
  if (!h) return;
  prefs.widths[h.dataset.resize] = DEFAULT_WIDTHS[h.dataset.resize];
  savePrefs(); renderTable();
});

// Arrastrar encabezados para reordenar columnas
const thead = $('#thead');
let dragCol = null;
const clearColMarks = () => thead.querySelectorAll('th').forEach((th) => th.classList.remove('drop-before', 'drop-after', 'dragging'));
thead.addEventListener('dragstart', (e) => {
  const th = e.target.closest('th[data-col]');
  if (resizing) { e.preventDefault(); return; }
  if (!th) return;
  dragCol = th.dataset.col;
  e.dataTransfer.setData('text/x-col', dragCol);
  e.dataTransfer.effectAllowed = 'move';
  th.classList.add('dragging');
});
thead.addEventListener('dragover', (e) => {
  const th = e.target.closest('th[data-col]');
  if (!th || !dragCol) return;
  e.preventDefault();
  thead.querySelectorAll('th').forEach((x) => x !== th && x.classList.remove('drop-before', 'drop-after'));
  if (th.dataset.col === dragCol || th.hasAttribute('data-pinned')) return;
  const r = th.getBoundingClientRect();
  const after = e.clientX > r.left + r.width / 2;
  th.classList.toggle('drop-after', after);
  th.classList.toggle('drop-before', !after);
});
thead.addEventListener('drop', (e) => {
  const th = e.target.closest('th[data-col]');
  if (!th || !dragCol) return;
  e.preventDefault();
  const target = th.dataset.col;
  const after = th.classList.contains('drop-after');
  if (target !== dragCol && !th.hasAttribute('data-pinned')) {
    const order = prefs.order.filter((k) => k !== dragCol);
    order.splice(order.indexOf(target) + (after ? 1 : 0), 0, dragCol);
    prefs.order = order;
    savePrefs();
  }
  dragCol = null;
  renderTable();
});
thead.addEventListener('dragend', () => { dragCol = null; clearColMarks(); });

// Arrastrar tarjetas entre columnas del tablero
// Arrastrar filas de la tabla (asa ⋮⋮) para cambiar el orden manual
const rowsEl = $('#rows');
let dragRow = null;
const clearRowMarks = () => rowsEl.querySelectorAll('tr').forEach((r) => r.classList.remove('drop-above', 'drop-below', 'dragging'));
rowsEl.addEventListener('dragstart', (e) => {
  const h = e.target.closest('[data-drag-row]');
  if (!h) return;
  if (prefs.sort.key) {
    e.preventDefault();
    toast('Quita el orden de la columna para mover las tareas a mano');
    return;
  }
  dragRow = Number(h.dataset.dragRow);
  e.dataTransfer.setData('text/x-row', String(dragRow));
  e.dataTransfer.effectAllowed = 'move';
  const tr = h.closest('tr');
  e.dataTransfer.setDragImage(tr, 20, 18);
  tr.classList.add('dragging');
});
rowsEl.addEventListener('dragover', (e) => {
  const tr = e.target.closest('tr[data-row]');
  if (!tr || dragRow === null) return;
  e.preventDefault();
  rowsEl.querySelectorAll('tr').forEach((r) => r !== tr && r.classList.remove('drop-above', 'drop-below'));
  if (Number(tr.dataset.row) === dragRow) return;
  const r = tr.getBoundingClientRect();
  const below = e.clientY > r.top + r.height / 2;
  tr.classList.toggle('drop-below', below);
  tr.classList.toggle('drop-above', !below);
});
rowsEl.addEventListener('drop', async (e) => {
  const tr = e.target.closest('tr[data-row]');
  if (!tr || dragRow === null) return;
  e.preventDefault();
  const after = tr.classList.contains('drop-below');
  const moved = dragRow;
  dragRow = null;
  await moveTask(moved, Number(tr.dataset.row), after);
  renderTable();
});
rowsEl.addEventListener('dragend', () => { dragRow = null; clearRowMarks(); });

const board = $('#board-view');
let dragFromLane = null;
let dragLane = null;
board.addEventListener('dragstart', (e) => {
  // Arrastrar el encabezado mueve la columna completa
  const h = e.target.closest('.lane-h');
  if (h) {
    dragLane = h.closest('[data-lane]');
    e.dataTransfer.setData('text/x-lane', dragLane.dataset.lane);
    e.dataTransfer.effectAllowed = 'move';
    dragLane.classList.add('dragging');
    return;
  }
  const c = e.target.closest('[data-card]');
  if (!c) return;
  e.dataTransfer.setData('text/x-task', c.dataset.card);
  dragFromLane = c.closest('[data-lane]').dataset.lane;
  e.dataTransfer.effectAllowed = 'move';
  c.classList.add('dragging');
});
board.addEventListener('dragend', () => {
  dragLane = null;
  board.querySelectorAll('.dragging, .drop, .drop-above, .drop-below, .drop-left, .drop-right').forEach((el) => el.classList.remove('dragging', 'drop', 'drop-above', 'drop-below', 'drop-left', 'drop-right'));
});
// Columna bajo el cursor y si la columna arrastrada queda a su izquierda o a su derecha
function laneDropTarget(x) {
  const lanes = [...board.querySelectorAll('[data-lane]')].filter((l) => l !== dragLane);
  for (const l of lanes) {
    const r = l.getBoundingClientRect();
    if (x < r.left + r.width / 2) return { lane: l, after: false };
  }
  return lanes.length ? { lane: lanes[lanes.length - 1], after: true } : null;
}
board.addEventListener('dragover', (e) => {
  if (!dragLane || !e.dataTransfer.types.includes('text/x-lane')) return;
  e.preventDefault();
  board.querySelectorAll('.drop-left, .drop-right').forEach((el) => el.classList.remove('drop-left', 'drop-right'));
  const t = laneDropTarget(e.clientX);
  if (t) t.lane.classList.add(t.after ? 'drop-right' : 'drop-left');
});
board.addEventListener('drop', (e) => {
  if (!dragLane || !e.dataTransfer.types.includes('text/x-lane')) return;
  e.preventDefault();
  const t = laneDropTarget(e.clientX);
  if (!t) return;
  const keys = [...board.querySelectorAll('[data-lane]')].map((l) => l.dataset.lane).filter((k) => k !== dragLane.dataset.lane);
  keys.splice(keys.indexOf(t.lane.dataset.lane) + (t.after ? 1 : 0), 0, dragLane.dataset.lane);
  prefs.laneOrder[prefs.groupBy || 'status'] = keys;
  savePrefs();
  renderBoard();
});
// Tarjeta bajo el cursor dentro de una columna, y si se suelta antes o después de ella
function cardDropTarget(lane, y) {
  const cards = [...lane.querySelectorAll('[data-card]:not(.dragging)')];
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (y < r.top + r.height / 2) return { card: c, after: false };
  }
  return cards.length ? { card: cards[cards.length - 1], after: true } : null;
}
board.addEventListener('dragover', (e) => {
  const l = e.target.closest('[data-lane]');
  if (!l || !e.dataTransfer.types.includes('text/x-task')) return;
  e.preventDefault();
  board.querySelectorAll('.drop, .drop-above, .drop-below').forEach((el) => el.classList.remove('drop', 'drop-above', 'drop-below'));
  l.classList.add('drop');
  if (!prefs.sort.key) {
    const tgt = cardDropTarget(l, e.clientY);
    if (tgt) tgt.card.classList.add(tgt.after ? 'drop-below' : 'drop-above');
  }
});
board.addEventListener('drop', async (e) => {
  const l = e.target.closest('[data-lane]');
  const id = Number(e.dataTransfer.getData('text/x-task'));
  if (!l || !id) return;
  e.preventDefault();
  const tgt = prefs.sort.key ? null : cardDropTarget(l, e.clientY);
  await moveToLane(byId(id), prefs.groupBy || 'status', dragFromLane, l.dataset.lane);
  if (tgt) await moveTask(id, Number(tgt.card.dataset.card), tgt.after);
  renderTable();
});

/* ---------- Inicio ---------- */
/* ============================================================
 *  Modo compartido (Supabase): inicio de sesión con código al correo
 * ============================================================ */
function loginCard(html) {
  $('#logged-out').innerHTML = `<div class="lo-card"><img class="lo-logo-img" src="assets/bove-white.svg" alt="BOVE">${html}</div>`;
  $('#logged-out').hidden = false;
}
// Pide el correo, envía un código y lo verifica. Termina cuando hay sesión iniciada.
function showLogin(msg = '') {
  return new Promise((resolve) => {
    const dom = Api.auth.allowedDomain;
    const step1 = () => {
      loginCard(`<h2>Entrar a BOVE</h2>
        <p>${msg ? esc(msg) : `Ingresa tu correo${dom ? ` de @${esc(dom)}` : ''} y te enviaremos un código para entrar.`}</p>
        <form class="lo-form" id="lo-form1"><input type="email" id="lo-email" placeholder="nombre@${esc(dom || 'empresa.cl')}" required autocomplete="email">
        <button class="btn-new" type="submit">Enviar código</button></form>`);
      $('#lo-email').focus();
      $('#lo-form1').onsubmit = async (ev) => {
        ev.preventDefault();
        const email = $('#lo-email').value.trim().toLowerCase();
        if (dom && !email.endsWith('@' + dom)) { toast(`Usa tu correo de @${dom}`); return; }
        try { await Api.auth.sendCode(email); step2(email); } catch (err) { toast(`No se pudo enviar el código: ${err.message}`); }
      };
    };
    const step2 = (email) => {
      loginCard(`<h2>Revisa tu correo</h2>
        <p>Enviamos un código a <b>${esc(email)}</b>. Escríbelo aquí:</p>
        <form class="lo-form" id="lo-form2"><input id="lo-code" inputmode="numeric" autocomplete="one-time-code" placeholder="Código" required>
        <button class="btn-new" type="submit">Entrar</button></form>
        <p><a href="#" id="lo-back" class="lo-link">Usar otro correo</a></p>`);
      $('#lo-code').focus();
      $('#lo-back').onclick = (ev) => { ev.preventDefault(); step1(); };
      $('#lo-form2').onsubmit = async (ev) => {
        ev.preventDefault();
        try { await Api.auth.verifyCode(email, $('#lo-code').value.trim()); $('#logged-out').hidden = true; resolve(); }
        catch (err) { toast(`Código incorrecto o vencido: ${err.message}`); }
      };
    };
    step1();
  });
}
// Primera vez que entra una cuenta: elegir quién es entre las personas existentes, o crear una nueva
function linkAccount(email) {
  return new Promise((resolve) => {
    const free = USERS.filter((u) => !u.email);
    const guess = email.split('@')[0].split(/[._-]/)[0];
    loginCard(`<h2>¿Quién eres?</h2>
      <p>Es la primera vez que entras con <b>${esc(email)}</b>. Elige tu nombre para vincular tu cuenta, o créalo.</p>
      <div class="lo-people">${free.map((u) => `<button class="lo-person" data-link-person="${u.id}">${esc(u.name)}</button>`).join('')}</div>
      <form class="lo-form" id="lo-new"><input id="lo-name" placeholder="Soy nuevo: mi nombre" value="${esc(guess.charAt(0).toUpperCase() + guess.slice(1))}" required>
      <button class="btn-new" type="submit">Crear</button></form>`);
    $('#logged-out').onclick = async (ev) => {
      const b = ev.target.closest('[data-link-person]');
      if (!b) return;
      await Api.linkPerson(b.dataset.linkPerson, email);
      $('#logged-out').onclick = null; $('#logged-out').hidden = true;
      resolve(b.dataset.linkPerson);
    };
    $('#lo-new').onsubmit = async (ev) => {
      ev.preventDefault();
      const p = await Api.createPerson($('#lo-name').value.trim(), email);
      $('#logged-out').onclick = null; $('#logged-out').hidden = true;
      resolve(p.id);
    };
  });
}
async function sharedSignIn() {
  let email = await Api.auth.email();
  const dom = Api.auth.allowedDomain;
  if (email && dom && !email.endsWith('@' + dom)) { await Api.auth.signOut(); email = null; }
  if (!email) { await showLogin(); email = await Api.auth.email(); }
  await loadPeople();
  const person = await Api.personForEmail(email);
  CURRENT_USER = person && !person.deleted ? person.id : await linkAccount(email);
  if (person && person.deleted) await Api.linkPerson(person.id, email);
}

// Recarga los datos cuando otra persona cambia algo (si no estás escribiendo en ese momento)
let remoteTimer;
async function refreshFromServer() {
  clearTimeout(remoteTimer);
  const el = document.activeElement;
  const typing = el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName));
  if (typing || pop().classList.contains('open') || $('#confirm').classList.contains('open')) {
    remoteTimer = setTimeout(refreshFromServer, 1500);
    return;
  }
  await afterHistoryChange();
}

// Si una operación falla sin que nadie la atienda, se avisa en vez de fallar en silencio
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast(`Algo falló: ${(e.reason && e.reason.message) || e.reason}`);
});

(async () => {
  try {
    if (SHARED()) await sharedSignIn();
    Api.currentUser = CURRENT_USER;
    await Api.ensureSeed(SEED);
    await loadPeople();
    state.projects = await Api.listProjects();
    state.tasks = await Api.listTasks();
    // Migración: antes el proyecto era un texto libre; ahora cada tarea pertenece a un proyecto de la lista
    const OLD = { ventas: 'Bus Light', operaciones: 'ERP', administracion: 'Bove', marketing: 'PUC' };
    for (const t of state.tasks) {
      if (t.project_id === undefined) {
        const name = t.project ? (state.projects.find((p) => norm(p.name) === norm(t.project)) || {}).name || OLD[norm(t.project)] : null;
        const proj = state.projects.find((p) => p.name === name) || state.projects.find((p) => p.name === 'Bove') || state.projects[0];
        t.project_id = proj.id;
        delete t.project;
        await Api.saveTask(t, { silent: true });
      }
    }
    // Migración: los tres estados de dependencia pasan a ser un solo estado "En espera"
    for (const t of state.tasks) {
      if (['dep_int', 'dep_ext', 'dep_mix'].includes(t.status)) { t.status = 'wait'; await Api.saveTask(t, { silent: true }); }
    }
    // Migración: antes había un solo responsable (assignee); ahora pueden ser varios (assignees)
    for (const t of state.tasks) {
      if (!Array.isArray(t.assignees)) {
        t.assignees = t.assignee ? [t.assignee] : [];
        delete t.assignee;
        await Api.saveTask(t, { silent: true });
      }
    }
    // Base nueva (modo compartido): se crea un primer proyecto para empezar
    if (!state.projects.length) {
      await Api.createProject('General');
      state.projects = await Api.listProjects();
    }
  } catch (err) {
    document.body.innerHTML = `<p style="padding:40px">No se pudo abrir la base de datos${SHARED() ? '' : ' local'}: ${esc(err.message)}</p>`;
    return;
  }
  if (!isAllView() && !projectById(prefs.project)) { prefs.project = state.projects[0].id; savePrefs(); }
  renderAccount();
  $('#logged-out').hidden = SHARED() || !prefs.loggedOut;
  if (SHARED()) {
    Api.onError = () => toast('No se pudo guardar el último cambio en la nube. Se recargaron los datos.');
    Api.onRemoteChange(refreshFromServer);
  }
  renderSidebar();
  renderTable();
})();
