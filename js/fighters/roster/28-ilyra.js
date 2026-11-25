/* NEXUS CLASH — js/fighters/roster/28-ilyra.js · luchador 28 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { hairCap, windOf, cape, fighter, counterMove } = NX.RosterLib;

  /* ======================================================================
   * v3.1 · ILYRA — Princesa Enmascarada (esgrimista, kit tipo Lucina)
   * Sin punta especial: la hoja golpea igual en toda su longitud.
   * ==================================================================== */
  const DB_TABLE = {
    1: { side: { x: 34, y: -44, r: 26, dmg: 4, ang: 70, bkb: 32, kbg: 10 } },
    2: { up: { x: 24, y: -70, r: 26, dmg: 4, ang: 82, bkb: 34, kbg: 10 }, side: { x: 36, y: -46, r: 26, dmg: 4, ang: 65, bkb: 32, kbg: 10 }, down: { x: 36, y: -22, r: 24, dmg: 4, ang: 40, bkb: 30, kbg: 10 } },
    3: { up: { x: 24, y: -74, r: 26, dmg: 5, ang: 85, bkb: 34, kbg: 12 }, side: { x: 38, y: -46, r: 26, dmg: 5, ang: 62, bkb: 32, kbg: 12 }, down: { x: 36, y: -20, r: 24, dmg: 3, ang: 40, bkb: 30, kbg: 10 } },
    4: { up: { x: 18, y: -84, r: 30, dmg: 8, ang: 86, bkb: 60, kbg: 88 }, side: { x: 40, y: -46, r: 28, dmg: 7, ang: 40, bkb: 55, kbg: 98 }, down: { x: 36, y: -24, r: 26, dmg: 1.6, ang: 70, bkb: 30, kbg: 10 } }
  };
  fighter({
    id: 'ilyra', name: 'Ilyra', title: 'Princesa Enmascarada',
    passive: 'Filo uniforme: su espada hace el mismo daño en toda la hoja, sin depender de la punta.',
    palette: { primary: '#eaf4f4', secondary: '#1f5a6a', skin: '#f2d2bc', head: '#f2d2bc', hand: '#1f5a6a', arms: '#eaf4f4', legs: '#16404c', feet: '#1f5a6a', accent: '#5ae0d0', hair: '#4a2a5a', eye: '#1f5a6a', belt: '#c9a43a' },
    stats: { weight: 90, height: 84, width: 32, walk: 3.3, run: 7.6, dash: 8.2, airSpeed: 4.1, gravity: 0.62, fall: 10.5, fastFall: 16, jump: 13.8, shortHop: 9, airJump: 12.9, traction: 0.6 },
    profile: { style: 'sword', reach: 1.1, power: 1.03, speed: 1.05 },
    ai: { recovery: 'up', projectile: null, range: 98, counter: 'down', sword: true },
    rig: {
      headR: 11, torsoW: 18, hipW: 17, torsoH: 26, thigh: 17, shin: 16, armW: 6,
      weapon: { type: 'sword', len: 54, w: 5.5, color: '#d8f4ff', glow: '#5ae0d0', trail: '#8af0e4', guard: '#c9a43a', hilt: '#1f5a6a', taper: 0.6 },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f), sw = Math.sin(a.f.tick * 0.16) * 3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.9);
          ctx.quadraticCurveTo(-r * 1.9 - w * 0.6, -r * 0.4 + sw, -r * 1.6 - w, r * 2.2 + sw);
          ctx.quadraticCurveTo(-r * 1.0, r * 0.8, -r * 0.6, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
          R.disc(ctx, -r * 1.05, -r * 0.4, 3, a.pal.accent);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.1 });
          /* Antifaz con aberturas: tapa los ojos salvo dos rendijas brillantes. */
          ctx.fillStyle = '#f6f2ff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.4); ctx.quadraticCurveTo(r * 0.3, -r * 0.62, r * 0.98, -r * 0.42);
          ctx.lineTo(r * 1.02, r * 0.05); ctx.quadraticCurveTo(r * 0.55, r * 0.22, r * 0.2, r * 0.02); ctx.quadraticCurveTo(-r * 0.05, r * 0.18, -r * 0.25, r * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.42); ctx.quadraticCurveTo(r * 0.3, -r * 0.7, r * 0.95, -r * 0.5); ctx.stroke();
          R.ellipse(ctx, r * 0.6, -r * 0.16, r * 0.17, r * 0.07, -0.1, '#1f5a6a', false);
          R.ellipse(ctx, r * 0.08, -r * 0.14, r * 0.13, r * 0.06, 0.1, '#1f5a6a', false);
          R.poly(ctx, [[r * 0.05, -r * 1.05], [r * 0.25, -r * 1.35], [r * 0.45, -r * 1.02]], '#c9a43a');
        },
        back(ctx, a) { cape(ctx, a, a.pal.secondary, 34, 9, '#5ae0d0'); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.62, r.torsoW, 4);
          R.poly(ctx, [[-r.hipW * 0.5, -4], [r.hipW * 0.5, -4], [r.hipW * 0.75, 16], [-r.hipW * 0.75, 16]], a.pal.primary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(0, -r.torsoH); ctx.lineTo(0, -6); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'jab', gravity: 0.5, charge: { at: 8, max: 60, key: 'special', mult: 3 },
        vel: [{ f: [12, 16], vx: 5 }],
        hitboxes: [
          { f: [13, 17], x: 72, y: -44, r: 16, dmg: 8, ang: 361, bkb: 40, kbg: 75, effect: 'slash', shieldMult: 2.2, shieldDmg: 22 },
          { f: [13, 17], x: 40, y: -44, r: 14, dmg: 8, ang: 361, bkb: 40, kbg: 75, effect: 'slash', shieldMult: 2.2, shieldDmg: 22 }],
        onCharge(f, mv) { if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 24, f.y - f.h * 0.55, { color: '#8af0e4' }); },
        onFrame(f, fr) { if (fr === 13) f.match.effects.list.push({ type: 'streak', x: f.x + f.facing * 70, y: f.y - 44, vx: f.facing * 9, vy: 0, life: 10, max: 10, len: 36, color: '#d8f4ff' }); }
      },
      side: {
        frames: 32, oncePerAir: true, drift: 0.2, gravity: 0.4, act: [5, 10],
        poseFn(f, mv, k) {
          const v = mv.data.v || 'side', lib = R.SWORD[v === 'up' ? 'utilt' : v === 'down' ? 'dtilt' : 'ftilt'] || R.POSES.ftilt;
          return k < 1 ? lib.wind : lib.strike;
        },
        onStart(f, mv) { mv.data.stage = 1; mv.data.v = 'side'; if (!f.ground) f.vy = Math.min(f.vy, 0) * 0.4; },
        onFrame(f, fr, mv) {
          const st = mv.data.stage, v = mv.data.v, spec = DB_TABLE[st][v] || DB_TABLE[st].side;
          if (fr >= 4 && fr <= 8 && (st === 1 || f.ground)) { f.vx = f.facing * (st === 1 ? 6 : 3.5); mv.velX = true; }
          if (st === 4 && v === 'down') {
            if (fr >= 5 && fr <= 20 && (fr - 5) % 3 === 0) { mv.hitSets = {}; mv.extraBoxes = [spec]; NX.Audio.play('slash', { pitch: 1.6 }); }
            else if (fr === 22) { mv.hitSets = {}; mv.extraBoxes = [{ x: 38, y: -30, r: 28, dmg: 5, ang: 45, bkb: 50, kbg: 100, effect: 'slash' }]; NX.Audio.play('slash', { pitch: 0.9 }); }
            else mv.extraBoxes = null;
          } else {
            mv.extraBoxes = (fr >= 5 && fr <= 9) ? [Object.assign({ effect: 'slash' }, spec)] : null;
            if (fr === 5) NX.Audio.play('slash', { pitch: 0.9 + st * 0.12 });
          }
          if (st < 4 && fr >= 5 && f.input.pressed('special')) {
            f.input.consume('special'); mv.data.q = { y: f.input.y, x: f.input.x };
          }
          if (fr >= 12 && fr <= 26 && st < 4 && mv.data.q) {
            const I = mv.data.q; mv.data.q = null;
            mv.data.stage++; mv.data.v = I.y < -0.5 ? 'up' : (I.y > 0.5 ? 'down' : 'side');
            if (mv.data.stage === 2 && mv.data.v === 'side' && Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x);
            mv.frame = 0; mv.hitSets = {}; mv.swung = false; mv.extraBoxes = null;
          }
        }
      },
      up: {
        frames: 46, pose: 'rise', intangible: [1, 5], helplessLag: 20, drift: 0.5,
        hitboxes: [
          { f: [5, 8], x: 14, y: -70, r: 26, dmg: 11, ang: 80, bkb: 60, kbg: 70, effect: 'slash' },
          { f: [9, 16], x: 10, y: -84, r: 20, dmg: 6, ang: 80, bkb: 40, kbg: 70, effect: 'slash', group: 1 }],
        onStart(f, mv) { mv.data.vx = U.clamp(f.input.x, -1, 1) * 3.5; if (Math.abs(f.input.x) > 0.3) f.facing = Math.sign(f.input.x); },
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 17) { f.vy = -16.5; f.vx = mv.data.vx + f.facing * 0.8; mv.velX = mv.velY = true; }
          if (fr === 5) NX.Audio.play('slash', { pitch: 1.25 });
        }
      },
      down: counterMove({ mult: 1.2, min: 8, kbg: 88, color: '#8af0e4', text: '¡CONTRA!' })
    }
  });

})(window.NX = window.NX || {});
