/* ============================================================
 *  Gestor de tareas — lógica de la interfaz
 * ============================================================ */

const USERS = [
  { id: 'jorge', name: 'Jorge', color: '#2383e2' },
  { id: 'francisco', name: 'Francisco', color: '#448361' },
  { id: 'ulises', name: 'Ulises', color: '#9065b0' },
];

const STATUS = {
  todo:    { label: 'No completada',       cls: 'c-red',    order: 0 },
  doing:   { label: 'En curso',            cls: 'c-blue',   order: 1 },
  dep_int: { label: 'Dependencia interna', cls: 'c-gray',   order: 2 },
  dep_ext: { label: 'Dependencia externa', cls: 'c-gray',   order: 3 },
  dep_mix: { label: 'Dependencia mixta',   cls: 'c-gray',   order: 4 },
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
prefs.user = prefs.user || 'jorge';
prefs.sort = prefs.sort || { key: null, dir: null };
prefs.view = prefs.view || 'table';
prefs.filters = prefs.filters || {};
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
const projectTag = (id) => (projectById(id) ? `<span class="tag t${hashIdx(projectName(id), 6)}">${esc(projectName(id))}</span>` : '');
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
 *      Dependencia interna → No completada
 *      Dependencia mixta   → Dependencia externa (sigue esperando algo de afuera)
 *  - Al agregar una dependencia sin completar:
 *      No completada / En curso → Dependencia interna
 *      Dependencia externa      → Dependencia mixta
 * ============================================================ */
async function releaseIfFree(t) {
  if (!t || !['dep_int', 'dep_mix'].includes(t.status)) return;
  if (blockedBy(t).length) return;
  const next = t.status === 'dep_int' ? 'todo' : 'dep_ext';
  t.status = next;
  await Api.saveTask(t);
  toast(`La tarea ${t.id} ya no espera otras tareas → ${STATUS[next].label}`);
}
async function onTaskCompleted(t) {
  for (const dep of blocking(t)) await releaseIfFree(dep);
}
async function onDependencyAdded(t, depTask) {
  if (depTask.status === 'done') return;
  const map = { todo: 'dep_int', doing: 'dep_int', dep_ext: 'dep_mix' };
  if (map[t.status]) {
    t.status = map[t.status];
    toast(`La tarea ${t.id} ahora espera a la ${depTask.id} → ${STATUS[t.status].label}`);
  }
}

/* ============================================================
 *  Tabla
 * ============================================================ */
function visibleColumns() {
  return orderedColumns().filter((c) => c.fixed || !prefs.hidden.includes(c.key));
}

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function matchesQuery(t) {
  const q = norm(state.query).trim();
  if (!q) return true;
  const hay = norm([t.id, t.title, t.description, projectName(t.project_id), assigneeNames(t), STATUS[t.status].label].join(' '));
  return q.split(/\s+/).every((w) => hay.includes(w));
}

function sortedTasks() {
  const list = state.tasks.filter((t) => t.project_id === prefs.project && matchesQuery(t) && matchesFilters(t));
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
  $('#rows').innerHTML = shown.length ? '' : `<tr class="no-results"><td></td><td colspan="${cols.length}">${state.tasks.some((t) => t.project_id === prefs.project) ? 'Ninguna tarea coincide con la búsqueda o los filtros' : 'Este proyecto todavía no tiene tareas'}</td></tr>`;
  $('#rows').innerHTML += shown.map((t) =>
    `<tr data-row="${t.id}"><td class="gutter"><button class="row-del" data-del-task="${t.id}" title="Eliminar tarea">${icon('trash')}</button></td>${cols.map((c) => cell(c, t)).join('')}</tr>`).join('');
  const total = state.tasks.filter((t) => t.project_id === prefs.project).length;
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
  const me = user(prefs.user);

  $('#modal-body').innerHTML = `
    <div class="m-code">ID ${code(t)}</div>
    <textarea class="m-title" id="f-title" rows="1" placeholder="Sin título"></textarea>

    <div class="props">
      ${prop('id', 'ID', `<span class="ro">${code(t)}</span>`)}
      ${prop('person', 'Creado por', person(t.created_by))}
      ${prop('rel', 'Depende de', deps.map((d) => depChip(d, true)).join('') +
        `<button class="mini add-dep" id="add-dep">${deps.length ? '+' : 'Vacío'}</button>`, true)}
      ${prop('cal', 'Fecha límite', `<input type="date" id="f-due-date" class="${t.due_at ? '' : 'blank'}">` +
        (t.due_at
          ? (hasTime(t.due_at) || state.addingTime
              ? '<input type="time" id="f-due-time" class="due-time"><button class="mini" id="clear-time" title="Quitar hora">× hora</button>'
              : '<button class="mini" id="add-time">+ Agregar hora</button>') +
            '<button class="mini" id="clear-due" title="Quitar fecha">Quitar fecha</button>'
          : ''), true)}
      ${prop('select', 'Prioridad', pickSelect('priority', PRIORITY, t.priority, true), true)}
      ${prop('select', 'Proyecto', `<span class="pick">${projectTag(t.project_id) || EMPTY}<select data-field="project_id">${state.projects.map((p) =>
        `<option value="${p.id}" ${p.id === t.project_id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></span>`, true)}
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
  $('#f-due-date').value = t.due_at ? t.due_at.split('T')[0] : '';
  if ($('#f-due-time')) $('#f-due-time').value = hasTime(t.due_at) ? t.due_at.split('T')[1] : '';
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
  for (const f of fileList) await Api.addAttachment(t.id, f, 'file', prefs.user);
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

const usersMenuHtml = (t) => `<div class="title">Responsables</div>` + USERS.map((u) => `
    <div class="opt" data-toggle-user="${u.id}"><span class="cb ${t.assignees.includes(u.id) ? 'on' : ''}"></span><span class="tag c-gray person">${esc(u.name)}</span></div>`).join('');
function openUsersMenu(anchor, taskId = state.openId) {
  const t = byId(taskId);
  openPopover(anchor, usersMenuHtml(t));
  pop().dataset.kind = 'users';
  pop().dataset.task = t.id;
  pop().style.minWidth = '220px';
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
  if (field === 'project_id') opts = state.projects.map((p) => [String(p.id), projectTag(p.id)]);
  const cur = String(t[field] ?? '');
  openPopover(anchor, `<div class="opts">${opts.map(([v, h]) => `
    <div class="opt" data-set-val="${esc(v)}">${h}<span class="chk">${v === cur ? '✓' : ''}</span></div>`).join('')}</div>`);
  Object.assign(pop().dataset, { kind: 'cellselect', task: taskId, field });
  pop().style.minWidth = '220px';
}

function openCellDate(anchor, taskId) {
  const t = byId(taskId);
  openPopover(anchor, `<div class="title">Fecha límite</div>
    <div class="date-pop"><input type="date" id="pd-date"><input type="time" id="pd-time" title="Hora (opcional)"></div>
    <div class="date-hint">La hora es opcional</div>
    <div id="pd-foot">${t.due_at ? '<div class="opt muted-opt" data-pd-clear>✕&nbsp; Quitar fecha</div>' : ''}</div>`);
  Object.assign(pop().dataset, { kind: 'date', task: taskId });
  pop().style.minWidth = '260px';
  $('#pd-date').value = t.due_at ? t.due_at.split('T')[0] : '';
  $('#pd-time').value = hasTime(t.due_at) ? t.due_at.split('T')[1] : '';
  $('#pd-date').focus();
}

async function saveCellDate() {
  const t = popTask();
  const d = $('#pd-date').value, tm = $('#pd-time').value;
  t.due_at = d ? d + (tm ? `T${tm}` : '') : null;
  await Api.saveTask(t);
  $('#pd-foot').innerHTML = t.due_at ? '<div class="opt muted-opt" data-pd-clear>✕&nbsp; Quitar fecha</div>' : '';
  refreshTask(t.id);
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
    orderedColumns().filter((c) => !c.fixed).map((c) => `
      <div class="opt" data-toggle-col="${c.key}">${icon(c.icon)}${c.label}
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
  for (const d of dependents) await releaseIfFree(byId(d.id));
  if (state.openId === id) closeTask();
  renderTable();
  toast(`Tarea ${t.id} eliminada`);
}

/* ---------- Proyectos (barra lateral) ---------- */
function renderSidebar() {
  $('#project-list').innerHTML = state.projects.map((p) => {
    const open = state.tasks.filter((t) => t.project_id === p.id && t.status !== 'done').length;
    return `<button class="side-item proj ${p.id === prefs.project ? 'active' : ''}" data-project="${p.id}" draggable="true" title="Arrastra para cambiar el orden">
      <span class="proj-name">${esc(p.name)}</span>${open ? `<span class="side-n">${open}</span>` : ''}</button>`;
  }).join('');
  const current = projectById(prefs.project);
  if (!$('#page-title').isContentEditable) $('#page-title').textContent = current ? current.name : '';
  document.title = current ? `${current.name} · BOVE` : 'BOVE';
}

function selectProject(id) {
  if (state.openId) closeTask();
  prefs.project = id;
  savePrefs();
  renderSidebar();
  renderTable();
}

/* ---------- Renombrar proyecto (clic en el título) ---------- */
function startRenameProject() {
  const h = $('#page-title');
  if (h.isContentEditable) return;
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
  renderSidebar();
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

/* ---------- Usuario actual ---------- */
function renderUsers() {
  $('#users').innerHTML = USERS.map((u) => `
    <button class="user-btn ${u.id === prefs.user ? 'active' : ''}" data-user="${u.id}">
      ${u.name}${u.id === prefs.user ? '<span class="check">✓</span>' : ''}
    </button>`).join('');
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
      if (t.project_id !== prefs.project) toast(`Tarea movida a ${projectName(t.project_id)}`);
    } else { t[field] = v || null; await Api.saveTask(t); }
    refreshTask(t.id);
    return;
  }
  if (target.closest('[data-pd-clear]')) {
    const t = popTask();
    t.due_at = null; await Api.saveTask(t);
    closePopover(); refreshTask(t.id);
    return;
  }
  const prd = target.closest('[data-pop-rm-dep]');
  if (prd) {
    const t = popTask();
    t.depends_on = t.depends_on.filter((x) => x !== Number(prd.dataset.popRmDep));
    await Api.saveTask(t);
    await releaseIfFree(t);
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
  const userOpt = target.closest('[data-toggle-user]');
  if (userOpt) {
    const t = popTask();
    const id = userOpt.dataset.toggleUser;
    const list = t.assignees.includes(id) ? t.assignees.filter((x) => x !== id) : [...t.assignees, id];
    t.assignees = USERS.map((u) => u.id).filter((x) => list.includes(x));
    await Api.saveTask(t);
    refreshTask(t.id);
    pop().innerHTML = usersMenuHtml(t);
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
  if (pop().contains(target)) return;
  if (pop().classList.contains('open') && !target.closest('#add-dep, #cols-tool, #add-user')) { closePopover(); }

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
    await releaseIfFree(t);
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
    const t = await Api.createTask({ project_id: prefs.project, created_by: prefs.user, assignees: [prefs.user], status: lane ? lane.dataset.newIn : 'todo' });
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
  const pj = target.closest('[data-project]');
  if (pj) { selectProject(Number(pj.dataset.project)); return; }
  if (target.closest('#new-project')) {
    $('#new-project').hidden = true;
    $('#new-project-input').hidden = false;
    $('#new-project-input').focus();
    return;
  }

  // Cambiar usuario
  const ub = target.closest('[data-user]');
  if (ub) { prefs.user = ub.dataset.user; savePrefs(); renderUsers(); if (state.openId) renderPanel(); return; }

  // Restablecer datos
  if (target.closest('#reset')) {
    const btn = $('#reset');
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = '¿Seguro? Se borra todo. Clic de nuevo';
      setTimeout(() => { btn.classList.remove('armed'); btn.textContent = 'Restablecer datos de ejemplo'; }, 4000);
      return;
    }
    await Api.resetAll(SEED);
    state.tasks = await Api.listTasks();
    state.projects = await Api.listProjects();
    prefs.project = state.projects[0].id; savePrefs();
    renderSidebar();
    btn.classList.remove('armed'); btn.textContent = 'Restablecer datos de ejemplo';
    closeTask(); renderTable(); toast('Datos de ejemplo restablecidos');
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
  if (e.target.id === 'f-title' && e.key === 'Enter') { e.preventDefault(); $('#f-desc').focus(); }
  if (e.target.id === 'f-comment' && e.key === 'Enter' && e.target.value.trim()) {
    await Api.addComment(state.openId, prefs.user, e.target.value.trim());
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
const plist = $('#project-list');
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
  if (target !== dragProj) {
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
  if (!projectById(prefs.project)) { prefs.project = state.projects[0].id; savePrefs(); }
  renderUsers();
  renderSidebar();
  renderTable();
})();
