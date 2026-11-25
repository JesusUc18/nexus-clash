/* NEXUS CLASH — js/fighters/roster/02-vespera.js · luchador 02 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, hairCap, windOf, cape, orbDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 02 · VESPERA — Bruja Lunar (flotante, cañón de cristal)
   * Pasiva "Levitación": mantener Salto al caer flota hasta 80 frames.
   * ==================================================================== */
  fighter({
    id: 'vespera', name: 'Vespera', title: 'Bruja Lunar',
    passive: 'Levitación: mantén Salto al caer para flotar.',
    palette: { primary: '#3b2a6b', secondary: '#22183f', skin: '#e3d4f7', head: '#e3d4f7', hand: '#e3d4f7', accent: '#c9b6ff', eye: '#d4a017', hair: '#eeeaff', feet: '#22183f', legs: '#2a1d4f', arms: '#3b2a6b' },
    stats: { weight: 80, height: 84, width: 32, walk: 2.8, run: 6.2, dash: 6.8, airSpeed: 3.9, gravity: 0.42, fall: 7.6, fastFall: 12, jump: 12.8, shortHop: 8.2, airJump: 12, traction: 0.45 },
    profile: { style: 'magic', reach: 1.05, power: 0.95, speed: 1.05 },
    ai: { recovery: 'up', projectile: 'neutral', range: 220, zoner: true },
    init(f) { f.data.float = 80; },
    onLifeReset(f) { f.data.float = 80; },
    onLand(f) { f.data.float = 80; },
    onUpdate(f) {
      if (f.state === ST.AIR && f.input.isHeld('jump') && f.vy >= 0 && f.data.float > 0 && !f.fastFalling) {
        f.vy = -f.stat('gravity'); f.data.float--; f.data.floating = true;
        if (f.tick % 6 === 0) f.fx('sparkle', f.x, f.y, { color: '#c9b6ff' });
      } else f.data.floating = false;
      if (f.state === ST.LEDGE) f.data.float = 80;
    },
    rig: {
      headR: 12, torsoW: 18, hipW: 22, torsoH: 27, legW: 8, thigh: 15, shin: 16, armW: 6, handR: 4.5, footL: 9,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f);
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.9);
          ctx.quadraticCurveTo(-r * 1.6 - w * 0.3, -r * 0.2, -r * 1.3 - w * 0.6, r * 2.2 + Math.sin(a.f.tick * 0.12) * 2);
          ctx.lineTo(-r * 0.2, r * 1.2); ctx.quadraticCurveTo(-r * 0.2, 0, r * 0.3, -r * 0.9); ctx.fill(); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.2 });
          ctx.strokeStyle = '#d6c06a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, r * 1.02, PI * 1.12, PI * 1.85); ctx.stroke();
          ctx.fillStyle = '#ffe9a0'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.95, r * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = a.pal.hair; ctx.beginPath(); ctx.arc(r * 0.38, -r * 1.02, r * 0.26, 0, TAU); ctx.fill();
        },
        back(ctx, a) { cape(ctx, a, a.pal.secondary, 48, 14, '#6a4fb0'); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.85, 20], [-r.hipW * 0.85, 20]], a.pal.primary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r.hipW * 0.85, 18); ctx.lineTo(r.hipW * 0.85, 18); ctx.stroke();
          ctx.fillStyle = a.pal.accent; ctx.beginPath(); ctx.arc(0, -r.torsoH * 0.62, 3, 0, TAU); ctx.fill();
        },
        hand(ctx, a) {
          if (!a.f.move) return;
          ctx.save(); ctx.globalAlpha = 0.45; R.disc(ctx, a.J.haF.x, a.J.haF.y, 8 + Math.sin(a.f.tick * 0.4) * 2, '#c9b6ff', false); ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'cast', charge: { at: 8, max: 90, key: 'special', mult: 1 },
        onCharge(f, mv) { if (mv.charge % 5 === 0) f.fx('sparkle', f.x + f.facing * 26, f.y - f.h * 0.55, { color: '#c9b6ff' }); },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / 90;
          NX.Audio.play('magic', { pitch: 1.4 - k * 0.6 });
          shoot(f, {
            ox: 30, speed: 7 + 3 * k, r: 8 + 12 * k, dmg: 4 + 15 * k, ang: 40, bkb: 20 + 30 * k, kbg: 60 + 45 * k,
            effect: 'magic', life: 80 + 20 * k, color: '#b39cff', draw: orbDraw('#b39cff', '#ffffff'), trail: k > 0.5 ? 6 : 0
          });
        }
      },
      side: {
        frames: 40, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('magic', { pitch: 0.7 });
          shoot(f, {
            ox: 34, speed: 3.4, r: 24, dmg: 1.4, ang: 70, fkb: 22, bkb: 0, kbg: 100, rehit: 9, hits: 7, life: 110,
            effect: 'dark', color: '#c9b6ff', destructible: true, glow: false,
            draw(ctx, p) {
              for (let i = 0; i < 6; i++) {
                const a = p.t * 0.25 + i * 1.05, x = p.x + Math.cos(a) * p.r * 0.75, y = p.y + Math.sin(a * 1.3) * p.r * 0.5;
                const flap = Math.abs(Math.sin(p.t * 0.9 + i)) * 5 + 2;
                ctx.fillStyle = i % 2 ? '#e7dcff' : '#a58cf0'; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(x - 3, y, 4, flap, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(x + 3, y, 4, flap, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
              }
            }
          });
        }
      },
      up: {
        frames: 46, pose: 'spin', drift: 0.8, vel: [{ f: [5, 22], vy: -11.5 }],
        hitboxes: [
          { f: [5, 22], x: 0, y: -42, r: 28, dmg: 1.8, rehit: 4, fkb: 40, ang: 85, bkb: 0, kbg: 100, effect: 'magic', dir: 'auto' },
          { f: [23, 25], x: 0, y: -48, r: 32, dmg: 6, ang: 80, bkb: 50, kbg: 90, effect: 'magic', group: 1 }],
        onFrame(f, fr) {
          if (fr === 5) NX.Audio.play('magic', { pitch: 1.2 });
          if (fr >= 5 && fr <= 25 && fr % 2 === 0) f.fx('sparkle', f.x + U.rand(-20, 20), f.y - U.rand(10, 70), { color: '#e3d4ff' });
        }
      },
      down: {
        frames: 36, pose: 'kneel',
        onFrame(f, fr) {
          if (fr !== 14) return;
          if (f.data.rune && f.data.rune.active) f.data.rune.destroy('replace');
          NX.Audio.play('magic', { pitch: 0.5 });
          const gx = f.x + f.facing * (f.ground ? 44 : 0);
          f.data.rune = f.spawnProjectile({
            x: gx, y: f.ground ? f.ground.y - 4 : f.y, vx: 0, vy: f.ground ? 0 : 4, gravity: 0.5, maxFall: 12, r: 6, dmg: 0, harmless: true,
            life: 720, passCollide: true, reflectable: false, absorbable: false, destructible: false, glow: false,
            onGround(p, pl) { p.y = pl.y - 4; p.vy = 0; p.data.armed = true; },
            update(p, m) {
              if (!p.data.armed || p.t < 30) return;
              for (const t of m.fighters) {
                if (t === p.owner || !t.inPlay() || !t.canBeHit()) continue;
                if (Math.abs(t.x - p.x) < 34 && Math.abs(t.y - (p.y + 4)) < 26) {
                  boom(p.owner, p.x, p.y - 20, { r: 48, dmg: 13, ang: 75, bkb: 55, kbg: 82, effect: 'dark' });
                  m.effects.spawn('spark', p.x, p.y - 20, { effect: 'dark', n: 12, power: 1.5 });
                  p.destroy('trigger'); return false;
                }
              }
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y + 3); ctx.scale(1, 0.32);
              const on = p.data.armed ? 0.6 + 0.4 * Math.sin(p.t * 0.15) : 0.3;
              ctx.strokeStyle = U.rgba('#c9b6ff', on); ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
              ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.stroke();
              ctx.rotate(p.t * 0.03);
              ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU * 2 / 5; ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); } ctx.closePath(); ctx.stroke();
              ctx.restore();
            }
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
