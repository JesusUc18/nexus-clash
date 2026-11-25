/* NEXUS CLASH — js/fighters/roster/04-rook.js · luchador 04 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, nearestFoe, spend, hairCap, goggles, windOf, boltDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 04 · ROOK — Ingeniera de Chatarra (constructora con medidor)
   * Medidor CHATARRA: se llena con el tiempo y golpeando. Muros y torretas.
   * ==================================================================== */
  function crateDraw(ctx, b) {
    ctx.save();
    const blink = b.life < 90 && Math.floor(b.life / 6) % 2 === 0;
    ctx.globalAlpha = blink ? 0.55 : 1;
    ctx.fillStyle = '#7d8691'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    ctx.fillStyle = '#f2b632';
    for (let i = -b.h; i < b.w + b.h; i += 16) { ctx.beginPath(); ctx.moveTo(b.x + i, b.y); ctx.lineTo(b.x + i + 8, b.y); ctx.lineTo(b.x + i + 8 - b.h * 0.6, b.y + b.h); ctx.lineTo(b.x + i - b.h * 0.6, b.y + b.h); ctx.closePath(); ctx.globalAlpha = (blink ? 0.3 : 0.5); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = '#3a3f4a';
    [[4, 4], [b.w - 4, 4], [4, b.h - 4], [b.w - 4, b.h - 4]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(b.x + x, b.y + y, 2, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  fighter({
    id: 'rook', name: 'Rook', title: 'Ingeniera de Chatarra',
    passive: 'Constructora: genera CHATARRA para muros (25) y torretas (50).',
    palette: { primary: '#2e5a88', secondary: '#f2b632', skin: '#c98d64', head: '#c98d64', hand: '#3a3a3a', accent: '#ff6a2a', hair: '#5a2d1a', eye: '#1b1b1b', feet: '#3a2a20', legs: '#2e5a88', arms: '#c98d64', belt: '#5a3a20' },
    stats: { weight: 92, height: 78, width: 34, run: 6.8, airSpeed: 3.8 },
    profile: { style: 'fist', reach: 1, power: 1, speed: 1 },
    meter: { max: 100, start: 30, label: 'CHATARRA', short: 'CHATARRA', color: '#ffb02e', gainOnHit: 0.8, text: f => 'CHATARRA ' + Math.floor(f.meter) },
    ai: { recovery: 'up', projectile: 'neutral', range: 160, builder: true },
    onUpdate(f) { if (f.inPlay() && f.state !== ST.RESPAWN) f.addMeter(0.04); },
    rig: {
      headR: 12, torsoW: 22, hipW: 20, torsoH: 25, thigh: 14, shin: 14, armW: 7.5,
      weapon: { type: 'sword', len: 30, w: 6, trail: '#ffd27a' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, sw = Math.sin(a.f.tick * 0.15) * 3 - windOf(a.f) * 0.3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.5);
          ctx.quadraticCurveTo(-r * 1.9, -r * 0.6 + sw, -r * 1.7 + sw, r * 0.7);
          ctx.quadraticCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair);
          goggles(ctx, r, '#3a2a20', '#7fe9ff', -r * 0.62);
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.32, -r.torsoH * 0.7], [r.torsoW * 0.32, -r.torsoH * 0.7], [r.hipW * 0.45, -2], [-r.hipW * 0.45, -2]], a.pal.secondary);
          ctx.fillStyle = OUT;
          ctx.fillRect(-r.torsoW * 0.32, -r.torsoH * 0.98, 3, r.torsoH * 0.3); ctx.fillRect(r.torsoW * 0.32 - 3, -r.torsoH * 0.98, 3, r.torsoH * 0.3);
          ctx.fillStyle = '#d99a20'; ctx.fillRect(-5, -r.torsoH * 0.5, 10, 7);
        },
        weapon(ctx, f, w) {
          ctx.fillStyle = '#9aa4ae'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.rect(-2.5, -4, 5, w.len - 6); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-8, w.len - 8); ctx.lineTo(8, w.len - 8); ctx.lineTo(8, w.len + 4); ctx.lineTo(3, w.len + 4);
          ctx.lineTo(3, w.len - 2); ctx.lineTo(-3, w.len - 2); ctx.lineTo(-3, w.len + 4); ctx.lineTo(-8, w.len + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_up' || mv.frame > 50) return;
      const x = f.x, y = f.y - f.h - 8, a = f.tick * 0.9;
      ctx.save();
      ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#c0c8d2';
      for (let i = 0; i < 2; i++) { const s = Math.cos(a + i * PI); ctx.beginPath(); ctx.ellipse(x + s * 13, y, Math.abs(s) * 14 + 2, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      R.disc(ctx, x, y, 3.5, '#ff6a2a');
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 36, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 8 && fr !== 13 && fr !== 18) return;
          NX.Audio.play('laser', { pitch: 1.8 });
          shoot(f, { ox: 30, oy: -f.h * 0.55, speed: 14, vy: U.rand(-0.6, 0.6), r: 6, dmg: 2.5, ang: 20, bkb: 8, kbg: 22, life: 30, color: '#d9dee6', glow: false, draw: boltDraw('#d9dee6', 8) });
        }
      },
      side: {
        frames: 30, pose: 'cast',
        onStart(f, mv) { mv.data.ok = spend(f, 25); },
        onFrame(f, fr, mv) {
          if (fr !== 10 || !mv.data.ok) return;
          const m = f.match;
          let b;
          if (f.ground) b = { x: f.x + f.facing * 58 - 20, y: f.ground.y - 64, w: 40, h: 64 };
          else b = { x: f.x + f.facing * 30 - 36, y: f.y + 14, w: 72, h: 18 };
          const blk = m.addSolid(Object.assign(b, { type: 'solid', life: 420, owner: f, color: '#7d8691', draw: crateDraw }));
          f.data.blocks = (f.data.blocks || []).filter(x => !x.removed);
          f.data.blocks.push(blk);
          if (f.data.blocks.length > 2) m.removeSolid(f.data.blocks.shift());
          f.spawnProjectile({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: 0, vy: 0, r: Math.max(b.w, b.h) * 0.6, life: 3, dmg: 6, ang: 60, bkb: 40, kbg: 60, dir: 'auto', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false, draw() {} });
          f.fx('debris', b.x + b.w / 2, b.y + b.h, { n: 6, color: '#7d8691' });
          NX.Audio.play('block');
        }
      },
      up: {
        frames: 62, pose: 'rise', drift: 1,
        hitboxes: [{ f: [4, 46], x: 0, y: -92, r: 22, dmg: 1.2, rehit: 6, fkb: 18, bkb: 0, kbg: 100, ang: 80, effect: 'hit', dir: 'auto' }],
        onFrame(f, fr, mv) {
          if (fr >= 4 && fr <= 46) {
            f.vy = fr < 30 ? -6.6 : -3.5; mv.velY = true;
            if (fr % 6 === 0) NX.Audio.play('spin', { pitch: 1.4 });
          }
        }
      },
      down: {
        frames: 40, pose: 'kneel',
        onStart(f, mv) { mv.data.ok = spend(f, 50); },
        onFrame(f, fr, mv) {
          if (fr !== 16 || !mv.data.ok) return;
          if (f.data.turret && f.data.turret.active) f.data.turret.destroy('replace');
          NX.Audio.play('block');
          f.data.turret = f.spawnProjectile({
            x: f.x + f.facing * 36, y: f.y - 16, vx: 0, vy: 0, gravity: 0.6, maxFall: 12, r: 16, dmg: 0, harmless: true,
            life: 420, reflectable: false, absorbable: false, destructible: false, passCollide: true, facing: f.facing, glow: false,
            onGround(p, pl) { p.y = pl.y - p.r; p.vy = 0; p.data.grounded = true; },
            update(p) {
              if (!p.data.grounded || p.t % 45 !== 20) return;
              const foe = nearestFoe(p.owner, p.x, p.y, 640);
              if (!foe) return;
              p.facing = U.sign(foe.x - p.x);
              p.owner.spawnProjectile({ x: p.x + p.facing * 18, y: p.y - 8, vx: p.facing * 11, vy: 0, r: 6, dmg: 3, ang: 30, bkb: 15, kbg: 30, life: 60, color: '#ffd23a', glow: false, draw: boltDraw('#ffd23a', 9) });
              NX.Audio.play('laser', { pitch: 1.6 });
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y);
              const blink = p.life < 90 && Math.floor(p.life / 6) % 2 === 0;
              if (blink) ctx.globalAlpha = 0.5;
              ctx.strokeStyle = OUT; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.moveTo(-12, 16); ctx.lineTo(0, 2); ctx.lineTo(12, 16); ctx.stroke();
              R.disc(ctx, 0, -2, 11, '#f2b632');
              ctx.fillStyle = '#3a3f4a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.rect(p.facing > 0 ? 4 : -20, -6, 16, 7); ctx.fill(); ctx.stroke();
              R.disc(ctx, 0, -3, 3, p.t % 45 < 8 ? '#ff3b3b' : '#7fe9ff', false);
              ctx.restore();
            }
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
