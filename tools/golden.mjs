// Huella determinista del motor: node tools/golden.mjs [--write]
// Compara el resultado de partidas de bots con semilla fija contra tools/golden.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadEngine, runMatch } from './sim.mjs';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'golden.json');
const out = {};
const probe = loadEngine({ seed: 1 });
const ids = probe.ROSTER.map(d => d.id), stages = probe.STAGES.map(s => s.id);
const cases = [];
ids.forEach((id, i) => cases.push({ name: `1v1 ${id}`, fighters: [id, ids[(i * 7 + 3) % ids.length]], stageId: stages[i % stages.length], frames: 2400 }));
for (let i = 0; i < 8; i++) cases.push({ name: `ffa ${i}`, fighters: [0, 1, 2, 3].map(k => ids[(i * 5 + k * 9) % ids.length]), stageId: stages[i % stages.length], frames: 2400 });
cases.push({ name: 'horde', mode: 'horde', fighters: [ids[0], ids[5]], stageId: stages[0], frames: 3000 });
cases.push({ name: 'mirror', fighters: [ids[24], ids[24]], stageId: stages[3], frames: 2400 });

for (const c of cases) {
  const NX = loadEngine({ seed: 1234 });
  const r = runMatch(NX, Object.assign({ draw: 2 }, c));
  out[c.name] = crypto.createHash('sha1').update(JSON.stringify(r)).digest('hex').slice(0, 16);
}
if (process.argv.includes('--write')) { fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n'); console.log('golden.json escrito:', Object.keys(out).length, 'casos'); }
else {
  const ref = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const bad = Object.keys(ref).filter(k => ref[k] !== out[k]);
  console.log(bad.length ? 'DIFERENCIAS: ' + bad.join(', ') : `OK · ${Object.keys(ref).length} casos idénticos`);
  process.exitCode = bad.length ? 1 : 0;
}
