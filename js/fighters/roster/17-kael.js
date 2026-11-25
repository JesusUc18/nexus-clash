/* NEXUS CLASH — js/fighters/roster/17-kael.js · luchador 17 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, cape, orbDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * ===================== V2 · 8 LUCHADORES NUEVOS =======================
   * ==================================================================== */

  /* ======================================================================
   * 17 · KAEL — Mente Psiónica (flotante, cañón de cristal)
   * Pasiva: el Orbe del Vacío se puede almacenar (Escudo durante la carga)
   * y se guarda solo al llegar al máximo. La barra ORBE muestra la carga.
   * ==================================================================== */
  const KAEL_MAX = 120;
  fighter({
    id: 'kael', name: 'Kael', title: 'Mente Psiónica',
    passive: 'Orbe almacenable: carga el Orbe del Vacío y guárdalo con Escudo.',
    palette: { primary: '#eef3f6', secondary: '#1fb5a8', skin: '#cfe4e8', head: '#cfe4e8', hand: '#1fb5a8', accent: '#e8c35a', eye: '#2fd8c8', feet: '#1fb5a8', legs: '#16857c', arms: '#eef3f6', belt: '#e8c35a' },
    stats: { weight: 79, height: 92, width: 34, walk: 3.0, run: 7.4, dash: 8.0, airSpeed: 4.0, airAccel: 0.3, gravity: 0.42, fall: 8.2, fastFall: 13, jump: 13.2, shortHop: 8.4, airJump: 12.8 },
    profile: { style: 'magic', reach: 1.1, power: 1.02, speed: 1.0 },
    meter: { max: KAEL_MAX, label: 'ORBE', short: 'ORBE', color: '#7af0e4', text: f => (f.data.stored || 0) >= KAEL_MAX ? 'ORBE MÁX' : 'ORBE' },
    ai: { recovery: 'up', projectile: 'neutral', range: 140, zoner: true },
    init(f) { f.data.stored = 0; },
    onLifeReset(f) { f.data.stored = 0; f.meter = 0; },
    onUpdate(f) {
      f.meter = f.data.stored || 0;
      if (f.data.stored >= KAEL_MAX && f.tick % 7 === 0 && f.inPlay()) f.fx('sparkle', f.x + U.rand(-18, 18), f.y - U.rand(10, f.h), { color: '#7af0e4' });
    },
    poseMod(f, p) { return f.ground ? null : { oy: (p.oy || 0) + Math.sin(f.tick * 0.12) * 1.5 }; },
    rig: {
      headR: 11, headH: 1.12, torsoW: 20, hipW: 16, torsoH: 30, thigh: 17, shin: 17, legW: 7.5, armW: 6, upperArm: 15, foreArm: 14,
      handR: 5, footL: 9, eyes: 'glow', mouth: false,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.2, r * 0.6], [-r * 1.25, r * 0.9], [-r * 0.9, r * 1.5], [r * 0.2, r * 1.3]], a.pal.secondary);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.02, PI * 1.1, PI * 1.9); ctx.stroke();
          R.poly(ctx, [[r * 0.45, -r * 0.62], [r * 0.62, -r * 0.9], [r * 0.79, -r * 0.62], [r * 0.62, -r * 0.36]], a.pal.accent);
          R.disc(ctx, r * 0.62, -r * 0.63, 2.4, '#2fd8c8', false);
          ctx.strokeStyle = U.rgba('#1fb5a8', 0.7); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.6); ctx.quadraticCurveTo(-r * 0.2, -r * 1.05, r * 0.2, -r * 0.95); ctx.stroke();
        },
        back(ctx, a) {
          const { J, f } = a, t = f.tick;
          cape(ctx, a, a.pal.secondary, 52, 12, '#e8c35a');
          for (let i = 0; i < 3; i++) {
            const ang = t * 0.04 + i * TAU / 3, x = J.sh.x - 14 + Math.cos(ang) * 22, y = J.sh.y - 4 + Math.sin(ang) * 10;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
            R.poly(ctx, [[0, -9], [4, 0], [0, 9], [-4, 0]], i === 1 ? '#bff6f0' : '#7af0e4');
            ctx.restore();
          }
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.35, -r.torsoH); ctx.lineTo(-r.hipW * 0.2, 0); ctx.moveTo(r.torsoW * 0.35, -r.torsoH); ctx.lineTo(r.hipW * 0.2, 0); ctx.stroke();
          R.poly(ctx, [[0, -r.torsoH * 0.8], [5, -r.torsoH * 0.65], [0, -r.torsoH * 0.5], [-5, -r.torsoH * 0.65]], '#2fd8c8');
          R.poly(ctx, [[-r.hipW * 0.5, -4], [r.hipW * 0.5, -4], [r.hipW * 0.8, 22], [-r.hipW * 0.8, 22]], a.pal.primary);
        },
        hand(ctx, a) {
          const mv = a.f.move;
          if (!mv || mv.def.key !== 'special_neutral') return;
          const k = Math.min(1, (mv.charge || 0) / KAEL_MAX);
          const h = a.J.haF, r = 6 + 12 * k;
          ctx.save();
          const g = ctx.createRadialGradient(h.x + 6, h.y, 1, h.x + 6, h.y, r * 1.6);
          g.addColorStop(0, '#0a1414'); g.addColorStop(0.5, '#1fb5a8'); g.addColorStop(1, 'rgba(47,216,200,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x + 6, h.y, r * 1.6, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'charge', charge: { at: 8, max: KAEL_MAX, key: 'special', mult: 1 },
        onStart(f, mv) {
          mv.charge = Math.min(KAEL_MAX, f.data.stored || 0);
          if (mv.charge >= KAEL_MAX) mv.chargeDone = true;
          f.data.stored = 0;
        },
        onCharge(f, mv) {
          f.data.stored = mv.charge;
          if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 28, f.y - f.h * 0.55, { color: '#7af0e4' });
          const I = f.input;
          if (mv.charge >= KAEL_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.stored = mv.charge;
            if (mv.charge >= KAEL_MAX) { f.fx('text', f.x, f.y - f.h - 18, { text: 'ORBE LISTO', color: '#7af0e4', size: 20 }); NX.Audio.play('chargeFull'); }
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / KAEL_MAX;
          f.data.stored = 0;
          NX.Audio.play(k > 0.6 ? 'beam' : 'magic', { pitch: 1.3 - k * 0.6 });
          shoot(f, {
            ox: 30, speed: 7 + 2.5 * k, r: 8 + 16 * k, dmg: 2.5 + 22.5 * k, ang: 40, bkb: 30 + 30 * k, kbg: 45 + 45 * k,
            effect: 'magic', life: 90, color: '#2fd8c8', trail: k > 0.5 ? 8 : 0, draw: orbDraw('#1fb5a8', '#062020')
          });
          if (k > 0.9) f.match.camera.shake(6);
        }
      },
      side: {
        frames: 36, pose: 'cast', oncePerAir: true, gravity: 0.3,
        reflect: { f: [8, 18], x: 30, y: -52, r: 32, mult: 1.4, color: '#7af0e4' },
        hitboxes: [{ f: [9, 14], x: 32, y: -52, r: 24, dmg: 6, ang: 70, fkb: 50, bkb: 0, kbg: 100, effect: 'magic' }],
        onStart(f) { if (!f.ground) f.vy = Math.min(f.vy, 0) * 0.3; NX.Audio.play('magic', { pitch: 1.6 }); },
        onHit(f, t) { t.facing = -t.facing; f.fx('ring', t.x, t.y - t.h / 2, { r: 34, color: '#7af0e4' }); }
      },
      up: {
        frames: 40, intangible: [1, 24], helplessLag: 16,
        poseFn() { return { aF1: 1.0, aF2: 0.5, aB1: -0.6, aB2: 0.5, lean: 0.2, lF1: 0.4, lF2: -0.6, lB1: -0.1, lB2: -0.4, planted: false }; },
        onStart(f, mv) {
          let x = f.input.x, y = f.input.y;
          if (Math.hypot(x, y) < 0.35) { x = 0; y = -1; }
          mv.data.a = Math.atan2(x, -y);
          if (Math.abs(x) > 0.2) f.facing = Math.sign(x);
        },
        onFrame(f, fr, mv) {
          if (fr === 4) { f.hidden = true; f.fx('ring', f.x, f.y - f.h / 2, { r: 44, color: '#7af0e4' }); NX.Audio.play('magic', { pitch: 2 }); }
          if (fr >= 4 && fr < 6) { f.vx = 0; f.vy = 0; mv.velX = mv.velY = true; }
          if (fr >= 6 && fr <= 17) { f.vx = Math.sin(mv.data.a) * 17; f.vy = -Math.cos(mv.data.a) * 17; mv.velX = mv.velY = true; }
          if (fr === 18) {
            f.hidden = false; f.vx *= 0.1; f.vy = Math.min(0, f.vy * 0.1);
            f.fx('ring', f.x, f.y - f.h / 2, { r: 50, color: '#7af0e4' });
            for (let i = 0; i < 6; i++) f.fx('sparkle', f.x, f.y - f.h / 2, { color: '#bff6f0' });
          }
        },
        onEnd(f) { f.hidden = false; }
      },
      down: {
        frames: 40, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('magic', { pitch: 0.4 });
          shoot(f, {
            ox: 24, oy: -f.h * 0.8, speed: 13, r: 16, life: 16, dmg: 1, ang: 80, fkb: 0, bkb: 0, kbg: 0, effect: 'magic',
            reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false,
            filter(owner, t) { return Math.sign(owner.x - t.x) === t.facing || Math.abs(owner.x - t.x) < 12; },
            onHit(p, t) { t.pendingStun = Math.min(200, 90 + Math.floor(t.percent * 0.6)); p.match.effects.spawn('text', t.x, t.y - t.h - 12, { text: '¡PARALIZADO!', color: '#7af0e4', size: 18 }); },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.vx), 1);
              ctx.globalAlpha = Math.min(1, p.life / 6);
              for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? '#7af0e4' : '#bff6f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-i * 9, 0, p.r - i * 4, -0.9, 0.9); ctx.stroke(); }
              ctx.restore();
            }
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
