/* NEXUS CLASH — js/fighters/roster/33-monocromo.js · luchador 33 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, fighter } = NX.RosterLib;

  /* ======================================================================
   * v7 · MONOCROMO — Hombre LCD (silueta plana de cristal líquido, kit
   * tipo Mr. Game & Watch). Animación entrecortada (def.lcd), pitidos en
   * cada ataque, comida en la sartén, Juez con número del 1 al 9,
   * Trampolín de bomberos y Cubo que absorbe 3 proyectiles y los vierte.
   * ==================================================================== */
  const LCD = '#141414';
  const JUDGE = {
    1: { dmg: 2, ang: 60, bkb: 20, kbg: 40, effect: 'hit', self: 12 },
    2: { dmg: 4, ang: 60, bkb: 30, kbg: 55, effect: 'hit' },
    3: { dmg: 6, ang: 361, bkb: 35, kbg: 70, effect: 'hit' },
    4: { dmg: 7, ang: 45, bkb: 40, kbg: 78, effect: 'heavy' },
    5: { dmg: 8, ang: 361, bkb: 40, kbg: 80, effect: 'elec' },
    6: { dmg: 12, ang: 361, bkb: 45, kbg: 88, effect: 'fire' },
    7: { dmg: 13, ang: 50, bkb: 45, kbg: 90, effect: 'heavy' },
    8: { dmg: 9, ang: 70, bkb: 50, kbg: 86, effect: 'water' },
    9: { dmg: 32, ang: 45, bkb: 60, kbg: 104, effect: 'heavy' }
  };
  function foodDraw(kind) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y);
      const step = Math.floor(p.t / 5) * (PI / 4) * U.sign(p.vx || 1);
      ctx.rotate(step);
      ctx.fillStyle = LCD;
      if (kind === 0) { ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.3, p.r * 0.55, 0, 0, TAU); ctx.fill(); }
      else if (kind === 1) {
        ctx.beginPath(); ctx.ellipse(-p.r * 0.2, 0, p.r * 1.0, p.r * 0.55, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.r * 0.6, 0); ctx.lineTo(p.r * 1.4, -p.r * 0.6); ctx.lineTo(p.r * 1.4, p.r * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d8d8c8'; ctx.beginPath(); ctx.arc(-p.r * 0.7, -p.r * 0.12, p.r * 0.14, 0, TAU); ctx.fill();
      } else { ctx.beginPath(); ctx.ellipse(0, 0, p.r * 0.9, p.r * 1.1, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    };
  }
  function firemenDraw(ctx, p) {
    const x = p.x, y = p.y, k = Math.floor(p.t / 4) % 2;
    ctx.save(); ctx.fillStyle = LCD; ctx.strokeStyle = LCD; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const fx = x + s * 24;
      ctx.beginPath(); ctx.arc(fx, y - 30, 5, 0, TAU); ctx.fill();
      ctx.fillRect(fx - 5, y - 37, 10, 3);
      ctx.beginPath(); ctx.moveTo(fx, y - 25); ctx.lineTo(fx, y - 12); ctx.moveTo(fx, y - 12); ctx.lineTo(fx - 4, y); ctx.moveTo(fx, y - 12); ctx.lineTo(fx + 4, y);
      ctx.moveTo(fx, y - 21); ctx.lineTo(fx - s * 10, y - 18); ctx.stroke();
    }
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 16, y - 18 + k * 2); ctx.quadraticCurveTo(x, y - 12 + k * 4, x + 16, y - 18 + k * 2); ctx.stroke();
    ctx.restore();
  }
  fighter({
    id: 'monocromo', name: 'Monocromo', title: 'Hombre LCD',
    passive: 'Silueta de cristal líquido: ligero y flotante, se mueve a saltos de fotograma. El Cubo guarda 3 proyectiles y luego vierte aceite ardiente.',
    palette: { primary: LCD, secondary: LCD, skin: LCD, head: LCD, hand: LCD, arms: LCD, legs: LCD, feet: LCD, accent: '#e8e8e0', eye: LCD },
    stats: { weight: 75, height: 82, width: 30, walk: 2.6, run: 6.0, dash: 6.6, airSpeed: 3.6, airAccel: 0.24, gravity: 0.45, fall: 8.8, fastFall: 13, jump: 13.6, shortHop: 8.6, airJump: 12.8 },
    profile: { style: 'fist', reach: 1.05, power: 1.04, speed: 1.0 },
    lcd: 4,
    meter: { max: 3, label: 'CUBO', short: 'CUBO', color: '#e8e8e0', text: f => (f.data.oil || 0) >= 3 ? '¡CUBO LLENO!' : 'CUBO ' + (f.data.oil || 0) + '/3' },
    ai: { recovery: 'up', projectile: 'neutral', range: 90, absorb: 'down' },
    init(f) { f.data.oil = 0; },
    onLifeReset(f) { f.data.oil = 0; },
    onUpdate(f) { f.meter = f.data.oil || 0; },
    onMoveStart(f) { NX.Audio.play('beep', { pitch: 1 + Math.random() * 0.4 }); },
    rig: {
      headR: 11, headW: 1.05, neck: 2, torsoH: 22, torsoW: 15, hipW: 13, torsoRound: 7, armW: 5, upperArm: 13, foreArm: 12, handR: 4.5,
      legW: 6, thigh: 14, shin: 14, footL: 9, footH: 5, eyes: 'none', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.disc(ctx, r * 1.0, r * 0.18, r * 0.36, LCD, false);
          ctx.fillStyle = '#e8e8e0'; ctx.beginPath(); ctx.ellipse(r * 0.42, -r * 0.22, r * 0.17, r * 0.22, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = LCD; ctx.beginPath(); ctx.arc(r * 0.48, -r * 0.2, r * 0.08, 0, TAU); ctx.fill();
        },
        hand(ctx, a) {
          const mv = a.f.move; if (!mv) return;
          const k = mv.def.key, h = a.J.haF, ang = a.J.foreF;
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(-ang); ctx.fillStyle = LCD; ctx.strokeStyle = LCD;
          if (k === 'special_neutral') { ctx.fillRect(-1.5, 0, 3, 10); ctx.beginPath(); ctx.ellipse(0, 16, 9, 3.5, 0, 0, TAU); ctx.fill(); }
          else if (k === 'special_side') {
            ctx.fillRect(-1.5, 0, 3, 20); ctx.fillRect(-7, 18, 14, 9);
            const n = mv.data.n;
            if (n) { ctx.save(); ctx.translate(-14, -10); ctx.rotate(ang); ctx.fillStyle = '#e8e8e0'; ctx.fillRect(-8, -10, 16, 20); ctx.strokeStyle = LCD; ctx.lineWidth = 2; ctx.strokeRect(-8, -10, 16, 20); ctx.fillStyle = LCD; ctx.font = '400 15px Anton, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, 1); ctx.restore(); }
          } else if (k === 'special_down') {
            ctx.rotate(ang); R.poly(ctx, [[-10, -2], [10, -2], [8, 16], [-8, 16]], LCD, false);
            ctx.strokeStyle = '#e8e8e0'; ctx.lineWidth = 1.2; for (let i = 0; i < (a.f.data.oil || 0); i++) { ctx.beginPath(); ctx.moveTo(-7, 12 - i * 4); ctx.lineTo(7, 12 - i * 4); ctx.stroke(); }
          }
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 24, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 8) return;
          const kind = Math.floor(Math.random() * 3);
          NX.Audio.play('beep', { pitch: 1.6 });
          shoot(f, { ox: 26, oy: -f.h * 0.62, speed: U.rand(2.4, 5.6), vy: U.rand(-8.5, -5.5), gravity: 0.38, r: 8, life: 100, dmg: 4, ang: 70, bkb: 25, kbg: 35,
            effect: 'hit', color: LCD, glow: false, draw: foodDraw(kind) });
        }
      },
      side: {
        frames: 40, pose: 'overhead',
        onStart(f, mv) { mv.data.n = 1 + Math.floor(Math.random() * 9); },
        onFrame(f, fr, mv) {
          const n = mv.data.n, J = JUDGE[n];
          if (fr === 5) { NX.Audio.play('beep', { pitch: 0.6 + n * 0.15 }); f.fx('text', f.x, f.y - f.h - 22, { text: String(n), color: n === 9 ? '#ffd23a' : '#e8e8e0', size: 30 }); }
          if (fr >= 12 && fr <= 14) mv.extraBoxes = [Object.assign({ x: 34, y: -46, r: 26 }, J)];
          else mv.extraBoxes = null;
          if (fr === 12) {
            if (J.self) { f.addDamage(J.self, null); f.flashTimer = 10; }
            if (n === 9) { f.match.camera.shake(8); NX.Audio.play('explosion', { pitch: 1.4 }); }
          }
        }
      },
      up: {
        frames: 46, pose: 'rise', helpless: false, oncePerAir: true, drift: 0.9,
        vel: [{ f: [6, 18], vy: -15.5 }],
        hitboxes: [{ f: [5, 9], x: 0, y: -6, r: 26, dmg: 4, ang: 85, bkb: 50, kbg: 40, effect: 'hit', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr === 3) {
            NX.Audio.play('beep', { pitch: 1.9 });
            f.spawnProjectile({ x: f.x, y: f.y + 4, vx: 0, vy: 0, r: 1, life: 26, dmg: 0, pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, filter() { return false; }, draw: firemenDraw });
          }
          if (fr > 24 && f.vy > 3) { f.vy = 3; }
        }
      },
      down: {
        frames: 36, pose: 'guard',
        absorb: { f: [4, 26], x: 26, y: -40, r: 48, mult: 0,
          onAbsorb(f) {
            f.data.oil = Math.min(3, (f.data.oil || 0) + 1);
            f.fx('text', f.x, f.y - f.h - 14, { text: f.data.oil >= 3 ? '¡LLENO!' : 'CUBO ' + f.data.oil + '/3', color: '#e8e8e0', size: 18 });
            NX.Audio.play('beep', { pitch: 1.2 + f.data.oil * 0.2 });
          } },
        onStart(f, mv) { mv.data.dump = (f.data.oil || 0) >= 3; },
        onFrame(f, fr, mv) {
          if (!mv.data.dump) return;
          f.absorber = null;
          if (fr >= 8 && fr <= 12) mv.extraBoxes = [{ x: 46, y: -24, r: 38, dmg: 20, ang: 40, bkb: 50, kbg: 96, effect: 'fire' }];
          else mv.extraBoxes = null;
          if (fr === 8) {
            f.data.oil = 0; NX.Audio.play('water', { pitch: 0.6 }); f.match.camera.shake(6);
            for (let i = 0; i < 10; i++) f.fx('drop', f.x + f.facing * U.rand(20, 70), f.y - U.rand(10, 50), { color: LCD });
            f.fx('text', f.x, f.y - f.h - 16, { text: '¡ACEITE!', color: '#ffb03a', size: 22 });
          }
        }
      }
    }
  });

})(window.NX = window.NX || {});
