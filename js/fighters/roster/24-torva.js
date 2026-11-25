/* NEXUS CLASH — js/fighters/roster/24-torva.js · luchador 24 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, groundAt, windOf, boltDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 24 · TORVA — Baluarte (escudo torre y lanza)
   * Pasiva "Escudo Torre": quieta o caminando bloquea proyectiles frontales.
   * ==================================================================== */
  function towerShield(ctx, x, y, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    R.poly(ctx, [[-14, -26], [14, -26], [16, 18], [0, 32], [-16, 18]], '#5a626e');
    R.poly(ctx, [[-10, -21], [10, -21], [12, 15], [0, 26], [-12, 15]], '#3a2a5a', false);
    ctx.fillStyle = '#d4a93a'; ctx.fillRect(-2, -20, 4, 44); ctx.fillRect(-10, -6, 20, 4);
    ctx.restore();
  }
  fighter({
    id: 'torva', name: 'Torva', title: 'Baluarte',
    passive: 'Escudo Torre: bloquea proyectiles frontales mientras está quieta o camina.',
    palette: { primary: '#8c96a4', secondary: '#3a2a5a', skin: '#d8b090', head: '#8c96a4', hand: '#5a626e', arms: '#8c96a4', legs: '#5a626e', feet: '#3a3f4a', accent: '#d4a93a', visor: '#141218', belt: '#3a2a5a' },
    stats: { weight: 112, height: 92, width: 42, walk: 2.6, run: 5.8, dash: 6.4, airSpeed: 3.4, gravity: 0.6, fall: 10.2, jump: 12.8, airJump: 11.8 },
    profile: { style: 'sword', reach: 1.32, power: 1.08, speed: 0.92 },   // V1.2.1: alcance 1.2 → 1.32 (+10%)
    ai: { recovery: 'up', projectile: 'neutral', range: 122, heavy: true },
    canBeHit(f, box) {
      if (!box || box.kind !== 'proj' || !f.ground) return true;
      const s = f.state;
      if (s !== ST.IDLE && s !== ST.WALK && s !== ST.CROUCH && s !== ST.LAND) return true;
      if (Math.sign(box.x - f.x) !== f.facing) return true;
      box.proj.destroy('blocked');
      f.fx('ring', f.x + f.facing * 24, f.y - f.h * 0.5, { r: 26, color: '#d4a93a' });
      NX.Audio.play('shieldHit');
      return false;
    },
    rig: {
      headR: 12, torsoW: 26, hipW: 22, torsoH: 28, armW: 9, legW: 11, handR: 6, eyes: 'visor', mouth: false,
      weapon: { type: 'sword', len: 66, w: 5, trail: '#e6d6a0' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f);
          ctx.fillStyle = '#c8202a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.95); ctx.quadraticCurveTo(-r * 1.4 - w * 0.4, -r * 1.7, -r * 2.0 - w * 0.6, -r * 0.6 + Math.sin(a.f.tick * 0.15) * 2);
          ctx.quadraticCurveTo(-r * 1.2, -r * 1.0, -r * 0.6, -r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-r * 0.05, -r * 1.05, r * 0.15, r * 1.3);
        },
        back(ctx, a) { towerShield(ctx, a.J.haB.x - 4, a.J.haB.y - 6, a.J.lean * 0.5, 1); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.3, -r.torsoH * 0.85], [r.torsoW * 0.3, -r.torsoH * 0.85], [r.hipW * 0.35, 14], [-r.hipW * 0.35, 14]], a.pal.secondary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-2, -r.torsoH * 0.75, 4, r.torsoH * 0.6); ctx.fillRect(-7, -r.torsoH * 0.55, 14, 3);
          R.ellipse(ctx, r.torsoW * 0.35, -r.torsoH * 0.95, 9, 6, 0.3, '#a8b2c0');
        },
        weapon(ctx, f, w) {
          ctx.fillStyle = '#6a4a2a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.rect(-2.5, -18, 5, w.len); ctx.fill(); ctx.stroke();
          R.poly(ctx, [[-8, 2], [8, 2], [3, 14], [-3, 14]], '#a8b2c0');
          R.poly(ctx, [[-4, w.len - 18], [4, w.len - 18], [0, w.len + 6]], '#d9e2ec');
        }
      }
    },
    specials: {
      neutral: {
        frames: 40, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 16) return;
          NX.Audio.play('swing', { size: 1.4 });
          shoot(f, { ox: 22, oy: -f.h * 0.85, speed: 10, vy: -4, gravity: 0.25, maxFall: 14, r: 7, dmg: 10, ang: 45, bkb: 35, kbg: 70, life: 80,
            effect: 'slash', color: '#d9e2ec', glow: false, draw: boltDraw('#d9e2ec', 22) });
        }
      },
      side: {
        frames: 52, pose: 'dashattack', oncePerAir: true, drift: 0, gravity: 0.35,
        armor: { f: [8, 30], kb: 80 }, vel: [{ f: [8, 30], vx: 8.5 }],
        hitboxes: [{ f: [10, 30], x: 46, y: -48, r: 20, dmg: 12, ang: 40, bkb: 50, kbg: 80, effect: 'slash' }],
        onFrame(f, fr) { if (fr === 8) NX.Audio.play('dash'); if (fr >= 8 && fr <= 30 && fr % 4 === 0 && f.ground) f.fx('dust', f.x - f.facing * 20, f.y, { n: 1 }); }
      },
      up: {
        frames: 48, pose: 'uppercut', vel: [{ f: [5, 20], vy: -13, vx: 1.5 }],
        hitboxes: [{ f: [5, 14], x: 10, y: -88, r: 26, dmg: 10, ang: 88, bkb: 55, kbg: 75, effect: 'heavy' }],
        onFrame(f, fr) { if (fr === 5) NX.Audio.play('swing', { size: 1.5 }); }
      },
      down: {
        frames: 40, pose: 'stomp',
        hitboxes: [{ f: [14, 16], x: 44, y: -30, r: 26, dmg: 7, ang: 60, bkb: 45, kbg: 50, effect: 'heavy' }],
        onFrame(f, fr) {
          if (fr !== 14 || !f.ground) return;
          const m = f.match, gx = f.x + f.facing * 44;
          if (!groundAt(m, gx, f.ground.y, 4)) return;
          if (f.data.wall && !f.data.wall.removed) m.removeSolid(f.data.wall);
          f.data.wall = m.addSolid({
            x: gx - 10, y: f.ground.y - 76, w: 20, h: 76, life: 240, owner: f, type: 'solid',
            draw(ctx, b) {
              ctx.save();
              if (b.life < 60 && Math.floor(b.life / 5) % 2 === 0) ctx.globalAlpha = 0.5;
              towerShield(ctx, b.x + b.w / 2, b.y + 30, 0, 1.35);
              ctx.restore();
            }
          });
          NX.Audio.play('stomp'); f.fx('debris', gx, f.ground.y, { n: 6, color: '#8c96a4' });
        }
      },
      down_air: {
        frames: 40, pose: 'dair', kind: 'air', landingLag: 14,
        hitboxes: [{ f: [10, 16], x: 0, y: 6, r: 26, dmg: 11, ang: 280, bkb: 25, kbg: 80, effect: 'heavy', meteor: true }]
      }
    }
  });

})(window.NX = window.NX || {});
