/* NEXUS CLASH — js/fighters/roster/19-chronia.js · luchador 19 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, hairCap, fighter } = NX.RosterLib;

  /* ======================================================================
   * 19 · CHRONIA — Relojera del Tiempo (control de tiempo)
   * ==================================================================== */
  fighter({
    id: 'chronia', name: 'Chronia', title: 'Relojera del Tiempo',
    passive: 'Rebobinar: su Up-B la devuelve a donde estaba hace ~1,3 s.',
    palette: { primary: '#24304a', secondary: '#c9a04a', skin: '#efcfb4', head: '#efcfb4', hand: '#24304a', accent: '#3ac0b0', hair: '#e9e2d0', eye: '#24304a', feet: '#3a2a1a', legs: '#1a2236', arms: '#24304a', belt: '#c9a04a' },
    stats: { weight: 86, height: 82, width: 32, run: 6.8, airSpeed: 3.9, gravity: 0.5, fall: 9 },
    profile: { style: 'magic', reach: 1.15, power: 0.98, speed: 1.0 },
    ai: { recovery: 'up', projectile: 'side', range: 150, zoner: true },
    init(f) { f.data.hist = []; },
    onLifeReset(f) { f.data.hist = []; },
    onUpdate(f) {
      if (!f.inPlay() || f.state === ST.RESPAWN || f.hitlag > 0) return;
      const h = f.data.hist || (f.data.hist = []);
      h.push({ x: f.x, y: f.y, g: !!f.ground });
      if (h.length > 80) h.shift();
    },
    poseMod(f, p) {
      const mv = f.move;
      if (mv && mv.def.key === 'special_up' && mv.frame <= 18) return { alpha: Math.abs(mv.frame - 10) / 10 };
      return null;
    },
    rig: {
      headR: 11.5, torsoW: 19, hipW: 20, torsoH: 26, thigh: 15, shin: 15, armW: 6,
      weapon: { type: 'staff', len: 46, w: 8, trail: '#3ac0b0' },
      parts: {
        headBack(ctx, a) { const r = a.rig.headR; R.disc(ctx, -r * 0.75, -r * 0.35, r * 0.45, a.pal.hair); },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.3 });
          R.poly(ctx, [[-r * 0.7, -r * 0.75], [r * 0.75, -r * 0.75], [r * 0.6, -r * 1.75], [-r * 0.55, -r * 1.75]], a.pal.primary);
          R.poly(ctx, [[-r * 1.05, -r * 0.7], [r * 1.1, -r * 0.7], [r * 1.1, -r * 0.88], [-r * 1.05, -r * 0.88]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 0.62, -r * 1.05, r * 1.32, r * 0.18);
          ctx.save(); ctx.translate(r * 0.15, -r * 1.35); ctx.rotate(a.f.tick * 0.03);
          for (let i = 0; i < 6; i++) { ctx.rotate(PI / 3); ctx.fillStyle = a.pal.secondary; ctx.fillRect(-1.5, -5.5, 3, 3); }
          R.disc(ctx, 0, 0, 3.5, a.pal.secondary); ctx.restore();
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.08, r * 0.3, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.22); ctx.quadraticCurveTo(r * 0.2, r * 0.8, -r * 0.1, r * 0.9); ctx.stroke();
        },
        back(ctx, a) {
          const s = a.J.sh;
          ctx.save(); ctx.translate(s.x - 10, s.y + 4); ctx.rotate(a.f.tick * 0.01);
          ctx.fillStyle = a.pal.secondary; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < 24; i++) { const r = i % 2 ? 22 : 18; const ang = i * TAU / 24; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          R.disc(ctx, 0, 0, 13, '#f4ecd8');
          ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.moveTo(0, 0); ctx.lineTo(6, 2); ctx.stroke();
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.8, 18], [-r.hipW * 0.8, 18]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r.torsoW * 0.12, -r.torsoH * (0.8 - i * 0.22), 2, 0, TAU); ctx.fill(); }
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(r.torsoW * 0.12, -r.torsoH * 0.5); ctx.quadraticCurveTo(r.torsoW * 0.35, -r.torsoH * 0.35, r.torsoW * 0.3, -r.torsoH * 0.2); ctx.stroke();
        },
        weapon(ctx, f, w) {
          R.limb(ctx, [{ x: 0, y: -12 }, { x: 0, y: w.len }], 4, '#5a3b1f');
          ctx.save(); ctx.translate(0, w.len + 9);
          R.disc(ctx, 0, 0, 10, '#c9a04a');
          R.disc(ctx, 0, 0, 7.5, '#f4ecd8', false);
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.rotate(f.tick * 0.08);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); ctx.stroke();
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 40, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 14) return;
          if (f.data.field && f.data.field.active) f.data.field.destroy('replace');
          NX.Audio.play('magic', { pitch: 0.7 });
          f.data.field = f.spawnProjectile({
            x: f.x + f.facing * 120, y: f.y - 50, vx: 0, vy: 0, r: 78, life: 200, dmg: 0, harmless: true, stageCollide: false,
            reflectable: false, absorbable: false, destructible: false, glow: false,
            update(p, m) {
              for (const t of m.fighters) {
                if (t === p.owner || !t.inPlay()) continue;
                if (U.dist(t.x, t.y - t.h / 2, p.x, p.y) < p.r && m.frame % 2 === 0) t.hitlag = Math.max(t.hitlag, 1);
              }
              for (const q of m.projectiles) {
                if (q === p || !q.active || q.owner === p.owner) continue;
                if (U.dist(q.x, q.y, p.x, p.y) < p.r) { q.x -= q.vx * 0.55; q.y -= q.vy * 0.55; }
              }
            },
            draw(ctx, p) {
              const k = Math.min(1, p.t / 10, p.life / 20);
              ctx.save(); ctx.translate(p.x, p.y);
              ctx.globalAlpha = 0.22 * k; R.disc(ctx, 0, 0, p.r, '#3ac0b0', false);
              ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = '#3ac0b0'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.stroke();
              for (let i = 0; i < 12; i++) { const ang = i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * p.r * 0.85, Math.sin(ang) * p.r * 0.85); ctx.lineTo(Math.cos(ang) * p.r, Math.sin(ang) * p.r); ctx.stroke(); }
              ctx.lineWidth = 3; ctx.rotate(p.t * 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -p.r * 0.6); ctx.stroke();
              ctx.rotate(p.t * 0.2); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -p.r * 0.8); ctx.stroke();
              ctx.restore();
            }
          });
        }
      },
      side: {
        frames: 34, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('slash', { pitch: 1.4 });
          [-0.8, 0.6].forEach((vy, i) => shoot(f, {
            ox: 26, oy: -f.h * (0.55 + i * 0.1), speed: 11, vy, r: 10, dmg: 5, ang: 45, bkb: 25, kbg: 45, life: 70, rehit: 20, pierce: true,
            effect: 'slash', color: '#c9a04a', glow: false, stageCollide: true,
            update(p) { if (p.t > 8) { p.vx *= 0.9; p.vy *= 0.9; } },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y);
              ctx.rotate(Math.abs(p.vx) > 1 ? p.t * 0.5 : (p.facing > 0 ? 0 : PI));
              R.poly(ctx, [[14, 0], [4, -4], [-10, -2], [-10, 2], [4, 4]], '#c9a04a');
              R.disc(ctx, -10, 0, 3, '#24304a', false);
              ctx.restore();
            }
          }));
        }
      },
      up: {
        frames: 36, intangible: [1, 20], helplessLag: 12,
        poseFn() { return { aF1: 2.2, aF2: 0.3, aB1: -0.6, lean: -0.1, planted: false }; },
        onStart(f, mv) {
          const h = f.data.hist || [];
          let pick = null;
          for (let i = 0; i < Math.min(h.length, 30); i++) if (h[i].g) { pick = h[i]; break; }
          mv.data.to = pick || h[0] || null;
          NX.Audio.play('magic', { pitch: 0.5 });
        },
        onFrame(f, fr, mv) {
          if (fr < 10) { f.vx *= 0.6; f.vy *= 0.5; mv.velX = mv.velY = true; return; }
          if (fr === 10) {
            const to = mv.data.to;
            if (to) {
              f.fx('bolt', f.x, f.y - f.h / 2, { x2: to.x, y2: to.y - f.h / 2, color: '#3ac0b0', life: 14 });
              f.fx('ring', f.x, f.y - f.h / 2, { r: 40, color: '#3ac0b0' });
              f.x = to.x; f.y = to.y - 2; f.vx = 0; f.vy = 0; f.lvx = 0; f.lvy = 0; f.ground = null;
              f.fx('ring', f.x, f.y - f.h / 2, { r: 50, color: '#c9a04a' });
              NX.Audio.play('reflect');
            } else mv.data.rise = true;
          }
          if (mv.data.rise && fr >= 10 && fr <= 22) { f.vy = -12; mv.velY = true; }
        },
        onLand(f) { f.endMoveCleanup(true); f.startLand(8); return 'continue'; }
      },
      down: {
        frames: 46, pose: 'charge',
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('tick');
          if (fr !== 14) return;
          NX.Audio.play('reflect');
          f.fx('ring', f.x, f.y - f.h / 2, { r: 90, color: '#3ac0b0', w: 6, life: 18 });
          f.spawnProjectile({ x: f.x, y: f.y - f.h / 2, vx: 0, vy: 0, r: 80, life: 4, dmg: 4, ang: 80, fkb: 0, bkb: 0, kbg: 0, stun: 45, effect: 'magic',
            dir: 'auto', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false, draw() {} });
        }
      }
    }
  });

})(window.NX = window.NX || {});
