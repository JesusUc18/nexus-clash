/* NEXUS CLASH — js/fighters/roster/20-hexa.js · luchador 20 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, nearestFoe, steer, tail, wingPair, torsoStripes, boltDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 20 · HEXA — Caballero Avispa (veneno, 3 saltos aéreos)
   * ==================================================================== */
  fighter({
    id: 'hexa', name: 'Hexa', title: 'Caballero Avispa',
    passive: 'Veneno: sus especiales envenenan (daño continuo).',
    palette: { primary: '#f2c230', secondary: '#1b1b1b', skin: '#d9a87a', head: '#f2c230', hand: '#1b1b1b', accent: '#9aff6a', visor: '#7a1a1a', feet: '#1b1b1b', legs: '#1b1b1b', arms: '#f2c230', belt: '#1b1b1b' },
    stats: { weight: 84, height: 80, width: 32, run: 7.2, airSpeed: 4.3, gravity: 0.52, fall: 9, airJump: 11.5, airJumps: 3, airJumpDecay: 0.05 },
    profile: { style: 'sword', reach: 1.25, power: 0.95, speed: 1.05 },
    ai: { recovery: 'up', projectile: 'neutral', range: 110, extraJumps: true },
    flipJump: false,
    rig: {
      headR: 12, torsoW: 20, hipW: 16, torsoH: 25, thigh: 15, shin: 15, armW: 6.5, eyes: 'visor', mouth: false,
      weapon: { type: 'sword', len: 62, w: 5, trail: '#fff07a' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.fillStyle = '#1b1b1b';
          ctx.fillRect(-r * 0.9, -r * 0.62, r * 1.8, r * 0.2); ctx.fillRect(-r * 0.95, r * 0.3, r * 1.9, r * 0.2);
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
          for (const [sx, k] of [[0.1, 1], [-0.35, 0.85]]) {
            ctx.beginPath(); ctx.moveTo(r * sx, -r * 0.9); ctx.quadraticCurveTo(r * (sx + 0.4) * k, -r * 1.9, r * (sx + 0.9), -r * 1.8); ctx.stroke();
            R.disc(ctx, r * (sx + 0.9), -r * 1.8, 2.5, '#1b1b1b');
          }
        },
        back(ctx, a) {
          const f = a.f, flap = f.ground ? Math.sin(f.tick * 0.2) * 0.1 : Math.sin(f.tick * 1.6) * 0.45;
          ctx.save(); ctx.globalAlpha = 0.55; wingPair(ctx, a, '#dff4ff', '#9ad4ff', 30, flap); ctx.restore();
        },
        tail(ctx, a) {
          const h = a.J.hip;
          ctx.save(); ctx.translate(h.x - 10, h.y - 2); ctx.rotate(0.5);
          R.ellipse(ctx, -6, 6, 11, 7, 0, '#f2c230');
          ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-12, 3, 4, 7); ctx.fillRect(-4, 2, 4, 9);
          R.poly(ctx, [[-17, 4], [-25, 8], [-16, 9]], '#1b1b1b');
          ctx.restore();
        },
        torso(ctx, a) { torsoStripes(ctx, a, '#1b1b1b', 3); },
        weapon(ctx, f, w) {
          ctx.fillStyle = '#c0c8d2'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.rect(-2, -10, 4, w.len - 14); ctx.fill(); ctx.stroke();
          ctx.save(); ctx.translate(0, w.len - 24);
          R.poly(ctx, [[-6, 0], [6, 0], [3, 14], [-3, 14]], '#f2c230');
          ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-5, 4, 10, 3);
          R.poly(ctx, [[-3, 14], [3, 14], [0, 26]], '#1b1b1b');
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 28, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('laser', { pitch: 2 });
          shoot(f, { ox: 30, oy: -f.h * 0.55, speed: 14, r: 6, dmg: 4, ang: 40, bkb: 15, kbg: 30, life: 40, effect: 'hit',
            burn: { frames: 150, dmg: 1, kind: 'poison' }, color: '#9aff6a', glow: false, draw: boltDraw('#9aff6a', 10) });
        }
      },
      side: {
        frames: 42, pose: 'dashattack', oncePerAir: true, drift: 0, landingLag: 14,
        hitboxes: [{ f: [8, 20], x: 34, y: -32, r: 20, dmg: 11, ang: 45, bkb: 40, kbg: 80, effect: 'slash', burn: { frames: 90, dmg: 1, kind: 'poison' } }],
        onStart(f, mv) { mv.data.air = !f.ground; NX.Audio.play('spin', { pitch: 1.8 }); },
        onFrame(f, fr, mv) {
          if (fr >= 8 && fr <= 20) {
            f.vx = f.facing * (mv.data.air ? 9 : 11); mv.velX = true;
            if (mv.data.air) { f.vy = 7; mv.velY = true; }
          }
        },
        onLand(f, mv) { if (mv.data.air) { f.endMoveCleanup(true); f.startLand(14); } return 'continue'; }
      },
      up: {
        frames: 56, pose: 'rise', helplessLag: 16,
        hitboxes: [{ f: [4, 42], x: 0, y: -50, r: 26, dmg: 1, rehit: 6, fkb: 20, bkb: 0, kbg: 100, ang: 80, effect: 'hit', dir: 'auto' }],
        onFrame(f, fr, mv) {
          if (fr < 4 || fr > 42) return;
          const I = f.input;
          let x = I.x, y = I.y;
          const a = Math.hypot(x, y) < 0.3 ? 0 : Math.atan2(x, -y);
          f.vx = Math.sin(a) * 6.8; f.vy = -Math.cos(a) * 6.8; mv.velX = mv.velY = true;
          if (Math.abs(x) > 0.3) f.facing = Math.sign(x);
          if (fr % 5 === 0) NX.Audio.play('spin', { pitch: 2.2 });
        }
      },
      down: {
        frames: 40, pose: 'roar',
        canUse: f => !(f.data.drones || []).some(d => d.active),
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('spin', { pitch: 2.5 });
          f.data.drones = [0, 1, 2].map(i => f.spawnProjectile({
            x: f.x, y: f.y - f.h * 0.6, vx: 0, vy: 0, r: 7, life: 160, dmg: 3, ang: 60, bkb: 20, kbg: 35, effect: 'hit',
            burn: { frames: 60, dmg: 1, kind: 'poison' }, stageCollide: false, glow: false, data: { i },
            update(p) {
              const o = p.owner;
              if (p.t < 30) {
                const ang = p.t * 0.2 + p.data.i * 2.1;
                p.x = o.x + Math.cos(ang) * 40; p.y = o.y - o.h * 0.6 + Math.sin(ang) * 18; p.vx = 0; p.vy = 0;
                return;
              }
              if (!p.data.go) {
                p.data.go = true;
                const t = nearestFoe(o, p.x, p.y, 900);
                const a = t ? Math.atan2(t.y - t.h / 2 - p.y, t.x - p.x) : (o.facing > 0 ? 0 : PI);
                p.vx = Math.cos(a) * 7; p.vy = Math.sin(a) * 7;
              }
              steer(p, 0.08, 900);
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y);
              ctx.globalAlpha = 0.6; ctx.fillStyle = '#e6f6ff';
              const fl = Math.abs(Math.sin(p.t * 1.5)) * 4 + 2;
              ctx.beginPath(); ctx.ellipse(-2, -5, 3, fl, -0.4, 0, TAU); ctx.ellipse(3, -5, 3, fl, 0.4, 0, TAU); ctx.fill();
              ctx.globalAlpha = 1; R.ellipse(ctx, 0, 0, 6, 4, 0, '#f2c230');
              ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-1, -4, 2, 8);
              ctx.restore();
            }
          }));
        }
      }
    }
  });

})(window.NX = window.NX || {});
