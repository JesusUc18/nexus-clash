/* NEXUS CLASH — js/fighters/roster/22-ritmo.js · luchador 22 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { hairCap, windOf, fighter } = NX.RosterLib;

  /* ======================================================================
   * 22 · RITMO — Bailarín de Capoeira (combos y patadas giratorias)
   * Pasiva "Ginga": tras una esquiva, el siguiente golpe hace +20% (70 f).
   * ==================================================================== */
  fighter({
    id: 'ritmo', name: 'Ritmo', title: 'Bailarín de Capoeira',
    passive: 'Ginga: tras una esquiva, +20% de daño durante 70 frames.',
    palette: { primary: '#1aa36a', secondary: '#f4f1e8', skin: '#7a4a2a', head: '#7a4a2a', hand: '#7a4a2a', arms: '#7a4a2a', legs: '#f4f1e8', feet: '#7a4a2a', accent: '#ffd23a', hair: '#1a120c', belt: '#ffd23a', eye: '#1a120c' },
    stats: { weight: 88, height: 82, width: 32, walk: 3.4, run: 7.8, dash: 8.4, airSpeed: 4.3, gravity: 0.6, jump: 14, shortHop: 9 },
    profile: { style: 'kick', reach: 1.1, power: 0.97, speed: 1.1 },
    ai: { recovery: 'up', projectile: null, range: 75, rushdown: true },
    init(f) { f.data.ginga = 0; },
    onUpdate(f) {
      const dodging = f.state === ST.DODGE || f.state === ST.AIRDODGE;
      if (dodging) f.data.wasDodge = true;
      else if (f.data.wasDodge) { f.data.wasDodge = false; f.data.ginga = 70; f.fx('text', f.x, f.y - f.h - 14, { text: 'GINGA', color: '#ffd23a', size: 16 }); }
      if (f.data.ginga > 0) { f.data.ginga--; if (f.tick % 6 === 0) f.fx('sparkle', f.x, f.y - f.h / 2, { color: '#ffd23a' }); }
    },
    damageMod(f) { return f.data.ginga > 0 ? 1.2 : 1; },
    onHitConfirm(f) { if (f.data.ginga > 0) f.data.ginga = 0; },
    rig: {
      headR: 11.5, torsoW: 20, hipW: 17, torsoH: 25, thigh: 17, shin: 17, legW: 9,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, t = a.f.tick, w = windOf(a.f);
          for (let i = 0; i < 5; i++) {
            const x0 = -r * 0.9 + i * 3, y0 = -r * 0.3 + i * 2;
            const pts = [{ x: x0, y: y0 }];
            for (let k = 1; k <= 3; k++) pts.push({ x: x0 - k * (3 + w * 0.15), y: y0 + k * 6 + Math.sin(t * 0.18 + i + k) * 2 });
            R.limb(ctx, pts, 4, a.pal.hair);
          }
        },
        head(ctx, a) { hairCap(ctx, a.rig.headR, a.pal.hair, { a1: -0.6 }); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.skin; ctx.fillRect(-r.torsoW * 0.18, -r.torsoH, r.torsoW * 0.36, r.torsoH * 0.85);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 6);
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 3);
          ctx.strokeStyle = a.pal.belt; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-r.hipW * 0.3, -6); ctx.lineTo(-r.hipW * 0.45, 8 + Math.sin(a.f.tick * 0.2) * 2); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 38, pose: 'spin',
        hitboxes: [{ f: [10, 16], x: 0, y: -42, r: 42, dmg: 9, ang: 45, bkb: 40, kbg: 75, dir: 'auto', effect: 'hit' }],
        onFrame(f, fr) { if (fr === 10) NX.Audio.play('swing', { size: 1.6 }); }
      },
      side: {
        frames: 40, pose: 'dtilt', act: [6, 16], oncePerAir: true, drift: 0,
        vel: [{ f: [6, 16], vx: 9.5 }],
        hitboxes: [{ f: [6, 16], x: 24, y: -10, r: 20, dmg: 8, ang: 85, bkb: 55, kbg: 40, effect: 'hit' }],
        onStart(f, mv) { if (!f.ground) { f.vy = Math.min(f.vy, 0); mv.noGrav = true; } },
        onFrame(f, fr, mv) { if (fr === 6) NX.Audio.play('dash'); if (fr === 17) mv.noGrav = false; if (f.ground && fr >= 6 && fr <= 16 && fr % 3 === 0) f.fx('dust', f.x, f.y, { n: 2, vx: -f.facing * 2 }); }
      },
      up: {
        frames: 46, pose: 'spin', vel: [{ f: [4, 20], vy: -12.5, vx: 2.5 }],
        hitboxes: [
          { f: [4, 18], x: 0, y: -46, r: 26, dmg: 2, rehit: 4, fkb: 35, bkb: 0, kbg: 100, ang: 80, dir: 'auto', effect: 'hit' },
          { f: [19, 21], x: 0, y: -50, r: 30, dmg: 6, ang: 80, bkb: 50, kbg: 85, effect: 'hit', group: 1, dir: 'auto' }],
        onFrame(f, fr) { if (fr % 6 === 4 && fr <= 20) NX.Audio.play('spin', { pitch: 1.3 }); }
      },
      down: {
        frames: 50,
        poseFn(f, mv) {
          const s = mv.frame * 0.55;
          if (mv.frame < 6 || mv.frame > 40) return { lF1: 1.2, lF2: -2.0, lB1: 0.2, lB2: -1.5, lean: 0.5, aF1: 1.3, aB1: 1.2 };
          return { rot: PI, oy: -6, aF1: 0.1, aF2: 0, aB1: -0.1, aB2: 0, lF1: 1.4 * Math.sin(s), lF2: -0.1, lB1: -1.4 * Math.sin(s), lB2: -0.1, planted: false };
        },
        hitboxes: [
          { f: [10, 34], x: 0, y: -50, r: 40, dmg: 1.8, rehit: 5, fkb: 30, bkb: 0, kbg: 100, ang: 361, dir: 'auto', effect: 'hit' },
          { f: [35, 37], x: 0, y: -50, r: 44, dmg: 7, ang: 361, bkb: 55, kbg: 80, dir: 'auto', effect: 'hit', group: 1 }],
        onFrame(f, fr, mv) {
          if (fr >= 10 && fr <= 34) { f.vx = f.input.x * 2.5; mv.velX = true; }
          if (fr % 6 === 4 && fr >= 10 && fr <= 34) NX.Audio.play('spin', { pitch: 1.1 });
        }
      }
    }
  });

})(window.NX = window.NX || {});
