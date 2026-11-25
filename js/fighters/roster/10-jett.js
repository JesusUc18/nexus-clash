/* NEXUS CLASH — js/fighters/roster/10-jett.js · luchador 10 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, spikes, goggles, fighter } = NX.RosterLib;

  /* ======================================================================
   * 10 · JETT — Piloto Ígnea (rushdown de caída rápida)
   * ==================================================================== */
  fighter({
    id: 'jett', name: 'Jett', title: 'Piloto Ígnea',
    passive: 'Botas propulsoras: la caída más rápida del plantel.',
    palette: { primary: '#d62a2a', secondary: '#1b1b22', skin: '#c48a5e', head: '#c48a5e', hand: '#1b1b22', accent: '#ffb030', hair: '#f2f2f2', feet: '#3a3a44', legs: '#1b1b22', arms: '#d62a2a', belt: '#1b1b22' },
    stats: { weight: 82, height: 80, width: 32, walk: 3.4, run: 8.0, dash: 8.6, airSpeed: 4.0, gravity: 0.78, fall: 12.5, fastFall: 18, jump: 15.2, shortHop: 9.6, airJump: 13.6, traction: 0.65 },
    profile: { style: 'kick', reach: 0.95, power: 0.94, speed: 1.18 },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 60, rushdown: true },
    rig: {
      headR: 12, torsoW: 20, hipW: 17, torsoH: 24, thigh: 15, shin: 15, footL: 12,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          spikes(ctx, r, a.pal.hair, 9, 0.35, PI * 1.0, PI * 2.05);
          goggles(ctx, r, '#3a3a44', '#ffb030', -r * 0.7);
        },
        back(ctx, a) {
          const s = a.J.sh;
          R.poly(ctx, [[s.x - 8, s.y - 4], [s.x - 22, s.y + 2], [s.x - 18, s.y + 16], [s.x - 6, s.y + 12]], '#3a3a44');
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.62, r.torsoW, 3);
          R.disc(ctx, r.torsoW * 0.22, -r.torsoH * 0.82, 3, '#ffe14d');
        },
        front(ctx, a) {
          const f = a.f;
          if (f.ground || f.vy + f.lvy > 1) return;
          for (const ft of [a.J.ftF, a.J.ftB]) {
            ctx.save(); ctx.globalAlpha = 0.85;
            const g = ctx.createLinearGradient(ft.x, ft.y, ft.x, ft.y + 18);
            g.addColorStop(0, '#fff6c0'); g.addColorStop(1, 'rgba(255,90,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ft.x - 4, ft.y + 2); ctx.lineTo(ft.x + 4, ft.y + 2); ctx.lineTo(ft.x, ft.y + 16 + Math.random() * 6); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
        }
      }
    },
    specials: {
      neutral: {
        frames: 30, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 9) return;
          NX.Audio.play('laser', { pitch: 0.8 });
          shoot(f, {
            ox: 28, speed: 10, vy: 1.2, r: 8, dmg: 5, ang: 50, bkb: 30, kbg: 50, life: 50, effect: 'fire', trail: 6, color: '#ffb030', glow: false,
            update(p) { p.vx *= 1.03; },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
              R.poly(ctx, [[12, 0], [4, -4], [-8, -4], [-11, -7], [-11, 7], [-8, 4], [4, 4]], '#d9dee6');
              ctx.fillStyle = '#d62a2a'; ctx.fillRect(4, -4, 4, 8);
              ctx.restore();
            },
            onDestroy(p, why) { if (why !== 'out') boom(p.owner, p.x, p.y, { r: 30, dmg: 4, ang: 50, bkb: 30, kbg: 40, effect: 'fire' }); }
          });
        }
      },
      side: {
        frames: 40, pose: 'dashattack', oncePerAir: true, drift: 0,
        vel: [{ f: [6, 18], vx: 14, vy: 0 }, { f: [19, 24], vx: 4 }],
        hitboxes: [{ f: [6, 18], x: 10, y: -40, r: 22, dmg: 8, ang: 361, bkb: 40, kbg: 70, effect: 'fire' }],
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('fire', { pitch: 1.2 });
          if (fr >= 6 && fr <= 18) f.fx('flame', f.x - f.facing * 22, f.y - f.h * 0.4, { scale: 1.3 });
        }
      },
      up: {
        frames: 50, pose: 'rise',
        onStart(f, mv) { mv.data.vx = U.clamp(f.input.x, -1, 1) * 3; },
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 20) {
            f.vy = -14; f.vx = mv.data.vx; mv.velX = mv.velY = true;
            f.fx('flame', f.x + U.rand(-8, 8), f.y + 6, { scale: 1.4 });
          }
          if (fr === 5) NX.Audio.play('fire');
        },
        hitboxes: [
          { f: [5, 20], x: 0, y: 2, r: 22, dmg: 2, rehit: 4, fkb: 25, bkb: 0, kbg: 100, ang: 90, effect: 'fire' },
          { f: [21, 23], x: 0, y: -44, r: 28, dmg: 6, ang: 80, bkb: 50, kbg: 80, effect: 'fire', group: 1, dir: 'auto' }]
      },
      down: {
        frames: 40, pose: 'roar',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('explosion', { pitch: 1.8 });
          f.fx('flash', 0, 0, { color: '#fff3c0', alpha: 0.35, life: 8 });
          f.fx('ring', f.x, f.y - f.h / 2, { r: 70, color: '#fff3c0', w: 8 });
          f.spawnProjectile({ x: f.x + f.facing * 10, y: f.y - f.h / 2, vx: 0, vy: 0, r: 58, life: 5, dmg: 4, ang: 80, fkb: 20, bkb: 0, kbg: 100, stun: 40,
            effect: 'fire', dir: 'auto', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false, draw() {} });
        }
      }
    }
  });

})(window.NX = window.NX || {});
