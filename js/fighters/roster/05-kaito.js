/* NEXUS CLASH — js/fighters/roster/05-kaito.js · luchador 05 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, hairCap, headband, windOf, fighter } = NX.RosterLib;

  /* ======================================================================
   * 05 · KAITO REN — Puño de Jade (equilibrado, artes marciales)
   * ==================================================================== */
  fighter({
    id: 'kaito', name: 'Kaito Ren', title: 'Puño de Jade',
    passive: 'Disciplina: kit equilibrado con contraataque.',
    palette: { primary: '#1f8a5b', secondary: '#f0e6d2', skin: '#e2b48a', head: '#e2b48a', hand: '#e2b48a', accent: '#7dffb0', hair: '#1a1a1a', belt: '#111111', feet: '#f0e6d2', legs: '#145c3d', arms: '#e2b48a' },
    stats: { weight: 98, height: 82, width: 34, run: 7.2, airSpeed: 4.1 },
    profile: { style: 'fist', reach: 1, power: 1, speed: 1.05 },
    ai: { recovery: 'up', projectile: 'neutral', range: 70, counter: 'down' },
    rig: {
      headR: 12, torsoW: 22, hipW: 18, torsoH: 26,
      parts: {
        headBack(ctx, a) { const r = a.rig.headR; R.disc(ctx, -r * 0.55, -r * 0.95, r * 0.38, a.pal.hair); },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.5 });
          headband(ctx, r, '#c8202a', a.f.tick, windOf(a.f));
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.3, -r.torsoH); ctx.lineTo(r.torsoW * 0.1, -r.torsoH * 0.45); ctx.lineTo(r.torsoW * 0.35, -r.torsoH); ctx.stroke();
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2 - 1, -7, r.hipW + 2, 6);
          ctx.fillRect(-r.hipW / 2 - 4, -5, 5, 12);
        }
      }
    },
    specials: {
      neutral: {
        frames: 38, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('magic', { pitch: 0.9 });
          shoot(f, {
            ox: 30, speed: 9, r: 13, dmg: 7, ang: 45, bkb: 35, kbg: 55, effect: 'magic', life: 50, color: '#7dffb0', trail: 5,
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.vx), 1);
              ctx.globalAlpha = 0.4; R.disc(ctx, 0, 0, p.r * 1.5, '#7dffb0', false); ctx.globalAlpha = 1;
              R.ellipse(ctx, 2, 0, p.r, p.r * 0.75, 0, '#bfffd9');
              ctx.fillStyle = '#1f8a5b'; for (let i = 0; i < 4; i++) ctx.fillRect(p.r * 0.2, -p.r * 0.55 + i * p.r * 0.3, p.r * 0.7, 2);
              ctx.restore();
            }
          });
        }
      },
      side: {
        frames: 44, pose: 'kick', oncePerAir: true, drift: 0,
        vel: [{ f: [6, 20], vx: 9, vy: 0 }],
        hitboxes: [
          { f: [6, 14], x: 28, y: -42, r: 17, dmg: 2.5, rehit: 4, fkb: 35, bkb: 0, kbg: 100, ang: 30, effect: 'hit' },
          { f: [16, 20], x: 32, y: -42, r: 20, dmg: 8, ang: 40, bkb: 50, kbg: 85, effect: 'hit', group: 1 }],
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('dash'); if (fr >= 6 && fr <= 20 && fr % 2 === 0) f.fx('sparkle', f.x - f.facing * 16, f.y - f.h / 2, { color: '#7dffb0' }); }
      },
      up: {
        frames: 46, pose: 'spin', vel: [{ f: [4, 20], vy: -12.5, vx: 2 }],
        hitboxes: [
          { f: [4, 10], x: 0, y: -52, r: 24, dmg: 10, ang: 85, bkb: 55, kbg: 80, effect: 'hit', dir: 'auto' },
          { f: [11, 20], x: 0, y: -52, r: 22, dmg: 5, ang: 80, bkb: 40, kbg: 70, effect: 'hit', group: 1, dir: 'auto' }],
        onFrame(f, fr) { if (fr === 4) NX.Audio.play('spin'); }
      },
      down: {
        frames: 50, pose: 'counter',
        counter: { f: [6, 26], mult: 1.3, range: 150, hit: { ang: 40, bkb: 60, kbg: 82, effect: 'magic' } }
      }
    }
  });

})(window.NX = window.NX || {});
