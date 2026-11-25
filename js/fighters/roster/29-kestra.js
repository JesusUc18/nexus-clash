/* NEXUS CLASH — js/fighters/roster/29-kestra.js · luchador 29 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, steer, fighter, autolink, linkTick, plasmaDraw } = NX.RosterLib;

  /* ======================================================================
   * v3.1 · KESTRA — Cazadora Orbital (exotraje con cañón, kit tipo Samus)
   * Disparo Cargado almacenable, misiles (teledirigido / súper con
   * pulsación rápida), Barrena en Espiral y Bomba de esfera.
   * ==================================================================== */
  const KESTRA_MAX = 75;
  function missileDraw(col) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      R.poly(ctx, [[-12, -4], [6, -4], [12, 0], [6, 4], [-12, 4]], col);
      R.poly(ctx, [[-12, -4], [-16, -8], [-10, -4]], '#3a3f46'); R.poly(ctx, [[-12, 4], [-16, 8], [-10, 4]], '#3a3f46');
      R.disc(ctx, -15, 0, 3 + Math.random() * 2, '#ffb03a', false);
      ctx.restore();
    };
  }
  function bombDraw(ctx, p) {
    const blink = p.life < 24 && Math.floor(p.t / 3) % 2 === 0;
    R.disc(ctx, p.x, p.y, p.r, blink ? '#ffffff' : '#ff5ac8');
    R.disc(ctx, p.x - 2, p.y - 2, p.r * 0.35, '#ffd6f0', false);
  }
  fighter({
    id: 'kestra', name: 'Kestra', title: 'Cazadora Orbital',
    passive: 'Disparo almacenable: carga el cañón y guárdalo con Escudo. Agarre de rayo de largo alcance.',
    palette: { primary: '#3a4048', secondary: '#e8ecef', skin: '#3a4048', head: '#3a4048', hand: '#2a2f36', arms: '#e8ecef', legs: '#3a4048', feet: '#2a2f36', accent: '#b6ff3a', eye: '#ff5ac8', visor: '#ff5ac8', belt: '#b6ff3a' },
    stats: { weight: 108, height: 94, width: 34, walk: 2.8, run: 6.3, dash: 6.8, airSpeed: 3.6, airAccel: 0.25, gravity: 0.42, fall: 8.4, fastFall: 13.5, jump: 14.6, shortHop: 9.2, airJump: 13.2 },
    profile: { style: 'kick', reach: 1.05, power: 1.04, speed: 0.95 },
    meter: { max: KESTRA_MAX, label: 'CAÑÓN', short: 'CAÑÓN', color: '#b6ff3a', text: f => (f.data.stored || 0) >= KESTRA_MAX ? 'CAÑÓN MÁX' : 'CAÑÓN' },
    ai: { recovery: 'up', projectile: 'neutral', range: 150, zoner: true },
    init(f) { f.data.stored = 0; f.data.bombs = 0; },
    onLifeReset(f) { f.data.stored = 0; f.meter = 0; },
    onUpdate(f) {
      f.meter = f.data.stored || 0;
      if (f.data.stored >= KESTRA_MAX && f.tick % 6 === 0 && f.inPlay()) f.fx('sparkle', f.x + f.facing * 26, f.y - f.h * 0.55, { color: '#b6ff3a' });
    },
    moves: {
      grab: std => Object.assign({}, std, { frames: 52, grabs: [{ f: [12, 20], x: 92, y: -46, r: 16 }],
        onFrame(f, fr) { if (fr >= 8 && fr <= 24) beamFx(f, fr <= 20 ? 100 * Math.min(1, (fr - 7) / 6) : 100 * (24 - fr) / 4); } }),
      dashgrab: std => Object.assign({}, std, { frames: 58, grabs: [{ f: [14, 22], x: 100, y: -46, r: 16 }],
        onFrame(f, fr) { if (fr >= 10 && fr <= 26) beamFx(f, fr <= 22 ? 108 * Math.min(1, (fr - 9) / 6) : 108 * (26 - fr) / 4); } })
    },
    rig: {
      headR: 12.5, headH: 1.08, torsoW: 26, hipW: 22, torsoH: 28, torsoRound: 10, armW: 9, upperArm: 15, foreArm: 15, handR: 6,
      thigh: 17, shin: 17, legW: 10, footL: 12, footH: 7, eyes: 'visor', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.1, -r * 1.02], [-r * 0.65, -r * 1.42], [-r * 0.95, -r * 0.85]], a.pal.accent);
          ctx.strokeStyle = U.rgba('#ffffff', 0.4); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, PI * 1.15, PI * 1.5); ctx.stroke();
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 0.9, r * 0.45, r * 1.2, r * 0.3);
        },
        back(ctx, a) {
          const s = a.J.shB;
          R.disc(ctx, s.x, s.y, 11, U.shade('#e8ecef', -0.25));
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.32, -r.torsoH * 0.85], [r.torsoW * 0.32, -r.torsoH * 0.85], [r.torsoW * 0.2, -r.torsoH * 0.35], [-r.torsoW * 0.2, -r.torsoH * 0.35]], a.pal.secondary);
          R.disc(ctx, 0, -r.torsoH * 0.6, 3.5, a.pal.accent);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r.hipW * 0.4, -10); ctx.lineTo(r.hipW * 0.4, -10); ctx.stroke();
        },
        hand(ctx, a) {
          const J = a.J, el = J.elF, h = J.haF, ang = Math.atan2(h.y - el.y, h.x - el.x);
          R.disc(ctx, J.shF.x, J.shF.y, 11, a.pal.secondary);
          ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(ang);
          const L = Math.hypot(h.x - el.x, h.y - el.y) + 14;
          ctx.fillStyle = '#e8ecef'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(-2, -8, L, 16); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#3a4048'; ctx.fillRect(L - 6, -6, 6, 12);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(4, 8); ctx.moveTo(10, -8); ctx.lineTo(10, 8); ctx.stroke();
          const mv = a.f.move;
          const k = mv && mv.def.key === 'special_neutral' ? Math.min(1, (mv.charge || 0) / KESTRA_MAX) : ((a.f.data && a.f.data.stored) || 0) / KESTRA_MAX;
          if (k > 0.05) {
            const g = ctx.createRadialGradient(L + 2, 0, 1, L + 2, 0, 6 + 12 * k);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#b6ff3a'); g.addColorStop(1, 'rgba(182,255,58,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L + 2, 0, 6 + 12 * k, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'shoot', charge: { at: 8, max: KESTRA_MAX, key: 'special', mult: 1 },
        onStart(f, mv) {
          mv.charge = Math.min(KESTRA_MAX, f.data.stored || 0);
          if (mv.charge >= KESTRA_MAX) mv.chargeDone = true;
          f.data.stored = 0;
        },
        onCharge(f, mv) {
          f.data.stored = mv.charge;
          if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 30, f.y - f.h * 0.55, { color: '#b6ff3a' });
          const I = f.input;
          if (mv.charge >= KESTRA_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.stored = mv.charge;
            if (mv.charge >= KESTRA_MAX) { f.fx('text', f.x, f.y - f.h - 18, { text: 'CAÑÓN LISTO', color: '#b6ff3a', size: 20 }); NX.Audio.play('chargeFull'); }
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / KESTRA_MAX;
          f.data.stored = 0;
          NX.Audio.play(k > 0.6 ? 'beam' : 'laser', { pitch: 1.4 - k * 0.6 });
          shoot(f, {
            ox: 40, speed: 8 + 3 * k, r: 7 + 15 * k, dmg: 5 + 19 * k,   /* V1.2.1: máx. 28% → 24% */ ang: 40, bkb: 25 + 25 * k, kbg: 45 + 40 * k,
            effect: 'fire', life: 90, color: '#b6ff3a', trail: k > 0.5 ? 8 : 0, draw: plasmaDraw('#b6ff3a', '#4aff9a')
          });
          if (!f.ground) f.vx -= f.facing * 2 * k;
          if (k > 0.9) f.match.camera.shake(6);
        }
      },
      side: {
        frames: 40, pose: 'shoot', gravity: 0.5,
        onStart(f, mv) { mv.data.sup = f.input.tapSide > 0 || f.input.smashPressed(); },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          if (mv.data.sup) {
            NX.Audio.play('fire', { pitch: 0.7 });
            shoot(f, { ox: 40, speed: 3, r: 10, life: 110, dmg: 10, ang: 45, bkb: 35, kbg: 70, effect: 'fire', glow: false, draw: missileDraw('#e8ecef'),
              update(p) { if (p.t > 10) p.vx = U.approach(p.vx, U.sign(p.vx) * 12.5, 0.8); } });
            f.fx('text', f.x, f.y - f.h - 18, { text: 'SÚPER MISIL', color: '#e8ecef', size: 16 });
          } else {
            NX.Audio.play('fire', { pitch: 1.2 });
            shoot(f, { ox: 40, speed: 5, r: 9, life: 120, dmg: 7, ang: 50, bkb: 30, kbg: 50, effect: 'fire', glow: false, draw: missileDraw('#b6ff3a'),
              update(p) { if (p.t > 12) steer(p, 0.045, 700); } });
          }
        }
      },
      up: {
        frames: 52, pose: 'spin', helplessLag: 18, drift: 0.9, intangible: [1, 3],
        hitboxes: (function () {
          const a = [];
          for (let i = 0; i < 7; i++) a.push({ f: [4 + i * 4, 6 + i * 4], x: 0, y: -46, r: 30, dmg: 1.6, ang: 90, bkb: 40, kbg: 8, effect: 'hit', dir: 'auto', group: i + 1 });
          a.push({ f: [32, 34], x: 0, y: -46, r: 34, dmg: 2.5, ang: 65, bkb: 55, kbg: 120, effect: 'hit', dir: 'auto', group: 9 });
          return a;
        })(),
        onFrame(f, fr, mv) {
          if (fr === 3) NX.Audio.play('spin', { pitch: 1.3 });
          if (fr >= 3 && fr <= 30) { f.vy = fr < 14 ? -11 : -11 + (fr - 14) * 0.7; mv.velY = true; }
          if (fr < 32) linkTick(f, mv, 0.3);
          if (fr >= 3 && fr <= 34 && fr % 2 === 0) f.fx('sparkle', f.x + U.rand(-22, 22), f.y - U.rand(10, f.h), { color: '#ff5ac8' });
        },
        onHit(f, t, mv) { if (mv.frame < 32) autolink(f, t, mv); }
      },
      down: {
        frames: 40, pose: 'ball', drift: 1, gravity: 0.45,
        onStart(f, mv) { if (!f.ground) f.vy = Math.min(f.vy, -4.5); },
        onFrame(f, fr, mv) {
          if (f.ground) { f.vx = f.input.x * 3.2; mv.velX = true; }
          if (fr !== 8 || (f.data.bombs || 0) >= 3) return;
          f.data.bombs = (f.data.bombs || 0) + 1;
          NX.Audio.play('tick');
          f.spawnProjectile({
            x: f.x, y: f.y - 12, vx: 0, vy: 0.4, r: 8, life: 34, dmg: 0, effect: 'fire', glow: false,
            reflectable: false, absorbable: false, destructible: false, stageCollide: false, pierce: true,
            filter() { return false; },
            update(p) {
              for (const t of p.owner.opponents()) if (!t.hidden && U.dist(p.x, p.y, t.x, t.y - t.h / 2) < t.w / 2 + 14) { p.destroy('touch'); return false; }
            },
            onDestroy(p) {
              const o = p.owner;
              o.data.bombs = Math.max(0, (o.data.bombs || 1) - 1);
              boom(o, p.x, p.y, { r: 32, dmg: 4, ang: 80, bkb: 45, kbg: 30, effect: 'fire',
                filter(owner, t) { return t !== owner; } });
              if (o.inPlay() && U.dist(p.x, p.y, o.x, o.y - 14) < 72 && !o.ground) { o.vy = Math.min(o.vy, -8); o.fastFalling = false; }
            },
            draw: bombDraw
          });
        }
      }
    }
  });
  function beamFx(f, len) {
    if (len <= 2) return;
    const s = f.localToWorld(26, -46);
    f.spawnProjectile({ x: s.x, y: s.y, vx: 0, vy: 0, r: 1, life: 1, dmg: 0, pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false,
      filter() { return false; },
      draw(ctx, p) {
        ctx.save(); ctx.strokeStyle = U.rgba('#b6ff3a', 0.9); ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + f.facing * len, p.y); ctx.stroke();
        ctx.setLineDash([]); R.disc(ctx, p.x + f.facing * len, p.y, 5, '#ff5ac8'); ctx.restore();
      } });
  }

})(window.NX = window.NX || {});
