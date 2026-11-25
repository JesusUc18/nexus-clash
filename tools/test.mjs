// NEXUS CLASH — tools/test.mjs · `npm test`
// Pruebas sin dependencias (solo Node ≥ 18):
//   1. Sintaxis de todos los .js y que index.html cargue todos los módulos.
//   2. Integridad del plantel, la Tier List y el changelog.
//   3. Humo: cada luchador juega una partida de bots en cada modo sin errores.
//   4. Huella dorada: el motor da exactamente el mismo resultado que antes
//      (ver tools/golden.mjs; tras un cambio de balance intencionado:
//      `npm run golden:update`).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadEngine, runMatch, scriptsFromIndex } from './sim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
function test(name, fn) {
  const t0 = Date.now();
  try { fn(); console.log(`  ✓ ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${String(e && e.stack || e).split('\n').slice(0, 6).join('\n      ')}`); }
}
function assert(c, msg) { if (!c) throw new Error(msg); }
const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

console.log('NEXUS CLASH · pruebas');

test('sintaxis de todos los .js', () => {
  for (const f of walk('js').filter(f => f.endsWith('.js'))) new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});

test('index.html carga cada módulo exactamente una vez', () => {
  const scripts = scriptsFromIndex();
  const dup = scripts.filter((s, i) => scripts.indexOf(s) !== i);
  assert(!dup.length, 'scripts repetidos: ' + dup.join(', '));
  scripts.forEach(s => assert(fs.existsSync(path.join(ROOT, s)), 'no existe ' + s));
  const orphan = walk('js').filter(f => f.endsWith('.js') && f !== path.join('js', 'tools', 'bundle.js') && !scripts.includes(f.split(path.sep).join('/')));
  assert(!orphan.length, 'archivos que index.html no carga: ' + orphan.join(', '));
});

const NX = loadEngine({ seed: 99, files: scriptsFromIndex().filter(s => !/(menus|hud|packager|main)\.js$/.test(s)) });

test('plantel: ids únicos, 4 especiales y movesets válidos', () => {
  const ids = NX.ROSTER.map(d => d.id);
  assert(ids.length >= 2, 'plantel vacío');
  assert(new Set(ids).size === ids.length, 'ids repetidos');
  for (const slot of NX.ROSTER) {
    for (const d of slot.forms || [slot]) {
      const mv = NX.buildMoveset ? NX.buildMoveset(d) : null;
      assert(mv, 'NX.buildMoveset no disponible');
      for (const k of ['neutral', 'side', 'up', 'down']) assert(mv['special_' + k], `${d.id}: falta special_${k}`);
      for (const k in mv) for (const h of mv[k].hitboxes || []) {
        assert(Array.isArray(h.f) && h.f[0] <= h.f[1], `${d.id}.${k}: ventana de hitbox inválida`);
        assert(Number.isFinite(h.dmg) && Number.isFinite(h.r), `${d.id}.${k}: daño/radio no numérico`);
      }
    }
  }
});

test('Tier List: cada luchador aparece una vez y tiene explicación', () => {
  const ids = NX.ROSTER.map(d => d.id), order = NX.TierList.order;
  assert(new Set(order).size === order.length, 'luchador repetido en la Tier List');
  const missing = ids.filter(id => !order.includes(id)), extra = order.filter(id => !ids.includes(id));
  assert(!missing.length && !extra.length, `faltan: ${missing.join(', ') || '—'} · sobran: ${extra.join(', ') || '—'}`);
  ids.forEach(id => assert(NX.TierList.why[id], 'sin explicación: ' + id));
  ids.forEach(id => { const s = NX.TierList.stats(id); assert(s && Object.values(s).every(v => typeof v === 'object' || Number.isFinite(v)), 'barras inválidas: ' + id); });
});

test('changelog: la primera entrada es NX.VERSION', () => {
  assert(NX.CHANGELOG && NX.CHANGELOG[0].version === NX.VERSION, `NX.VERSION=${NX.VERSION} pero el changelog empieza por ${NX.CHANGELOG && NX.CHANGELOG[0].version}`);
});

test('humo: cada luchador en 1 VS 1, Batalla Campal, Horda y Práctica', () => {
  const ids = NX.ROSTER.map(d => d.id), stages = NX.STAGES.map(s => s.id);
  ids.forEach((id, i) => {
    const E = loadEngine({ seed: 500 + i });
    const st = stages[i % stages.length];
    const run = (cfg) => { try { return runMatch(E, Object.assign({ stageId: st, draw: 2 }, cfg)); } catch (e) { e.message = `${id} (${cfg.mode || 'versus'}): ${e.message}`; throw e; } };
    run({ fighters: [id, ids[(i + 11) % ids.length]], frames: 1500, level: 1 + (i % 9) });
    run({ fighters: [id, ids[(i + 1) % ids.length], ids[(i + 2) % ids.length], ids[(i + 3) % ids.length]], frames: 1200 });
    run({ mode: 'horde', fighters: [id, ids[(i + 5) % ids.length]], frames: 900 });
    run({ mode: 'practice', fighters: [ids[(i + 7) % ids.length], id], frames: 600 });
  });
});

test('huella dorada (comportamiento idéntico)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'golden.mjs')], { encoding: 'utf8' });
  assert(r.status === 0, (r.stdout + r.stderr).trim());
});

console.log(failed ? `\n${failed} prueba(s) fallaron` : '\nTodo en orden');
process.exitCode = failed ? 1 : 0;
