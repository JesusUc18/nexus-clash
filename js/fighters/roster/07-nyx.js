/* NEXUS CLASH — js/fighters/roster/07-nyx.js · luchador 07 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, earsPointy, scarf, tail, starDraw, cloudDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 07 · NYX — Gata Sombra (ligera y veloz)
   * Pasiva "Velo": tras la Bomba de Humo se vuelve casi invisible.
   * ==================================================================== */
  fighter({
    id: 'nyx', name: 'Nyx', title: 'Gata Sombra',
    passive: 'Velo: tras la Bomba de Humo es casi invisible.',
    palette: { primary: '#2b2b3a', secondary: '#121218', skin: '#2b2b3a', head: '#34344a', hand: '#34344a', accent: '#ff3b7a', eye: '#111', sclera: '#ffe14d', feet: '#121218', legs: '#1c1c28', arms: '#34344a' },
    stats: { weight: 76, height: 72, width: 30, walk: 3.4, run: 8.4, dash: 9, airSpeed: 4.4, gravity: 0.66, fall: 11, fastFall: 16.5, jump: 13.6, shortHop: 8.6, airJump: 12.6, traction: 0.62 },
    profile: { style: 'fist', reach: 0.95, power: 0.88, speed: 1.15, effect: 'slash' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 60, rushdown: true },
    onUpdate(f) {
      if (f.data.vanish > 0) { f.data.vanish--; f.tint = 'shadow'; if (f.data.vanish === 0) f.tint = null; }
    },
    onHurt(f) { f.data.vanish = 0; f.tint = null; },
    poseMod(f, p) { if (f.data.vanish > 0) return { alpha: p.alpha * (f.isHuman ? 0.4 : 0.22) }; return null; },
    rig: {
      headR: 13, headW: 1.05, torsoW: 17, hipW: 15, torsoH: 21, thigh: 14, shin: 14, legW: 8, armW: 6, handR: 4.5, footL: 9,
      mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          earsPointy(ctx, r, a.pal.head, '#ff8ab0');
          R.poly(ctx, [[-r * 0.2, r * 0.15], [r * 1.05, r * 0.05], [r * 0.85, r * 0.75], [-r * 0.1, r * 0.85]], a.pal.secondary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-r * 0.1, r * 0.12, r * 1.1, 2.5);
        },
        tail(ctx, a) { tail(ctx, a, 'thin', a.pal.head, a.pal.accent); },
        back(ctx, a) { scarf(ctx, a, a.pal.accent, 30); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.4, -r.torsoH * 0.9); ctx.lineTo(r.torsoW * 0.4, -r.torsoH * 0.2); ctx.stroke();
          ctx.fillStyle = '#121218'; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 4);
        },
        hand(ctx, a) {
          const h = a.J.haF; ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.2;
          for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(h.x + 2, h.y + i * 2.5); ctx.lineTo(h.x + 7, h.y + i * 3); ctx.stroke(); }
        }
      }
    },
    specials: {
      neutral: {
        frames: 28, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('slash', { pitch: 1.5 });
          [-1.1, 1.1].forEach(vy => shoot(f, { ox: 26, oy: -f.h * 0.55, speed: 13, vy, r: 8, dmg: 3, ang: 45, bkb: 15, kbg: 40, life: 34, effect: 'slash', color: '#cfd6e0', glow: false, draw: starDraw('#cfd6e0', 4) }));
        }
      },
      side: {
        frames: 40, pose: 'dashattack', oncePerAir: true, drift: 0, intangible: [6, 16],
        vel: [{ f: [6, 16], vx: 13, vy: 0 }, { f: [17, 22], vx: 3 }],
        hitboxes: [{ f: [6, 16], x: 6, y: -36, r: 24, dmg: 9, ang: 40, bkb: 45, kbg: 70, effect: 'slash' }],
        onFrame(f, fr) {
          if (fr === 6) { NX.Audio.play('slash'); f.tint = 'shadow'; }
          if (fr >= 6 && fr <= 16 && fr % 2 === 0) f.match.effects.list.push({ type: 'wisp', x: f.x - f.facing * 10, y: f.y - f.h / 2, vx: 0, vy: -0.3, life: 14, max: 14, size: 12, color: '#5a3a7a' });
          if (fr === 17 && !(f.data.vanish > 0)) f.tint = null;
        },
        onEnd(f) { if (!(f.data.vanish > 0)) f.tint = null; }
      },
      up: {
        frames: 40, pose: 'flip',
        vel: [{ f: [4, 12], vy: -12, vx: 3 }, { f: [16, 24], vy: -10, vx: 2 }],
        hitboxes: [
          { f: [4, 10], x: 10, y: -40, r: 20, dmg: 6, ang: 80, bkb: 45, kbg: 60, effect: 'slash' },
          { f: [16, 22], x: 10, y: -46, r: 22, dmg: 7, ang: 85, bkb: 50, kbg: 85, effect: 'slash', group: 1 }],
        onFrame(f, fr) { if (fr === 4 || fr === 16) { NX.Audio.play('airjump', { pitch: 1.3 }); f.fx('ring', f.x, f.y, { r: 20, color: '#ff3b7a' }); } }
      },
      down: {
        frames: 34, pose: 'kneel', intangible: [8, 14],
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('explosion', { pitch: 1.6 });
          f.spawnProjectile({
            x: f.x, y: f.y - f.h * 0.45, vx: 0, vy: 0, r: 62, life: 70, dmg: 3, ang: 60, fkb: 40, bkb: 0, kbg: 100, hits: 99, pierce: true,
            effect: 'dark', stageCollide: false, reflectable: false, absorbable: false, destructible: false, transcendent: true, dir: 'auto', glow: false,
            update(p) { if (p.t > 6) p.harmless = true; },
            draw: cloudDraw('#6a6a7a', 0.8)
          });
          f.data.vanish = 110;
        }
      }
    }
  });

})(window.NX = window.NX || {});
