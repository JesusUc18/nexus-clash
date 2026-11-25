/* NEXUS CLASH — js/fighters/roster/15-brakk.js · luchador 15 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, groundAt, rockDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 15 · BRAKK — Gladiador de Hierro (brawler pesado)
   * Pasiva "Impulso de Combo": golpes encadenados (≤70 f) suben su daño
   * un 3% por acierto hasta +15%.
   * ==================================================================== */
  fighter({
    id: 'brakk', name: 'Brakk', title: 'Gladiador de Hierro',
    passive: 'Impulso de Combo: cada golpe encadenado suma +3% de daño (máx. +15%).',
    palette: { primary: '#8a2a1a', secondary: '#3a3a3a', skin: '#b07a52', head: '#b07a52', hand: '#c0c4cc', accent: '#e0e0e0', hair: '#2a1a12', feet: '#2a1a12', legs: '#3a3a3a', arms: '#b07a52', belt: '#5a3a20' },
    stats: { weight: 115, height: 92, width: 42, walk: 3, run: 6.3, dash: 6.9, airSpeed: 3.5, gravity: 0.6, fall: 10.2, jump: 13.2, airJump: 12 },
    profile: { style: 'fist', reach: 1.05, power: 1.08, speed: 0.97 },
    ai: { recovery: 'up', projectile: 'neutral', range: 75, heavy: true },
    init(f) { f.data.combo = 0; f.data.comboT = 0; },
    onLifeReset(f) { f.data.combo = 0; f.data.comboT = 0; },
    onHitConfirm(f) { f.data.combo = Math.min(5, (f.data.combo || 0) + 1); f.data.comboT = 70; },
    damageMod(f) { return 1 + 0.03 * (f.data.combo || 0); },
    onUpdate(f) { if (f.data.comboT > 0 && --f.data.comboT === 0) f.data.combo = 0; },
    onDamaged(f, d) { if (f.move && f.move.def.key === 'special_down') f.move.data.abs = (f.move.data.abs || 0) + d; },
    rig: {
      torsoW: 32, hipW: 26, torsoH: 29, torsoRound: 9, headR: 12.5, armW: 11, upperArm: 15, foreArm: 14, handR: 7,
      legW: 12, thigh: 15, shin: 14, footL: 13, brows: true,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.6, -r * 0.7], [-r * 0.3, -r * 1.55], [0, -r * 0.95], [r * 0.25, -r * 1.5], [r * 0.45, -r * 0.85], [-r * 0.1, -r * 0.6]], a.pal.hair);
          R.poly(ctx, [[-r * 0.1, r * 0.3], [r * 0.95, r * 0.25], [r * 0.7, r * 1.15], [r * 0.1, r * 1.0]], a.pal.hair);
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.45, -r.torsoH * 0.95); ctx.lineTo(r.torsoW * 0.35, -r.torsoH * 0.1); ctx.stroke();
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 7);
          R.disc(ctx, 0, -4.5, 4, '#c0c4cc');
          R.poly(ctx, [[-r.hipW * 0.5, -1], [r.hipW * 0.5, -1], [r.hipW * 0.45, 12], [-r.hipW * 0.45, 12]], a.pal.primary);
        },
        back(ctx, a) {
          const s = a.J.shF;
          R.ellipse(ctx, s.x + 2, s.y + 2, 10, 7, a.J.lean, '#8c929c');
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 18) return;
          NX.Audio.play('stomp');
          if (f.ground) {
            const gy = f.ground.y;
            f.fx('debris', f.x + f.facing * 20, gy, { n: 8, color: '#7a5a3a' });
            shoot(f, {
              ox: 30, oy: -16, speed: 8.5, r: 16, life: 46, dmg: 12, ang: 60, bkb: 45, kbg: 75, effect: 'heavy', stageCollide: false,
              destructible: false, reflectable: true, color: '#7a5a3a', glow: false, draw: rockDraw('#8a6a48'),
              update(p, m) {
                if (p.vy === 0 && !groundAt(m, p.x, p.y + p.r, 5)) { p.gravity = 0.5; p.stageCollide = true; }
                if (p.t % 4 === 0 && p.gravity === 0) m.effects.spawn('dust', p.x, p.y + p.r, { n: 1 });
              },
              onDestroy(p, w, m) { m.effects.spawn('debris', p.x, p.y, { n: 8, color: '#7a5a3a' }); }
            });
          } else {
            shoot(f, { ox: 24, oy: -f.h * 0.6, speed: 6, vy: 6, gravity: 0.3, r: 15, life: 70, dmg: 11, ang: 60, bkb: 40, kbg: 70, effect: 'heavy',
              destructible: false, color: '#7a5a3a', glow: false, draw: rockDraw('#8a6a48'),
              onDestroy(p, w, m) { m.effects.spawn('debris', p.x, p.y, { n: 8, color: '#7a5a3a' }); } });
          }
        }
      },
      side: {
        frames: 44, pose: 'fsmash', oncePerAir: true, drift: 0, gravity: 0.35,
        armor: { f: [4, 18], kb: 90 }, vel: [{ f: [8, 18], vx: 9 }],
        hitboxes: [{ f: [12, 18], x: 34, y: -50, r: 21, dmg: 13, ang: 38, bkb: 50, kbg: 88, effect: 'heavy' }],
        onFrame(f, fr) { if (fr === 8) NX.Audio.play('dash'); if (fr === 12) NX.Audio.play('swing', { size: 2 }); }
      },
      up: {
        frames: 46, pose: 'uppercut', vel: [{ f: [4, 20], vy: -13.5, vx: 1.5 }],
        hitboxes: [
          { f: [4, 9], x: 18, y: -74, r: 22, dmg: 13, ang: 84, bkb: 55, kbg: 88, effect: 'heavy' },
          { f: [10, 20], x: 12, y: -74, r: 20, dmg: 6, ang: 80, bkb: 40, kbg: 70, effect: 'hit', group: 1 }],
        onFrame(f, fr) { if (fr === 4) NX.Audio.play('swing', { size: 1.5 }); if (fr >= 4 && fr <= 20 && fr % 2 === 0) f.fx('flame', f.x + f.facing * 10, f.y - f.h, { scale: 0.9 }); }
      },
      down: {
        frames: 60, pose: 'guard', armor: { f: [4, 44], kb: 999 },
        onStart(f, mv) { mv.data.abs = 0; NX.Audio.play('block'); },
        onFrame(f, fr, mv) {
          f.damageTakenMult = (fr >= 4 && fr <= 44) ? 0.5 : 0;
          if (fr >= 4 && fr <= 44 && fr % 10 === 4) f.flashArmor = 5;
          mv.extraBoxes = (fr >= 45 && fr <= 48) ? [{ x: 0, y: -46, r: 48, dmg: Math.min(22, 8 + mv.data.abs * 0.8), ang: 361, bkb: 60, kbg: 80, dir: 'auto', effect: 'heavy' }] : null;
          if (fr === 45) { NX.Audio.play('stomp'); f.fx('shockwave', f.x, f.y, { r: 120 }); f.match.camera.shake(8); }
        },
        onEnd(f) { f.damageTakenMult = 0; }
      }
    }
  });

})(window.NX = window.NX || {});
