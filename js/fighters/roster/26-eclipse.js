/* NEXUS CLASH — js/fighters/roster/26-eclipse.js · luchador 26 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, hairCap, windOf, cape, orbDraw, fighter, swapMove } = NX.RosterLib;

  /* --------------------- SOL Y LUNA · ESPADAS DEL ECLIPSE ---------------- */
  const SOL = {
    id: 'eclipse_sol', name: 'Sol', title: 'Espada del Mediodía',
    passive: 'Forma de potencia: golpes lentos y devastadores.',
    palette: { primary: '#8a1a1a', secondary: '#e8a83a', skin: '#c8885a', head: '#c8885a', hand: '#3a1a1a', arms: '#8a1a1a', legs: '#3a1a1a', feet: '#2a1010', accent: '#ffb02e', hair: '#1a1010', eye: '#5a1a0a', belt: '#e8a83a' },
    stats: { weight: 98, height: 86, width: 34, walk: 2.9, run: 6.6, dash: 7.2, airSpeed: 3.6, gravity: 0.6, fall: 10, jump: 13, shortHop: 8.5, airJump: 12 },
    profile: { style: 'sword', reach: 1.25, power: 1.18, speed: 0.88, effect: 'fire' },
    ai: { recovery: 'up', projectile: 'side', range: 105, sword: true },
    onLifeReset(f) { f.data.bladeOut = false; },
    rig: {
      headR: 11.5, torsoW: 22, hipW: 20, torsoH: 26, armW: 7.5,
      weapon: { type: 'sword', len: 54, w: 12, trail: '#ffb02e' },
      parts: {
        headBack(ctx, a) { const r = a.rig.headR; R.disc(ctx, -r * 0.75, -r * 0.5, r * 0.35, a.pal.hair); R.disc(ctx, -r * 1.0, -r * 0.1, r * 0.28, a.pal.hair); },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.4 });
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.03, PI * 1.15, PI * 1.85); ctx.stroke();
          R.poly(ctx, [[r * 0.35, -r * 0.95], [r * 0.48, -r * 1.15], [r * 0.6, -r * 0.95], [r * 0.48, -r * 0.8]], '#ff3a2a');
        },
        back(ctx, a) { cape(ctx, a, '#5a0a0a', 38, 11, '#ff8a2a'); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.4, -r.torsoH * 0.9); ctx.lineTo(0, -r.torsoH * 0.55); ctx.lineTo(r.torsoW * 0.4, -r.torsoH * 0.9); ctx.stroke();
          R.disc(ctx, 0, -r.torsoH * 0.55, 3.5, '#ff3a2a');
          R.poly(ctx, [[-r.hipW * 0.5, -4], [r.hipW * 0.5, -4], [r.hipW * 0.65, 12], [-r.hipW * 0.65, 12]], a.pal.primary);
        },
        weapon(ctx, f, w) {
          if (f.data && f.data.bladeOut) return;
          ctx.fillStyle = '#3a1a1a'; ctx.fillRect(-2.5, -10, 5, 12);
          R.poly(ctx, [[-10, 2], [10, 2], [8, 7], [-8, 7]], '#e8a83a');
          R.poly(ctx, [[-6, 7], [7, 7], [12, w.len * 0.55], [4, w.len], [-2, w.len * 0.92], [-7, w.len * 0.5]], '#cfc6c0');
          ctx.strokeStyle = U.rgba('#ff8a2a', 0.9); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(3, w.len * 0.85); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 44, pose: 'charge', charge: { at: 8, max: 60, key: 'special', mult: 1.6 },
        hitboxes: [{ f: [12, 16], x: 0, y: -44, r: 56, dmg: 12, ang: 70, bkb: 50, kbg: 85, effect: 'fire', dir: 'auto' }],
        onCharge(f, mv) { if (mv.charge % 3 === 0) f.fx('flame', f.x + U.rand(-30, 30), f.y - U.rand(0, f.h), { scale: 1 + mv.charge / 60 }); },
        onRelease(f) { NX.Audio.play('explosion', { pitch: 0.9 }); f.fx('explosion', f.x, f.y - f.h * 0.45, { r: 60 }); }
      },
      side: {
        frames: 36, pose: 'overhead',
        canUse: f => !f.data.bladeOut,
        onFrame(f, fr) {
          if (fr !== 12) return;
          f.data.bladeOut = true;
          NX.Audio.play('slash', { pitch: 0.7 });
          shoot(f, {
            ox: 30, oy: -f.h * 0.6, speed: 10, r: 22, life: 170, dmg: 2.5, ang: 55, bkb: 25, kbg: 40, rehit: 11, pierce: true, hits: 99,
            effect: 'fire', reflectable: false, absorbable: false, destructible: false, stageCollide: false, glow: false, data: { phase: 0 },
            update(p) {
              const o = p.owner;
              if (!o.inPlay()) { p.destroy('owner'); return false; }
              if (p.data.phase === 0) { p.vx *= 0.9; p.vy = 0; if (Math.abs(p.vx) < 1.2) { p.data.phase = 1; p.data.t0 = p.t; } }
              else if (p.data.phase === 1) { p.vx = 0; if (p.t - p.data.t0 > 26) p.data.phase = 2; }
              else {
                const tx = o.x, ty = o.y - o.h * 0.6, a = Math.atan2(ty - p.y, tx - p.x);
                p.vx = Math.cos(a) * 11; p.vy = Math.sin(a) * 11;
                if (U.dist(p.x, p.y, tx, ty) < 30) { p.destroy('caught'); return false; }
              }
            },
            onDestroy(p) { p.owner.data.bladeOut = false; },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.5);
              ctx.globalAlpha = 0.5; R.disc(ctx, 0, 0, p.r, '#ff8a2a', false); ctx.globalAlpha = 1;
              R.poly(ctx, [[-4, -24], [4, -24], [8, 0], [2, 24], [-6, 4]], '#cfc6c0');
              ctx.fillStyle = '#e8a83a'; ctx.fillRect(-8, -26, 16, 4);
              ctx.restore();
            }
          });
        }
      },
      up: {
        frames: 60, pose: 'rise', drift: 0.6, helplessLag: 22,
        hitboxes: [
          { f: [5, 16], x: 10, y: -80, r: 26, dmg: 7, ang: 85, bkb: 50, kbg: 60, effect: 'fire' },
          { f: [25, 40], x: 6, y: 4, r: 28, dmg: 10, ang: 70, bkb: 45, kbg: 70, effect: 'fire', group: 1 }],
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 18) { f.vy = -14; mv.velY = true; if (fr === 5) NX.Audio.play('slash', { pitch: 0.8 }); }
          else if (fr > 18 && fr < 25) { f.vy = 0; mv.velY = true; }
          else if (fr >= 25) {
            f.vy = 15; mv.velY = true; mv.data.dive = true;
            if (fr % 2 === 0) f.fx('flame', f.x, f.y, { scale: 1.3 });
            if (fr >= 40 && !f.ground) mv.frame = 39;
          }
        },
        onLand(f, mv) {
          if (mv.data.dive) boom(f, f.x, f.y - 12, { r: 52, dmg: 8, ang: 70, bkb: 50, kbg: 60, effect: 'fire' });
          f.endMoveCleanup(true); f.startLand(mv.data.dive ? 20 : 12);
          return 'continue';
        }
      },
      down: swapMove({ color: '#c8b0ff', at: 10, frames: 30 })
    }
  };

  const LUNA = {
    id: 'eclipse_luna', name: 'Luna', title: 'Espada de Medianoche',
    passive: 'Forma veloz. Previsión: esquivar justo antes de un golpe ralentiza a los rivales.',
    palette: { primary: '#f4f1fa', secondary: '#7a5ac8', skin: '#f2dcd0', head: '#f2dcd0', hand: '#7a5ac8', arms: '#f4f1fa', legs: '#3a2a5a', feet: '#7a5ac8', accent: '#c8b0ff', hair: '#c8b0ff', eye: '#5a3aa8', belt: '#7a5ac8' },
    stats: { weight: 86, height: 84, width: 30, walk: 3.4, run: 8.6, dash: 9.2, airSpeed: 4.3, gravity: 0.62, fall: 10.8, fastFall: 16, jump: 14.5, shortHop: 9.2, airJump: 13.2, traction: 0.6 },
    profile: { style: 'sword', reach: 1.12, power: 0.86, speed: 1.2, effect: 'magic' },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 85, rushdown: true, sword: true },
    onUpdate(f) {
      const m = f.match, dodging = f.state === ST.DODGE || f.state === ST.AIRDODGE;
      if (!dodging) f.data.fsUsed = false;
      else if (!f.data.fsUsed && f.stateTime <= 10) {
        const hr = f.hurtRect(), pad = 10;
        let danger = false;
        for (const o of f.opponents()) {
          const boxes = []; o.collectHitboxes(boxes);
          if (boxes.some(b => NX.Physics.circleRect(b.x, b.y, b.r + pad, hr.x, hr.y, hr.w, hr.h))) { danger = true; break; }
        }
        if (!danger) danger = m.projectiles.some(p => p.active && !p.harmless && p.owner !== f && NX.Physics.circleRect(p.x, p.y, p.r + pad, hr.x, hr.y, hr.w, hr.h));
        if (danger) {
          f.data.fsUsed = true; f.data.foresight = 80;
          f.fx('text', f.x, f.y - f.h - 18, { text: '¡PREVISIÓN!', color: '#c8b0ff', size: 22 });
          f.fx('flash', 0, 0, { color: '#7a5ac8', alpha: 0.3, life: 12 });
          NX.Audio.play('reflect');
        }
      }
      if (f.data.foresight > 0) {
        f.data.foresight--;
        for (const t of f.opponents()) if (m.frame % 2 === 0) t.hitlag = Math.max(t.hitlag, 1);
        for (const q of m.projectiles) if (q.active && q.owner !== f) { q.x -= q.vx * 0.5; q.y -= q.vy * 0.5; }
        if (f.tick % 5 === 0) f.fx('sparkle', f.x, f.y - f.h / 2, { color: '#c8b0ff' });
      }
    },
    onLifeReset(f) { f.data.foresight = 0; },
    rig: {
      headR: 11.5, torsoW: 18, hipW: 16, torsoH: 25, armW: 6,
      weapon: { type: 'sword', len: 50, w: 4, color: '#e8e0ff', glow: '#c8b0ff', trail: '#d8c8ff', guard: '#7a5ac8', hilt: '#3a2a5a', taper: 0.5 },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 1.0); ctx.quadraticCurveTo(-r * 1.6, -r * 0.8, -r * 1.2, r * 0.9); ctx.lineTo(-r * 0.2, r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.1 });
          ctx.save(); ctx.translate(-r * 0.3, -r * 0.85); NX.drawStar(ctx, 0, 0, 5, '#fff3a0', 4); ctx.restore();
        },
        back(ctx, a) {
          const { J, f } = a, w = windOf(f);
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 2; i++) {
            ctx.strokeStyle = i ? '#c8b0ff' : '#7a5ac8'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(J.hip.x - 4, J.hip.y - 6);
            ctx.quadraticCurveTo(J.hip.x - 20 - w, J.hip.y + 4 + i * 6, J.hip.x - 30 - w * 1.4, J.hip.y + 16 + Math.sin(f.tick * 0.2 + i) * 4); ctx.stroke();
          }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 4);
          R.poly(ctx, [[-r.hipW * 0.5, -4], [r.hipW * 0.5, -4], [r.hipW * 0.6, 10], [-r.hipW * 0.6, 10]], a.pal.primary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.35, -r.torsoH); ctx.lineTo(r.torsoW * 0.1, -r.torsoH * 0.4); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, vel: [{ f: [4, 8], vx: 6 }],
        poseFn(f, mv, k, POSES) {
          if (mv.frame >= 6 && mv.frame <= 27) return { aF1: 1.3 + Math.sin(mv.frame * 1.3) * 0.7, aF2: 0, wpn: 0, lean: 0.25, lF1: 0.7, lB1: -0.6 };
          return k < 1 ? POSES.jab.wind : POSES.jab.strike;
        },
        hitboxes: [
          { f: [6, 24], x: 42, y: -46, r: 26, dmg: 1.4, rehit: 3, fkb: 20, bkb: 0, kbg: 100, ang: 361, effect: 'magic' },
          { f: [28, 30], x: 46, y: -46, r: 30, dmg: 5, ang: 40, bkb: 55, kbg: 80, effect: 'magic', group: 1 }],
        onFrame(f, fr, mv) {
          if (fr % 3 === 0 && fr >= 6 && fr <= 24) NX.Audio.play('slash', { pitch: 1.4 + Math.random() * 0.3 });
          if (fr >= 10 && fr <= 24 && f.input.pressed('special') && (mv.data.ext || 0) < 24) { f.input.consume('special'); mv.frame -= 4; mv.data.ext = (mv.data.ext || 0) + 4; }
        }
      },
      side: {
        frames: 40, intangible: [4, 16], oncePerAir: true, drift: 0,
        poseFn() { return { lean: 0.6, aF1: 1.6, aF2: 0, wpn: 0, lF1: 1.0, lB1: -0.9, planted: false }; },
        onFrame(f, fr, mv) {
          if (fr === 5) { NX.Audio.play('magic', { pitch: 2 }); f.fx('ring', f.x, f.y - f.h / 2, { r: 36, color: '#c8b0ff' }); }
          if (fr >= 6 && fr <= 14) {
            f.hidden = true; f.vx = f.facing * 20; f.vy = 0; mv.velX = mv.velY = true;
            mv.extraBoxes = [{ x: -26, y: -42, r: 32, dmg: 7, ang: 50, bkb: 40, kbg: 70, effect: 'magic' }];
            f.match.effects.list.push({ type: 'wisp', x: f.x, y: f.y - f.h / 2, vx: 0, vy: 0, life: 14, max: 14, size: 14, color: '#c8b0ff' });
          } else if (fr === 15) {
            f.hidden = false; f.vx = f.facing * 3; mv.extraBoxes = null;
            f.fx('ring', f.x, f.y - f.h / 2, { r: 40, color: '#ffffff' }); NX.Audio.play('slash', { pitch: 1.6 });
          }
        },
        onEnd(f) { f.hidden = false; }
      },
      up: {
        frames: 54, pose: 'rise', vel: [{ f: [4, 16], vy: -13.5, vx: 1.5 }, { f: [18, 24], vy: 0 }],
        hitboxes: [{ f: [4, 10], x: 10, y: -78, r: 22, dmg: 5, ang: 85, bkb: 45, kbg: 60, effect: 'magic' }],
        onFrame(f, fr) {
          if (fr === 4) NX.Audio.play('magic', { pitch: 1.5 });
          if (fr !== 20) return;
          NX.Audio.play('beam', { pitch: 1.8 });
          [55, 72, 89].forEach(deg => {
            const a = deg * PI / 180;
            shoot(f, { ox: 10, oy: -f.h * 0.5, speed: 0, vx: Math.cos(a) * 15 * f.facing, vy: Math.sin(a) * 15, r: 9, life: 34, dmg: 5, ang: 60, bkb: 30, kbg: 50,
              effect: 'magic', color: '#c8b0ff', trail: 6, reflectable: true, draw: orbDraw('#c8b0ff', '#ffffff') });
          });
        }
      },
      down: swapMove({ color: '#ff8a2a', at: 10, frames: 30 })
    }
  };

  fighter({
    id: 'eclipse', name: 'Sol y Luna', title: 'Espadas del Eclipse',
    passive: 'Dos espadachinas en un slot. Abajo + K alterna entre Sol (potencia) y Luna (velocidad, Previsión).',
    forms: [SOL, LUNA], portraitForm: 0
  });

})(window.NX = window.NX || {});
