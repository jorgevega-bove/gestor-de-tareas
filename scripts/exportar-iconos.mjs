// Exporta todos los íconos de la app a assets/icons/*.svg
//
// Los íconos viven dentro del código (js/app.js e index.html) para que la app
// cargue rápido y sin parpadeos. Este script los copia como archivos sueltos,
// así quedan a la vista en el repositorio y se pueden abrir o reutilizar.
//
// Uso:  node scripts/exportar-iconos.mjs
// Correrlo cada vez que se agregue o cambie un ícono, y subir los archivos junto con el cambio.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'icons');
const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

// Nombre del archivo según dónde aparece el ícono en el código
const NAMES = {
  // Íconos rellenos del objeto P (js/app.js)
  id: 'id', text: 'texto', status: 'estado', select: 'seleccion', person: 'persona', cal: 'calendario',
  clock: 'reloj', rel: 'relacion', doc: 'documento', lock: 'candado', eye: 'ojo', trash: 'basurero',
  x: 'cerrar-relleno', plus: 'mas', table: 'tabla',
  // Constantes con SVG (js/app.js)
  SORT_ICON: 'ordenar', FUNNEL_ICON: 'filtro', LINK_ICON: 'enlace', TOGGLE_ICON: 'propiedades',
  BOARD_ICON: 'kanban', CLIP_ICON: 'adjuntar', PENCIL_ICON: 'lapiz', CHEV: 'flecha-derecha',
  TRASH_ICON: 'basurero-linea', ARCHIVE_ICON: 'archivar', GOOGLE_ICON: 'google',
  // SVG escritos directamente en el HTML (por id, data-view o clase)
  'm-account': 'usuario', 'ico-open': 'menu', 'ico-close': 'cerrar', 'proj-search': 'buscar-proyecto',
  'chev-ud': 'flechas-arriba-abajo', 'view-table': 'vista-tabla', 'view-board': 'vista-kanban',
  'cols-tool': 'propiedades', 'search-tool': 'buscar', 'panel-back': 'volver', 'close-ico': 'cerrar',
  'log-proj-btn': 'flecha-abajo', account: 'usuario', chev: 'flecha-derecha',
};

const icons = new Map(); // nombre → svg
const seen = new Map();  // contenido → nombre (para no repetir el mismo dibujo)

function normalize(svg) {
  // Solo se limpia la etiqueta <svg> (los rectángulos de adentro conservan su ancho y alto)
  return svg.replace(/^<svg[^>]*>/, (tag) => tag
    .replace(/\s(class|width|height|aria-hidden)="[^"]*"/g, '')
    .replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"'));
}
function add(key, svg) {
  const name = NAMES[key] || key;
  const clean = normalize(svg);
  // Mismo dibujo = mismas figuras (aunque cambien atributos como la clase)
  const body = (svg.match(/<(path|circle|rect)[^>]*>/g) || []).join('') || clean;
  if (seen.has(body)) return;
  if (icons.has(name)) return; // mismo nombre, otra variante: se queda la primera
  seen.set(body, name);
  icons.set(name, clean);
}

// 1. Objeto P: rutas de íconos rellenos de 16×16
const pBlock = app.match(/const P = \{([\s\S]*?)\n\};/)[1];
for (const [, key, d] of pBlock.matchAll(/^\s*(\w+):\s*'([^']+)'/gm)) {
  add(key, `<svg viewBox="0 0 16 16" fill="currentColor"><path d="${d}"/></svg>`);
}
// 2. Constantes con un SVG completo
for (const [, key, svg] of app.matchAll(/const (\w+) = '(<svg[\s\S]*?<\/svg>)';/g)) add(key, svg);

// 3. SVG escritos directamente en el HTML o en plantillas de app.js
function inline(text) {
  for (const m of text.matchAll(/<svg[\s\S]*?<\/svg>/g)) {
    const svg = m[0];
    const before = text.slice(Math.max(0, m.index - 300), m.index);
    const own = (svg.match(/^<svg[^>]*class="([^"]+)"/) || [])[1] || '';
    const tag = before.slice(before.lastIndexOf('<'));
    const view = (tag.match(/data-view="(\w+)"/) || [])[1];
    const id = (tag.match(/id="([\w-]+)"/) || [])[1] || ([...before.matchAll(/id="([\w-]+)"/g)].pop() || [])[1];
    const ownKey = own.split(' ').find((c) => NAMES[c]);
    const key = ownKey || (view && `view-${view}`) || id || (before.match(/class="([\w-]+)"[^<]*>\s*$/) || [])[1];
    if (key) add(key, svg);
  }
}
inline(html);
inline(app.replace(/const (\w+) = '<svg[\s\S]*?<\/svg>';/g, '').replace(/`<svg class="i" viewBox="0 0 16 16"><path d="\$\{P\[name\]\}"\/><\/svg>`/, ''));

// Escribir los archivos (se rehace la carpeta completa)
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.svg')) rmSync(join(out, f));
const names = [...icons.keys()].sort((a, b) => a.localeCompare(b, 'es'));
for (const n of names) writeFileSync(join(out, `${n}.svg`), `${icons.get(n)}\n`);

// Índice con vista previa
const rows = names.map((n) => `| <img src="${n}.svg" width="24" height="24" alt=""> | \`${n}.svg\` |`).join('\n');
writeFileSync(join(out, 'README.md'), `# Íconos de la app

Copia de todos los íconos que usa la app, uno por archivo. Se generan desde el código con:

\`\`\`
node scripts/exportar-iconos.mjs
\`\`\`

No se editan a mano: los íconos se cambian en \`js/app.js\` o \`index.html\` y luego se vuelve a correr el script.
Usan \`currentColor\`, así que toman el color del texto donde se usen (en un visor se ven negros).

| Ícono | Archivo |
|---|---|
${rows}
`);
console.log(`${names.length} íconos exportados a assets/icons/`);
