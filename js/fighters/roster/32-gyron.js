/* NEXUS CLASH — js/fighters/roster/32-gyron.js · luchador 32 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, fighter, autolink, linkTick } = NX.RosterLib;

  /* ======================================================================
   * v6 · GYRON-64 — Centinela Retro (robot de juguete sobre ruedas, kit
   * tipo R.O.B.). Láser Óptico que se recarga solo, Rotor de Brazos que
   * refleja, Propulsores con COMBUSTIBLE (vuela mientras mantengas el
   * botón; se recarga en el suelo) y Peonza Giro cargable.
   * ==================================================================== */
  const LASER_MAX = 300, FUEL_MAX = 100;
  function laserDraw(len) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba('#ff3b2a', 0.45); ctx.lineWidth = p.r * 2.4; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#ff7a4a'; ctx.lineWidth = p.r * 1.2; ctx.stroke();
      ctx.strokeStyle = '#fff3e0'; ctx.lineWidth = p.r * 0.45; ctx.stroke();
      ctx.restore();
    };
  }
  function gyroDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    const sp = p.data.spin || 0, r = p.r;
    R.poly(ctx, [[-r * 1.15, -r * 0.1], [r * 1.15, -r * 0.1], [0, r * 1.0]], '#ff7a2a');
    R.ellipse(ctx, 0, -r * 0.1, r * 1.2, r * 0.42, 0, '#f2ecd8');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 1.2, r * 0.42, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#2a8f8a';
    for (let i = 0; i < 4; i++) { const x = ((sp * 9 + i * r * 0.9) % (r * 3.6)) - r * 1.8; ctx.fillRect(x, -r * 0.6, r * 0.32, r); }
    ctx.restore();
    ctx.fillStyle = '#4d5660'; ctx.fillRect(-r * 0.14, -r * 0.95, r * 0.28, r * 0.6);
    ctx.restore();
  }
  fighter({
    id: 'gyron', name: 'Gyron-64', title: 'Centinela Retro',
    passive: 'Sin piernas: rueda sobre su base. Propulsores con COMBUSTIBLE (mantén ↑+B para volar; se recarga en el suelo). Láser que se recarga solo.',
    palette: { primary: '#e9e2cf', secondary: '#2a8f8a', skin: '#e9e2cf', head: '#e9e2cf', hand: '#4d5660', arms: '#9aa3ad', legs: '#9aa3ad', feet: '#4d5660', accent: '#ff7a2a', eye: '#ff3b2a', belt: '#2a8f8a' },
    stats: { weight: 106, height: 96, width: 40, walk: 2.5, run: 5.4, dash: 6.2, airSpeed: 3.4, airAccel: 0.22, gravity: 0.42, fall: 8.8, fastFall: 13.5, jump: 13.0, shortHop: 8.2, airJump: 12.6 },
    profile: { style: 'fist', reach: 1.12, power: 1.06, speed: 0.92 },
    meter: { max: FUEL_MAX, start: FUEL_MAX, label: 'COMBUSTIBLE', short: 'COMBUSTIBLE', color: '#ff7a2a',
      text: f => ((f.data.laser || 0) >= LASER_MAX ? 'LÁSER LISTO · ' : '') + 'COMBUSTIBLE' },
    ai: { recovery: 'up', projectile: 'neutral', range: 125, zoner: true, heavy: true },
    init(f) { f.data.laser = LASER_MAX; f.data.gyroOut = false; },
    onLifeReset(f) { f.data.laser = LASER_MAX; f.meter = FUEL_MAX; f.data.burnUsed = false; f.data.rotorLift = false; f.data.burning = false; },
    onUpdate(f) {
      if ((f.data.laser || 0) < LASER_MAX) { f.data.laser++; if (f.data.laser === LASER_MAX && f.inPlay()) f.fx('sparkle', f.x + f.facing * 14, f.y - f.h * 0.85, { color: '#ff3b2a' }); }
      const burning = f.move && f.move.def.key === 'special_up';
      if (f.ground && !burning) { f.meter = Math.min(FUEL_MAX, f.meter + 1.6); f.data.burnUsed = false; f.data.rotorLift = false; }
    },
    rig: {
      legs: false, thigh: 16, shin: 16, footH: 6, footL: 10,
      headR: 13, headW: 1.15, headH: 0.95, neck: 5, torsoW: 30, hipW: 20, torsoH: 23, torsoRound: 5,
      armW: 8, upperArm: 16, foreArm: 15, handR: 6, eyes: 'none', mouth: false,
      parts: {
        back(ctx, a) {
          const { J, f, p, rig } = a;
          const baseY = p.planted ? -1 : J.hip.y + (rig.thigh + rig.shin) * 0.95 + rig.footH * 0.5;
          const top = J.hip.y - 4, colH = Math.max(4, baseY - 12 - top);
          ctx.fillStyle = '#9aa3ad'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(J.hip.x - 6, top, 12, colH); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#6b737c'; ctx.lineWidth = 1.2;
          for (let y = top + 6; y < top + colH - 2; y += 6) { ctx.beginPath(); ctx.moveTo(J.hip.x - 5, y); ctx.lineTo(J.hip.x + 5, y); ctx.stroke(); }
          if (f.data && f.data.burning) {
            for (const dx of [-14, 14]) {
              const L = 18 + Math.random() * 14;
              const g = ctx.createLinearGradient(0, baseY, 0, baseY + L);
              g.addColorStop(0, '#fff3c0'); g.addColorStop(0.4, '#ff9a2a'); g.addColorStop(1, 'rgba(255,60,0,0)');
              ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(dx - 7, baseY - 2); ctx.lineTo(dx + 7, baseY - 2); ctx.lineTo(dx, baseY + L); ctx.closePath(); ctx.fill();
            }
          }
          R.poly(ctx, [[-22, baseY - 12], [22, baseY - 12], [27, baseY - 3], [-27, baseY - 3]], a.pal.secondary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-24, baseY - 8, 48, 2.5);
          const roll = (f.x || 0) * 0.12;
          for (const wx of [-16, 0, 16]) {
            R.disc(ctx, wx, baseY - 2, 4.6, '#2b2f35');
            ctx.strokeStyle = '#8a929b'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(wx + Math.cos(roll) * 3, baseY - 2 + Math.sin(roll) * 3); ctx.lineTo(wx - Math.cos(roll) * 3, baseY - 2 - Math.sin(roll) * 3); ctx.stroke();
          }
        },
        head(ctx, a) {
          const r = a.rig.headR, f = a.f;
          R.poly(ctx, [[-r * 1.15, -r * 0.92], [r * 1.22, -r * 0.92], [r * 1.22, r * 0.88], [-r * 1.15, r * 0.88]], a.pal.head);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 1.15, -r * 0.92, r * 2.37, r * 0.3);
          R.poly(ctx, [[-r * 0.25, -r * 0.45], [r * 1.22, -r * 0.45], [r * 1.22, r * 0.38], [-r * 0.25, r * 0.38]], '#20262c');
          const k = f.data && f.data.laser != null ? Math.min(1, f.data.laser / LASER_MAX) : 1;
          const ec = U.mixRgb(U.hexToRgb('#5a2218'), U.hexToRgb(a.pal.eye || '#ff3b2a'), k), eye = `rgb(${ec.r},${ec.g},${ec.b})`;
          if (k >= 1) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(f.tick * 0.2); R.disc(ctx, r * 0.85, -r * 0.04, r * 0.48, '#ff3b2a', false); ctx.globalAlpha = 1; }
          R.disc(ctx, r * 0.85, -r * 0.04, r * 0.27, eye);
          R.disc(ctx, r * 0.22, -r * 0.04, r * 0.23, eye);
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(r * 0.78, -r * 0.2, r * 0.12, r * 0.08);
          R.disc(ctx, -r * 0.65, r * 0.05, r * 0.22, a.pal.accent);
          ctx.fillStyle = '#6b737c'; ctx.fillRect(-r * 0.3, r * 0.88, r * 0.6, r * 0.35);
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.32, -r.torsoH * 0.88], [r.torsoW * 0.36, -r.torsoH * 0.88], [r.torsoW * 0.3, -r.torsoH * 0.3], [-r.torsoW * 0.26, -r.torsoH * 0.3]], a.pal.secondary);
          ctx.fillStyle = '#ffffff'; ctx.font = '700 8px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('64', r.torsoW * 0.04, -r.torsoH * 0.6);
          ctx.strokeStyle = '#b9b19a'; ctx.lineWidth = 1.4;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r.hipW * 0.35, -4 - i * 3.4); ctx.lineTo(r.hipW * 0.35, -4 - i * 3.4); ctx.stroke(); }
        },
        hand(ctx, a) {
          const J = a.J, el = J.elF, h = J.haF, ang = Math.atan2(h.y - el.y, h.x - el.x);
          const open = a.f.move ? 0.55 : 0.3;
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);
          for (const s of [-1, 1]) {
            ctx.save(); ctx.rotate(s * open);
            R.poly(ctx, [[0, -2.5], [11, -2], [13, 0], [11, 2], [0, 2.5]], '#4d5660');
            ctx.restore();
          }
          R.disc(ctx, 0, 0, 4.5, '#6b737c');
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'shoot', gravity: 0.6,
        onFrame(f, fr) {
          if (fr !== 10) return;
          const k = Math.min(1, (f.data.laser || 0) / LASER_MAX), full = k >= 1;
          f.data.laser = 0;
          const aim = U.clamp(f.input.y, -1, 1) * 0.32, sp = 15;
          NX.Audio.play('laser', { pitch: full ? 0.8 : 1.4 });
          shoot(f, { ox: 18, oy: -f.h * 0.84, speed: 0, vx: Math.cos(aim) * sp * f.facing, vy: Math.sin(aim) * sp, r: full ? 7 : 4.5, life: full ? 46 : 30,
            dmg: full ? 9 : 2 + 4 * k, ang: 40, bkb: full ? 40 : 15, kbg: full ? 70 : 30, effect: 'fire', bounce: full ? 2 : 0, bounceDamp: 1,
            color: '#ff3b2a', glow: false, draw: laserDraw(full ? 70 : 34) });
          if (full) f.fx('text', f.x, f.y - f.h - 16, { text: 'LÁSER MÁX', color: '#ff3b2a', size: 16 });
          if (!f.ground) f.vx -= f.facing * 1.5;
        }
      },
      side: {
        frames: 46, pose: 'spin', gravity: 0.35, drift: 0.6,
        reflect: { f: [6, 30], x: 0, y: -50, r: 48, mult: 1.25, color: '#ffb36a' },
        hitboxes: (function () {
          const a = [];
          for (let i = 0; i < 5; i++) a.push({ f: [7 + i * 5, 9 + i * 5], x: 0, y: -50, r: 36, dmg: 1.8, ang: 70, bkb: 30, kbg: 10, effect: 'hit', dir: 'auto', group: i + 1 });
          a.push({ f: [32, 34], x: 0, y: -50, r: 40, dmg: 4, ang: 361, bkb: 45, kbg: 95, effect: 'hit', dir: 'auto', group: 9 });
          return a;
        })(),
        onStart(f, mv) { if (!f.ground && !f.data.rotorLift) { f.data.rotorLift = true; mv.data.lift = true; } },
        onFrame(f, fr, mv) {
          if (mv.data.lift && fr >= 7 && fr <= 24) { f.vy = Math.min(f.vy, -2.4); mv.velY = true; }
          if (fr >= 7 && fr <= 32 && fr % 6 === 1) NX.Audio.play('spin', { pitch: 1.2 });
          if (fr < 32) linkTick(f, mv, 0.2);
        },
        onHit(f, t, mv) { if (mv.frame < 32) autolink(f, t, mv); }
      },
      up: {
        frames: 200, pose: 'rise', helpless: false, oncePerAir: true, drift: 0,
        hitboxes: [{ f: [1, 8], x: 0, y: -2, r: 30, dmg: 6, ang: 80, bkb: 50, kbg: 55, effect: 'fire', dir: 'auto' }],
        canUse(f) { return f.meter > 4 && !f.data.burnUsed; },
        onStart(f, mv) { f.data.burnUsed = true; f.data.burning = true; mv.data.min = 22; NX.Audio.play('fire', { pitch: 0.6 }); },
        onFrame(f, fr, mv) {
          const I = f.input;
          const held = f.isHuman ? I.isHeld('special') : fr < 70;
          const burning = (fr <= mv.data.min || held) && f.meter > 0 && fr < 199;
          if (!burning) {
            f.data.burning = false;
            f.endMoveCleanup(false);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
            return;
          }
          f.meter = Math.max(0, f.meter - 1.15);
          f.vy = U.approach(f.vy, -7.2, 0.95); mv.velY = true;
          f.vx = U.approach(f.vx, I.x * 4.2, 0.35); mv.velX = true;
          if (Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x);
          if (fr % 2 === 0) f.fx('flame', f.x + U.rand(-14, 14), f.y + 6, { scale: 0.7 });
          if (fr % 12 === 0) NX.Audio.play('fire', { pitch: 0.5 });
        },
        onEnd(f) { f.data.burning = false; },
        onLand(f, mv) {
          if (mv.frame < 10) return;
          f.data.burning = false; f.endMoveCleanup(true); f.startLand(6);
          return 'continue';
        }
      },
      down: {
        frames: 36, pose: 'slam', charge: { at: 6, max: 60, key: 'special', mult: 1 },
        canUse(f) { return !f.data.gyroOut; },
        onCharge(f, mv) { if (mv.charge % 5 === 0) f.fx('sparkle', f.x + f.facing * 20, f.y - 14, { color: '#ff7a2a' }); },
        onRelease(f, mv) { mv.data.k = mv.charge / 60; },
        onFrame(f, fr, mv) {
          if (fr !== 9) return;
          const k = mv.data.k || 0;
          f.data.gyroOut = true;
          NX.Audio.play('spin', { pitch: 1.5 });
          f.spawnProjectile({
            x: f.x + f.facing * 30, y: f.y - 16, vx: f.facing * (3.5 + 6 * k), vy: f.ground ? 0 : 2, gravity: 0.5, maxFall: 10,
            r: 12, life: 420, dmg: 5 + 5 * k, ang: 40, bkb: 30, kbg: 55, effect: 'hit', pierce: true, hits: 99, rehit: 24,
            passCollide: true, reflectable: false, absorbable: false, destructible: true, glow: false, color: '#ff7a2a',
            data: { spin: 0 }, draw: gyroDraw,
            filter() { return Math.abs(this.vx) > 1.6; },
            update(p) {
              p.data.spin += Math.abs(p.vx) * 0.4 + 0.3;
              if (p.data.grounded) p.vx *= 0.986;
              p.dmg = Math.max(2, 2 + Math.abs(p.vx) * 0.9);
              if (p.t % 8 === 0 && p.data.grounded && Math.abs(p.vx) > 1) p.match.effects.spawn('dust', p.x, p.y + p.r, { n: 1 });
              p.data.grounded = false;
            },
            onGround(p, pl) { p.y = pl.y - p.r; p.vy = 0; p.data.grounded = true; },
            onWall(p) { p.vx = -p.vx * 0.7; p.x += p.vx * 2; NX.Audio.play('block'); },
            onHit(p) { p.vx = -p.vx * 0.55; p.vy = -3; },
            onDestroy(p) { if (p.owner) p.owner.data.gyroOut = false; p.match.effects.spawn('pop', p.x, p.y, { color: '#ff7a2a', r: 14 }); }
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
