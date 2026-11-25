/* NEXUS CLASH — js/fighters/roster/12-zephyr.js · luchador 12 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, earsLong, windOf, scarf, tail, fighter } = NX.RosterLib;

  /* ======================================================================
   * 12 · ZEPHYR — Liebre del Vendaval (el más rápido del juego)
   * ==================================================================== */
  fighter({
    id: 'zephyr', name: 'Zephyr', title: 'Liebre del Vendaval',
    passive: 'Vendaval: la mayor velocidad de carrera del juego.',
    palette: { primary: '#2d7fd6', secondary: '#e9e4d8', skin: '#e9e4d8', head: '#e9e4d8', hand: '#e9e4d8', accent: '#7affd6', eye: '#2a1a3a', feet: '#d64a2a', legs: '#e9e4d8', arms: '#e9e4d8' },
    stats: { weight: 84, height: 78, width: 30, walk: 3.8, run: 11, dash: 10.5, dashFrames: 8, airSpeed: 4.2, gravity: 0.6, fall: 10, fastFall: 15, jump: 13.8, shortHop: 8.8, airJump: 12.6, traction: 0.4 },
    profile: { style: 'kick', reach: 1, power: 0.92, speed: 1.12, effect: 'wind' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 70, rushdown: true },
    rig: {
      headR: 12, torsoW: 18, hipW: 16, torsoH: 23, thigh: 16, shin: 16, legW: 8, armW: 6, footL: 13,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR, sway = -windOf(a.f) * 0.025 + Math.sin(a.f.tick * 0.1) * 0.05;
          earsLong(ctx, r, a.pal.head, '#ffc0c8', sway);
          R.disc(ctx, r * 0.95, r * 0.25, r * 0.13, '#ff8aa0', false);
        },
        back(ctx, a) { scarf(ctx, a, '#2fd6a8', 46); },
        tail(ctx, a) { tail(ctx, a, 'puff', '#ffffff'); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.5, -r.torsoH], [r.torsoW * 0.5, -r.torsoH], [r.hipW * 0.5, -r.torsoH * 0.35], [-r.hipW * 0.5, -r.torsoH * 0.35]], a.pal.primary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-1, -r.torsoH, 2, r.torsoH * 0.65);
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_side' || mv.frame < 8 || mv.frame > 36) return;
      ctx.save(); ctx.translate(f.x, f.y - f.h * 0.5);
      for (let i = 0; i < 5; i++) {
        const y = -f.h * 0.55 + i * f.h * 0.27, w = 22 + i * 5;
        ctx.strokeStyle = U.rgba(i % 2 ? '#7affd6' : '#e8fff6', 0.7); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, y, w, 6, 0, f.tick * 0.5 + i, f.tick * 0.5 + i + 4.2); ctx.stroke();
      }
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 34, pose: 'kick',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('slash', { pitch: 0.8 });
          shoot(f, {
            ox: 28, oy: -f.h * 0.5, speed: 10, r: 20, dmg: 6, ang: 45, bkb: 30, kbg: 55, life: 40, effect: 'wind', pierce: true, color: '#7affd6', glow: false,
            update(p) { p.vx *= 0.975; },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.vx), 1);
              ctx.globalAlpha = Math.min(1, p.life / 12);
              ctx.fillStyle = '#e8fff6'; ctx.strokeStyle = '#2fd6a8'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(-6, 0, p.r, -1.2, 1.2); ctx.arc(-14, 0, p.r * 0.85, 1.1, -1.1, true); ctx.closePath(); ctx.fill(); ctx.stroke();
              ctx.restore();
            }
          });
        }
      },
      side: {
        frames: 50, pose: 'spin', oncePerAir: true, drift: 0,
        vel: [{ f: [8, 32], vx: 10.5, vy: 0.4 }],
        hitboxes: [
          { f: [8, 32], x: 4, y: -40, r: 28, dmg: 1.6, rehit: 5, fkb: 30, bkb: 0, kbg: 100, ang: 70, effect: 'wind', dir: 'auto' },
          { f: [33, 35], x: 4, y: -40, r: 32, dmg: 6, ang: 55, bkb: 55, kbg: 80, effect: 'wind', group: 1 }],
        onFrame(f, fr) { if (fr % 6 === 2 && fr >= 8 && fr <= 32) NX.Audio.play('spin', { pitch: 1.2 }); }
      },
      up: {
        frames: 50, pose: 'rise', vel: [{ f: [4, 22], vy: -13.5 }],
        hitboxes: [{ f: [4, 10], x: 0, y: -40, r: 26, dmg: 7, ang: 88, bkb: 55, kbg: 70, effect: 'wind', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr !== 4) return;
          NX.Audio.play('spin', { pitch: 0.6 });
          f.spawnProjectile({
            x: f.x, y: f.y - 30, vx: 0, vy: 0, r: 48, life: 40, dmg: 1, windbox: true, push: 0, lift: 7, stageCollide: false,
            reflectable: false, absorbable: false, destructible: false, transcendent: true, pierce: true, glow: false,
            draw(ctx, p) {
              ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 15) * 0.6; ctx.strokeStyle = '#e8fff6'; ctx.lineWidth = 2;
              for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(p.x, p.y + 30 - i * 22 - (p.t * 3) % 22, 26 - i * 3, 6, 0, 0, TAU); ctx.stroke(); }
              ctx.restore();
            }
          });
        }
      },
      down: {
        frames: 40, pose: 'cast',
        hitboxes: [{ f: [8, 9], x: 34, y: -42, r: 26, dmg: 3, ang: 30, bkb: 40, kbg: 30, effect: 'wind' }],
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('spin', { pitch: 0.9 });
          shoot(f, {
            ox: 50, oy: -f.h * 0.5, speed: 2, r: 50, life: 24, dmg: 1, windbox: true, push: 7, stageCollide: false, reflectable: false,
            absorbable: false, destructible: false, transcendent: true, pierce: true, glow: false,
            update(p, m) {
              for (const q of m.projectiles) {
                if (q === p || !q.active || q.owner === p.owner || !q.reflectable || q.harmless) continue;
                if (U.dist(q.x, q.y, p.x, p.y) < p.r + q.r) q.reflect(p.owner, 1.2);
              }
            },
            draw(ctx, p) {
              ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 8) * 0.65; ctx.strokeStyle = '#7affd6'; ctx.lineWidth = 3;
              for (let i = 0; i < 4; i++) { const yy = p.y - 36 + i * 24; ctx.beginPath(); ctx.moveTo(p.x - 30 * p.facing, yy); ctx.quadraticCurveTo(p.x, yy - 10 + (p.t * 2 % 10), p.x + 34 * p.facing, yy + 4); ctx.stroke(); }
              ctx.restore();
            }
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
