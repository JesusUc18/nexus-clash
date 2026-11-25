/* NEXUS CLASH — js/fighters/roster/03-ironclad.js · luchador 03 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boltDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 03 · IRONCLAD — Ogro Mecánico (superpesado con 3 saltos de propulsor)
   * ==================================================================== */
  fighter({
    id: 'ironclad', name: 'Ironclad', title: 'Ogro Mecánico',
    passive: 'Propulsores: 3 saltos aéreos con impulso decreciente.',
    palette: { primary: '#c46a1c', secondary: '#3a3f4a', skin: '#8c96a4', head: '#9aa4b2', hand: '#5a626e', accent: '#ffd23a', visor: '#5ff3ff', feet: '#2a2e36', legs: '#3a3f4a', arms: '#8c96a4' },
    stats: { weight: 128, height: 98, width: 48, walk: 2.6, run: 5.8, dash: 6.4, airSpeed: 3.3, gravity: 0.6, fall: 10.5, fastFall: 15, jump: 12.8, shortHop: 8.4, airJump: 10.8, airJumps: 3, airJumpDecay: 0.1 },
    profile: { style: 'heavy', reach: 1.1, power: 1.1, speed: 0.92 },
    ai: { recovery: 'up', projectile: 'neutral', range: 90, heavy: true, extraJumps: true },
    onAirJump(f) {
      for (let i = 0; i < 5; i++) f.fx('flame', f.x - f.facing * 14 + U.rand(-6, 6), f.y - f.h * 0.35, { scale: 1.3 });
      NX.Audio.play('fire', { pitch: 1.3 });
    },
    rig: {
      torsoW: 38, hipW: 30, torsoH: 32, torsoRound: 6, headR: 12.5, headW: 1.15, neck: 2, armW: 13, upperArm: 15, foreArm: 15,
      handR: 8, legW: 14, thigh: 14, shin: 14, footL: 14, footH: 8, eyes: 'visor', mouth: false,
      parts: {
        back(ctx, a) {
          const { J, f } = a;
          ctx.save(); ctx.translate(J.sh.x - 16, J.sh.y + 4); ctx.rotate(J.lean);
          R.poly(ctx, [[-10, -16], [10, -16], [10, 22], [-10, 22]], a.pal.secondary);
          R.poly(ctx, [[-14, 18], [-4, 18], [-6, 30], [-12, 30]], '#5a626e');
          R.poly(ctx, [[2, 18], [12, 18], [10, 30], [4, 30]], '#5a626e');
          if (f.airJumpAnim > 0 || (f.move && f.move.def.key === 'special_up' && f.move.frame >= 8 && f.move.frame <= 26)) {
            for (const x of [-9, 7]) {
              const g = ctx.createLinearGradient(0, 30, 0, 64);
              g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ff9a2a'); g.addColorStop(1, 'rgba(255,60,0,0)');
              ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 5, 30); ctx.lineTo(x + 5, 30); ctx.lineTo(x, 58 + Math.random() * 10); ctx.closePath(); ctx.fill();
            }
          }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.42, -r.torsoH * 0.95], [r.torsoW * 0.42, -r.torsoH * 0.95], [r.torsoW * 0.32, -r.torsoH * 0.45], [-r.torsoW * 0.32, -r.torsoH * 0.45]], '#d9dee6');
          ctx.fillStyle = a.pal.accent;
          for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(-r.hipW * 0.5 + i * 8 + 2, -7); ctx.rotate(0.6); ctx.fillRect(-2, -5, 4, 10); ctx.restore(); }
          ctx.fillStyle = '#4a4f5a';
          [[-0.3, -0.85], [0.3, -0.85], [-0.25, -0.55], [0.25, -0.55]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r.torsoW, y * r.torsoH, 1.8, 0, TAU); ctx.fill(); });
        },
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r); ctx.lineTo(-r * 0.5, -r * 1.7); ctx.stroke();
          R.disc(ctx, -r * 0.5, -r * 1.75, 3, (a.f.tick % 40 < 20) ? '#ff3b3b' : '#7a1010');
          R.poly(ctx, [[r * 0.1, r * 0.5], [r * 1.05, r * 0.4], [r * 0.95, r * 0.9], [r * 0.1, r * 0.95]], '#5a626e');
          ctx.strokeStyle = '#2a2e36'; ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(r * (0.25 + i * 0.2), r * 0.52); ctx.lineTo(r * (0.25 + i * 0.2), r * 0.9); ctx.stroke(); }
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_side' || !mv.data.ball) return;
      const hx = f.x + 14 * f.facing, hy = f.y - f.h * 0.62;
      const bx = f.x + mv.data.ball.x * f.facing, by = f.y + mv.data.ball.y;
      ctx.save();
      ctx.strokeStyle = '#555c66'; ctx.lineWidth = 4; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      const g = ctx.createRadialGradient(bx - 6, by - 6, 2, bx, by, 22);
      g.addColorStop(0, '#9aa4b2'); g.addColorStop(1, '#2a2e36');
      ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(bx, by, 22, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 40, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 10 && fr !== 16 && fr !== 22) return;
          NX.Audio.play('laser', { pitch: 0.7 });
          shoot(f, { ox: 34, oy: -f.h * 0.58, speed: 13, vy: U.rand(-0.4, 0.4), r: 7, dmg: 3, ang: 30, bkb: 12, kbg: 30, life: 40, effect: 'hit', color: '#c0c8d2', glow: false, draw: boltDraw('#c0c8d2', 11) });
          f.fx('spark', f.x + f.facing * 36, f.y - f.h * 0.58, { n: 3, power: 0.4 });
        }
      },
      side: {
        frames: 54, pose: 'fsmash', oncePerAir: true, drift: 0.3, gravity: 0.5,
        onFrame(f, fr, mv) {
          if (fr >= 10 && fr <= 34) {
            const k = (fr - 10) / 24, ang = -1.9 + k * 2.75, L = 95;
            const bx = 14 + Math.cos(ang) * L, by = -f.h * 0.62 + Math.sin(ang) * L;
            mv.data.ball = { x: bx, y: by };
            mv.extraBoxes = (fr >= 16 && fr <= 34) ? [{ x: bx, y: by, r: 24, dmg: 15, ang: 45, bkb: 45, kbg: 90, effect: 'heavy' }] : null;
            if (fr === 16) NX.Audio.play('swing', { size: 2 });
          } else { mv.extraBoxes = null; if (fr > 34) mv.data.ball = null; }
        }
      },
      up: {
        frames: 50, pose: 'rise',
        hitboxes: [{ f: [8, 26], x: 0, y: -50, r: 30, dmg: 9, ang: 75, bkb: 50, kbg: 72, effect: 'fire', dir: 'auto' }],
        onStart(f, mv) {
          let x = f.input.x, y = Math.min(-0.4, f.input.y);
          if (Math.hypot(x, y) < 0.45) { x = 0; y = -1; }
          mv.data.a = U.clamp(Math.atan2(x, -y), -0.75, 0.75);
          if (Math.abs(x) > 0.2) f.facing = Math.sign(x);
        },
        onFrame(f, fr, mv) {
          if (fr < 8) { f.vy *= 0.7; f.vx *= 0.8; mv.velY = mv.velX = true; }
          else if (fr <= 26) {
            f.vx = Math.sin(mv.data.a) * 12.5; f.vy = -Math.cos(mv.data.a) * 12.5; mv.velX = mv.velY = true;
            if (fr % 2 === 0) f.fx('flame', f.x - Math.sin(mv.data.a) * 20, f.y + 4, { scale: 1.5 });
          }
          if (fr === 8) NX.Audio.play('fire');
        }
      },
      down: {
        frames: 48, pose: 'roar',
        hitboxes: [
          { f: [14, 30], x: 0, y: -48, r: 62, dmg: 1.5, rehit: 5, fkb: 30, bkb: 0, kbg: 100, ang: 361, dir: 'auto', effect: 'fire', burn: { frames: 120, dmg: 1 } },
          { f: [31, 33], x: 0, y: -48, r: 66, dmg: 6, ang: 361, bkb: 55, kbg: 80, dir: 'auto', effect: 'fire', group: 1 }],
        onFrame(f, fr) {
          if (fr === 14) NX.Audio.play('beam', { pitch: 0.5 });
          if (fr >= 14 && fr <= 32) for (let i = 0; i < 2; i++) {
            const a = Math.random() * TAU;
            f.fx('dust', f.x + Math.cos(a) * 40, f.y - f.h / 2 + Math.sin(a) * 40, { n: 1, scale: 1.3 });
          }
        }
      }
    }
  });

})(window.NX = window.NX || {});
