/* NEXUS CLASH — js/fighters/roster/27-haldor.js · luchador 27 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, hairCap, spikes, windOf, fighter, autolink, linkTick, counterMove } = NX.RosterLib;

  /* ======================================================================
   * v3.1 · HALDOR — Mercenario del Alba (mandoble pesado, kit tipo Ike)
   * Erupción cargable (autodaño al máximo), Tajo Relámpago cargable,
   * Éter (lanza la espada, la recoge y cae) y Contraataque.
   * ==================================================================== */
  const ERUPT_MAX = 150;
  function swordSpinDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.6);
    ctx.globalAlpha = 0.35; R.disc(ctx, 0, 0, p.r, '#ffd28a', false); ctx.globalAlpha = 1;
    R.poly(ctx, [[-7, -30], [7, -30], [9, 18], [0, 30], [-9, 18]], '#b9c2cc');
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(-12, -32, 24, 5);
    ctx.fillStyle = '#4a2a1a'; ctx.fillRect(-3, -44, 6, 12);
    ctx.restore();
  }
  fighter({
    id: 'haldor', name: 'Haldor', title: 'Mercenario del Alba',
    passive: 'Mandoble de dos manos: golpes lentos con alcance y potencia enormes. Erupción al máximo le cuesta 10%.',
    palette: { primary: '#4a5a2a', secondary: '#6a3e22', skin: '#d8a27a', head: '#d8a27a', hand: '#5a3a22', arms: '#d8a27a', legs: '#3a2a1e', feet: '#2a1a12', accent: '#ffb03a', hair: '#a8481e', eye: '#2a1a0a', belt: '#c9a43a' },
    stats: { weight: 107, height: 92, width: 38, walk: 2.9, run: 6.7, dash: 7.2, airSpeed: 3.8, gravity: 0.62, fall: 10.4, fastFall: 15.5, jump: 13.2, shortHop: 8.6, airJump: 12.2, traction: 0.55 },
    profile: { style: 'sword', reach: 1.22, power: 1.24, speed: 0.85 },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 115, counter: 'down', sword: true, heavy: true },
    onLifeReset(f) { f.data.swordUp = false; },
    rig: {
      headR: 11.5, torsoW: 25, hipW: 22, torsoH: 28, armW: 8, upperArm: 16, foreArm: 15, handR: 6, legW: 9, brows: true,
      weapon: { type: 'sword', len: 60, w: 13, trail: '#ffd28a' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f);
          ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.35); ctx.quadraticCurveTo(-r * 1.6 - w * 0.4, -r * 0.1, -r * 2.0 - w * 0.6, r * 0.5 + Math.sin(a.f.tick * 0.2) * 2); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          spikes(ctx, r * 0.98, a.pal.hair, 6, 0.38, PI * 1.05, PI * 1.95);
          hairCap(ctx, r, a.pal.hair, { a1: -0.35 });
          ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.0, PI * 1.12, PI * 1.88); ctx.stroke();
          ctx.strokeStyle = U.rgba('#8a3a2a', 0.9); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.05); ctx.lineTo(r * 0.75, r * 0.45); ctx.stroke();
        },
        back(ctx, a) {
          const s = a.J.shB;
          R.ellipse(ctx, s.x, s.y + 2, 10, 7, 0.3, '#7a7f86');
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.5, -r.torsoH], [r.torsoW * 0.1, -r.torsoH], [-r.torsoW * 0.05, -6], [-r.torsoW * 0.5, -6]], a.pal.secondary);
          ctx.strokeStyle = '#c9a43a'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.45, -r.torsoH * 0.95); ctx.lineTo(r.torsoW * 0.42, -r.torsoH * 0.2); ctx.stroke();
          R.ellipse(ctx, r.torsoW * 0.32, -r.torsoH * 0.9, 9, 6, -0.3, '#8a9098');
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.7, 14], [-r.hipW * 0.7, 14]], '#3a2a1e');
        },
        weapon(ctx, f, w) {
          if (f.data && f.data.swordUp) return;
          ctx.fillStyle = '#4a2a1a'; ctx.fillRect(-3, -16, 6, 18);
          R.disc(ctx, 0, -17, 3.5, '#c9a43a');
          R.poly(ctx, [[-13, 2], [13, 2], [11, 8], [-11, 8]], '#c9a43a');
          R.poly(ctx, [[-8, 8], [8, 8], [9, w.len * 0.8], [0, w.len], [-9, w.len * 0.8]], '#b9c2cc');
          ctx.strokeStyle = U.rgba('#ffb03a', 0.85); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, w.len * 0.82); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 48, pose: 'slam', gravity: 0.45, charge: { at: 8, max: ERUPT_MAX, key: 'special', mult: 1 },
        onCharge(f, mv) {
          if (mv.charge % 4 === 0) f.fx('flame', f.x + f.facing * U.rand(20, 50), f.y - U.rand(0, 20), { scale: 0.7 + mv.charge / ERUPT_MAX });
          if (mv.charge === ERUPT_MAX - 1) f.fx('text', f.x, f.y - f.h - 22, { text: '¡AL LÍMITE!', color: '#ffb03a', size: 20 });
        },
        onRelease(f, mv) {
          mv.data.k = mv.charge / ERUPT_MAX;
          if (mv.charge >= ERUPT_MAX) { f.addDamage(10, null); f.flashTimer = 10; mv.data.self = true; }
        },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.data.k || 0, x = f.x + f.facing * 46, y = f.y - 26;
          boom(f, x, y, { r: 40 + 26 * k, dmg: 10 + 20 * k, ang: 80, bkb: 50 + 25 * k, kbg: 70 + 25 * k, effect: 'fire' });
          for (let i = 0; i < 6 + k * 8; i++) f.fx('flame', x + U.rand(-24, 24), y - U.rand(0, 70 + 60 * k), { scale: 1 + k });
        }
      },
      side: {
        frames: 62, pose: 'dashattack', oncePerAir: true, gravity: 0.25, drift: 0, ledgeGrab: true,
        charge: { at: 6, max: 80, key: 'special', mult: 1 },
        onStart(f) { if (!f.ground) f.vy = Math.min(f.vy, 1); },
        onCharge(f, mv) { f.vx *= 0.8; if (mv.charge % 5 === 0) f.fx('sparkle', f.x - f.facing * 10, f.y - f.h * 0.5, { color: '#ffd28a' }); },
        onRelease(f, mv) {
          const k = mv.charge / 80;
          mv.data.len = Math.round(9 + 15 * k); mv.data.dmg = 6 + 9 * k;
          NX.Audio.play('dash', { pitch: 1.2 });
        },
        onFrame(f, fr, mv) {
          const len = mv.data.len || 9, end = 7 + len;
          if (fr >= 7 && fr < end && !mv.data.hit) {
            f.vx = f.facing * 15; f.vy = 0; mv.velX = mv.velY = true;
            mv.extraBoxes = [{ x: 18, y: -44, r: 30, dmg: mv.data.dmg || 6, ang: 30, bkb: 60, kbg: 72, effect: 'slash' }];
            if (fr % 2 === 0) f.match.effects.list.push({ type: 'streak', x: f.x - f.facing * 20, y: f.y - U.rand(10, f.h), vx: -f.facing * 8, vy: 0, life: 10, max: 10, len: 22, color: '#ffd28a' });
          } else if (!mv.data.stopped && (fr >= end || mv.data.hit)) {
            mv.data.stopped = true; mv.extraBoxes = null; f.vx = f.facing * 3;
            NX.Audio.play('slash', { pitch: 0.8 });
            mv.frame = Math.max(fr, mv.def.frames - 22);
          }
          if (fr >= mv.def.frames - 1 && !f.ground && !mv.data.hit) {
            f.endMoveCleanup(true); f.state = ST.HELPLESS; f.stateTime = 0; f.helplessLag = 20;
          }
        },
        onHit(f, t, mv) { mv.data.hit = true; }
      },
      up: {
        frames: 80, pose: 'rise', drift: 0.25, helplessLag: 24, armor: { f: [3, 16], kb: 120 },
        hitboxes: [
          { f: [6, 9], x: 6, y: -60, r: 26, dmg: 2, ang: 90, bkb: 55, kbg: 12, effect: 'slash', group: 1 },
          { f: [10, 13], x: 6, y: -60, r: 26, dmg: 2, ang: 90, bkb: 55, kbg: 12, effect: 'slash', group: 2 },
          { f: [14, 17], x: 6, y: -60, r: 26, dmg: 2, ang: 90, bkb: 55, kbg: 12, effect: 'slash', group: 3 },
          { f: [27, 40], x: 8, y: -14, r: 30, dmg: 5, ang: 270, bkb: 30, kbg: 50, effect: 'slash', meteor: true, group: 4 }],
        onFrame(f, fr, mv) {
          if (fr === 4) {
            f.data.swordUp = true; NX.Audio.play('swing', { size: 1.4 });
            shoot(f, { ox: 8, oy: -f.h, speed: 0, vy: -14.5, r: 24, life: 17, dmg: 6, ang: 88, bkb: 60, kbg: 30, effect: 'slash',
              reflectable: false, absorbable: false, destructible: false, stageCollide: false, pierce: true, glow: false, draw: swordSpinDraw });
          }
          if (fr >= 5 && fr <= 20) { f.vy = -14; mv.velY = true; linkTick(f, mv, 0.25); }
          else if (fr > 20 && fr <= 26) {
            linkTick(f, mv, 0.3);
            f.vy = 0; mv.velY = true;
            if (fr === 21) { f.data.swordUp = false; f.fx('ring', f.x, f.y - f.h, { r: 40, color: '#ffd28a' }); NX.Audio.play('slash', { pitch: 1.2 }); }
          } else if (fr > 26) {
            f.vy = 16; mv.velY = true; mv.data.dive = true;
            if (fr % 2 === 0) f.fx('flame', f.x, f.y - 6, { scale: 1.1 });
            linkTick(f, mv, 0.3);
            if (fr >= 40 && !f.ground) mv.frame = 39;
          }
        },
        onHit(f, t, mv) { if (mv.frame <= 40) autolink(f, t, mv); },
        onEnd(f) { f.data.swordUp = false; },
        onLand(f, mv) {
          f.data.swordUp = false;
          if (mv.data.dive) boom(f, f.x + f.facing * 10, f.y - 16, { r: 56, dmg: 6, ang: 60, bkb: 60, kbg: 110, effect: 'fire' });
          f.endMoveCleanup(true); f.startLand(mv.data.dive ? 22 : 12);
          return 'continue';
        }
      },
      down: counterMove({ mult: 1.2, min: 8, kbg: 92, color: '#ffd28a', text: '¡CONTRA!' })
    }
  });

})(window.NX = window.NX || {});
