// NEXUS CLASH — tools/build.mjs
// Prepara el sitio estático para GitHub Pages (no hay paso de compilación: el
// juego sigue abriéndose con doble clic en index.html). Hace tres cosas:
//   1. Copia NX.VERSION (js/ui/changelog.js) a <title>, og:title y twitter:title.
//   2. Añade ?v=<hash del contenido> a cada <script src> / <link href> local de
//      index.html, para que el navegador no mezcle archivos de versiones distintas
//      tras publicar (GitHub Pages los sirve con caché de 10 minutos).
//   3. Regenera js/tools/bundle.js (copia de las fuentes para el botón .ZIP).
//
//   node tools/build.mjs           escribe los cambios
//   node tools/build.mjs --check   falla si algo está desactualizado (CI)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = 'js/tools/bundle.js';
const BINARY = /\.(png|jpe?g|gif|webp|ico)$/i;
const CHECK = process.argv.includes('--check');

const read = p => fs.readFileSync(path.join(ROOT, p));
/* Los saltos de línea se normalizan a LF: en Windows git deja CRLF en la copia de trabajo
 * (core.autocrlf) y en la CI de Linux son LF; así hashes y bundle salen iguales en ambos. */
const lf = buf => Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
const readText = p => lf(read(p)).toString();
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

function version() {
  const m = /NX\.VERSION\s*=\s*'([^']+)'/.exec(read('js/ui/changelog.js').toString());
  if (!m) throw new Error('No se encontró NX.VERSION en js/ui/changelog.js');
  return m[1];
}

function buildIndex(src, ver) {
  let out = src.replace(/(<title>|<meta (?:property="og:title"|name="twitter:title") content=")([^<"]*?)V\d+(?:\.\d+)*/g,
    (_, pre, text) => `${pre}${text}V${ver}`);
  out = out.replace(/(<script[^>]*\ssrc="|<link[^>]*\shref=")([^"?#:]+\.(?:js|css))(?:\?v=[\w.]*)?"/g, (all, pre, p) => {
    const file = path.join(ROOT, p);
    if (!fs.existsSync(file)) throw new Error('index.html enlaza un archivo que no existe: ' + p);
    return `${pre}${p}?v=${hash(lf(fs.readFileSync(file)))}"`;
  });
  return out;
}

/* Archivos que viajan en el .zip: todo lo versionado en git, menos el propio bundle. */
function projectFiles() {
  let list;
  try { list = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT }).toString().trim().split('\n'); }
  catch (e) { throw new Error('Se necesita git para listar los archivos del proyecto'); }
  return list.filter(p => p && p !== BUNDLE && fs.existsSync(path.join(ROOT, p))).sort();
}

function buildBundle(ver, indexSrc) {
  const files = {};
  for (const p of projectFiles()) {
    if (BINARY.test(p)) { files[p] = { b64: read(p).toString('base64') }; continue; }
    files[p] = p === 'index.html' ? indexSrc : readText(p);
  }
  return '/* NEXUS CLASH — js/tools/bundle.js (generado por tools/build.mjs: copia de todas las fuentes para el botón ZIP) */\n' +
    'window.NX = window.NX || {};\nNX.BUNDLE = ' + JSON.stringify({ version: ver, files }) + ';\n';
}

const ver = version();
const index = buildIndex(readText('index.html'), ver);
const bundle = buildBundle(ver, index);
const outputs = [['index.html', index], [BUNDLE, bundle]];
const stale = outputs.filter(([p, s]) => !fs.existsSync(path.join(ROOT, p)) || readText(p) !== s).map(([p]) => p);

if (CHECK) {
  if (stale.length) { console.error('Desactualizado: ' + stale.join(', ') + ' → ejecuta `npm run build`'); process.exit(1); }
  console.log(`build OK · V${ver}`);
} else {
  for (const [p, s] of outputs) if (stale.includes(p)) fs.writeFileSync(path.join(ROOT, p), s);
  console.log(`V${ver} · ${stale.length ? 'actualizado: ' + stale.join(', ') : 'sin cambios'} · bundle ${(bundle.length / 1024).toFixed(0)} KB`);
}
