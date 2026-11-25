/* NEXUS CLASH — js/fighters/roster/08-medu.js · luchador 08 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, cloudDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 08 · MEDU — Medusa Abisal (flotante, 3 saltos aéreos)
   * ==================================================================== */
  fighter({
    id: 'medu', name: 'Medu', title: 'Medusa Abisal',
    passive: 'Ingravidez: caída muy lenta y 3 saltos aéreos.',
    palette: { primary: '#7fd8ff', skin: '#7fd8ff', head: '#7fd8ff', hand: '#b6ecff', accent: '#ff7ae0', eye: '#132a4a', feet: '#4aa3d8', arms: '#7fd8ff' },
    stats: { weight: 74, height: 66, width: 42, walk: 2.6, run: 5.6, dash: 6.2, airSpeed: 4.0, airAccel: 0.3, gravity: 0.34, fall: 6.8, fastFall: 11, jump: 11.5, shortHop: 7.6, airJump: 10.5, airJumps: 3, airJumpDecay: 0.06 },
    profile: { style: 'fist', reach: 1.1, power: 0.92, speed: 1, effect: 'water' },
    flipJump: false,
    portraitZoom: 0.3,
    ai: { recovery: 'up', projectile: 'neutral', range: 120, floaty: true, extraJumps: true },
    onAirJump(f) { f.fx('water', f.x, f.y, { n: 6, vy: 2 }); },
    rig: {
      body: 'blob', blobR: 26, thigh: 10, upperArm: 8, foreArm: 5, armW: 7, handR: 5, footL: 8, footH: 5, belly: '#c8f2ff',
      parts: {
        back(ctx, a) {
          const { J, f } = a, c = J.hip, t = f.tick;
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 5; i++) {
            const x0 = c.x - 16 + i * 8, ph = t * 0.15 + i;
            const pts = [{ x: x0, y: c.y + 16 }];
            for (let k = 1; k <= 4; k++) pts.push({ x: x0 + Math.sin(ph + k * 0.8) * 4 - (f.vx) * k * 0.6, y: c.y + 16 + k * 9 - (f.ground ? k * 3 : 0) });
            R.limb(ctx, pts, 4, i % 2 ? '#ff7ae0' : '#9fe2ff');
          }
          ctx.restore();
        },
        head(ctx, a) {
          const r = a.rig.blobR;
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.55, r * 0.35, r * 0.18, -0.4, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ff7ae0';
          [[-0.55, -0.15], [-0.75, 0.2], [0.05, -0.75]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.08, 0, TAU); ctx.fill(); });
          ctx.strokeStyle = '#4aa3d8'; ctx.lineWidth = 2;
          ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = -r + i * r / 4; ctx.lineTo(x, r * 0.62 + (i % 2) * 4); } ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('water');
          shoot(f, {
            ox: 30, oy: -f.h * 0.5, speed: 3.2, vy: -0.8, gravity: -0.02, r: 18, life: 120, dmg: 9, ang: 70, bkb: 40, kbg: 70,
            effect: 'water', color: '#9fe2ff', glow: false,
            draw(ctx, p) {
              ctx.save(); ctx.globalAlpha = 0.55;
              const g = ctx.createRadialGradient(p.x - 5, p.y - 6, 2, p.x, p.y, p.r);
              g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#bff0ff'); g.addColorStop(1, '#4aa3d8');
              ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y + Math.sin(p.t * 0.1) * 2, p.r, 0, TAU); ctx.fill();
              ctx.globalAlpha = 1; ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 2; ctx.stroke();
              ctx.restore();
            },
            onDestroy(p, why, m) { m.effects.spawn('water', p.x, p.y, { n: 10 }); NX.Audio.play('water'); }
          });
        }
      },
      side: {
        frames: 40, pose: 'cast',
        hitboxes: [
          { f: [10, 14], x: 62, y: -30, r: 15, dmg: 8, ang: 45, bkb: 30, kbg: 80, effect: 'elec' },
          { f: [10, 14], x: 38, y: -30, r: 13, dmg: 6, ang: 45, bkb: 30, kbg: 70, effect: 'elec' }],
        onFrame(f, fr) { if (fr === 9) NX.Audio.play('elec'); }
      },
      up: {
        frames: 56, pose: 'rise', gravity: 0.6, drift: 1,
        vel: [{ f: [6, 13], vy: -8.5 }, { f: [22, 29], vy: -8 }, { f: [38, 45], vy: -7.5 }],
        hitboxes: [
          { f: [6, 9], x: 0, y: 0, r: 22, dmg: 4, ang: 270, bkb: 20, kbg: 30, effect: 'water' },
          { f: [22, 25], x: 0, y: 0, r: 22, dmg: 4, ang: 270, bkb: 20, kbg: 30, effect: 'water', group: 1 },
          { f: [38, 41], x: 0, y: 0, r: 22, dmg: 4, ang: 270, bkb: 20, kbg: 30, effect: 'water', group: 2 }],
        onFrame(f, fr) { if (fr === 6 || fr === 22 || fr === 38) { NX.Audio.play('water'); f.fx('water', f.x, f.y + 4, { n: 10, vy: 3 }); f.fx('ring', f.x, f.y + 4, { r: 24, color: '#bff0ff' }); } }
      },
      down: {
        frames: 40, pose: 'charge',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('water', { pitch: 0.6 });
          f.spawnProjectile({
            x: f.x + f.facing * 20, y: f.y - f.h * 0.4, vx: f.facing * 0.6, vy: 0, r: 56, life: 90, dmg: 1.5, ang: 80, fkb: 22, bkb: 0, kbg: 100,
            rehit: 10, hits: 99, pierce: true, effect: 'dark', stageCollide: false, reflectable: false, absorbable: false, destructible: false,
            transcendent: true, dir: 'auto', glow: false, draw: cloudDraw('#3a1f5a', 0.75)
          });
        }
      }
    }
  });

})(window.NX = window.NX || {});
