/* NEXUS CLASH — js/fighters/roster/11-grizzla.js · luchador 11 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { boom, earsRound, tail, fighter } = NX.RosterLib;

  /* ======================================================================
   * 11 · GRIZZLA — Osa Luchadora (grappler pesada)
   * ==================================================================== */
  fighter({
    id: 'grizzla', name: 'Grizzla', title: 'Osa Luchadora',
    passive: 'Llave maestra: agarres y lanzamientos más fuertes.',
    palette: { primary: '#c8202a', secondary: '#7a4a2a', skin: '#7a4a2a', head: '#7a4a2a', hand: '#6a3e22', accent: '#ffd23a', eye: '#1b1b1b', feet: '#3a2214', legs: '#7a4a2a', arms: '#7a4a2a', belt: '#ffd23a' },
    stats: { weight: 125, height: 96, width: 48, walk: 2.8, run: 6.0, dash: 6.6, airSpeed: 3.4, gravity: 0.6, fall: 10.2, jump: 13, airJump: 11.6, traction: 0.58 },
    profile: { style: 'heavy', reach: 1.0, power: 1.1, speed: 0.95 },
    ai: { recovery: 'up', projectile: null, range: 60, grappler: true, heavy: true },
    moves: {
      grab: std => Object.assign({}, std, { grabs: std.grabs.map(g => Object.assign({}, g, { x: g.x * 1.15, r: g.r * 1.3 })) }),
      throw_back: std => Object.assign({}, std, { hit: Object.assign({}, std.hit, { dmg: 13, kbg: 82 }) }),
      throw_up: std => Object.assign({}, std, { hit: Object.assign({}, std.hit, { dmg: 10, kbg: 74 }) })
    },
    rig: {
      torsoW: 36, hipW: 32, torsoH: 30, torsoRound: 12, headR: 14, armW: 12, upperArm: 15, foreArm: 14, handR: 8,
      legW: 13, thigh: 14, shin: 12, footL: 13, belly: '#c49a6c',
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          earsRound(ctx, r, a.pal.head, '#c49a6c');
          R.ellipse(ctx, r * 0.6, r * 0.38, r * 0.48, r * 0.34, 0, '#c49a6c');
          R.ellipse(ctx, r * 0.95, r * 0.25, r * 0.16, r * 0.12, 0, '#1b1b1b');
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.primary;
          ctx.fillRect(-r.torsoW * 0.35, -r.torsoH, 6, r.torsoH * 0.7); ctx.fillRect(r.torsoW * 0.35 - 6, -r.torsoH, 6, r.torsoH * 0.7);
          R.poly(ctx, [[-r.hipW / 2, -r.torsoH * 0.35], [r.hipW / 2, -r.torsoH * 0.35], [r.hipW / 2, 0], [-r.hipW / 2, 0]], a.pal.primary);
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2, -r.torsoH * 0.4, r.hipW, 6);
          R.ellipse(ctx, 0, -r.torsoH * 0.37, 7, 5, 0, '#fff0a0');
        },
        tail(ctx, a) { tail(ctx, a, 'stub', a.pal.head); }
      }
    },
    specials: {
      neutral: {
        frames: 52, grabs: [{ f: [8, 12], x: 38, y: -52, r: 22, command: true }],
        poseFn(f, mv, k, POSES) {
          if (mv.data.t) { const s = Math.sin(mv.frame * 0.8) * 0.1; return { aF1: 1.5, aF2: 1.4 + s, aB1: 1.4, aB2: 1.5 + s, lean: 0.1 + s }; }
          return k < 1 ? POSES.grab.wind : POSES.grab.strike;
        },
        onGrab(f, t, mv) { f.capture(t, { max: 90 }); mv.data.t = t; mv.frame = 20; f.fx('text', t.x, t.y - t.h - 16, { text: '¡ABRAZO!', color: '#ffd23a', size: 22 }); },
        onFrame(f, fr, mv) {
          const t = mv.data.t;
          if (!t || f.captive !== t) return;
          t.x = f.x + f.facing * (f.w / 2 + t.w / 2 - 12); t.y = f.y; t.facing = -f.facing;
          if (fr >= 24 && fr <= 40 && fr % 8 === 0) {
            t.addDamage(2.5, f); f.stats.damageDealt += 2.5; t.hitlag = 4; t.shaking = true; t.flashTimer = 4;
            f.fx('spark', t.x, t.y - t.h / 2, { n: 4, power: 0.6 }); NX.Audio.play('weak');
          }
          if (fr === 44) { f.releaseCaptive({ dmg: 7, ang: 55, bkb: 65, kbg: 72, effect: 'heavy' }); NX.Audio.play('throw'); }
        }
      },
      side: {
        frames: 50, pose: 'spin', oncePerAir: true, gravity: 0.5, drift: 0.3,
        vel: [{ f: [8, 34], vx: 4 }],
        hitboxes: [
          { f: [8, 34], x: 0, y: -52, r: 36, dmg: 2.2, rehit: 6, fkb: 35, bkb: 0, kbg: 100, ang: 361, dir: 'auto', effect: 'heavy' },
          { f: [35, 37], x: 0, y: -52, r: 40, dmg: 7, ang: 361, bkb: 50, kbg: 85, dir: 'auto', effect: 'heavy', group: 1 }],
        onFrame(f, fr) { if (fr % 8 === 0 && fr >= 8 && fr <= 34) NX.Audio.play('spin', { pitch: 0.7 }); }
      },
      up: {
        frames: 44, pose: 'rise', vel: [{ f: [5, 18], vy: -13.5, vx: 2 }],
        hitboxes: [{ f: [5, 12], x: 20, y: -84, r: 22, dmg: 11, ang: 80, bkb: 55, kbg: 80, effect: 'slash' }],
        onFrame(f, fr) { if (fr === 5) NX.Audio.play('slash', { pitch: 0.7 }); }
      },
      down: {
        frames: 46, pose: 'slam',
        hitboxes: [{ f: [14, 17], x: 0, y: -12, r: 46, dmg: 12, ang: 85, bkb: 60, kbg: 75, effect: 'heavy', dir: 'auto' }],
        onFrame(f, fr) { if (fr === 14) { NX.Audio.play('stomp'); f.match.camera.shake(10); f.fx('shockwave', f.x, f.y, { r: 120 }); f.fx('dust', f.x, f.y, { n: 8 }); } }
      },
      down_air: {
        frames: 40, pose: 'dive',
        hitboxes: [{ f: [8, 30], x: 0, y: -30, r: 34, dmg: 10, ang: 60, bkb: 50, kbg: 70, effect: 'heavy', dir: 'auto' }],
        onStart(f, mv) { mv.noDrift = true; f.vx *= 0.5; },
        onFrame(f, fr, mv) { if (fr > 6) { f.vy = 13; mv.velY = true; } if (fr === 30 && !f.ground) mv.frame = 29; },
        onLand(f) {
          boom(f, f.x, f.y - 14, { r: 56, dmg: 9, ang: 85, bkb: 55, kbg: 65, effect: 'heavy' });
          f.endMoveCleanup(true); f.startLand(18); return 'continue';
        }
      }
    }
  });

})(window.NX = window.NX || {});
