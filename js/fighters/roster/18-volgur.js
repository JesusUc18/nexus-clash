/* NEXUS CLASH — js/fighters/roster/18-volgur.js · luchador 18 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, groundWave, spikes, rockDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 18 · VOLGUR — Señor de la Forja (superpesado, 4 saltos aéreos)
   * Fuelle Voraz inhala rivales y proyectiles; martillo de vapor cargable.
   * ==================================================================== */
  function spikeBallDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.x * 0.05);
    ctx.fillStyle = '#6a6f78'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.25) * p.r * 0.9, Math.sin(a - 0.25) * p.r * 0.9);
      ctx.lineTo(Math.cos(a) * p.r * 1.55, Math.sin(a) * p.r * 1.55); ctx.lineTo(Math.cos(a + 0.25) * p.r * 0.9, Math.sin(a + 0.25) * p.r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 2, 0, 0, p.r);
    g.addColorStop(0, '#9aa0aa'); g.addColorStop(1, '#2a2e36');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d4823a'; ctx.fillRect(-p.r, -2, p.r * 2, 4);
    ctx.restore();
  }
  fighter({
    id: 'volgur', name: 'Volgur', title: 'Señor de la Forja',
    passive: 'Fuelles: 4 saltos aéreos cortos.',
    palette: { primary: '#3a2a1e', secondary: '#6a4a32', skin: '#8a5a3c', head: '#8a5a3c', hand: '#5a3a26', accent: '#d4823a', eye: '#1b1b1b', feet: '#2a1a12', legs: '#4a3a2a', arms: '#8a5a3c', belt: '#d4823a', hair: '#2a1a12' },
    stats: { weight: 127, height: 104, width: 54, walk: 2.4, run: 5.6, dash: 6.0, airSpeed: 3.4, gravity: 0.55, fall: 9.5, fastFall: 14, jump: 12.6, shortHop: 8.2, airJump: 9.6, airJumps: 4, airJumpDecay: 0.06, traction: 0.6 },
    profile: { style: 'heavy', reach: 1.2, power: 1.12, speed: 0.9 },
    poseStyle: 'sword',
    flipJump: false,
    ai: { recovery: 'up', projectile: 'side', range: 85, heavy: true, extraJumps: true, grappler: true, inhale: true },
    onAirJump(f) { f.fx('dust', f.x, f.y - 10, { n: 5, scale: 1.2 }); NX.Audio.play('dash'); },
    rig: {
      torsoW: 44, hipW: 40, torsoH: 32, torsoRound: 16, headR: 14, headW: 1.15, neck: 0, armW: 12, upperArm: 15, foreArm: 15,
      handR: 8, thigh: 13, shin: 12, legW: 14, footL: 14, footH: 8, belly: '#a8774f', brows: true,
      weapon: { type: 'hammer', len: 46, w: 14, trail: '#ffb070' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          [[-0.15, -0.85], [-0.7, -0.6]].forEach(([dx, dy]) => R.poly(ctx, [[r * dx - 5, r * dy + 4], [r * dx, r * dy - 9], [r * dx + 5, r * dy + 4]], a.pal.skin));
          spikes(ctx, r * 0.95, a.pal.hair, 7, 0.32, PI * 1.15, PI * 1.85);
          R.ellipse(ctx, r * 0.9, r * 0.35, r * 0.42, r * 0.32, 0, '#c48a6a');
          R.disc(ctx, r * 1.05, r * 0.3, 2, '#3a1a10', false); R.disc(ctx, r * 0.82, r * 0.32, 2, '#3a1a10', false);
          ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.6); ctx.quadraticCurveTo(r * 0.75, r * 0.05, r * 0.5, -r * 0.05); ctx.lineTo(r * 0.5, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.3, -r.torsoH * 0.82], [r.torsoW * 0.36, -r.torsoH * 0.82], [r.hipW * 0.48, 8], [-r.hipW * 0.36, 8]], a.pal.primary);
          ctx.fillStyle = a.pal.accent;
          [[-0.2, -0.75], [0.25, -0.75], [-0.25, -0.1], [0.3, -0.1]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r.torsoW, y * r.torsoH, 2.2, 0, TAU); ctx.fill(); });
          ctx.fillStyle = '#2a1a12'; ctx.fillRect(-r.torsoW * 0.3, -r.torsoH * 0.86, 4, -6);
        },
        back(ctx, a) {
          const s = a.J.sh;
          ctx.save(); ctx.translate(s.x - 22, s.y + 6); ctx.rotate(a.J.lean);
          for (let i = 0; i < 4; i++) R.poly(ctx, [[-9 + i, -14 + i * 7], [9 - i, -14 + i * 7], [7 - i, -9 + i * 7], [-7 + i, -9 + i * 7]], i % 2 ? '#6a4a32' : '#8a6a4a');
          R.disc(ctx, 0, 16, 4, '#d4823a');
          ctx.restore();
        },
        weapon(ctx, f, w) {
          R.limb(ctx, [{ x: 0, y: -10 }, { x: 0, y: w.len }], 5, '#5a3b1f');
          ctx.save(); ctx.translate(0, w.len + 6);
          R.poly(ctx, [[-20, -10], [20, -10], [20, 12], [-20, 12]], '#4a4f5a');
          ctx.fillStyle = '#d4823a'; ctx.fillRect(-20, -6, 40, 3); ctx.fillRect(-20, 6, 40, 3);
          R.poly(ctx, [[20, -6], [27, -4], [27, 4], [20, 6]], '#2a2e36');
          ctx.restore();
          if (f.move && f.move.def.key === 'special_down' && f.move.charging && f.tick % 3 === 0) {
            ctx.save(); ctx.globalAlpha = 0.5; R.disc(ctx, 30, w.len + 6, 6 + Math.random() * 4, '#ffffff', false); ctx.restore();
          }
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'cast',
        absorb: { f: [10, 22], x: 40, y: -50, r: 56, mult: 0, onAbsorb(f) { f.data.ammo = Math.min(3, (f.data.ammo || 0) + 1); } },
        onStart(f, mv) { mv.data.t = 0; NX.Audio.play('spin', { pitch: 0.5 }); },
        onFrame(f, fr, mv) {
          const I = f.input;
          if (mv.data.cap) {
            const c = mv.data.cap;
            if (f.captive !== c) { mv.data.cap = null; mv.noFriction = false; return; }
            c.x = f.x + f.facing * 8; c.y = f.y;
            mv.data.hold++;
            if (f.ground) { f.vx = I.x * 1.8; mv.noFriction = true; if (Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x); }
            if ((mv.data.hold > 12 && I.pressed('special')) || mv.data.hold > 100) {
              I.consume('special');
              f.releaseCaptive({ dmg: 10, ang: 30, bkb: 55, kbg: 60, effect: 'hit' });
              mv.data.cap = null; mv.noFriction = false; mv.frame = 28;
              f.fx('ring', f.x + f.facing * 30, f.y - f.h * 0.5, { r: 40, color: '#ffd27a' }); NX.Audio.play('throw');
            } else mv.frame = 24;
            return;
          }
          if (fr >= 10 && fr <= 22) {
            mv.data.t++;
            if (fr % 2 === 0) {
              const px = f.x + f.facing * U.rand(80, 170), py = f.y - U.rand(10, f.h);
              f.match.effects.list.push({ type: 'streak', x: px, y: py, vx: -f.facing * 7, vy: (f.y - f.h * 0.5 - py) * 0.08, life: 12, max: 12, len: 16, color: '#e8f0ff' });
            }
            for (const t of f.opponents()) {
              if (!t.canBeGrabbed({ def: { command: true, air: true }, owner: f })) continue;
              const dx = (t.x - f.x) * f.facing;
              if (dx < 0 || dx > 170 || Math.abs(t.y - f.y) > 90) continue;
              t.lvx = U.approach(t.lvx, -f.facing * 6, 1.5);
              if (dx < 58) {
                f.capture(t, { hide: true, max: 140 }); mv.data.cap = t; mv.data.hold = 0; mv.frame = 24;
                NX.Audio.play('grab'); f.fx('text', f.x, f.y - f.h - 18, { text: '¡ÑAM!', color: '#ffd27a', size: 22 });
                return;
              }
            }
            if (fr === 22 && I.isHeld('special') && mv.data.t < 100) mv.frame = 14;
          }
          if (fr === 24 && (f.data.ammo || 0) > 0) {
            const n = f.data.ammo; f.data.ammo = 0;
            for (let i = 0; i < n; i++) shoot(f, { ox: 36, oy: -f.h * 0.55, speed: 9, vy: (i - (n - 1) / 2) * 1.5, r: 11, dmg: 9, ang: 45, bkb: 35, kbg: 60, life: 60, effect: 'fire', color: '#ffb070', glow: false, draw: rockDraw('#c8642a') });
            NX.Audio.play('throw');
          }
        },
        onEnd(f, mv) { mv.noFriction = false; }
      },
      side: {
        frames: 40, pose: 'overhead',
        canUse: f => !(f.data.ball && f.data.ball.active),
        onFrame(f, fr) {
          if (fr !== 16) return;
          NX.Audio.play('swing', { size: 1.5 });
          f.data.ball = shoot(f, {
            ox: 30, oy: -f.h * 0.7, speed: 5.5, vy: -7, gravity: 0.45, maxFall: 12, r: 15, dmg: 13, ang: 50, bkb: 45, kbg: 70, life: 200,
            bounce: 4, bounceDamp: 0.85, passCollide: true, destructible: false, absorbable: false, effect: 'heavy', glow: false, draw: spikeBallDraw
          });
        }
      },
      up: {
        frames: 60, pose: 'rise', drift: 0.7, helplessLag: 26,
        hitboxes: [
          { f: [6, 14], x: 0, y: -60, r: 34, dmg: 8, ang: 85, bkb: 60, kbg: 60, effect: 'heavy', dir: 'auto' },
          { f: [33, 40], x: 0, y: 0, r: 34, dmg: 15, ang: 275, bkb: 30, kbg: 85, effect: 'heavy', meteor: true, group: 1 }],
        onFrame(f, fr, mv) {
          const I = f.input;
          if (fr < 6) { f.vy = 0; mv.velY = true; return; }
          if (fr === 6) { NX.Audio.play('stomp'); f.fx('dust', f.x, f.y, { n: 8 }); }
          if (fr <= 20) { f.vy = -15; mv.velY = true; return; }
          if (fr <= 32) {
            f.vy = U.approach(f.vy, 0, 1.6); mv.velY = true;
            if (I.pressed('shield')) {
              I.consume('shield'); f.endMoveCleanup(true);
              f.state = ST.HELPLESS; f.stateTime = 0; f.helplessLag = 26;
            }
            return;
          }
          f.vy = 17; mv.velY = true; mv.data.dive = true;
          if (fr === 33) NX.Audio.play('swing', { size: 2 });
          if (fr >= 40 && !f.ground) mv.frame = 39;
        },
        onLand(f, mv) {
          if (mv.data.dive) {
            boom(f, f.x, f.y - 14, { r: 66, dmg: 12, ang: 70, bkb: 55, kbg: 70, effect: 'heavy' });
            groundWave(f, 1, { dmg: 6, color: '#ffd27a' }); groundWave(f, -1, { dmg: 6, color: '#ffd27a' });
          }
          const lag = mv.data.dive ? 24 : 14;
          f.endMoveCleanup(true); f.startLand(lag);
          return 'continue';
        }
      },
      down: {
        frames: 48, pose: 'fsmash', charge: { at: 8, max: 90, key: 'special', mult: 1.8 },
        hitboxes: [
          { f: [14, 18], x: 54, y: -44, r: 26, dmg: 14, ang: 361, bkb: 40, kbg: 95, effect: 'heavy' },
          { f: [14, 18], x: 26, y: -52, r: 18, dmg: 11, ang: 361, bkb: 35, kbg: 90, effect: 'heavy' }],
        onStart(f, mv) { mv.noFriction = true; },
        onCharge(f, mv) {
          if (f.ground) { f.vx = f.input.x * 1.7; if (Math.abs(f.input.x) > 0.3) f.facing = Math.sign(f.input.x); }
          else f.vx *= 0.95;
          if (mv.charge % 4 === 0) f.fx('dust', f.x - f.facing * 20, f.y - f.h * 0.9, { n: 1 });
          if (mv.charge % 10 === 0) NX.Audio.play('charge', { pitch: 0.6 + mv.charge / 90 });
        },
        onRelease(f, mv) { mv.noFriction = false; NX.Audio.play('explosion', { pitch: 1.3 }); }
      }
    }
  });

})(window.NX = window.NX || {});
