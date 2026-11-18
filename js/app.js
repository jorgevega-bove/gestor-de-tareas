/* ============================================================
 *  Gestor de tareas — lógica de la interfaz
 * ============================================================ */

// Personas (se cargan desde la base de datos al iniciar)
let USERS = [];

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
const icon = (name) => `<svg class="i" viewBox="0 0 16 16"><path d="${P[name]}"/></svg>`;

/* ---------- Columnas ---------- */
const COLUMNS = [
  { key: 'title',      label: 'Tarea',             icon: 'text',   fixed: true,   sort: (t) => t.title || null },
  { key: 'status',     label: 'Estado',            icon: 'status',                sort: (t) => STATUS[t.status].order },
  { key: 'assignees',  label: 'Responsable',       icon: 'person',                sort: (t) => assigneeNames(t) || null },
  { key: 'priority',   label: 'Prioridad',         icon: 'select',                sort: (t) => (t.priority ? PRIORITY[t.priority].order : null) },
  { key: 'due_at',     label: 'Fecha límite',      icon: 'cal',                   sort: (t) => (t.due_at ? dueSortKey(t.due_at) : null) },
  { key: 'code',       label: 'ID',                icon: 'id',     hidden: true,  sort: (t) => t.id },
  { key: 'project_id', label: 'Proyecto',          icon: 'select', hidden: true,  sort: (t) => projectName(t.project_id) },
  { key: 'depends_on', label: 'Depende de',        icon: 'rel',    hidden: true,  sort: (t) => t.depends_on.length || null },
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
};

const prefs = (() => {
  try { return JSON.parse(localStorage.getItem('gt-prefs-v2')) || {}; } catch { return {}; }
})();
// Usuario actual: por ahora la maqueta la usa solo Jorge (el sistema de cuentas viene después)
const CURRENT_USER = 'jorge';
delete CURRENT_USER;
prefs.sort = prefs.sort || { key: null, dir: null };
prefs.view = prefs.view || 'table';
prefs.filters = prefs.filters || {};
// Sección abierta en la barra lateral: 'active', 'archived' o null (máximo una abierta)
if (prefs.openSection === undefined) prefs.openSection = 'active';
if (prefs.filters.status) prefs.filters.status = prefs.filters.status.filter((v) => v in STATUS);
prefs.hidden = prefs.hidden || COLUMNS.filter((c) => c.hidden).map((c) => c.key);
// Orden de columnas: se respeta el guardado y se agregan al final columnas nuevas
prefs.order = [
  ...(prefs.order || []).filter((k) => COLUMNS.some((c) => c.key === k)),
  ...COLUMNS.map((c) => c.key).filter((k) => !(prefs.order || []).includes(k)),
];
// Anchos de columna (px). Se pueden cambiar arrastrando el borde del encabezado.
const DEFAULT_WIDTHS = { title: 320, status: 170, assignees: 190, priority: 120, due_at: 160,
  code: 70, project_id: 140, depends_on: 150, created_by: 140, created_at: 160 };
prefs.widths = { ...DEFAULT_WIDTHS, ...(prefs.widths || {}) };
const MIN_WIDTH = 60;
const orderedColumns = () => prefs.order.map((k) => COLUMNS.find((c) => c.key === k));
function savePrefs() { try { localStorage.setItem('gt-prefs-v2', JSON.stringify(prefs)); } catch {} }

/* ---------- Utilidades ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const code = (t) => String(t.id);
const byId = (id) => state.tasks.find((t) => t.id === id);
const user = (id) => USERS.find((u) => u.id === id);
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
// Sin hora, la tarea vence al final de ese día.
const hasTime = (v) => !!v && v.includes('T');
const dueSortKey = (v) => (hasTime(v) ? v : `${v}T23:59`);
function parseLocal(v) {
  const [d, tm = '23:59'] = v.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, mi] = tm.split(':').map(Number);
  return new Date(y, m - 1, day, h, mi);
}
function fmtDue(v) {
  if (!v) return '';
  const [y, m, d] = v.split('T')[0].split('-');
  return `${d}/${m}/${y}` + (hasTime(v) ? ` ${v.split('T')[1]}` : '');
}
const isOverdue = (t) => t.due_at && t.status !== 'done' && parseLocal(t.due_at) < new Date();
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
const projectTag = (id) => (projectById(id) ? `<span class="tag t${Number(id) % 6}">${esc(projectName(id))}</span>` : '');
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
const depChip = (t, removable = false, link = true) =>
  `<span class="dep" ${link ? `data-open="${t.id}"` : ''} title="${esc(t.title)}">${code(t)}</span>` +
  (removable ? `<button class="mini dep-x" data-remove-dep="${t.id}" title="Quitar">×</button>` : '');

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
  await Api.saveTask(t);
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

function visibleColumns() {
  return orderedColumns().filter((c) => c.fixed || isForcedColumn(c.key) || !prefs.hidden.includes(c.key));
}

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function matchesQuery(t) {
  const q = norm(state.query).trim();
  if (!q) return true;
  const hay = norm([t.id, t.title, t.description, projectName(t.project_id), assigneeNames(t), STATUS[t.status].label].join(' '));
  return q.split(/\s+/).every((w) => hay.includes(w));
}

function sortedTasks() {
  const list = state.tasks.filter((t) => inView(t) && matchesQuery(t) && matchesFilters(t));
  const { key, dir } = prefs.sort;
  const col = COLUMNS.find((c) => c.key === key);
  if (!col) return list.sort((a, b) => a.id - b.id);
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
    case 'due_at': return `<td${ed} class="${isOverdue(t) ? 'overdue' : ''}">${fmtDue(t.due_at)}</td>`;
    case 'depends_on': return `<td${ed}>${t.depends_on.map(byId).filter(Boolean).map((d) => depChip(d, false, false)).join('')}</td>`;
    case 'created_by': return `<td>${person(t.created_by)}</td>`;
    case 'created_at': return `<td>${fmt(t.created_at)}</td>`;
  }
}

function renderTable() {
  if (state.projects.length) renderSidebar();
  renderTableView();
  renderBoard();
  const v = prefs.view;
  document.querySelectorAll('.view-tab').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('#table-view').hidden = v !== 'table';
  $('#board-view').hidden = v !== 'board';
  $('#cols-tool').style.display = v === 'table' ? '' : 'none';
}

/* ---------- Tablero (Kanban) ---------- */
function renderBoard() {
  const list = sortedTasks();
  const stSel = prefs.filters.status || [];
  $('#board-view').innerHTML = Object.entries(STATUS).filter(([k]) => !stSel.length || stSel.includes(k)).map(([k]) => {
    const items = list.filter((t) => t.status === k);
    return `<div class="lane l-${k}" data-lane="${k}">
      <div class="lane-h">${pill(STATUS, k)}<span class="n">${items.length}</span></div>
      <div class="cards">${items.map((t) => `
        <div class="card" draggable="true" data-open="${t.id}" data-card="${t.id}">
          ${t.title ? esc(t.title) : '<span class="untitled">Sin título</span>'}
        </div>`).join('')}</div>
      <div class="new-card" data-new-in="${k}">＋ Nueva</div>
    </div>`;
  }).join('');
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
  $('#colgroup').innerHTML = `<col style="width:34px">` + cols.map((c) => `<col data-w="${c.key}" style="width:${prefs.widths[c.key]}px">`).join('');
  $('#task-table').style.width = `${34 + cols.reduce((n, c) => n + prefs.widths[c.key], 0)}px`;
  $('#thead').innerHTML = `<tr><th class="gutter"></th>${cols.map((c) => `
    <th data-head="${c.key}" data-col="${c.key}" draggable="true" class="${c.key === key ? 'sorted' : ''} ${(prefs.filters[c.key] || []).length ? 'filtered' : ''}" title="Clic para ordenar o filtrar · arrastra para mover">
      <div class="h">${icon(c.icon)}${c.label}<span class="arrow">${(prefs.filters[c.key] || []).length ? '<span class="funnel">⏷</span>' : ''}${c.key === key ? (dir === 'asc' ? '↑' : '↓') : ''}</span></div>
      <span class="col-resize" data-resize="${c.key}" title="Arrastra para cambiar el ancho"></span>
    </th>`).join('')}</tr>`;
  const shown = sortedTasks();
  $('#rows').innerHTML = shown.length ? '' : `<tr class="no-results"><td></td><td colspan="${cols.length}">${state.tasks.some(inView) ? 'Ninguna tarea coincide con la búsqueda o los filtros' : (isAllView() ? 'No hay tareas en los proyectos en curso' : 'Este proyecto todavía no tiene tareas')}</td></tr>`;
  $('#rows').innerHTML += shown.map((t) =>
    `<tr data-row="${t.id}"><td class="gutter"><button class="row-del" data-del-task="${t.id}" title="Eliminar tarea">${icon('trash')}</button></td>${cols.map((c) => cell(c, t)).join('')}</tr>`).join('');
  const total = state.tasks.filter(inView).length;
  $('#count').textContent = isFiltering() ? `${shown.length} de ${total}` : total;
  renderFilterBar();
  $('#sort-tool').classList.toggle('on', !!key);
  $('#sort-tool').hidden = !key;
  $('#sort-tool').innerHTML = key
    ? `↕ ${COLUMNS.find((c) => c.key === key).label} ${dir === 'asc' ? '↑' : '↓'}`
    : '';
}

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
    <div class="opt" data-hm-sort="${key}">↕&nbsp; Ordenar ${sortLabel}</div>
    ${FILTERS[key] ? `<div class="opt" data-hm-filter="${key}">⏷&nbsp; Filtro ${nFilter ? `<span class="hint-r">${nFilter} seleccionado${nFilter > 1 ? 's' : ''}</span>` : ''}</div>` : ''}
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
  if (!blobUrls.has(a.id)) blobUrls.set(a.id, URL.createObjectURL(a.blob));
  return blobUrls.get(a.id);
};

function extStyle(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const c = { pdf: '#e5534b', xls: '#2f8a4f', xlsx: '#2f8a4f', csv: '#2f8a4f', doc: '#2f6fd6', docx: '#2f6fd6',
    ppt: '#d9730d', pptx: '#d9730d', zip: '#787774', rar: '#787774', mp4: '#9065b0', mov: '#9065b0', dwg: '#c14c8a' }[ext] || '#9b9a97';
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

    <div class="props">
      ${prop('id', 'ID', `<span class="ro">${code(t)}</span>`)}
      ${prop('person', 'Creado por', person(t.created_by))}
      ${prop('rel', 'Depende de', deps.map((d) => depChip(d, true)).join('') +
        `<button class="mini add-dep" id="add-dep">${deps.length ? '+' : 'Vacío'}</button>`, true)}
      ${prop('cal', 'Fecha límite', `<button class="pick-btn ${isOverdue(t) ? 'overdue' : ''}" id="pick-due">${t.due_at ? fmtDue(t.due_at) : '<span class="empty">Sin definir</span>'}</button>`, true)}
      ${prop('select', 'Prioridad', pickSelect('priority', PRIORITY, t.priority, true), true)}
      ${prop('select', 'Proyecto', `<button class="pick-btn" id="pick-project">${projectTag(t.project_id) || EMPTY}</button>`, true)}
      ${prop('person', 'Responsable', pickUsers(t.assignees), true)}
      ${prop('clock', 'Fecha de creación', `<span class="ro">${fmt(t.created_at)}</span>`)}
      ${prop('status', 'Estado', pickSelect('status', STATUS, t.status, false), true)}
    </div>

    <div class="section-h">Comentarios</div>
    <div class="comments">
      ${state.comments.map((c) => `
        <div class="comment">
          <div><div><span class="who">${esc(userName(c.author))}</span><span class="when">${fmt(c.created_at)}</span></div>
          <div class="body">${esc(c.body)}</div></div>
        </div>`).join('')}
    </div>
    <div class="comment-new"><span class="tag c-gray person">${esc(me.name)}</span><input id="f-comment" placeholder="Agregar un comentario… (Enter para enviar)"></div>

    <div class="divider"></div>
    <textarea class="desc" id="f-desc" placeholder="Escribe aquí los detalles de la tarea…"></textarea>

    <div class="section-h">Archivos adjuntos
      <label class="add">+ Adjuntar archivos<input type="file" id="up-file" multiple hidden></label>
    </div>
    ${files.length ? `<div class="files">${files.map((a) => {
      const e = extStyle(a.name);
      const img = (a.type || '').startsWith('image/');
      return `<a class="file" href="${urlFor(a)}" download="${esc(a.name)}" ${img ? `data-photo="${a.id}" title="Ver imagen"` : 'title="Descargar"'}>
        ${img ? `<img class="thumb" src="${urlFor(a)}" alt="">` : `<div class="ext" style="background:${e.color}">${e.label}</div>`}
        <div class="name">${esc(a.name)}</div>
        <div class="meta">${fmtSize(a.size)} · ${esc(userName(a.uploaded_by) || '')}</div>
        <button class="x" data-del-att="${a.id}" title="Eliminar">×</button></a>`;
    }).join('')}</div>` : '<div class="nothing">Sin archivos</div>'}

    <div class="hint">Arrastra fotos o archivos a este panel para adjuntarlos.</div>
  `;

  // Valores de texto (se asignan por JS para no tener problemas con caracteres especiales)
  $('#f-title').value = t.title;
  $('#f-desc').value = t.description;
  autoGrow($('#f-title'));
  autoGrow($('#f-desc'));
  overlay.scrollTop = scroll;
}

function autoGrow(el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }

async function openTask(id) {
  if (state.openId !== id) {
    closePopover();
    revokeUrls();
  }
  state.openId = id;
  state.addingTime = false;
  [state.comments, state.attachments] = await Promise.all([Api.listComments(id), Api.listAttachments(id)]);
  state.comments.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  const wasOpen = $('#overlay').classList.contains('open');
  $('#overlay').classList.add('open');
  renderPanel();
  if (!wasOpen) $('#overlay').scrollTop = 0;
  resetDeleteBtn();
}

function closeTask() {
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
function openPopover(anchor, html) {
  const el = pop();
  el.innerHTML = html;
  el.classList.add('open');
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  el.style.top = `${r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
}
function closePopover() { pop().classList.remove('open'); pop().dataset.kind = ''; }

function openDepPicker(anchor, taskId = state.openId) {
  const t = byId(taskId);
  const candidates = () => state.tasks
    .filter((x) => x.id !== t.id && !t.depends_on.includes(x.id) && !dependsOn(x, t.id))
    .sort((a, b) => a.id - b.id);
  const list = (q) => {
    const items = candidates().filter((x) => `${code(x)} ${x.title}`.toLowerCase().includes(q.toLowerCase()));
    return items.length ? items.map((x) => `
      <div class="opt" data-add-dep="${x.id}"><span class="code">${code(x)}</span><span class="ttl">${esc(x.title || 'Sin título')}</span>
      <span style="margin-left:auto">${pill(STATUS, x.status)}</span></div>`).join('')
      : '<div class="title">No hay tareas disponibles</div>';
  };
  const current = t.depends_on.map(byId).filter(Boolean);
  openPopover(anchor, `<div class="title">Esta tarea depende de…</div>
    ${current.length ? `<div class="pop-current">${current.map((d) =>
      `<span class="tag c-gray person">${code(d)} · ${esc(d.title || 'Sin título')}<button class="tag-x" data-pop-rm-dep="${d.id}" title="Quitar">×</button></span>`).join('')}</div>` : ''}
    <input class="search" id="dep-search" placeholder="Buscar tarea">
    <div class="opts" id="dep-opts">${list('')}</div>`);
  pop().dataset.kind = 'deps';
  pop().dataset.task = t.id;
  pop().style.minWidth = '380px';
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
  const t = popTask();
  const q = $('#um-search').value;
  const list = USERS.filter((u) => norm(u.name).includes(norm(q.trim())));
  $('#um-opts').innerHTML = list.map((u) => `
    <div class="opt" data-toggle-user="${u.id}"><span class="cb ${t.assignees.includes(u.id) ? 'on' : ''}"></span><span class="tag c-gray person">${esc(u.name)}</span></div>`).join('') +
    createRow('create-user', q, USERS.map((u) => u.name)) ||
    '<div class="title">Escribe un nombre para crear una persona</div>';
}
function openUsersMenu(anchor, taskId = state.openId) {
  openPopover(anchor, `<div class="title">Responsables</div>
    <input class="search" id="um-search" placeholder="Busca o crea una persona…" autocomplete="off">
    <div class="opts" id="um-opts"></div>`);
  Object.assign(pop().dataset, { kind: 'users', task: taskId });
  pop().style.minWidth = '240px';
  renderUserOpts();
  $('#um-search').oninput = renderUserOpts;
  $('#um-search').focus();
}

/* ---------- Edición directa en la tabla ---------- */
const popTask = () => byId(Number(pop().dataset.task));
function refreshTask(id) {
  renderTable();
  if (state.openId === id) renderPanel();
}

function openCellSelect(anchor, taskId, field) {
  const t = byId(taskId);
  let opts = [];
  if (field === 'status') opts = Object.keys(STATUS).map((k) => [k, pill(STATUS, k)]);
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
  const t = popTask();
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
  const t = popTask();
  const d = $('#pd-date') ? $('#pd-date').value : '';
  const tm = $('#pd-time') ? $('#pd-time').value : (hasTime(t.due_at) ? t.due_at.split('T')[1] : '');
  const before = [!!t.due_at, hasTime(t.due_at)];
  t.due_at = d ? d + (tm ? `T${tm}` : '') : null;
  await Api.saveTask(t);
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

async function deleteTask(id) {
  const t = byId(id);
  const dependents = blocking(t);
  await Api.deleteTask(id);
  state.tasks = await Api.listTasks();
  for (const d of dependents) await releaseIfFree(byId(d.id), true);
  if (state.openId === id) closeTask();
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
  document.querySelectorAll('[data-section]').forEach((h) => h.classList.toggle('open', h.dataset.section === prefs.openSection));
  document.querySelectorAll('[data-body]').forEach((b) => { b.hidden = b.dataset.body !== prefs.openSection; });
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
    <div class="opt" data-account="settings">⚙&nbsp; Configuración</div>
    <div class="opt" data-account="shortcuts">⌨&nbsp; Atajos de teclado</div>
    <div class="pop-sep"></div>
    <div class="opt" data-account="logout">↪&nbsp; Salir de la cuenta</div>`);
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
    <div class="set-sec">
      <div class="set-txt"><b>Datos de ejemplo</b><span>Borra todo y vuelve a cargar los proyectos y tareas de ejemplo.</span></div>
      <button class="btn-cancel danger-text" id="reset-data">Restablecer datos de ejemplo</button>
    </div>`);
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
function openShortcuts() {
  const k = (...keys) => keys.map((x) => `<kbd>${x}</kbd>`).join(' ');
  const mod = IS_MAC ? '⌘' : 'Ctrl';
  const rows = [
    [k(mod, 'F'), 'Buscar tareas'],
    [k('Esc'), 'Cerrar el panel, un menú o la búsqueda'],
    [k('Enter'), 'Guardar al editar una celda o el título del proyecto'],
    [k('Esc'), 'Cancelar la edición de una celda'],
    [k('Enter'), 'En el título de una tarea: pasar a la descripción'],
    [k('Enter'), 'En un comentario: enviarlo'],
    [k('Enter'), 'En Responsable o Proyecto: elegir o crear la opción'],
    ['Doble clic', 'En el borde de una columna: volver a su ancho original'],
  ];
  openDialog('Atajos de teclado', `<table class="kbd-table">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`);
}

function setLoggedOut(v) {
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
  USERS = await Api.listPeople();
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

async function createProject(name) {
  name = name.trim();
  if (!name) return;
  if (state.projects.some((p) => norm(p.name) === norm(name))) { toast(`Ya existe un proyecto llamado ${name}`); return; }
  const p = await Api.createProject(name);
  state.projects = await Api.listProjects();
  selectProject(p.id);
  toast(`Proyecto ${name} creado`);
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
    const t = popTask();
    const field = pop().dataset.field;
    const v = sv.dataset.setVal;
    closePopover();
    if (field === 'status') await setStatus(t, v);
    else if (field === 'project_id') {
      t.project_id = Number(v); await Api.saveTask(t);
      if (!inView(t)) toast(`Tarea movida a ${projectName(t.project_id)}`);
    } else { t[field] = v || null; await Api.saveTask(t); }
    refreshTask(t.id);
    return;
  }
  const pdc = target.closest('[data-pd-clear]');
  if (pdc) {
    const t = popTask();
    // Sin fecha no puede haber hora: quitar la fecha borra ambas
    t.due_at = pdc.dataset.pdClear === 'date' ? null : t.due_at.split('T')[0];
    await Api.saveTask(t);
    refreshTask(t.id);
    renderDatePop();
    return;
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
  const cu = target.closest('[data-create-user]');
  if (cu) {
    const t = popTask();
    const person = await Api.createPerson(cu.dataset.createUser);
    USERS = await Api.listPeople();
    t.assignees = USERS.map((u) => u.id).filter((x) => [...t.assignees, person.id].includes(x));
    await Api.saveTask(t);
    $('#um-search').value = '';
    refreshTask(t.id);
    renderUserOpts();
    $('#um-search').focus();
    toast(`${person.name} agregado como responsable`);
    return;
  }
  const cp = target.closest('[data-create-project]');
  if (cp) {
    const t = popTask();
    const p = await Api.createProject(cp.dataset.createProject);
    state.projects = await Api.listProjects();
    t.project_id = p.id;
    await Api.saveTask(t);
    closePopover();
    refreshTask(t.id);
    toast(`Proyecto ${p.name} creado · tarea movida ahí`);
    return;
  }
  const userOpt = target.closest('[data-toggle-user]');
  if (userOpt) {
    const t = popTask();
    const id = userOpt.dataset.toggleUser;
    const list = t.assignees.includes(id) ? t.assignees.filter((x) => x !== id) : [...t.assignees, id];
    t.assignees = USERS.map((u) => u.id).filter((x) => list.includes(x));
    await Api.saveTask(t);
    refreshTask(t.id);
    renderUserOpts();
    return;
  }
  const colOpt = target.closest('[data-toggle-col]');
  if (colOpt) {
    const k = colOpt.dataset.toggleCol;
    prefs.hidden = prefs.hidden.includes(k) ? prefs.hidden.filter((x) => x !== k) : [...prefs.hidden, k];
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
    if (am.dataset.account === 'logout') setLoggedOut(true);
    return;
  }
  if (pop().contains(target)) return;
  if (pop().classList.contains('open') && !target.closest('#add-dep, #cols-tool, #add-user, #pick-project, #pick-due')) { closePopover(); }

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

  // Quitar dependencia
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
    const t = await Api.createTask({ project_id: isAllView() ? (state.projects.find((p) => !p.archived) || state.projects[0]).id : prefs.project, created_by: CURRENT_USER, assignees: [CURRENT_USER], status: lane ? lane.dataset.newIn : 'todo' });
    state.tasks.push(t);
    renderTable();
    await openTask(t.id);
    $('#f-title').focus();
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
  // Secciones desplegables (máximo una abierta a la vez)
  const sec = target.closest('[data-section]');
  if (sec) {
    prefs.openSection = prefs.openSection === sec.dataset.section ? null : sec.dataset.section;
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
  if (target.closest('#new-project')) {
    $('#new-project').hidden = true;
    $('#new-project-input').hidden = false;
    $('#new-project-input').focus();
    return;
  }


  // Cerrar panel
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
    titleTimer = setTimeout(async () => { await Api.saveTask(byId(state.openId)); renderTable(); }, 250);
  } else if (el.id === 'f-desc') {
    autoGrow(el);
    byId(state.openId).description = el.value;
    clearTimeout(descTimer);
    const id = state.openId;
    descTimer = setTimeout(() => Api.saveTask(byId(id)), 400);
  }
});

document.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape' && $('#confirm').classList.contains('open')) { closeConfirm(); return; }
  if (e.key === 'Escape' && $('#dialog').classList.contains('open')) { closeDialog(); return; }
  if (e.key === 'Escape' && (e.target.id === 'new-project-input' || e.target.id === 'page-title')) { /* lo maneja abajo */ }
  else if (e.key === 'Escape') {
    if (e.target.id === 'search') return clearSearch();
    if ($('#lightbox').classList.contains('open')) return $('#lightbox').classList.remove('open');
    if (pop().classList.contains('open')) return closePopover();
    if (state.openId) return closeTask();
  }
  if (e.target.id === 'new-project-input' && (e.key === 'Enter' || e.key === 'Escape')) {
    const val = e.key === 'Enter' ? e.target.value : '';
    e.target.value = ''; e.target.hidden = true; $('#new-project').hidden = false;
    await createProject(val);
    return;
  }
  if (e.target.id === 'page-title' && (e.key === 'Enter' || e.key === 'Escape')) {
    e.preventDefault();
    await finishRenameProject(e.key === 'Enter');
    e.target.blur();
    return;
  }
  if ((e.target.id === 'um-search' || e.target.id === 'cs-search') && e.key === 'Enter') {
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
  $('#task-table').style.width = `${34 + cols.reduce((n, c) => n + prefs.widths[c.key], 0)}px`;
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
  if (th.dataset.col === dragCol) return;
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
  if (target !== dragCol) {
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
const board = $('#board-view');
board.addEventListener('dragstart', (e) => {
  const c = e.target.closest('[data-card]');
  if (!c) return;
  e.dataTransfer.setData('text/x-task', c.dataset.card);
  e.dataTransfer.effectAllowed = 'move';
  c.classList.add('dragging');
});
board.addEventListener('dragend', () => {
  board.querySelectorAll('.dragging, .drop').forEach((el) => el.classList.remove('dragging', 'drop'));
});
board.addEventListener('dragover', (e) => {
  const l = e.target.closest('[data-lane]');
  if (!l || !e.dataTransfer.types.includes('text/x-task')) return;
  e.preventDefault();
  board.querySelectorAll('.drop').forEach((el) => el !== l && el.classList.remove('drop'));
  l.classList.add('drop');
});
board.addEventListener('drop', async (e) => {
  const l = e.target.closest('[data-lane]');
  const id = Number(e.dataTransfer.getData('text/x-task'));
  if (!l || !id) return;
  e.preventDefault();
  await setStatus(byId(id), l.dataset.lane);
  renderTable();
});

/* ---------- Inicio ---------- */
(async () => {
  try {
    await Api.ensureSeed(SEED);
    USERS = await Api.listPeople();
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
        await Api.saveTask(t);
      }
    }
    // Migración: los tres estados de dependencia pasan a ser un solo estado "En espera"
    for (const t of state.tasks) {
      if (['dep_int', 'dep_ext', 'dep_mix'].includes(t.status)) { t.status = 'wait'; await Api.saveTask(t); }
    }
    // Migración: antes había un solo responsable (assignee); ahora pueden ser varios (assignees)
    for (const t of state.tasks) {
      if (!Array.isArray(t.assignees)) {
        t.assignees = t.assignee ? [t.assignee] : [];
        delete t.assignee;
        await Api.saveTask(t);
      }
    }
  } catch (err) {
    document.body.innerHTML = `<p style="padding:40px">No se pudo abrir la base de datos local: ${esc(err.message)}</p>`;
    return;
  }
  if (!isAllView() && !projectById(prefs.project)) { prefs.project = state.projects[0].id; savePrefs(); }
  renderAccount();
  $('#logged-out').hidden = !prefs.loggedOut;
  renderSidebar();
  renderTable();
})();
