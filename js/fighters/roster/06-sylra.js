/* NEXUS CLASH — js/fighters/roster/06-sylra.js · luchador 06 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, groundAt, tetherLedge, hairCap, elfEar, windOf, fighter } = NX.RosterLib;

  /* ======================================================================
   * 06 · SYLRA — Guardabosques Espinosa (zoner de plantas)
   * ==================================================================== */
  function briarDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y + 22);
    const k = Math.min(1, p.t / 10, p.life / 20);
    ctx.scale(1, k);
    ctx.strokeStyle = '#3d5a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 9, 0);
      ctx.quadraticCurveTo(i * 12 + Math.sin(p.t * 0.05 + i) * 4, -22, i * 6, -36 + Math.abs(i) * 4); ctx.stroke();
    }
    ctx.fillStyle = '#d6ff6b';
    for (let i = 0; i < 9; i++) { const x = Math.sin(i * 2.3) * 26, y = -8 - (i * 7 % 30); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 3); ctx.lineTo(x + 1, y + 2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ff5a8a';
    [[-12, -30], [14, -26], [0, -38]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function briar(f, x, gy, life) {
    if (f.data.briar && f.data.briar.active) f.data.briar.destroy('replace');
    f.data.briar = f.spawnProjectile({
      x, y: gy - 22, vx: 0, vy: 0, r: 34, life: life || 160, dmg: 2.5, ang: 80, fkb: 35, bkb: 0, kbg: 100, rehit: 18, hits: 99,
      pierce: true, effect: 'hit', stageCollide: false, reflectable: false, absorbable: false, destructible: false,
      transcendent: true, dir: 'auto', glow: false, draw: briarDraw
    });
    f.fx('debris', x, gy, { n: 5, color: '#4f7a2a' });
    return f.data.briar;
  }
  const seedDraw = (ctx, p) => { R.ellipse(ctx, p.x, p.y, p.r, p.r * 0.75, p.t * 0.3, '#8a5a2a'); ctx.fillStyle = '#d6ff6b'; ctx.fillRect(p.x - 1, p.y - p.r - 3, 2, 4); };
  fighter({
    id: 'sylra', name: 'Sylra', title: 'Guardabosques Espinosa',
    passive: 'Control de zona: zarzales que castigan el terreno.',
    palette: { primary: '#4f7a2a', secondary: '#6b4a2b', skin: '#e8c9a0', head: '#e8c9a0', hand: '#e8c9a0', accent: '#d6ff6b', hair: '#c26a2a', eye: '#2a5a1a', feet: '#4a3220', legs: '#6b4a2b', arms: '#e8c9a0' },
    stats: { weight: 90, height: 84, width: 32, run: 6.6, airSpeed: 3.9, gravity: 0.52 },
    profile: { style: 'kick', reach: 1.05, power: 0.96, speed: 1.02 },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 200, zoner: true },
    rig: {
      headR: 11.5, torsoW: 19, hipW: 18, torsoH: 26, thigh: 16, shin: 16, armW: 6.5,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f), sw = Math.sin(a.f.tick * 0.12) * 2;
          const pts = [{ x: -r * 0.6, y: 0 }];
          for (let i = 1; i <= 4; i++) pts.push({ x: -r * 0.8 - i * (2 + w * 0.15), y: i * r * 0.5 + sw * i * 0.4 });
          R.limb(ctx, pts, 7, a.pal.hair);
          R.disc(ctx, pts[4].x, pts[4].y + 3, 3, a.pal.accent);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          elfEar(ctx, r, a.pal.skin);
          hairCap(ctx, r, a.pal.hair);
          ctx.fillStyle = '#7fbf3a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-r * 0.2 + i * r * 0.4, -r * 0.95); ctx.rotate(-0.6 + i * 0.6); ctx.beginPath(); ctx.ellipse(0, -3, 2.5, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
        },
        back(ctx, a) {
          const { J, f } = a, w = windOf(f), t = J.top;
          ctx.fillStyle = '#3d5a1a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(t.x + 4, t.y);
          for (let i = 0; i <= 5; i++) ctx.lineTo(t.x - 8 - i * 3 - w * (i / 5), t.y + 6 + i * 6 + (i % 2) * 5);
          ctx.lineTo(t.x - 2, t.y + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-r.hipW / 2, -7, r.hipW, 5);
          R.poly(ctx, [[r.hipW * 0.1, -4], [r.hipW * 0.45, -4], [r.hipW * 0.4, 6], [r.hipW * 0.12, 6]], '#8a5a2a');
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(0, -r.torsoH * 0.95); ctx.lineTo(0, -r.torsoH * 0.35); ctx.stroke();
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_side' || mv.frame < 8 || mv.frame > 24) return;
      const fr = mv.frame, ext = fr <= 12 ? (fr - 8) / 4 : fr <= 16 ? 1 : 1 - (fr - 16) / 8;
      const hx = f.x + f.facing * 18, hy = f.y - f.h * 0.55, len = 110 * ext;
      ctx.save(); ctx.lineCap = 'round';
      const ex = hx + f.facing * len, ey = hy + 4;
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ex) / 2, hy - 14 * ext, ex, ey); ctx.stroke();
      ctx.strokeStyle = '#4f7a2a'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.fillStyle = '#7fbf3a';
      for (let i = 1; i < 5; i++) { const k = i / 5; ctx.beginPath(); ctx.ellipse(hx + (ex - hx) * k, hy - 10 * ext * Math.sin(k * PI) - 3, 3, 6, f.facing * 0.8, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 36, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 14) return;
          NX.Audio.play('swing');
          shoot(f, {
            ox: 18, oy: -f.h * 0.85, speed: 6, vy: -7, gravity: 0.4, r: 9, dmg: 5, ang: 50, bkb: 25, kbg: 45, life: 100,
            effect: 'hit', passCollide: true, glow: false, draw: seedDraw,
            onGround(p, pl) { briar(p.owner, p.x, pl.y, 140); p.destroy('sprout'); },
            onHit(p, t) { boom(p.owner, p.x, p.y, { r: 30, dmg: 6, ang: 60, bkb: 40, kbg: 50, effect: 'hit' }); }
          });
        }
      },
      side: {
        frames: 44, pose: 'shoot',
        hitboxes: [
          { f: [12, 16], x: 100, y: -46, r: 20, dmg: 7, ang: 20, fkb: 62, bkb: 0, kbg: 100, reverse: true, effect: 'hit' },
          { f: [12, 16], x: 60, y: -46, r: 16, dmg: 6, ang: 20, fkb: 55, bkb: 0, kbg: 100, reverse: true, effect: 'hit' }],
        onFrame(f, fr) {
          if (fr === 9) NX.Audio.play('swing', { pitch: 1.4 });
          if (fr >= 12 && fr <= 16) tetherLedge(f, 150);
        }
      },
      up: {
        frames: 44, pose: 'rise', vel: [{ f: [5, 16], vy: -14, vx: 1.5 }],
        hitboxes: [{ f: [5, 9], x: 0, y: -10, r: 26, dmg: 9, ang: 88, bkb: 60, kbg: 70, effect: 'hit', dir: 'auto' }],
        onStart(f) { NX.Audio.play('spin', { pitch: 0.8 }); },
        onFrame(f, fr) {
          if (fr === 5) { f.fx('debris', f.x, f.y + 4, { n: 6, color: '#4f7a2a' }); f.fx('ring', f.x, f.y, { r: 36, color: '#d6ff6b' }); }
          if (fr >= 5 && fr <= 18 && fr % 3 === 0) f.fx('feather', f.x + U.rand(-15, 15), f.y, { color: '#7fbf3a' });
        }
      },
      down: {
        frames: 40, pose: 'kneel',
        onFrame(f, fr) {
          if (fr !== 14) return;
          NX.Audio.play('block');
          if (f.ground) {
            const gx = f.x + f.facing * 55;
            briar(f, groundAt(f.match, gx, f.ground.y, 4) ? gx : f.x, f.ground.y, 180);
          } else {
            shoot(f, { ox: 0, oy: -10, speed: 0, vy: 8, gravity: 0.5, r: 8, dmg: 4, ang: 280, bkb: 20, kbg: 40, life: 90, passCollide: true, glow: false, draw: seedDraw,
              onGround(p, pl) { briar(p.owner, p.x, pl.y, 160); p.destroy('sprout'); } });
          }
        }
      }
    }
  });

})(window.NX = window.NX || {});
