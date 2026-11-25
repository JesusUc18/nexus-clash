/* NEXUS CLASH — js/fighters/roster/13-aria.js · luchador 13 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { hairCap, windOf, cape, fighter } = NX.RosterLib;

  /* ======================================================================
   * 13 · ARIA SOLENNE — Espada Resonante (espadachina con medidor)
   * Medidor RESONANCIA: al llenarse, el siguiente especial es "Crescendo".
   * ==================================================================== */
  function empower(f, mv) {
    if (f.meter < 100) return;
    f.meter = 0; mv.data.emp = true; mv.chargeMult = 1.4; f.flashTimer = 12;
    f.fx('ring', f.x, f.y - f.h / 2, { r: 60, color: '#7ad0ff', w: 6 });
    f.fx('text', f.x, f.y - f.h - 20, { text: 'CRESCENDO!', color: '#7ad0ff', size: 24 });
    NX.Audio.play('chargeFull');
  }
  function echoDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.dir || 1), 1);
    ctx.globalAlpha = Math.min(1, p.life / 4) * 0.8;
    ctx.fillStyle = '#bfe8ff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-p.r * 1.4, -4); ctx.lineTo(p.r * 1.2, -2); ctx.lineTo(p.r * 1.5, 0); ctx.lineTo(p.r * 1.2, 2); ctx.lineTo(-p.r * 1.4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha *= 0.4; R.disc(ctx, 0, 0, p.r, '#7ad0ff', false);
    ctx.restore();
  }
  fighter({
    id: 'aria', name: 'Aria Solenne', title: 'Espada Resonante',
    passive: 'Resonancia: con el medidor lleno, el siguiente especial se potencia.',
    palette: { primary: '#f4f1ea', secondary: '#2a3b6b', skin: '#f0cfb0', head: '#f0cfb0', hand: '#2a3b6b', accent: '#7ad0ff', hair: '#d8b04a', eye: '#2a3b6b', feet: '#2a3b6b', legs: '#2a3b6b', arms: '#f4f1ea', belt: '#2a3b6b' },
    stats: { weight: 95, height: 84, width: 32, run: 7.0, airSpeed: 3.9 },
    profile: { style: 'sword', reach: 1.05, power: 1, speed: 1.02 },
    meter: { max: 100, label: 'RESONANCIA', short: 'RESONANCIA', color: '#7ad0ff', gainOnHit: 1.1, text: f => f.meter >= 100 ? 'RESONANCIA MÁX' : 'RESONANCIA' },
    onDamaged(f, d) { f.addMeter(d * 0.5); },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 95, counter: 'down', sword: true },
    rig: {
      headR: 11.5, torsoW: 19, hipW: 18, torsoH: 26, thigh: 16, shin: 16, armW: 6.5,
      weapon: { type: 'sword', len: 52, w: 6, color: '#cfe6ff', glow: '#7ad0ff', trail: '#9fe0ff', guard: '#d6c06a', hilt: '#2a3b6b' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f), sw = Math.sin(a.f.tick * 0.14) * 3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8);
          ctx.quadraticCurveTo(-r * 2.2 - w * 0.5, -r * 0.6 + sw, -r * 2.0 - w, r * 1.6 + sw);
          ctx.quadraticCurveTo(-r * 1.4, r * 0.4, -r * 0.7, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
          R.disc(ctx, -r * 0.85, -r * 0.6, 3.5, a.pal.accent);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.15 });
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.95); ctx.quadraticCurveTo(r * 1.0, -r * 0.6, r * 0.75, -r * 0.05); ctx.lineTo(r * 0.45, -r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        back(ctx, a) { cape(ctx, a, a.pal.secondary, 40, 10, '#7ad0ff'); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.7, 12], [-r.hipW * 0.7, 12]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 5);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.35, -r.torsoH); ctx.lineTo(0, -r.torsoH * 0.5); ctx.lineTo(r.torsoW * 0.35, -r.torsoH); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 42, pose: 'shoot', vel: [{ f: [6, 12], vx: 7 }],
        hitboxes: [
          { f: [8, 12], x: 56, y: -46, r: 16, dmg: 9, ang: 30, bkb: 40, kbg: 75, effect: 'slash' },
          { f: [8, 12], x: 30, y: -46, r: 14, dmg: 7, ang: 30, bkb: 40, kbg: 70, effect: 'slash' }],
        onStart(f, mv) { empower(f, mv); },
        onFrame(f, fr, mv) {
          if (fr === 12) { mv.data.echo = f.localToWorld(56, -46); mv.data.dir = f.facing; }
          if (fr === 30 && mv.data.echo) {
            const e = mv.data.echo, emp = mv.data.emp;
            f.spawnProjectile({ x: e.x, y: e.y, vx: 0, vy: 0, r: emp ? 46 : 30, life: 8, dmg: emp ? 15 : 7, ang: 35, bkb: emp ? 60 : 40, kbg: emp ? 100 : 70,
              effect: 'slash', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, dir: mv.data.dir, glow: false, draw: echoDraw });
            NX.Audio.play('slash', { pitch: 1.3 });
          }
        }
      },
      side: {
        frames: 34, pose: 'ftilt', act: [5, 12], oncePerAir: true, drift: 0.2, gravity: 0.4,
        vel: [{ f: [4, 12], vx: 9, vy: 0 }],
        onStart(f, mv) { empower(f, mv); mv.data.stage = 1; },
        onFrame(f, fr, mv) {
          const st = mv.data.stage, big = st === 3;
          mv.extraBoxes = (fr >= 5 && fr <= 12) ? [{ x: 32, y: -44, r: big ? 26 : 22, dmg: big ? 10 : 6, ang: big ? 40 : 50, bkb: big ? 50 : 35, kbg: big ? 88 : 35, effect: 'slash' }] : null;
          if (fr === 5) NX.Audio.play('slash', { pitch: 0.9 + st * 0.15 });
          if (fr >= 14 && fr <= 30 && st < 3 && f.input.pressed('special')) {
            f.input.consume('special');
            mv.data.stage++; mv.frame = 0; mv.hitSets = {}; mv.swung = false;
            if (Math.abs(f.input.x) > 0.3) f.facing = Math.sign(f.input.x);
          }
        }
      },
      up: {
        frames: 46, pose: 'rise',
        hitboxes: [
          { f: [5, 12], x: 16, y: -84, r: 22, dmg: 9, ang: 85, bkb: 50, kbg: 70, effect: 'slash' },
          { f: [13, 20], x: 10, y: -84, r: 20, dmg: 5, ang: 80, bkb: 40, kbg: 80, effect: 'slash', group: 1 }],
        onStart(f, mv) { empower(f, mv); },
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 20) { f.vy = mv.data.emp ? -15.5 : -13; f.vx = f.facing * 1.5; mv.velX = mv.velY = true; }
          if (fr === 5) NX.Audio.play('slash', { pitch: 1.1 });
          if (fr === 20 && mv.data.emp) {
            f.spawnProjectile({ x: f.x, y: f.y - f.h - 10, vx: 0, vy: -9, r: 26, life: 26, dmg: 8, ang: 88, bkb: 50, kbg: 80, effect: 'slash', stageCollide: false, pierce: true, glow: false, dir: f.facing,
              draw(ctx, p) { ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 8); ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y + 14, p.r, PI * 1.15, PI * 1.85); ctx.stroke(); ctx.restore(); } });
          }
        }
      },
      down: {
        frames: 46, pose: 'counter', counter: { f: [5, 22] },
        onStart(f, mv) { empower(f, mv); mv.data.mult = mv.data.emp ? 1.9 : 1.35; },
        onCounter(f, atk, box, mv) {
          if (atk && atk !== f) {
            f.facing = U.sign(atk.x - f.x);
            const base = box && box.def ? box.def.dmg || 6 : 6;
            if (Math.abs(atk.x - f.x) < 160 && Math.abs(atk.y - f.y) < 130)
              f.hitTarget(atk, { dmg: Math.max(9, base * mv.data.mult), ang: 40, bkb: 60, kbg: 85, effect: 'slash' }, { dir: U.sign(atk.x - f.x) });
            atk.hitlag = Math.max(atk.hitlag, 8);
          }
          f.intangible = Math.max(f.intangible, 24); f.addMeter(35);
          mv.frame = Math.max(mv.frame, mv.def.frames - 20);
          f.fx('ring', f.x, f.y - f.h / 2, { r: 70, color: '#7ad0ff', w: 6 });
        }
      }
    }
  });

})(window.NX = window.NX || {});
