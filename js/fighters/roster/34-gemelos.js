/* NEXUS CLASH — js/fighters/roster/34-gemelos.js · luchador 34 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, hairCap, fighter, swapMove, autolink, linkTick, glasses } = NX.RosterLib;

  /* ======================================================================
   * v7 · LOSGEMELOS — Dúo Gamer (dos gemelos en un slot, estilo Pyra/
   * Mythra). Camisa azul rey y lentes los dos; cambian el pantalón y el
   * peinado. Abajo + B cambia de gemelo conservando daño y posición.
   *  · COPETE: normales a GRITOS; especiales con su consola portátil.
   *  · FLEQUILLO: normales con su LAPTOP; especiales con cartas coleccionables.
   * ==================================================================== */
  const ROYAL = '#1d47c9';
  function shirtDetails(ctx, a) {
    const r = a.rig;
    R.poly(ctx, [[-r.torsoW * 0.12, -r.torsoH], [r.torsoW * 0.22, -r.torsoH], [r.torsoW * 0.05, -r.torsoH * 0.8]], '#f2f2f2');
    ctx.strokeStyle = '#163a9e'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(r.torsoW * 0.05, -r.torsoH * 0.8); ctx.lineTo(r.torsoW * 0.05, -6); ctx.stroke();
    for (let i = 0; i < 3; i++) R.disc(ctx, r.torsoW * 0.1, -r.torsoH * (0.68 - i * 0.2), 1.2, '#e8eefc', false);
  }
  function consoleDraw(ctx, joys) {
    ctx.save();
    if (joys) { R.poly(ctx, [[-17, -8], [-11, -8], [-11, 8], [-17, 8]], '#19c3e6'); R.poly(ctx, [[11, -8], [17, -8], [17, 8], [11, 8]], '#ff3c3c'); }
    R.poly(ctx, [[-11, -8], [11, -8], [11, 8], [-11, 8]], '#2b2b30');
    ctx.fillStyle = '#0e2a3a'; ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = 'rgba(120,220,255,.55)'; ctx.fillRect(-7, -4, 6, 4); ctx.fillRect(1, 0, 6, 4);
    if (joys) { R.disc(ctx, -14, -3, 1.8, '#111', false); R.disc(ctx, 14, 3, 1.8, '#111', false); }
    ctx.restore();
  }
  const CARD_TYPES = [
    { c: '#ff5a2a', fx: 'fire' }, { c: '#2a8cff', fx: 'water' }, { c: '#ffd400', fx: 'elec' }, { c: '#3cc85a', fx: 'hit' }];
  function cardShape(ctx, w, h, art) {
    ctx.fillStyle = '#f2c418'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbe8'; ctx.fillRect(-w * 0.4, -h * 0.42, w * 0.8, h * 0.84);
    ctx.fillStyle = art; ctx.fillRect(-w * 0.32, -h * 0.34, w * 0.64, h * 0.4);
    ctx.fillStyle = '#c9c2a8'; ctx.fillRect(-w * 0.32, h * 0.12, w * 0.64, h * 0.05); ctx.fillRect(-w * 0.32, h * 0.22, w * 0.5, h * 0.05);
    ctx.fillStyle = art; ctx.beginPath(); ctx.arc(w * 0.28, -h * 0.36, w * 0.09, 0, TAU); ctx.fill();
  }
  function cardDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.45 * U.sign(p.vx || 1));
    cardShape(ctx, p.r * 1.6, p.r * 2.2, p.data.art || '#ff5a2a');
    ctx.restore();
  }
  function bigCardDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(PI / 2 + Math.sin(p.t * 0.3) * 0.08);
    cardShape(ctx, 34, 50, p.data.art);
    ctx.restore();
  }
  function throwCard(f, o) {
    const T = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
    return shoot(f, Object.assign({ r: 8, life: 40, dmg: 4, ang: 45, bkb: 25, kbg: 38, effect: T.fx, color: T.c, glow: false, data: { art: T.c }, draw: cardDraw }, o));
  }
  function pixelDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    const s = Math.max(3, p.r / 2.2), n = 4;
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#5ae0ff'; ctx.fillRect(-p.r * 1.4, -p.r * 1.4, p.r * 2.8, p.r * 2.8); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 || i === n - 1) && (j === 0 || j === n - 1)) continue;
      ctx.fillStyle = (i + j + Math.floor(p.t / 3)) % 3 === 0 ? '#ffffff' : ((i + j) % 2 ? '#19c3e6' : '#ff3c3c');
      ctx.fillRect(-s * n / 2 + i * s, -s * n / 2 + j * s, s - 0.5, s - 0.5);
    }
    ctx.restore();
  }
  function joyDraw(col) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.5);
      R.poly(ctx, [[-4, -10], [4, -10], [4, 10], [-4, 10]], col);
      R.disc(ctx, 0, -4, 2, '#111', false);
      ctx.restore();
    };
  }
  const GEM_NORMALS = new Set(['jab', 'jab2', 'jab3', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair']);
  const gemSwap = col => swapMove({ color: col, at: 10, frames: 30 });

  const COPETE = {
    id: 'gemelos_copete', name: 'Copete', title: 'El Gemelo Gamer',
    passive: 'Ataca a GRITOS y usa su consola portátil para los especiales. Más potencia.',
    palette: { primary: ROYAL, secondary: '#22252e', skin: '#c98f62', head: '#c98f62', hand: '#c98f62', arms: ROYAL, legs: '#22252e', feet: '#f2f2f2', accent: '#19c3e6', hair: '#1e1612', eye: '#2a1a10', belt: '#3a2a1a' },
    stats: { weight: 94, height: 86, width: 32, walk: 2.8, run: 6.4, dash: 7.0, airSpeed: 3.5, gravity: 0.56, fall: 9.8, fastFall: 14.5, jump: 13.4, shortHop: 8.6, airJump: 12.4 },
    profile: { style: 'magic', reach: 1.15, power: 1.12, speed: 0.92, effect: 'wind' },
    ai: { recovery: 'up', projectile: 'neutral', range: 120, zoner: true },
    onLifeReset(f) { f.data.joys = 0; },
    onUpdate(f) {
      const mv = f.move;
      if (!mv || f.state !== ST.ATTACK || !GEM_NORMALS.has(mv.def.key) || !mv.def.act) return;
      const a = mv.def.act, fr = mv.frame;
      if (fr >= a[0] - 1 && fr <= a[1] && (fr - a[0]) % 3 === 0) {
        const m = f.localToWorld(16, -f.h * 0.8);
        f.fx('ring', m.x + f.facing * (fr - a[0]) * 4, m.y, { r: 10 + (fr - a[0]) * 3, color: '#bfe3ff', w: 3 });
      }
      if (fr === a[0] && /smash/.test(mv.def.key)) f.fx('text', f.x + f.facing * 30, f.y - f.h - 14, { text: '¡AAAAH!', color: '#bfe3ff', size: 20 });
    },
    rig: {
      headR: 11.5, torsoW: 23, hipW: 20, torsoH: 26, armW: 7.5, upperArm: 14, foreArm: 13, legW: 8.5,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          /* Copete "de mango chupado": mechones gruesos, disparejos y despeinados hacia arriba. */
          const T = [[-0.62, -0.75, 0.62], [-0.38, -0.25, 0.85], [-0.12, 0.15, 1.05], [0.12, -0.35, 0.8], [0.32, 0.45, 1.15], [0.5, -0.1, 0.95], [0.66, 0.6, 0.72], [-0.25, 0.55, 0.7], [0.2, 0.05, 0.6]];
          ctx.lineJoin = 'round';
          T.forEach(([bx, lean, len], i) => {
            const sway = Math.sin(a.f.tick * 0.12 + i * 1.7) * 0.05;
            const ang = -PI / 2 + lean * 0.55 + sway, L = r * len, x0 = r * bx, y0 = -r * 0.72, wd = r * 0.2;
            const tx = x0 + Math.cos(ang) * L, ty = y0 + Math.sin(ang) * L;
            const nx = Math.cos(ang + PI / 2) * wd, ny = Math.sin(ang + PI / 2) * wd;
            ctx.fillStyle = i % 3 === 1 ? U.shade(a.pal.hair, 0.12) : a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(x0 - nx, y0 - ny);
            ctx.quadraticCurveTo(x0 + Math.cos(ang) * L * 0.6 - nx * 0.6 + r * 0.06, y0 + Math.sin(ang) * L * 0.6 - ny * 0.6, tx, ty);
            ctx.quadraticCurveTo(x0 + Math.cos(ang) * L * 0.5 + nx * 0.7, y0 + Math.sin(ang) * L * 0.5 + ny * 0.7, x0 + nx, y0 + ny);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          });
          hairCap(ctx, r, a.pal.hair, { a1: -0.6 });
          glasses(ctx, r);
          const mv = a.f.move;
          if (mv && GEM_NORMALS.has(mv.def.key)) R.ellipse(ctx, r * 0.42, r * 0.48, r * 0.2, r * 0.26, 0, '#5a1010');
        },
        torso: shirtDetails,
        front(ctx, a) {
          const mv = a.f.move;
          if (!mv || !/^special_(neutral|side|up)/.test(mv.def.key)) return;
          const h = a.J.haF;
          ctx.save(); ctx.translate(h.x + 4, h.y - 2); ctx.rotate(-0.15);
          consoleDraw(ctx, !(a.f.data && a.f.data.joys > 0));
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'shoot', charge: { at: 8, max: 60, key: 'special', mult: 1 },
        onCharge(f, mv) { if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 26, f.y - f.h * 0.55, { color: '#5ae0ff' }); },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / 60;
          NX.Audio.play(k > 0.6 ? 'beam' : 'laser', { pitch: 1.5 - k * 0.5 });
          /* V1.2.1: menos alcance (vida 80 → 52 fotogramas, ~35% menos distancia). */
          shoot(f, { ox: 34, speed: 7 + 3 * k, r: 8 + 10 * k, life: 52, dmg: 5 + 14 * k, ang: 40, bkb: 25 + 25 * k, kbg: 40 + 45 * k,
            effect: 'magic', color: '#5ae0ff', glow: false, draw: pixelDraw });
          if (k > 0.9) { f.match.camera.shake(5); f.fx('text', f.x, f.y - f.h - 16, { text: '¡COMBO MÁX!', color: '#5ae0ff', size: 18 }); }
        }
      },
      side: {
        frames: 34, pose: 'shoot',
        canUse(f) { return !(f.data.joys > 0); },
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('swing', { pitch: 1.4 });
          [['#19c3e6', -0.7], ['#ff3c3c', 0.7]].forEach(([col, vy]) => {
            f.data.joys = (f.data.joys || 0) + 1;
            shoot(f, { ox: 30, speed: 10.5, vy, r: 10, life: 110, dmg: 3, ang: 55, bkb: 30, kbg: 35, effect: 'hit', pierce: true, hits: 99, rehit: 12,
              stageCollide: false, reflectable: true, absorbable: false, color: col, glow: false, draw: joyDraw(col),
              update(p) {
                const o = p.owner;
                if (p.t < 18 || !o) return;
                const dx = o.x - p.x, dy = o.y - o.h * 0.55 - p.y;
                p.vx = U.approach(p.vx, U.sign(dx) * 11, 0.9); p.vy = U.approach(p.vy, U.clamp(dy * 0.12, -9, 9), 0.8);
                if (Math.hypot(dx, dy) < 26) p.destroy('caught');
              },
              onDestroy(p) { const o = p.data.thrower; if (o && o.data.joys > 0) o.data.joys--; },
              data: { thrower: f } });
          });
        }
      },
      up: {
        frames: 72, pose: 'rise', helplessLag: 22, drift: 0.4,
        hitboxes: [
          { f: [5, 8], x: 10, y: -70, r: 24, dmg: 3, ang: 88, bkb: 55, kbg: 12, effect: 'magic', group: 1 },
          { f: [10, 13], x: 10, y: -70, r: 24, dmg: 3, ang: 88, bkb: 55, kbg: 12, effect: 'magic', group: 2 },
          { f: [15, 18], x: 10, y: -70, r: 24, dmg: 3, ang: 88, bkb: 55, kbg: 12, effect: 'magic', group: 3 },
          { f: [28, 44], x: 10, y: -16, r: 28, dmg: 6, ang: 270, bkb: 30, kbg: 55, effect: 'magic', meteor: true, group: 4 }],
        onFrame(f, fr, mv) {
          if (fr === 4) NX.Audio.play('magic', { pitch: 1.4 });
          if (fr >= 5 && fr <= 19) { f.vy = -13.5; mv.velY = true; linkTick(f, mv, 0.25); }
          else if (fr > 19 && fr <= 26) { f.vy = 0; mv.velY = true; linkTick(f, mv, 0.3); }
          else if (fr > 26) {
            f.vy = 15; mv.velY = true; mv.data.dive = true; linkTick(f, mv, 0.3);
            if (fr % 2 === 0) f.fx('sparkle', f.x, f.y - 10, { color: '#5ae0ff' });
            if (fr >= 44 && !f.ground) mv.frame = 43;
          }
        },
        onHit(f, t, mv) { if (mv.frame <= 44) autolink(f, t, mv); },
        onLand(f, mv) {
          if (mv.data.dive) { boom(f, f.x + f.facing * 10, f.y - 16, { r: 54, dmg: 6, ang: 60, bkb: 60, kbg: 105, effect: 'magic' }); f.fx('text', f.x, f.y - f.h - 18, { text: 'GAME OVER', color: '#5ae0ff', size: 18 }); }
          f.endMoveCleanup(true); f.startLand(mv.data.dive ? 20 : 12);
          return 'continue';
        }
      },
      down: gemSwap('#5ae0ff')
    }
  };

  const FLEQUILLO = {
    id: 'gemelos_flequillo', name: 'Flequillo', title: 'El Gemelo de las Cartas',
    passive: 'Golpea con su LAPTOP y lanza cartas coleccionables (fuego, agua, rayo o planta). Más velocidad.',
    palette: { primary: ROYAL, secondary: '#c9a96e', skin: '#c98f62', head: '#c98f62', hand: '#c98f62', arms: ROYAL, legs: '#c9a96e', feet: '#3a2a1a', accent: '#f2c418', hair: '#1e1612', eye: '#2a1a10', belt: '#5a3a1a' },
    stats: { weight: 88, height: 86, width: 30, walk: 3.2, run: 7.8, dash: 8.4, airSpeed: 4.0, gravity: 0.6, fall: 10.4, fastFall: 15.5, jump: 14.2, shortHop: 9.0, airJump: 13 },
    profile: { style: 'sword', reach: 0.82, power: 0.94, speed: 1.12, effect: 'hit' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 95, rushdown: true },
    rig: {
      headR: 11.5, torsoW: 23, hipW: 20, torsoH: 26, armW: 7.5, upperArm: 14, foreArm: 13, legW: 8.5,
      weapon: { type: 'laptop', len: 30, w: 14, trail: '#9fe8ff' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.15 });
          /* Flequillo de lado que cae sobre la frente. */
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.55);
          ctx.quadraticCurveTo(-r * 0.2, -r * 1.35, r * 0.8, -r * 0.85);
          ctx.quadraticCurveTo(r * 1.15, -r * 0.6, r * 1.02, -r * 0.18);
          ctx.lineTo(r * 0.78, -r * 0.42); ctx.lineTo(r * 0.62, -r * 0.2); ctx.lineTo(r * 0.45, -r * 0.48);
          ctx.quadraticCurveTo(-r * 0.1, -r * 0.6, -r * 0.9, -r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
          glasses(ctx, r);
        },
        torso: shirtDetails,
        weapon(ctx, f, w) {
          R.poly(ctx, [[-w.w / 2, 2], [w.w / 2, 2], [w.w / 2, w.len], [-w.w / 2, w.len]], '#b9c0c8');
          ctx.fillStyle = '#8a929b'; ctx.fillRect(-w.w / 2, 2, 2.5, w.len - 2);
          ctx.fillStyle = 'rgba(160,240,255,.9)'; ctx.fillRect(w.w / 2 - 2, 4, 2, w.len - 6);
          R.disc(ctx, 0, w.len * 0.55, 2.6, '#e8eefc', false);
        },
        front(ctx, a) {
          const mv = a.f.move;
          if (!mv || !/^special_(neutral|side|up)/.test(mv.def.key)) return;
          const h = a.J.haB;
          ctx.save(); ctx.translate(h.x, h.y);
          [-0.35, 0, 0.35].forEach((rot, i) => { ctx.save(); ctx.rotate(rot - 0.2); ctx.translate(0, -8); cardShape(ctx, 11, 15, CARD_TYPES[i].c); ctx.restore(); });
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 30, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 9) return;
          NX.Audio.play('swing', { pitch: 1.8 });
          [-0.2, 0, 0.2].forEach(a => throwCard(f, { ox: 30, speed: 0, vx: Math.cos(a) * 11.5 * f.facing, vy: Math.sin(a) * 11.5, dmg: a ? 3.5 : 5, kbg: a ? 32 : 48 }));
        }
      },
      side: {
        frames: 40, oncePerAir: true, drift: 0, intangible: [5, 13],
        poseFn() { return { lean: 0.6, aF1: 1.6, aF2: 0, wpn: 0, lF1: 1.0, lB1: -0.9, planted: false }; },
        onFrame(f, fr, mv) {
          if (fr === 5) { NX.Audio.play('swing', { pitch: 2 }); f.fx('ring', f.x, f.y - f.h / 2, { r: 34, color: '#f2c418' }); }
          if (fr >= 6 && fr <= 14) {
            f.vx = f.facing * 18; f.vy = 0; mv.velX = mv.velY = true;
            mv.extraBoxes = [{ x: 10, y: -44, r: 30, dmg: 8, ang: 45, bkb: 45, kbg: 70, effect: 'elec' }];
            if (fr % 2 === 0) f.match.effects.list.push({ type: 'streak', x: f.x - f.facing * 20, y: f.y - U.rand(10, f.h), vx: -f.facing * 8, vy: 0, life: 10, max: 10, len: 22, color: '#f2c418' });
          } else if (fr === 15) { mv.extraBoxes = null; f.vx = f.facing * 3; }
        }
      },
      up: {
        frames: 54, pose: 'rise', helplessLag: 18, vel: [{ f: [4, 17], vy: -14, vx: 1.6 }, { f: [19, 24], vy: 0 }],
        onFrame(f, fr) {
          if (fr === 4) {
            NX.Audio.play('magic', { pitch: 1.6 });
            const T = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
            f.spawnProjectile({ x: f.x, y: f.y + 6, vx: 0, vy: 0, r: 26, life: 16, dmg: 6, ang: 80, bkb: 50, kbg: 55, effect: T.fx, pierce: true,
              stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, data: { art: T.c }, draw: bigCardDraw,
              update(p) { const o = p.owner; p.x = o.x; p.y = o.y + 8; } });
          }
          if (fr === 21) {
            NX.Audio.play('swing', { pitch: 1.6 });
            [60, 78, 96].forEach(deg => { const a = deg * PI / 180; throwCard(f, { ox: 6, oy: -f.h * 0.4, speed: 0, vx: Math.cos(a) * 12 * f.facing, vy: Math.sin(a) * 12, dmg: 4, ang: 60, kbg: 45, life: 34 }); });
          }
        }
      },
      down: gemSwap('#f2c418')
    }
  };

  fighter({
    id: 'gemelos', name: 'LosGemelos', title: 'Dúo Gamer',
    passive: 'Dos gemelos en un slot. Abajo + B alterna entre Copete (gritos y consola, potencia) y Flequillo (laptop y cartas, velocidad).',
    forms: [COPETE, FLEQUILLO], portraitForm: 0
  });

})(window.NX = window.NX || {});
