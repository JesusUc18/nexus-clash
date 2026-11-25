/* NEXUS CLASH — js/fighters/roster/30-tamba.js · luchador 30 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { spikes, fighter, autolink, linkTick } = NX.RosterLib;

  /* ======================================================================
   * v3.1 · TAMBA — Titán de la Selva (simio superpesado, kit tipo DK)
   * Puñetazo Gigante almacenable, Cabezazo que entierra, Kong Giratorio
   * (gran recuperación horizontal), Palmada al suelo y lanzamiento de carga.
   * ==================================================================== */
  const PUNCH_MAX = 120;
  function cargoRelease(f, mv, hit, dir) {
    const t = mv.data.victim;
    if (!t || t.grabbedBy !== f) return;
    t.grabbedBy = null; mv.data.victim = null;
    t.state = ST.AIR; t.stateTime = 0; t.ground = null;
    f.match.combat.applyHit(f, t, Object.assign({ ang: 45, bkb: 60, kbg: 60, effect: 'heavy' }, hit), { dir, noAttackerLag: true });
    NX.Audio.play('throw');
    mv.frame = Math.max(mv.frame, mv.def.frames - 16);
  }
  fighter({
    id: 'tamba', name: 'Tamba', title: 'Titán de la Selva',
    passive: 'Carga del titán: al lanzar hacia delante levanta al rival y puede caminar y saltar con él antes de arrojarlo.',
    palette: { primary: '#4a5a6e', secondary: '#d8c8a8', skin: '#d8c8a8', head: '#4a5a6e', hand: '#3a4656', arms: '#4a5a6e', legs: '#4a5a6e', feet: '#3a4656', accent: '#e8b82a', eye: '#2a1a0a', belt: '#3a8a3a' },
    stats: { weight: 127, height: 98, width: 52, walk: 3.0, run: 7.3, dash: 7.8, airSpeed: 4.0, gravity: 0.62, fall: 10.5, fastFall: 15.5, jump: 13.2, shortHop: 8.6, airJump: 12.2, traction: 0.55 },
    profile: { style: 'heavy', reach: 1.22, power: 1.14, speed: 0.92 },
    meter: { max: PUNCH_MAX, label: 'PUÑO', short: 'PUÑO', color: '#e8b82a', text: f => (f.data.punch || 0) >= PUNCH_MAX ? 'PUÑO MÁX' : 'PUÑO' },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 80, heavy: true, grappler: true },
    init(f) { f.data.punch = 0; },
    onLifeReset(f) { f.data.punch = 0; f.meter = 0; },
    onUpdate(f) {
      f.meter = f.data.punch || 0;
      if (f.data.punch >= PUNCH_MAX && f.tick % 8 === 0 && f.inPlay()) f.fx('sparkle', f.x + f.facing * 30, f.y - f.h * 0.5, { color: '#ffd23a' });
    },
    moves: {
      throw_fwd: {
        frames: 190, release: 999, path: 'up',
        poseFn(f, mv) { const s = Math.sin(mv.frame * 0.25) * 0.15; return { aF1: 3.0, aF2: 0.25, aB1: 2.9, aB2: 0.3, lF1: 0.3 + s, lB1: -0.3 - s }; },
        victimPath(f, t) { t.x = f.x; t.y = f.y - f.h - 2; t.facing = f.facing; },
        onFrame(f, fr, mv) {
          const I = f.input, t = mv.data.victim;
          if (!t) return;
          if (fr === 1) { mv.data.mash = 0; f.fx('text', f.x, f.y - f.h - 50, { text: '¡CARGA!', color: '#e8b82a', size: 20 }); }
          if (f.ground) { f.vx = I.x * 2.6; mv.velX = true; if (I.pressed('jump') || I.pressed('tapjump')) { I.consume('jump'); I.consume('tapjump'); f.vy = -11; f.ground = null; NX.Audio.play('airjump'); } }
          if (t.input.mashed) mv.data.mash++;
          if (mv.data.mash > 22 + t.percent / 8) {
            t.grabbedBy = null; mv.data.victim = null; t.state = ST.AIR; t.stateTime = 0; t.ground = null; t.vy = -6; t.actionLock = 8;
            mv.frame = Math.max(fr, mv.def.frames - 14); return;
          }
          if (fr > 12 && (I.pressed('attack') || I.pressed('grab') || I.pressed('special') || I.smashPressed())) {
            ['attack', 'grab', 'special', 'smash'].forEach(k => I.consume(k));
            const d = I.dir(), back = d === 'side' && Math.sign(I.x) !== f.facing;
            if (d === 'up') cargoRelease(f, mv, { dmg: 8, ang: 88, bkb: 70, kbg: 66 }, f.facing);
            else if (d === 'down') cargoRelease(f, mv, { dmg: 7, ang: 70, bkb: 60, kbg: 50 }, f.facing);
            else if (back) cargoRelease(f, mv, { dmg: 11, ang: 45, bkb: 60, kbg: 78 }, -f.facing);
            else cargoRelease(f, mv, { dmg: 9, ang: 42, bkb: 62, kbg: 66 }, f.facing);
            return;
          }
          if (fr >= 170) cargoRelease(f, mv, { dmg: 9, ang: 42, bkb: 62, kbg: 66 }, f.facing);
        }
      },
      throw_back: std => Object.assign({}, std, { hit: Object.assign({}, std.hit, { dmg: 11, kbg: 80 }) })
    },
    rig: {
      torsoW: 46, hipW: 34, torsoH: 34, torsoRound: 16, headR: 15, headW: 1.05, neck: 0, armW: 13, upperArm: 21, foreArm: 20, handR: 10,
      thigh: 11, shin: 10, legW: 13, footL: 14, footH: 8, belly: '#d8c8a8', brows: true,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.ellipse(ctx, r * 0.45, r * 0.15, r * 0.62, r * 0.55, 0, '#d8c8a8');
          R.ellipse(ctx, r * 0.95, r * 0.05, r * 0.1, r * 0.07, 0, '#2a1a0a', false);
          R.ellipse(ctx, r * 0.7, r * 0.05, r * 0.1, r * 0.07, 0, '#2a1a0a', false);
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r * 0.45, r * 0.5); ctx.quadraticCurveTo(r * 0.75, r * 0.6, r * 1.0, r * 0.45); ctx.stroke();
          ctx.fillStyle = U.shade('#4a5a6e', -0.2); ctx.fillRect(-r * 0.1, -r * 0.62, r * 1.05, r * 0.2);
          spikes(ctx, r * 0.95, U.shade('#4a5a6e', -0.15), 5, 0.22, PI * 1.25, PI * 1.75);
          R.disc(ctx, -r * 0.55, -r * 0.05, r * 0.28, '#d8c8a8');
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = '#3a8a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.42, -r.torsoH * 0.95); ctx.lineTo(r.torsoW * 0.35, -r.torsoH * 0.12); ctx.stroke();
          for (let i = 0; i < 3; i++) R.poly(ctx, [[-r.torsoW * 0.2 + i * 10, -r.torsoH * 0.65 + i * 7], [-r.torsoW * 0.1 + i * 10, -r.torsoH * 0.8 + i * 7], [-r.torsoW * 0.02 + i * 10, -r.torsoH * 0.6 + i * 7]], '#5aba4a');
        },
        hand(ctx, a) {
          const J = a.J, el = J.elF, h = J.haF;
          const mx = el.x + (h.x - el.x) * 0.6, my = el.y + (h.y - el.y) * 0.6, ang = Math.atan2(h.y - el.y, h.x - el.x);
          ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
          ctx.fillStyle = '#e8b82a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.rect(-4, -8, 8, 16); ctx.fill(); ctx.stroke();
          ctx.restore();
          const mv = a.f.move;
          const k = mv && mv.def.key === 'special_neutral' ? Math.min(1, (mv.charge || 0) / PUNCH_MAX) : ((a.f.data && a.f.data.punch) || 0) / PUNCH_MAX;
          if (k > 0.3) { ctx.save(); ctx.globalAlpha = 0.25 + 0.35 * k; R.disc(ctx, h.x, h.y, a.rig.handR * (1.2 + k), '#ffd23a', false); ctx.restore(); }
        }
      }
    },
    specials: {
      neutral: {
        frames: 44, pose: 'fsmash', charge: { at: 8, max: PUNCH_MAX, key: 'special', mult: 1 },
        poseFn(f, mv, k, POSES) {
          if (mv.charging) { const s = Math.sin(mv.charge * 0.35); return { aF1: 1.2 + s * 1.6, aF2: 0.3, aB1: -0.4, aB2: 0.4, lean: -0.1, lF1: 0.3, lB1: -0.3 }; }
          return k < 1 ? POSES.fsmash.wind : POSES.fsmash.strike;
        },
        onStart(f, mv) {
          mv.charge = Math.min(PUNCH_MAX, f.data.punch || 0);
          if (mv.charge >= PUNCH_MAX) mv.chargeDone = true;
          f.data.punch = 0;
        },
        onCharge(f, mv) {
          f.data.punch = mv.charge;
          if (mv.charge % 12 === 0) NX.Audio.play('swing', { size: 0.6 });
          const I = f.input;
          if (mv.charge >= PUNCH_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.punch = mv.charge;
            if (mv.charge >= PUNCH_MAX) { f.fx('text', f.x, f.y - f.h - 18, { text: 'PUÑO LISTO', color: '#ffd23a', size: 20 }); NX.Audio.play('chargeFull'); }
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          const k = (mv.charge || 0) / PUNCH_MAX, full = k >= 1;
          if (fr === 9) { f.data.punch = 0; mv.data.k = k; if (full) f.fx('text', f.x, f.y - f.h - 20, { text: '¡PUÑO GIGANTE!', color: '#ffd23a', size: 22 }); }
          if (full && fr <= 16) f.armorKB = 999;
          if (fr >= 10 && fr <= 14) { f.vx = f.facing * (3 + 5 * k); mv.velX = true; }
          mv.extraBoxes = (fr >= 12 && fr <= 15) ? [
            { x: 52, y: -48, r: 24, dmg: 10 + 18 * k, ang: full ? 45 : 50, bkb: 30 + 30 * k, kbg: 60 + 32 * k, effect: 'heavy' },
            { x: 26, y: -50, r: 18, dmg: 9 + 16 * k, ang: 50, bkb: 30 + 25 * k, kbg: 58 + 30 * k, effect: 'heavy' }] : null;
          if (fr === 12) { NX.Audio.play(full ? 'explosion' : 'swing', { size: 1 + k, pitch: 0.8 }); if (full) f.match.camera.shake(8); }
        }
      },
      side: {
        frames: 46, pose: 'overhead', armor: { f: [5, 16], kb: 90 }, gravity: 0.6, drift: 0.4,
        hitboxes: [
          { f: [14, 18], x: 34, y: -46, r: 26, dmg: 10, ang: 270, bkb: 40, kbg: 60, effect: 'heavy', meteor: true, bury: true },
          { f: [14, 18], x: 12, y: -62, r: 18, dmg: 9, ang: 270, bkb: 40, kbg: 60, effect: 'heavy', meteor: true, bury: true }],
        onStart(f) { if (!f.ground) f.vy = Math.min(f.vy, -2.5); },
        onFrame(f, fr) { if (fr === 14) { NX.Audio.play('stomp'); f.match.camera.shake(4); } }
      },
      up: {
        frames: 66, pose: 'spin', helplessLag: 22, drift: 0, gravity: 0.35,
        hitboxes: (function () {
          const a = [{ f: [6, 9], x: 0, y: -46, r: 40, dmg: 6, ang: 80, bkb: 50, kbg: 20, effect: 'heavy', dir: 'auto', group: 1 }];
          for (let i = 0; i < 6; i++) a.push({ f: [13 + i * 6, 15 + i * 6], x: 0, y: -46, r: 40, dmg: 1.2, ang: 85, bkb: 40, kbg: 10, effect: 'heavy', dir: 'auto', group: i + 2 });
          a.push({ f: [50, 52], x: 0, y: -46, r: 44, dmg: 3, ang: 50, bkb: 55, kbg: 135, effect: 'heavy', dir: 'auto', group: 9 });
          return a;
        })(),
        onStart(f, mv) { mv.data.air = !f.ground; if (mv.data.air) f.vy = -7.5; },
        onFrame(f, fr, mv) {
          const I = f.input;
          if (fr === 6) NX.Audio.play('spin', { pitch: 0.6 });
          if (fr >= 6 && fr <= 52) {
            f.vx = U.approach(f.vx, Math.abs(I.x) > 0.2 ? I.x * (mv.data.air ? 6.4 : 5) : f.facing * 1.5, 0.6); mv.velX = true;
            if (mv.data.air) { f.vy = U.approach(f.vy, fr < 30 ? -2.2 : 1.6, 0.35); mv.velY = true; }
          }
          if (fr < 50) linkTick(f, mv, 0.25);
          if (fr % 4 === 0 && fr <= 52) f.fx('dust', f.x + U.rand(-30, 30), f.y - U.rand(0, 40), { n: 1 });
        },
        onHit(f, t, mv) { if (mv.frame < 50) autolink(f, t, mv); },
        onLand(f, mv) { if (!mv.data.air) return; f.endMoveCleanup(true); f.startLand(20); return 'continue'; }
      },
      down: {
        frames: 52, pose: 'slam',
        onStart(f, mv) { mv.data.air = !f.ground; mv.data.slaps = 0; },
        onFrame(f, fr, mv) {
          if (mv.data.air) {
            mv.extraBoxes = (fr >= 10 && fr <= 13) ? [{ x: 20, y: -70, r: 30, dmg: 12, ang: 85, bkb: 45, kbg: 85, effect: 'heavy' }] : null;
            if (fr === 10) NX.Audio.play('stomp', { pitch: 1.4 });
            return;
          }
          if (fr >= 10 && fr <= 40 && (fr - 10) % 8 === 0) {
            mv.data.slaps++; mv.hitSets = {};
            const last = fr === 34 || mv.data.slaps >= 9;
            mv.extraBoxes = [
              { x: 52, y: -10, r: 30, dmg: last ? 6 : 3.5, ang: 85, bkb: last ? 65 : 55, kbg: last ? 72 : 30, effect: 'heavy', dir: 'auto' },
              { x: -52, y: -10, r: 30, dmg: last ? 6 : 3.5, ang: 85, bkb: last ? 65 : 55, kbg: last ? 72 : 30, effect: 'heavy', dir: 'auto' }];
            NX.Audio.play('stomp'); f.match.camera.shake(4);
            f.fx('dust', f.x + 52, f.y, { n: 4 }); f.fx('dust', f.x - 52, f.y, { n: 4 });
          } else if ((fr - 10) % 8 >= 3) mv.extraBoxes = null;
          if (fr === 30 && f.input.isHeld('special') && mv.data.slaps < 8) mv.frame = 25;
        }
      }
    }
  });

})(window.NX = window.NX || {});
