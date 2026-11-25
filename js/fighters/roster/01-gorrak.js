/* NEXUS CLASH — js/fighters/roster/01-gorrak.js · luchador 01 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, groundWave, rockDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 01 · GORRAK — Coloso de Roca (superpesado)
   * Pasiva "Piel de Piedra": recibe un 10% menos de daño.
   * ==================================================================== */
  const gorrakShard = (p, x, y, vx) => p.owner.spawnProjectile({
    x, y, vx, vy: -5, gravity: 0.5, r: 7, dmg: 3, ang: 70, bkb: 20, kbg: 40, life: 40, effect: 'hit', glow: false,
    draw: rockDraw('#6f6a63'), onDestroy(q, w, m) { m.effects.spawn('debris', q.x, q.y, { n: 3, color: '#6f6a63' }); }
  });
  fighter({
    id: 'gorrak', name: 'Gorrak', title: 'Coloso de Roca',
    passive: 'Piel de Piedra: recibe un 10% menos de daño.',
    palette: { primary: '#6f6a63', secondary: '#45413b', skin: '#8a837a', head: '#8a837a', hand: '#7a736a', accent: '#ff7a1a', eye: '#ffb030', feet: '#3a3632', legs: '#5a554e', arms: '#7a736a' },
    stats: { weight: 138, height: 104, width: 50, walk: 2.4, run: 5.6, dash: 6.2, airSpeed: 3.4, airAccel: 0.26, gravity: 0.62, fall: 11, fastFall: 15.5, jump: 13.8, shortHop: 8.9, airJump: 12.8, traction: 0.62 },
    profile: { style: 'heavy', reach: 1.15, power: 1.15, speed: 0.9 },
    onIncoming: (f, dmg) => dmg * 0.9,
    ai: { recovery: 'up', projectile: 'neutral', range: 75, heavy: true },
    rig: {
      torsoW: 40, hipW: 32, torsoH: 30, torsoRound: 10, headR: 12, headW: 1.15, neck: 0, shoulderY: 6,
      upperArm: 17, foreArm: 16, armW: 14, handR: 9, thigh: 15, shin: 13, legW: 15, footL: 15, footH: 8,
      eyes: 'glow', mouth: false,
      parts: {
        back(ctx, a) {
          const t = a.J.top;
          [[-6, 2, 1], [-14, 8, 0.8], [2, 0, 0.7]].forEach(([dx, dy, k]) => {
            R.poly(ctx, [[t.x + dx - 6 * k, t.y + dy + 4], [t.x + dx - 2, t.y + dy - 22 * k], [t.x + dx + 5 * k, t.y + dy + 4]], '#9a5cff');
          });
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2; ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(a.f.tick * 0.1);
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.1, -r.torsoH * 0.9); ctx.lineTo(r.torsoW * 0.05, -r.torsoH * 0.6);
          ctx.lineTo(-r.torsoW * 0.15, -r.torsoH * 0.4); ctx.lineTo(r.torsoW * 0.1, -r.torsoH * 0.12);
          ctx.moveTo(r.torsoW * 0.05, -r.torsoH * 0.6); ctx.lineTo(r.torsoW * 0.3, -r.torsoH * 0.55); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-r.hipW / 2, -5, r.hipW, 5);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.95, -r * 0.4], [r * 1.25, -r * 0.6], [r * 1.1, -r * 0.18], [-r * 0.6, -r * 0.12]], a.pal.secondary);
          R.poly(ctx, [[r * 0.1, r * 0.55], [r * 1.05, r * 0.35], [r * 0.85, r * 0.85], [r * 0.1, r * 0.95]], a.pal.secondary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.1); ctx.lineTo(-r * 0.2, r * 0.45); ctx.lineTo(-r * 0.4, r * 0.8); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 18) return;
          NX.Audio.play('swing', { size: 1.5 });
          shoot(f, {
            ox: 16, oy: -f.h * 0.95, speed: 6.5, vy: -6, gravity: 0.38, maxFall: 14, r: 17, dmg: 13, ang: 45, bkb: 40, kbg: 85,
            effect: 'heavy', life: 120, destructible: false, absorbable: false, color: '#8a837a', glow: false, draw: rockDraw('#8a837a'),
            onDestroy(p, why, m) {
              m.effects.spawn('debris', p.x, p.y, { n: 10, color: '#7a736a' }); NX.Audio.play('stomp');
              if (why === 'stage' || why === 'hit') for (let i = -1; i <= 1; i++) gorrakShard(p, p.x, p.y - 8, i * 4);
            }
          });
        }
      },
      side: {
        frames: 48, pose: 'dashattack', oncePerAir: true, drift: 0, gravity: 0.3,
        armor: { f: [6, 24], kb: 110 }, vel: [{ f: [8, 24], vx: 8.5 }],
        hitboxes: [{ f: [8, 24], x: 28, y: -62, r: 28, dmg: 14, ang: 40, bkb: 55, kbg: 80, effect: 'heavy' }],
        onFrame(f, fr) {
          if (fr === 8) NX.Audio.play('dash');
          if (fr >= 8 && fr <= 24 && fr % 3 === 0 && f.ground) f.fx('dust', f.x - f.facing * 20, f.y, { n: 2, vx: -f.facing * 3 });
        }
      },
      up: {
        frames: 54, pose: 'rise', vel: [{ f: [6, 22], vy: -14, vx: 1.5 }],
        hitboxes: [
          { f: [5, 12], x: 0, y: -10, r: 34, dmg: 10, ang: 85, bkb: 60, kbg: 70, effect: 'fire', dir: 'auto' },
          { f: [13, 22], x: 8, y: -100, r: 24, dmg: 6, ang: 80, bkb: 45, kbg: 80, effect: 'heavy', group: 1 }],
        onStart(f) { NX.Audio.play('explosion', { pitch: 0.6 }); f.fx('debris', f.x, f.y, { n: 10, color: '#7a736a' }); },
        onFrame(f, fr) { if (fr <= 22 && fr % 2 === 0) f.fx('flame', f.x + U.rand(-14, 14), f.y + 6, { scale: 1.4 }); }
      },
      down: {
        frames: 50, pose: 'stomp',
        hitboxes: [{ f: [16, 18], x: 0, y: -12, r: 46, dmg: 12, ang: 80, bkb: 55, kbg: 70, effect: 'heavy', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr !== 16) return;
          groundWave(f, 1, { dmg: 8, color: '#a89a88' }); groundWave(f, -1, { dmg: 8, color: '#a89a88' });
          f.fx('shockwave', f.x, f.y, { r: 170 }); NX.Audio.play('stomp'); f.match.camera.shake(12);
        }
      },
      down_air: {
        frames: 40, pose: 'slam', vel: [{ f: [1, 8], vy: -3 }],
        hitboxes: [{ f: [9, 30], x: 0, y: 4, r: 30, dmg: 13, ang: 280, bkb: 30, kbg: 85, effect: 'heavy', meteor: true }],
        onStart(f, mv) { mv.noDrift = true; f.vx *= 0.3; },
        onFrame(f, fr, mv) {
          if (fr > 8) { f.vy = 16; mv.velY = true; }
          if (fr === 30 && !f.ground) mv.frame = 29;
        },
        onLand(f) {
          boom(f, f.x, f.y - 12, { r: 70, dmg: 11, ang: 70, bkb: 55, kbg: 70, effect: 'heavy' });
          groundWave(f, 1, { dmg: 7, color: '#a89a88' }); groundWave(f, -1, { dmg: 7, color: '#a89a88' });
          f.endMoveCleanup(true); f.startLand(22);
          return 'continue';
        }
      }
    }
  });

})(window.NX = window.NX || {});
