/* NEXUS CLASH — js/fighters/roster/14-morgrath.js · luchador 14 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, steer, groundAt, hood, windOf, orbDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 14 · MORGRATH — Segador Espectral (guadaña de largo alcance)
   * ==================================================================== */
  fighter({
    id: 'morgrath', name: 'Morgrath', title: 'Segador Espectral',
    passive: 'Alcance de guadaña: los normales llegan más lejos que casi nadie (solo Torva lo supera).',
    palette: { primary: '#2a2633', secondary: '#151219', skin: '#c9d1c8', head: '#c9d1c8', hand: '#c9d1c8', accent: '#7aff9a', eye: '#7aff9a', feet: '#151219', legs: '#1d1a24', arms: '#2a2633' },
    stats: { weight: 82, height: 92, width: 30, run: 6.6, airSpeed: 3.8, gravity: 0.5, fall: 9, jump: 13.2, airJump: 12.2 },
    profile: { style: 'sword', reach: 1.3, power: 1, speed: 0.95, effect: 'dark' },
    ai: { recovery: 'up', projectile: 'neutral', range: 120, sword: true },
    poseMod(f, p) {
      if (f.move && f.move.def.key === 'special_up' && f.move.frame >= 4 && f.move.frame <= 24) return { alpha: 0.3 };
      return null;
    },
    rig: {
      headR: 11, torsoW: 18, hipW: 22, torsoH: 30, thigh: 17, shin: 17, armW: 6, handR: 4.5, eyes: 'glow', mouth: false,
      weapon: { type: 'sword', len: 74, w: 5, trail: '#7aff9a' },
      parts: {
        head(ctx, a) { hood(ctx, a.rig.headR, a.pal.primary, 'rgba(0,0,0,.55)'); },
        back(ctx, a) {
          const { J, f } = a, w = windOf(f), t = J.top;
          ctx.fillStyle = a.pal.secondary; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(t.x + 4, t.y);
          const by = J.hip.y + 34;
          for (let i = 0; i <= 6; i++) ctx.lineTo(t.x - 10 - i * 3 - w * 0.8 * (i / 6), by - (i % 2) * 8 + Math.sin(f.tick * 0.15 + i) * 2);
          ctx.lineTo(t.x - 2, t.y + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.5, -6], [r.hipW * 0.5, -6], [r.hipW * 0.75, 26], [-r.hipW * 0.75, 26]], a.pal.primary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r.hipW * 0.75, 24); ctx.lineTo(r.hipW * 0.75, 24); ctx.stroke();
          R.ellipse(ctx, r.torsoW * 0.2, -r.torsoH * 0.92, 7, 5, 0.3, '#d9d4c4');
        },
        weapon(ctx, f, w) {
          ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, w.len); ctx.stroke();
          ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#c9d6d0'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(0, w.len - 2);
          ctx.quadraticCurveTo(26, w.len + 4, 40, w.len - 22);
          ctx.quadraticCurveTo(22, w.len - 6, 0, w.len - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = U.rgba('#7aff9a', 0.6); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(4, w.len - 3); ctx.quadraticCurveTo(24, w.len + 1, 36, w.len - 18); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 40, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 14) return;
          NX.Audio.play('magic', { pitch: 0.5 });
          shoot(f, {
            ox: 26, speed: 4.2, r: 14, life: 150, dmg: 8, ang: 50, bkb: 35, kbg: 65, effect: 'dark', color: '#7aff9a', trail: 8,
            update(p) { if (p.t > 10) steer(p, 0.045, 700); },
            draw(ctx, p) {
              orbDraw('#3aff7a', '#e8ffe8')(ctx, p);
              ctx.fillStyle = '#0a1a0a';
              ctx.beginPath(); ctx.arc(p.x - 4, p.y - 2, 2.2, 0, TAU); ctx.arc(p.x + 4, p.y - 2, 2.2, 0, TAU); ctx.fill();
              ctx.beginPath(); ctx.ellipse(p.x, p.y + 5, 2.5, 3.2, 0, 0, TAU); ctx.fill();
            }
          });
        }
      },
      side: {
        frames: 48, pose: 'fsmash', vel: [{ f: [6, 13], vx: 5 }],
        hitboxes: [
          { f: [14, 18], x: 76, y: -42, r: 22, dmg: 11, ang: 25, bkb: 50, kbg: 45, reverse: true, effect: 'dark' },
          { f: [14, 18], x: 38, y: -42, r: 18, dmg: 8, ang: 361, bkb: 30, kbg: 85, effect: 'dark' }],
        onFrame(f, fr) { if (fr === 14) NX.Audio.play('slash', { pitch: 0.6 }); }
      },
      up: {
        frames: 52, pose: 'float', intangible: [4, 24],
        poseFn() { return { aF1: 0.6, aF2: 0.4, aB1: -0.4, aB2: 0.4, lean: 0.2, lF1: 0.3, lF2: -0.4, lB1: -0.1, lB2: -0.3, planted: false }; },
        onStart(f, mv) {
          let x = f.input.x, y = Math.min(-0.3, f.input.y);
          if (Math.hypot(x, y) < 0.45) { x = 0; y = -1; }
          mv.data.a = U.clamp(Math.atan2(x, -y), -0.9, 0.9);
          NX.Audio.play('magic', { pitch: 0.4 });
        },
        onFrame(f, fr, mv) {
          if (fr >= 4 && fr <= 24) {
            f.vx = Math.sin(mv.data.a) * 11.5; f.vy = -Math.cos(mv.data.a) * 11.5; mv.velX = mv.velY = true;
            f.match.effects.list.push({ type: 'wisp', x: f.x + U.rand(-10, 10), y: f.y - U.rand(10, 60), vx: 0, vy: -0.5, life: 22, max: 22, size: 10, color: '#3aff7a' });
          }
          if (fr === 25) { f.vx *= 0.3; f.vy *= 0.2; NX.Audio.play('slash', { pitch: 0.5 }); f.fx('ring', f.x, f.y - f.h / 2, { r: 50, color: '#7aff9a' }); }
        },
        hitboxes: [{ f: [25, 28], x: 0, y: -46, r: 34, dmg: 10, ang: 75, bkb: 50, kbg: 80, dir: 'auto', effect: 'dark' }]
      },
      down: {
        frames: 50, pose: 'kneel',
        onFrame(f, fr) {
          if (fr !== 16 || !f.ground) return;
          const gx = f.x + f.facing * 82, gy = f.ground.y;
          const x = groundAt(f.match, gx, gy, 4) ? gx : f.x + f.facing * 30;
          NX.Audio.play('magic', { pitch: 0.3 }); NX.Audio.play('stomp');
          f.fx('debris', x, gy, { n: 8, color: '#2a2633' });
          f.spawnProjectile({
            x, y: gy - 26, vx: 0, vy: 0, r: 32, life: 18, dmg: 11, ang: 88, bkb: 50, kbg: 60, effect: 'dark', stageCollide: false,
            reflectable: false, absorbable: false, destructible: false, pierce: true, transcendent: true, glow: false,
            draw(ctx, p) {
              const k = Math.min(1, p.t / 5) * Math.min(1, p.life / 6);
              ctx.save(); ctx.translate(p.x, gy);
              for (const s of [-1, 1]) {
                ctx.save(); ctx.translate(s * 12, 0); ctx.rotate(s * 0.25);
                R.limb(ctx, [{ x: 0, y: 4 }, { x: 0, y: -40 * k }], 7, '#c9d6d0');
                for (let i = -1; i <= 1; i++) R.limb(ctx, [{ x: 0, y: -40 * k }, { x: i * 6, y: -52 * k }], 3, '#c9d6d0');
                ctx.restore();
              }
              ctx.globalAlpha = 0.4 * k; R.ellipse(ctx, 0, 0, 34, 8, 0, '#3aff7a', false);
              ctx.restore();
            }
          });
        }
      },
      down_air: {
        frames: 42, pose: 'dair', landingLag: 16, kind: 'air',
        hitboxes: [
          { f: [10, 15], x: 20, y: 14, r: 26, dmg: 12, ang: 275, bkb: 25, kbg: 85, effect: 'dark', meteor: true },
          { f: [10, 15], x: 0, y: -20, r: 20, dmg: 8, ang: 361, bkb: 30, kbg: 70, effect: 'dark' }]
      }
    }
  });

})(window.NX = window.NX || {});
