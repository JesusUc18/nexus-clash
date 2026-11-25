/* NEXUS CLASH — js/fighters/roster/09-valkyr.js · luchador 09 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, fighter } = NX.RosterLib;

  /* ======================================================================
   * 09 · VALKYR-7 — Guardiana Autómata (zoner pesada)
   * ==================================================================== */
  fighter({
    id: 'valkyr', name: 'Valkyr-7', title: 'Guardiana Autómata',
    passive: 'Blindaje: dos reflectores en su kit.',
    palette: { primary: '#e8ecf2', secondary: '#2a3a5a', skin: '#9fb0c8', head: '#e8ecf2', hand: '#2a3a5a', accent: '#38d0ff', visor: '#38d0ff', feet: '#2a3a5a', legs: '#c9d2de', arms: '#c9d2de' },
    stats: { weight: 108, height: 90, width: 38, run: 6.2, airSpeed: 3.5, gravity: 0.55, fall: 9.6, jump: 13, airJump: 11.8 },
    profile: { style: 'fist', reach: 1.05, power: 1.02, speed: 0.96 },
    ai: { recovery: 'up', projectile: 'neutral', range: 230, zoner: true, reflect: 'down' },
    rig: {
      headR: 12, headH: 1.05, torsoW: 24, hipW: 20, torsoH: 28, armW: 8, legW: 10, handR: 5.5, eyes: 'visor', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.8, -r * 0.6], [-r * 0.2, -r * 1.75], [r * 0.25, -r * 0.95]], a.pal.accent);
          R.disc(ctx, -r * 0.35, r * 0.05, r * 0.3, a.pal.secondary);
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.98], [r.torsoW * 0.5, -r.torsoH * 0.98], [r.torsoW * 0.36, -r.torsoH * 0.6], [-r.torsoW * 0.36, -r.torsoH * 0.6]], '#c9d2de');
          const pulse = 0.6 + 0.4 * Math.sin(a.f.tick * 0.12);
          ctx.fillStyle = U.rgba('#38d0ff', pulse); ctx.beginPath(); ctx.arc(0, -r.torsoH * 0.58, 5, 0, TAU); ctx.fill();
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 6);
        },
        back(ctx, a) {
          const s = a.J.sh;
          R.poly(ctx, [[s.x - 14, s.y - 6], [s.x - 4, s.y - 8], [s.x - 6, s.y + 14], [s.x - 16, s.y + 10]], '#9fb0c8');
        }
      }
    },
    specials: {
      neutral: {
        frames: 44, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 16) return;
          NX.Audio.play('laser', { pitch: 0.5 });
          shoot(f, {
            ox: 20, oy: -f.h * 0.8, speed: 5.5 + f.input.x * f.facing * 1.5, vy: -10, gravity: 0.4, maxFall: 14, r: 10, dmg: 6, ang: 50, bkb: 30, kbg: 50,
            effect: 'fire', life: 140, passCollide: true, color: '#38d0ff', glow: false,
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
              R.ellipse(ctx, 0, 0, p.r * 1.3, p.r * 0.8, 0, '#d9dee6');
              ctx.fillStyle = '#38d0ff'; ctx.fillRect(-p.r * 0.2, -p.r * 0.8, 3, p.r * 1.6);
              ctx.restore();
            },
            onDestroy(p, why) { if (why !== 'out' && why !== 'replace') boom(p.owner, p.x, p.y, { r: 52, dmg: 11, ang: 60, bkb: 50, kbg: 75, effect: 'fire' }); }
          });
        }
      },
      side: {
        frames: 42, pose: 'guard', oncePerAir: true, drift: 0.2,
        vel: [{ f: [6, 18], vx: 8 }],
        reflect: { f: [6, 18], x: 26, y: -46, r: 36, mult: 1.3, color: '#38d0ff' },
        hitboxes: [{ f: [6, 18], x: 28, y: -46, r: 22, dmg: 10, ang: 50, bkb: 50, kbg: 70, effect: 'hit' }],
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('dash'); }
      },
      up: {
        frames: 48, pose: 'uppercut', vel: [{ f: [6, 22], vy: -13, vx: 1.5 }],
        hitboxes: [
          { f: [6, 12], x: 18, y: -72, r: 20, dmg: 12, ang: 82, bkb: 55, kbg: 85, effect: 'hit' },
          { f: [13, 22], x: 10, y: -72, r: 18, dmg: 6, ang: 80, bkb: 40, kbg: 70, effect: 'hit', group: 1 }],
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('fire', { pitch: 1.4 });
          if (fr >= 6 && fr <= 22 && fr % 2 === 0) f.fx('flame', f.x - f.facing * 10, f.y - f.h * 0.4, { scale: 1.1 });
        }
      },
      down: {
        frames: 56, pose: 'guard', gravity: 0.3,
        reflect: { f: [8, 40], x: 0, y: -46, r: 62, mult: 1.5, color: '#38d0ff' },
        hitboxes: [{ f: [8, 9], x: 0, y: -46, r: 52, dmg: 4, ang: 361, bkb: 60, kbg: 30, dir: 'auto', effect: 'elec' }],
        onFrame(f, fr) { if (fr === 8) NX.Audio.play('reflect'); }
      }
    }
  });

})(window.NX = window.NX || {});
