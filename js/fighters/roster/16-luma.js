/* NEXUS CLASH — js/fighters/roster/16-luma.js · luchador 16 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, nearestFoe, steer, hood, cape, flameDraw, fighter } = NX.RosterLib;

  /* ======================================================================
   * 16 · LUMA — Farolera de Ascuas (invocadora con medidor)
   * Medidor LLAMA: lleno, despierta al espíritu "Fuego Fatuo" 12 s
   * (+15% daño, +8% knockback, quemaduras y disparos automáticos).
   * ==================================================================== */
  const SPIRIT_TIME = 720;
  function endSpirit(f) { f.data.spirit = 0; f.buffDamage = 0; f.buffKB = 0; }
  fighter({
    id: 'luma', name: 'Luma', title: 'Farolera de Ascuas',
    passive: 'Fuego Fatuo: con el medidor LLAMA lleno invoca a su espíritu 12 s.',
    palette: { primary: '#5a2a6b', secondary: '#2a1a2e', skin: '#f2d2b6', head: '#f2d2b6', hand: '#f2d2b6', accent: '#ffb84a', hair: '#ff6a3a', eye: '#5a2a6b', feet: '#2a1a2e', legs: '#3a1f45', arms: '#5a2a6b' },
    stats: { weight: 90, height: 80, width: 30, run: 7.6, airSpeed: 4.0, gravity: 0.56, jump: 13.4 },
    profile: { style: 'fist', reach: 1, power: 0.95, speed: 1.08, effect: 'fire' },
    meter: { max: 100, label: 'LLAMA', short: 'LLAMA', color: '#ff8a2a', gainOnHit: 1.0, text: f => f.data.spirit > 0 ? 'FUEGO FATUO' : 'LLAMA' },
    ai: { recovery: 'up', projectile: 'neutral', range: 150, absorb: 'down' },
    init(f) { f.data.spirit = 0; },
    onLifeReset(f) { endSpirit(f); },
    onDamaged(f, d) { if (!(f.data.spirit > 0)) f.addMeter(d * 0.8); },
    onMeterFull(f) {
      if (f.data.spirit > 0) return;
      f.data.spirit = SPIRIT_TIME; f.buffDamage = 1.15; f.buffKB = 1.08;
      f.fx('explosion', f.x, f.y - f.h / 2, { r: 60 });
      f.fx('text', f.x, f.y - f.h - 24, { text: '¡FUEGO FATUO!', color: '#ffb84a', size: 26 });
      NX.Audio.play('magic', { pitch: 0.6 }); NX.Audio.play('fire');
    },
    onHitConfirm(f, target, d) { if (f.data.spirit > 0 && target && target.inPlay() && !d.burn) target.applyBurn(90, 1, f); },
    onUpdate(f) {
      if (!(f.data.spirit > 0)) return;
      f.data.spirit--;
      f.meter = (f.data.spirit / SPIRIT_TIME) * f.meterMax;
      if (f.data.spirit <= 0) { endSpirit(f); f.meter = 0; f.fx('ring', f.x, f.y - f.h / 2, { r: 40, color: '#ffb84a' }); return; }
      if (f.data.spirit % 80 === 40 && f.inPlay() && f.state !== ST.RESPAWN) {
        const a = f.tick * 0.06, sx = f.x + Math.cos(a) * 44, sy = f.y - f.h - 10 + Math.sin(a * 2) * 8;
        const foe = nearestFoe(f, sx, sy, 600);
        if (foe) {
          const ang = Math.atan2(foe.y - foe.h / 2 - sy, foe.x - sx);
          f.spawnProjectile({ x: sx, y: sy, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, r: 8, life: 70, dmg: 3, ang: 45, bkb: 20, kbg: 30, effect: 'fire', burn: { frames: 60, dmg: 1 }, color: '#ffb84a', glow: false, draw: flameDraw('#ffb84a') });
          NX.Audio.play('fire', { pitch: 1.6 });
        }
      }
    },
    drawOverlay(ctx, f) {
      if (!(f.data.spirit > 0) || f.state === ST.DEAD) return;
      const a = f.tick * 0.06, x = f.x + Math.cos(a) * 44, y = f.y - f.h - 10 + Math.sin(a * 2) * 8;
      ctx.save();
      const g = ctx.createRadialGradient(x, y, 2, x, y, 26);
      g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffb84a'); g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x - 14, y + 6); ctx.quadraticCurveTo(x - 16, y - 18, x, y - 30 - Math.sin(f.tick * 0.3) * 4); ctx.quadraticCurveTo(x + 16, y - 18, x + 14, y + 6);
      ctx.quadraticCurveTo(x, y + 18, x - 14, y + 6); ctx.fill();
      ctx.fillStyle = '#5a1a0a';
      ctx.beginPath(); ctx.ellipse(x - 5, y - 4, 2.5, 4, 0, 0, TAU); ctx.ellipse(x + 5, y - 4, 2.5, 4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + 4, 3, 0, PI); ctx.fill();
      ctx.restore();
      if (f.tick % 5 === 0) f.fx('flame', x + U.rand(-6, 6), y + 4, { scale: 0.7 });
    },
    rig: {
      headR: 12, torsoW: 18, hipW: 20, torsoH: 25, thigh: 15, shin: 15, armW: 6,
      weapon: { type: 'staff', len: 40, w: 7, trail: '#ffb84a' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
          [[r * 0.6, -r * 0.55], [r * 0.85, -r * 0.2]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 4, y - 3); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x - 2, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); });
          hood(ctx, r, a.pal.primary, null);
        },
        back(ctx, a) { cape(ctx, a, a.pal.primary, 44, 13, '#ff8a2a'); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.75, 14], [-r.hipW * 0.75, 14]], a.pal.legs);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 4);
        },
        weapon(ctx, f, w) {
          R.limb(ctx, [{ x: 0, y: -14 }, { x: 0, y: w.len }], 4, '#5a3b1f');
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, w.len); ctx.lineTo(0, w.len + 8); ctx.stroke();
          const ly = w.len + 18, on = f.data.spirit > 0 ? 1 : 0.7;
          ctx.save(); ctx.globalAlpha = 0.35 * on; R.disc(ctx, 0, ly, 18, '#ffb84a', false); ctx.restore();
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-7, ly - 11, 14, 3); ctx.fillRect(-7, ly + 8, 14, 3);
          ctx.fillStyle = U.rgba('#fff0b0', 0.9 * on); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.rect(-6, ly - 8, 12, 16); ctx.fill(); ctx.stroke();
          R.ellipse(ctx, 0, ly + 1, 3, 5 + Math.sin(f.tick * 0.4), 0, '#ff8a2a', false);
        }
      }
    },
    specials: {
      neutral: {
        frames: 32, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('fire', { pitch: 1.4 });
          const n = f.data.spirit > 0 ? 2 : 1;
          for (let i = 0; i < n; i++) shoot(f, {
            ox: 26, oy: -f.h * 0.6 + i * 14, speed: 6, vy: i ? 1 : -1, r: 9, life: 90, dmg: 4, ang: 45, bkb: 25, kbg: 40, effect: 'fire',
            burn: { frames: 60, dmg: 1 }, color: '#ffb84a', glow: false, draw: flameDraw('#ffb84a'),
            update(p) { if (p.t > 8) steer(p, 0.05, 500); }
          });
        }
      },
      side: {
        frames: 40, pose: 'fsmash', vel: [{ f: [5, 10], vx: 4 }],
        hitboxes: [
          { f: [10, 14], x: 48, y: -40, r: 22, dmg: 10, ang: 361, bkb: 40, kbg: 80, effect: 'fire', burn: { frames: 120, dmg: 1 } },
          { f: [10, 14], x: 24, y: -44, r: 16, dmg: 7, ang: 361, bkb: 35, kbg: 70, effect: 'fire' }],
        onFrame(f, fr) { if (fr === 10) NX.Audio.play('fire'); }
      },
      up: {
        frames: 46, pose: 'rise', vel: [{ f: [5, 22], vy: -12.5, vx: 1 }],
        hitboxes: [
          { f: [5, 22], x: 0, y: -42, r: 24, dmg: 1.5, rehit: 4, fkb: 30, bkb: 0, kbg: 100, ang: 85, effect: 'fire', dir: 'auto' },
          { f: [23, 25], x: 0, y: -46, r: 28, dmg: 5, ang: 80, bkb: 50, kbg: 80, effect: 'fire', group: 1 }],
        onFrame(f, fr) {
          if (fr === 5) NX.Audio.play('fire');
          if (fr >= 5 && fr <= 22) f.fx('flame', f.x + U.rand(-12, 12), f.y - U.rand(0, 40), { scale: 1.1 });
        }
      },
      down: {
        frames: 44, pose: 'guard',
        absorb: { f: [6, 30], x: 0, y: -42, r: 52, mult: 1.2, onAbsorb(f) { f.addMeter(25); f.fx('text', f.x, f.y - f.h - 14, { text: '+LLAMA', color: '#ffb84a', size: 18 }); } },
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('magic', { pitch: 1.2 }); if (fr >= 6 && fr <= 30 && fr % 3 === 0) f.fx('flame', f.x + U.rand(-30, 30), f.y - U.rand(10, 70), { scale: 0.8 }); }
      }
    }
  });

})(window.NX = window.NX || {});
