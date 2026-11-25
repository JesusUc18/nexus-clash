// Simulador headless: carga el motor en un contexto vm con stubs del navegador.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* Contexto 2D que acepta cualquier llamada. */
function fakeCtx() {
  const grad = { addColorStop() {} };
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return s => ({ width: String(s).length * 7 });
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'getLineDash') return () => [];
      if (k === 'canvas') return { width: 1280, height: 720 };
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

export function scriptsFromIndex() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
}

export function loadEngine({ seed = 1, files } = {}) {
  const el = () => ({ classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } }, style: {}, appendChild() {}, addEventListener() {}, setAttribute() {} });
  const ctx = {
    console, Math: Object.create(Math), JSON, Date, Map, Set, WeakMap, Object, Array, Promise, setTimeout: () => 0, clearTimeout() {},
    navigator: { userAgent: 'node', maxTouchPoints: 0 },
    document: { body: el(), documentElement: el(), getElementById: () => el(), createElement: el, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] },
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame() {}, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    localStorage: { getItem: () => null, setItem() {} }, location: { protocol: 'file:' }
  };
  ctx.Math.random = seeded(seed);
  ctx.window = ctx;
  vm.createContext(ctx);
  const list = files || scriptsFromIndex().filter(s => !/\/(ui|tools)\//.test(s) && !/main\.js$/.test(s));
  for (const f of list) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.NX;
}

/* Ejecuta una partida de bots; devuelve un resumen. */
export function runMatch(NX, { fighters, stageId, frames = 3600, level = 9, mode = 'versus', draw = 0 }) {
  const m = new NX.Match({ mode, stageId, rules: { stocks: 3, minutes: 7 },
    players: fighters.map(id => ({ fighterId: id, human: false, level })) });
  const ctx = fakeCtx();
  for (let i = 0; i < frames && !m.over; i++) {
    m.update();
    if (draw && i % draw === 0) m.draw(ctx, 1280, 720, 1);
  }
  return {
    frame: m.frame, over: m.over, phase: m.phase,
    fighters: m.fighters.map(f => ({ id: f.slotDef.id, stocks: f.stocks, pct: Math.round(f.percent * 100) / 100, x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100, kos: f.stats.kos }))
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const NX = loadEngine({ seed: 7 });
  const ids = NX.ROSTER.map(d => d.id), stages = NX.STAGES.map(s => s.id);
  console.log(`${ids.length} luchadores · ${stages.length} escenarios`);
  let fails = 0;
  const t0 = Date.now();
  ids.forEach((id, i) => {
    const opp = ids[(i * 7 + 3) % ids.length];
    try { runMatch(NX, { fighters: [id, opp], stageId: stages[i % stages.length], frames: 2400, draw: 3 }); }
    catch (e) { fails++; console.log('FALLO', id, 'vs', opp, '\n', e.stack.split('\n').slice(0, 4).join('\n')); }
  });
  console.log(`${ids.length} partidas en ${Date.now() - t0} ms · fallos: ${fails}`);
}
