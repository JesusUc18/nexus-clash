/* NEXUS CLASH — js/fighters/roster/23-volta.js · luchador 23 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, spikes, fighter } = NX.RosterLib;

  /* ======================================================================
   * 23 · VOLTA — Inventora Galvánica (electricidad e imanes)
   * ==================================================================== */
  function chainZap(f, from, range, dmg, exclude) {
    let best = null, bd = range;
    for (const t of f.opponents()) {
      if (exclude.indexOf(t) >= 0 || !t.canBeHit()) continue;
      const d = U.dist(from.x, from.y, t.x, t.y - t.h / 2);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) return null;
    const to = { x: best.x, y: best.y - best.h / 2 };
    f.fx('bolt', from.x, from.y, { x2: to.x, y2: to.y, color: '#5fd0ff', life: 12 });
    if (best.isShielding()) { best.shieldHP -= dmg * 1.2; f.fx('ring', to.x, to.y, { r: 30, color: best.color }); NX.Audio.play('shieldHit'); }
    else f.hitTarget(best, { dmg, ang: 45, bkb: 35, kbg: 50, effect: 'elec' }, { dir: U.sign(best.x - from.x), x: to.x, y: to.y });
    exclude.push(best);
    return to;
  }
  fighter({
    id: 'volta', name: 'Volta', title: 'Inventora Galvánica',
    passive: 'Rayo encadenado: su descarga salta entre varios rivales.',
    palette: { primary: '#f4f6f8', secondary: '#2a3a5a', skin: '#f0c8a8', head: '#f0c8a8', hand: '#c87a3a', arms: '#f4f6f8', legs: '#2a3a5a', feet: '#3a2a1a', accent: '#5fd0ff', hair: '#ff8a3a', eye: '#2a3a5a', belt: '#c87a3a' },
    stats: { weight: 90, height: 80, width: 32, run: 7.0, airSpeed: 3.9 },
    profile: { style: 'magic', reach: 1, power: 0.98, speed: 1.02, effect: 'elec' },
    ai: { recovery: 'up', projectile: 'neutral', range: 160, zoner: true },
    rig: {
      headR: 12, torsoW: 20, hipW: 20, torsoH: 25, armW: 6.5,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          spikes(ctx, r * 1.05, a.pal.hair, 13, 0.45, PI * 0.85, PI * 2.15);
          if (a.f.tick % 30 < 4) { ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(-r * 0.7, -r * 1.4); ctx.lineTo(-r * 0.4, -r * 1.1); ctx.stroke(); }
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.08, r * 0.24, 0, TAU); ctx.stroke();
        },
        back(ctx, a) {
          const s = a.J.sh, t = a.f.tick;
          ctx.save(); ctx.translate(s.x - 14, s.y + 6); ctx.rotate(a.J.lean);
          R.poly(ctx, [[-9, -12], [9, -12], [9, 16], [-9, 16]], '#c87a3a');
          for (const x of [-5, 5]) { R.limb(ctx, [{ x, y: -12 }, { x, y: -26 }], 3, '#8a5a2a'); R.disc(ctx, x, -28, 3.5, '#5fd0ff'); }
          if (t % 12 < 6) { ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-5, -28); ctx.lineTo(-1, -32); ctx.lineTo(1, -26); ctx.lineTo(5, -28); ctx.stroke(); }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.7, 16], [-r.hipW * 0.7, 16]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.torsoW * 0.12, -r.torsoH, r.torsoW * 0.24, r.torsoH * 0.9);
          ctx.fillStyle = '#d62a2a'; ctx.fillRect(r.torsoW * 0.22, -r.torsoH * 0.7, 2, 6); ctx.fillStyle = '#2a7ad6'; ctx.fillRect(r.torsoW * 0.28, -r.torsoH * 0.7, 2, 6);
        }
      }
    },
    specials: {
      neutral: {
        frames: 40, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('elec');
          const from = f.localToWorld(30, -f.h * 0.55);
          let first = null, bd = 260;
          for (const t of f.opponents()) {
            const dx = (t.x - f.x) * f.facing;
            if (dx < 0 || dx > 260 || Math.abs(t.y - f.y) > 100 || !t.canBeHit()) continue;
            if (dx < bd) { bd = dx; first = t; }
          }
          if (!first) { f.fx('bolt', from.x, from.y, { x2: from.x + f.facing * 200, y2: from.y + U.rand(-20, 20), color: '#5fd0ff', life: 10 }); return; }
          const p1 = chainZap(f, from, 400, 8, f.opponents().filter(o => o !== first));
          if (p1) chainZap(f, p1, 220, 5, [first]);
        }
      },
      side: {
        frames: 44, pose: 'cast',
        hitboxes: [{ f: [26, 28], x: 50, y: -45, r: 34, dmg: 7, ang: 50, bkb: 45, kbg: 70, effect: 'elec' }],
        onFrame(f, fr) {
          if (fr === 8) {
            NX.Audio.play('beam', { pitch: 0.4 });
            shoot(f, {
              ox: 120, oy: -f.h * 0.5, speed: 0, r: 110, life: 18, dmg: 0, harmless: true, stageCollide: false, reflectable: false,
              absorbable: false, destructible: false, transcendent: true, pierce: true, glow: false,
              update(p, m) {
                const o = p.owner;
                for (const t of m.fighters) {
                  if (t === o || !t.inPlay() || !t.canBeHit()) continue;
                  if (U.dist(t.x, t.y - t.h / 2, p.x, p.y) > p.r) continue;
                  const d = t.x - o.x;
                  if (Math.abs(d) > 46) t.lvx = U.approach(t.lvx, -Math.sign(d) * 4.5, 0.9);
                  else t.lvx *= 0.5;
                }
              },
              draw(ctx, p) {
                ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 6) * 0.6; ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) { const rr = p.r * (1 - ((p.t * 0.06 + i / 3) % 1)); ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke(); }
                ctx.restore();
              }
            });
          }
          if (fr === 26) NX.Audio.play('elec');
        }
      },
      up: {
        frames: 48, pose: 'rise', vel: [{ f: [6, 22], vy: -13, vx: 1.5 }],
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('elec');
          if (fr >= 6 && fr <= 22 && fr % 3 === 0) {
            f.spawnProjectile({ x: f.x, y: f.y + 6, vx: 0, vy: 0, r: 15, life: 20, dmg: 3, ang: 90, fkb: 30, bkb: 0, kbg: 100, effect: 'elec',
              stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false,
              draw(ctx, p) { ctx.save(); ctx.globalAlpha = p.life / 20; ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 8); ctx.lineTo(p.x + 3, p.y - 2); ctx.lineTo(p.x - 3, p.y + 2); ctx.lineTo(p.x + 8, p.y + 8); ctx.stroke(); ctx.restore(); } });
          }
        }
      },
      down: {
        frames: 50, pose: 'roar',
        hitboxes: [{ f: [16, 22], x: 0, y: -45, r: 64, dmg: 11, ang: 70, bkb: 50, kbg: 80, effect: 'elec', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr < 16 && fr % 3 === 0) f.fx('sparkle', f.x + U.rand(-20, 20), f.y - U.rand(10, f.h), { color: '#5fd0ff' });
          if (fr === 16) {
            NX.Audio.play('elec'); NX.Audio.play('explosion', { pitch: 1.5 });
            for (let i = 0; i < 6; i++) { const a = i * TAU / 6; f.fx('bolt', f.x, f.y - f.h / 2, { x2: f.x + Math.cos(a) * 70, y2: f.y - f.h / 2 + Math.sin(a) * 70, color: '#5fd0ff', life: 10 }); }
          }
        }
      }
    }
  });

})(window.NX = window.NX || {});
