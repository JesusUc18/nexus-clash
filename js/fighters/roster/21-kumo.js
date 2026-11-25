/* NEXUS CLASH — js/fighters/roster/21-kumo.js · luchador 21 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, tetherLedge, fighter } = NX.RosterLib;

  /* ======================================================================
   * 21 · KUMO — Acechadora Arácnida (telarañas y trampas)
   * ==================================================================== */
  function webDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.1);
    ctx.strokeStyle = 'rgba(245,245,255,.9)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * p.r, Math.sin(a) * p.r); ctx.stroke(); }
    for (const k of [0.35, 0.65, 0.95]) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * TAU / 8; ctx.lineTo(Math.cos(a) * p.r * k, Math.sin(a) * p.r * k); } ctx.stroke(); }
    ctx.restore();
  }
  fighter({
    id: 'kumo', name: 'Kumo', title: 'Acechadora Arácnida',
    passive: 'Seda: telarañas que paralizan y un hilo para recuperarse.',
    palette: { primary: '#3a2450', secondary: '#14101c', skin: '#c8b8d8', head: '#3a2450', hand: '#14101c', accent: '#e2263a', eye: '#e2263a', feet: '#14101c', legs: '#2a1a3a', arms: '#3a2450', hair: '#14101c' },
    stats: { weight: 80, height: 80, width: 30, walk: 3.3, run: 7.8, dash: 8.4, airSpeed: 4.2, gravity: 0.6, fall: 10.5, fastFall: 15.5, jump: 13.6 },
    profile: { style: 'fist', reach: 1, power: 0.95, speed: 1.1, effect: 'slash' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 70, rushdown: true },
    rig: {
      headR: 12, torsoW: 18, hipW: 16, torsoH: 24, thigh: 16, shin: 16, legW: 8, armW: 6, eyes: 'glow', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.fillStyle = a.pal.accent;
          [[0.1, -0.55], [0.4, -0.6], [0.2, -0.78], [0.5, -0.8]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r, y * r, 1.6, 0, TAU); ctx.fill(); });
          ctx.fillStyle = '#c8b8d8'; ctx.fillRect(r * 0.15, r * 0.3, r * 0.75, r * 0.25);
        },
        back(ctx, a) {
          const { J, f } = a, t = f.tick;
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            const base = { x: J.sh.x - 6, y: J.sh.y + 4 + i * 4 };
            const sw = Math.sin(t * 0.15 + i * 1.3) * 0.25;
            const a1 = -2.2 + i * 0.35 + sw;
            const k1 = { x: base.x + Math.sin(a1) * 18, y: base.y + Math.cos(a1) * 18 };
            const k2 = { x: k1.x + Math.sin(a1 + 1.6) * 16, y: k1.y + Math.cos(a1 + 1.6) * 16 };
            R.limb(ctx, [base, k1, k2], 3, i % 2 ? '#2a1a3a' : '#3a2450');
          }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-4, -r.torsoH * 0.8], [4, -r.torsoH * 0.8], [0, -r.torsoH * 0.6]], a.pal.accent, false);
          R.poly(ctx, [[-4, -r.torsoH * 0.4], [4, -r.torsoH * 0.4], [0, -r.torsoH * 0.6]], a.pal.accent, false);
          ctx.fillStyle = '#14101c'; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 4);
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv) return;
      const hx = f.x + f.facing * 16, hy = f.y - f.h * 0.6;
      let ex = null, ey = null;
      if (mv.def.key === 'special_side' && mv.frame >= 8 && mv.frame <= 30) {
        if (mv.data.zip) { ex = mv.data.zip.x; ey = mv.data.zip.y - mv.data.zip.h / 2; }
        else { const ext = Math.min(1, (mv.frame - 7) / 6) * (mv.frame > 18 ? Math.max(0, 1 - (mv.frame - 18) / 8) : 1); ex = hx + f.facing * 170 * ext; ey = hy; }
      }
      if (mv.def.key === 'special_up' && mv.frame >= 4 && mv.frame <= 26) {
        if (!mv.data.anchor) mv.data.anchor = { x: f.x + f.facing * 10, y: f.y - f.h - 200 };
        ex = mv.data.anchor.x; ey = mv.data.anchor.y;
      }
      if (ex == null) return;
      ctx.save(); ctx.strokeStyle = 'rgba(245,245,255,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 32, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('swing', { pitch: 1.6 });
          shoot(f, { ox: 28, oy: -f.h * 0.55, speed: 10, r: 13, dmg: 3, ang: 60, fkb: 10, bkb: 0, kbg: 100, stun: 35, life: 40, effect: 'hit', color: '#f5f5ff', glow: false, draw: webDraw });
        }
      },
      side: {
        frames: 46, pose: 'shoot',
        onFrame(f, fr, mv) {
          if (fr === 8) NX.Audio.play('swing', { pitch: 1.3 });
          if (fr >= 12 && fr <= 14 && !mv.data.zip) {
            for (const t of f.opponents()) {
              const dx = (t.x - f.x) * f.facing;
              if (dx > 0 && dx < 180 && Math.abs((t.y - t.h / 2) - (f.y - f.h * 0.6)) < 45 && t.canBeHit()) { mv.data.zip = t; mv.data.zt = 0; break; }
            }
            if (!mv.data.zip && !f.ground) tetherLedge(f, 180);
          }
          const t = mv.data.zip;
          if (t) {
            if (!t.inPlay() || mv.data.zt > 24) { mv.data.zip = null; return; }
            mv.data.zt++;
            const dx = t.x - f.x;
            if (Math.abs(dx) > 42) {
              f.vx = Math.sign(dx) * 14; f.vy = U.clamp((t.y - f.y) * 0.3, -10, 10); f.facing = Math.sign(dx);
              mv.velX = mv.velY = true; mv.frame = Math.min(mv.frame, 20);
              mv.extraBoxes = null;
            } else {
              mv.extraBoxes = [{ x: 22, y: -40, r: 24, dmg: 10, ang: 40, bkb: 50, kbg: 75, effect: 'slash' }];
              f.vx *= 0.4; mv.data.zip = null; mv.frame = 26;
              NX.Audio.play('slash');
            }
          } else if (fr > 30) mv.extraBoxes = null;
        }
      },
      up: {
        frames: 50, pose: 'rise', vel: [{ f: [6, 24], vy: -12, vx: 1 }],
        hitboxes: [{ f: [20, 24], x: 6, y: -82, r: 20, dmg: 6, ang: 80, bkb: 45, kbg: 70, effect: 'slash' }],
        onFrame(f, fr) { if (fr === 5) NX.Audio.play('swing', { pitch: 0.8 }); }
      },
      down: {
        frames: 36, pose: 'kneel',
        onFrame(f, fr) {
          if (fr !== 14) return;
          if (f.data.trap && f.data.trap.active) f.data.trap.destroy('replace');
          NX.Audio.play('block');
          const gx = f.x + f.facing * (f.ground ? 40 : 0);
          f.data.trap = f.spawnProjectile({
            x: gx, y: f.ground ? f.ground.y - 4 : f.y, vx: 0, vy: f.ground ? 0 : 4, gravity: 0.5, maxFall: 12, r: 6, dmg: 0, harmless: true,
            life: 600, passCollide: true, reflectable: false, absorbable: false, destructible: false, glow: false,
            onGround(p, pl) { p.y = pl.y - 4; p.vy = 0; p.data.armed = true; },
            update(p, m) {
              if (!p.data.armed || p.t < 24) return;
              for (const t of m.fighters) {
                if (t === p.owner || !t.inPlay() || !t.canBeHit()) continue;
                if (Math.abs(t.x - p.x) < 36 && Math.abs(t.y - (p.y + 4)) < 24) {
                  p.owner.hitTarget(t, { dmg: 4, fkb: 0, bkb: 0, kbg: 0, ang: 90, stun: 70, effect: 'hit' }, { x: p.x, y: p.y });
                  m.effects.spawn('text', t.x, t.y - t.h - 12, { text: '¡ATRAPADO!', color: '#f5f5ff', size: 18 });
                  p.destroy('trigger'); return false;
                }
              }
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y + 3); ctx.scale(1, 0.3);
              ctx.globalAlpha = p.data.armed ? 0.85 : 0.4;
              webDraw(ctx, { x: 0, y: 0, r: 34, t: 0 });
              ctx.restore();
            }
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
