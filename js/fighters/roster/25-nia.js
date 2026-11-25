/* NEXUS CLASH — js/fighters/roster/25-nia.js · luchador 25 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, hairCap, earsRound, headband, tail, rockDraw, flameDraw, fighter, swapMove } = NX.RosterLib;

  /* ======================================================================
   * ================ V3 · LUCHADORES MULTIFORMA (1 slot cada uno) ========
   * Un slot con `forms: [...]` agrupa varias formas completas. El especial
   * Abajo cambia de forma conservando daño, vidas y posición (swapMove, en lib.js).
   * ==================================================================== */

  /* ------------------------- NIA · DOMADORA DE BESTIAS ------------------- */
  const NIA_TRAINER = {
    id: 'nia_trainer', name: 'Nia',
    palette: { primary: '#2a7a5a', secondary: '#d8c08a', skin: '#e8b890', head: '#e8b890', hand: '#e8b890', arms: '#2a7a5a', legs: '#d8c08a', feet: '#5a3a2a', accent: '#ff6a3a', hair: '#3a2418', eye: '#2a1a10', belt: '#5a3a2a' },
    stats: { height: 66, width: 28 },
    rig: {
      headR: 12, torsoW: 18, hipW: 16, torsoH: 22, thigh: 13, shin: 13, armW: 5.5,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, sw = Math.sin(a.f.tick * 0.15) * 3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.6); ctx.quadraticCurveTo(-r * 1.9, -r * 0.4 + sw, -r * 1.5 + sw, r * 1.0); ctx.quadraticCurveTo(-r * 1.2, 0, -r * 0.5, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        head(ctx, a) { hairCap(ctx, a.rig.headR, a.pal.hair); headband(ctx, a.rig.headR, '#ff6a3a', a.f.tick, 0); },
        back(ctx, a) { const s = a.J.sh; R.poly(ctx, [[s.x - 12, s.y], [s.x - 2, s.y], [s.x - 2, s.y + 18], [s.x - 12, s.y + 16]], '#8a5a3a'); },
        torso(ctx, a) { const r = a.rig; ctx.fillStyle = a.pal.accent; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH, r.torsoW, 4); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(r.torsoW * 0.2, -r.torsoH * 0.6, 2.5, 0, TAU); ctx.fill(); }
      }
    }
  };
  function trainerTick(f) {
    const m = f.match, main = m.stagePlatforms[0];
    const tr = f.data.trainer || (f.data.trainer = { x: U.clamp(f.x - f.facing * 90, main.x + 30, main.x + main.w - 30), y: main.y, vx: 0, facing: f.facing, dummy: null });
    let tx = f.inPlay() ? f.x - f.facing * 90 : main.x + main.w / 2;
    tx = U.clamp(tx, main.x + 30, main.x + main.w - 30);
    const dx = tx - tr.x;
    tr.vx = Math.abs(dx) > 10 ? U.approach(tr.vx, Math.sign(dx) * 5.2, 0.6) : U.approach(tr.vx, 0, 0.8);
    tr.x += tr.vx; tr.y = main.y;
    if (f.inPlay()) tr.facing = Math.sign(f.x - tr.x) || tr.facing;
  }
  function beastOverlay(ctx, f) {
    const mv = f.move, tr = f.data.trainer;
    if (!mv || mv.def.key !== 'special_down' || !tr) return;
    const k = Math.sin(Math.min(1, mv.frame / 30) * PI);
    ctx.save(); ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#ff6a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tr.x + tr.facing * 10, tr.y - 50); ctx.quadraticCurveTo((tr.x + f.x) / 2, Math.min(tr.y, f.y) - 120, f.x, f.y - f.h / 2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  const beastSwap = () => swapMove({ color: '#ff6a3a' });

  const BRISA = {
    id: 'nia_brisa', name: 'Brisa', title: 'Hurón del Viento',
    passive: 'La bestia más ligera y rápida de Nia.',
    palette: { primary: '#e8dcc0', secondary: '#3ab8b0', skin: '#e8dcc0', head: '#e8dcc0', hand: '#e8dcc0', arms: '#e8dcc0', legs: '#e8dcc0', feet: '#c8b898', accent: '#7affd6', eye: '#1b1b1b', belly: '#fff8e8' },
    stats: { weight: 72, height: 62, width: 30, walk: 3.6, run: 8.8, dash: 9.4, airSpeed: 4.5, gravity: 0.62, fall: 10.5, fastFall: 16, jump: 13.4, shortHop: 8.4, airJump: 12.2, traction: 0.55 },
    profile: { style: 'fist', reach: 0.95, power: 0.88, speed: 1.18, effect: 'wind' },
    ai: { recovery: 'up', projectile: 'neutral', range: 60, rushdown: true },
    onUpdate: trainerTick, drawOverlay: beastOverlay,
    rig: {
      headR: 12, headW: 1.15, torsoW: 18, hipW: 16, torsoH: 20, thigh: 11, shin: 10, legW: 8, armW: 6, upperArm: 10, foreArm: 9, handR: 4.5, footL: 9, belly: '#fff8e8',
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          earsRound(ctx, r * 0.85, a.pal.head, '#f2b8b0');
          R.ellipse(ctx, r * 1.05, r * 0.18, r * 0.2, r * 0.16, 0, '#3a2a2a');
          ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1;
          for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(r * 0.85, r * 0.35); ctx.lineTo(r * 1.5, r * 0.3 + i * 4); ctx.stroke(); }
          ctx.fillStyle = a.pal.secondary; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.75, r * 0.5, r * 0.2, -0.2, 0, TAU); ctx.fill();
        },
        tail(ctx, a) { tail(ctx, a, 'thick', a.pal.primary, a.pal.secondary); },
        back(ctx, a) { const t = a.J.top; R.poly(ctx, [[t.x - 2, t.y + 2], [t.x - 14, t.y - 4], [t.x - 10, t.y + 8]], a.pal.secondary); },
        torso(ctx, a) { const r = a.rig; ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.95, r.torsoW, 3); }
      }
    },
    specials: {
      neutral: {
        frames: 32, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 9) return;
          NX.Audio.play('spin', { pitch: 1.4 });
          shoot(f, { ox: 24, oy: -f.h * 0.5, speed: 9, r: 18, life: 30, dmg: 4, ang: 50, bkb: 30, kbg: 40, effect: 'wind', color: '#7affd6', glow: false,
            update(p) { p.vx *= 0.97; },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.4); ctx.globalAlpha = Math.min(1, p.life / 8);
              ctx.strokeStyle = '#e8fff6'; ctx.lineWidth = 3;
              for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, p.r * (0.4 + i * 0.25), i * 2, i * 2 + 3.5); ctx.stroke(); }
              ctx.restore();
            } });
        }
      },
      side: {
        frames: 36, pose: 'dashattack', oncePerAir: true, drift: 0,
        vel: [{ f: [6, 14], vx: 13, vy: 0 }],
        hitboxes: [{ f: [6, 14], x: 14, y: -30, r: 18, dmg: 7, ang: 45, bkb: 40, kbg: 65, effect: 'wind' }],
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('dash'); if (fr >= 6 && fr <= 14) f.fx('dust', f.x - f.facing * 12, f.y - f.h * 0.4, { n: 1 }); }
      },
      up: {
        frames: 44, pose: 'spin', vel: [{ f: [4, 20], vy: -13, vx: 2 }],
        hitboxes: [
          { f: [4, 18], x: 0, y: -34, r: 24, dmg: 1.5, rehit: 4, fkb: 30, bkb: 0, kbg: 100, ang: 85, effect: 'wind', dir: 'auto' },
          { f: [19, 21], x: 0, y: -36, r: 28, dmg: 4, ang: 80, bkb: 45, kbg: 80, effect: 'wind', group: 1, dir: 'auto' }],
        onFrame(f, fr) { if (fr % 6 === 4 && fr <= 20) NX.Audio.play('spin', { pitch: 1.6 }); }
      },
      down: beastSwap()
    }
  };

  const TERRO = {
    id: 'nia_terro', name: 'Terro', title: 'Armadillo de Piedra',
    passive: 'La bestia equilibrada de Nia: rueda y levanta pilares.',
    palette: { primary: '#a88a5a', secondary: '#6a5034', skin: '#d8b890', head: '#a88a5a', hand: '#6a5034', arms: '#d8b890', legs: '#a88a5a', feet: '#6a5034', accent: '#e8c35a', eye: '#1b1b1b', belly: '#e8d4b0' },
    stats: { weight: 100, height: 74, width: 40, run: 6.4, dash: 7.0, airSpeed: 3.7, gravity: 0.6, fall: 10.5, jump: 12.8, airJump: 11.8 },
    profile: { style: 'fist', reach: 1, power: 1.02, speed: 1 },
    ai: { recovery: 'up', projectile: 'neutral', range: 75 },
    onUpdate: trainerTick,
    drawOverlay(ctx, f) {
      beastOverlay(ctx, f);
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_up' || !mv.data.base) return;
      const b = mv.data.base, k = Math.min(1, mv.frame / 8) * Math.min(1, (40 - mv.frame) / 10);
      if (k <= 0) return;
      const top = Math.min(b.y, f.y + 4);
      ctx.save(); ctx.globalAlpha = k;
      R.poly(ctx, [[b.x - 22, b.y], [b.x + 22, b.y], [b.x + 16, top], [b.x - 16, top]], '#8a6a48');
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2;
      for (let y = b.y - 20; y > top; y -= 22) { ctx.beginPath(); ctx.moveTo(b.x - 18, y); ctx.lineTo(b.x + 18, y + 4); ctx.stroke(); }
      ctx.restore();
    },
    rig: {
      headR: 12, headW: 1.2, torsoW: 30, hipW: 28, torsoH: 24, torsoRound: 12, thigh: 11, shin: 10, legW: 11, armW: 9, upperArm: 11, foreArm: 10, handR: 6, footL: 12, belly: '#e8d4b0',
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          [[-0.1, 0.15], [-0.55, -0.15]].forEach(([dx, rot]) => { ctx.save(); ctx.translate(r * dx, -r * 0.8); ctx.rotate(rot); R.ellipse(ctx, 0, -r * 0.5, r * 0.2, r * 0.55, 0, a.pal.head); ctx.restore(); });
          R.ellipse(ctx, r * 0.95, r * 0.25, r * 0.5, r * 0.26, 0.15, '#d8b890');
          R.disc(ctx, r * 1.4, r * 0.2, 2.5, '#3a2a2a', false);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 0.9, -r * 0.55, r * 1.5, r * 0.15);
        },
        back(ctx, a) {
          const { J } = a;
          ctx.save(); ctx.translate(J.hip.x - 6, J.hip.y - 14); ctx.rotate(J.lean);
          for (let i = 0; i < 4; i++) { R.ellipse(ctx, -4, -i * 7, 18 - i * 2, 8, 0, i % 2 ? '#a88a5a' : '#8a6a48'); }
          ctx.restore();
        },
        tail(ctx, a) { tail(ctx, a, 'stub', '#8a6a48'); }
      }
    },
    specials: {
      neutral: {
        frames: 38, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 14) return;
          NX.Audio.play('swing', { size: 1.2 });
          shoot(f, { ox: 18, oy: -f.h * 0.9, speed: 7.5, vy: -5, gravity: 0.35, maxFall: 13, r: 12, dmg: 9, ang: 45, bkb: 35, kbg: 65, life: 90, effect: 'heavy', destructible: false, glow: false,
            draw: rockDraw('#8a6a48'), onDestroy(p, w, m) { m.effects.spawn('debris', p.x, p.y, { n: 6, color: '#8a6a48' }); } });
        }
      },
      side: {
        frames: 44, pose: 'ball', oncePerAir: true, drift: 0, gravity: 0.6,
        vel: [{ f: [6, 30], vx: 9.5 }],
        hitboxes: [{ f: [6, 30], x: 0, y: -24, r: 26, dmg: 10, ang: 45, bkb: 45, kbg: 70, effect: 'heavy' }],
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('spin', { pitch: 0.7 }); if (f.ground && fr >= 6 && fr <= 30 && fr % 3 === 0) f.fx('dust', f.x - f.facing * 10, f.y, { n: 1 }); }
      },
      up: {
        frames: 46, pose: 'rise', vel: [{ f: [6, 18], vy: -15, vx: 1 }],
        hitboxes: [{ f: [5, 10], x: 0, y: 0, r: 30, dmg: 9, ang: 88, bkb: 55, kbg: 70, effect: 'heavy', dir: 'auto' }],
        onStart(f, mv) {
          const pl = f.ground || null;
          mv.data.base = { x: f.x, y: pl ? pl.y : f.y + 60 };
          NX.Audio.play('stomp'); f.fx('debris', f.x, f.y, { n: 8, color: '#8a6a48' });
        }
      },
      down: beastSwap()
    }
  };

  function lavaPuddle(owner, x, y) {
    return owner.spawnProjectile({
      x, y: y - 8, vx: 0, vy: 0, r: 26, life: 120, dmg: 3, ang: 80, fkb: 30, bkb: 0, kbg: 100, rehit: 20, pierce: true, hits: 99,
      effect: 'fire', burn: { frames: 60, dmg: 1 }, stageCollide: false, reflectable: false, absorbable: false, destructible: false, transcendent: true, glow: false,
      draw(ctx, p) {
        const k = Math.min(1, p.t / 6, p.life / 20);
        ctx.save(); ctx.globalAlpha = k;
        const g = ctx.createRadialGradient(p.x, p.y + 6, 2, p.x, p.y + 6, 30);
        g.addColorStop(0, '#fff2a0'); g.addColorStop(0.4, '#ff8a2a'); g.addColorStop(1, 'rgba(160,30,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 30, 8, 0, 0, TAU); ctx.fill();
        ctx.restore();
        if (p.t % 7 === 0) p.match.effects.spawn('flame', p.x + U.rand(-18, 18), p.y);
      }
    });
  }
  const RESCOLDO = {
    id: 'nia_rescoldo', name: 'Rescoldo', title: 'Rinoceronte de Magma',
    passive: 'La bestia más pesada de Nia: lava y cargas con armadura.',
    palette: { primary: '#3a2a2a', secondary: '#ff6a1a', skin: '#4a3434', head: '#4a3434', hand: '#3a2a2a', arms: '#4a3434', legs: '#3a2a2a', feet: '#2a1a1a', accent: '#ffb02e', eye: '#ffd23a', belly: '#5a3a30' },
    stats: { weight: 128, height: 100, width: 50, walk: 2.4, run: 5.8, dash: 6.3, airSpeed: 3.4, gravity: 0.62, fall: 11, fastFall: 15.5, jump: 13.4, shortHop: 8.6, airJump: 12.2, traction: 0.6 },
    profile: { style: 'heavy', reach: 1.1, power: 1.12, speed: 0.92, effect: 'fire' },
    ai: { recovery: 'up', projectile: 'neutral', range: 80, heavy: true },
    onUpdate: trainerTick, drawOverlay: beastOverlay,
    rig: {
      torsoW: 40, hipW: 34, torsoH: 30, torsoRound: 12, headR: 14, headW: 1.25, neck: 0, armW: 13, upperArm: 15, foreArm: 14, handR: 8,
      thigh: 14, shin: 12, legW: 15, footL: 14, footH: 8, eyes: 'glow', brows: true, mouth: false, belly: '#5a3a30',
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[r * 0.8, r * 0.05], [r * 1.6, -r * 0.9], [r * 1.2, r * 0.25]], '#e8dcc0');
          R.poly(ctx, [[r * 0.45, -r * 0.4], [r * 0.75, -r * 1.05], [r * 0.8, -r * 0.35]], '#c8bca0');
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(-r * 0.3, r * 0.1); ctx.lineTo(-r * 0.5, r * 0.5); ctx.stroke();
          [[-0.2, -0.85], [-0.7, -0.6]].forEach(([dx, dy]) => R.poly(ctx, [[r * dx - 4, r * dy + 4], [r * dx, r * dy - 7], [r * dx + 4, r * dy + 4]], a.pal.head));
        },
        back(ctx, a) {
          const { J, f } = a;
          for (let i = 0; i < 4; i++) {
            const x = J.top.x - 6 - i * 7, y = J.top.y + 2 + i * 8;
            R.poly(ctx, [[x - 5, y + 6], [x - 3, y - 12], [x + 5, y + 6]], '#2a1a1a');
            ctx.fillStyle = U.rgba('#ff8a2a', 0.6 + 0.4 * Math.sin(f.tick * 0.12 + i)); ctx.beginPath(); ctx.arc(x - 3, y - 10, 2.5, 0, TAU); ctx.fill();
          }
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 2; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(a.f.tick * 0.1);
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.2, -r.torsoH * 0.9); ctx.lineTo(0, -r.torsoH * 0.55); ctx.lineTo(-r.torsoW * 0.1, -r.torsoH * 0.2); ctx.stroke();
          ctx.globalAlpha = 1;
        },
        tail(ctx, a) { tail(ctx, a, 'stub', '#3a2a2a'); }
      }
    },
    specials: {
      neutral: {
        frames: 44, pose: 'roar',
        onFrame(f, fr) {
          if (fr !== 16) return;
          NX.Audio.play('fire', { pitch: 0.6 });
          [5.5, 3.5].forEach((sp, i) => shoot(f, {
            ox: 26, oy: -f.h * 0.75, speed: sp, vy: -6 - i, gravity: 0.4, maxFall: 13, r: 10, dmg: 7, ang: 60, bkb: 35, kbg: 55, life: 100, effect: 'fire',
            passCollide: true, color: '#ff8a2a', glow: false, draw: flameDraw('#ff8a2a'),
            onGround(p, pl) { lavaPuddle(p.owner, p.x, pl.y); p.destroy('lava'); }
          }));
        }
      },
      side: {
        frames: 52, pose: 'dashattack', oncePerAir: true, drift: 0, gravity: 0.35,
        armor: { f: [6, 26], kb: 100 }, vel: [{ f: [8, 26], vx: 9 }],
        hitboxes: [{ f: [8, 26], x: 34, y: -42, r: 26, dmg: 14, ang: 40, bkb: 55, kbg: 82, effect: 'fire' }],
        onFrame(f, fr) { if (fr === 8) NX.Audio.play('dash'); if (fr >= 8 && fr <= 26 && fr % 2 === 0) f.fx('flame', f.x - f.facing * 24, f.y - f.h * 0.3, { scale: 1.2 }); }
      },
      up: {
        frames: 52, pose: 'rise', vel: [{ f: [6, 20], vy: -13, vx: 1.2 }],
        hitboxes: [{ f: [5, 11], x: 0, y: 0, r: 36, dmg: 11, ang: 85, bkb: 60, kbg: 70, effect: 'fire', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr === 5) { NX.Audio.play('explosion', { pitch: 0.7 }); f.fx('explosion', f.x, f.y, { r: 50 }); }
          if (fr >= 6 && fr <= 20) f.fx('flame', f.x + U.rand(-16, 16), f.y + 6, { scale: 1.5 });
        }
      },
      down: beastSwap()
    }
  };

  fighter({
    id: 'nia', name: 'Nia', title: 'Domadora de Bestias',
    passive: 'Tres bestias en un slot (Brisa ⇄ Terro ⇄ Rescoldo). Abajo + K las cambia; al perder una vida sale la siguiente.',
    forms: [BRISA, TERRO, RESCOLDO], portraitForm: 0,
    onRespawn(f) { f.setForm(f.formIndex + 1); },
    drawBackdrop(ctx, f) {
      const tr = f.data.trainer;
      if (!tr) return;
      const d = tr.dummy || (tr.dummy = R.makeDummy(NIA_TRAINER));
      d.x = tr.x; d.y = tr.y; d.facing = tr.facing; d.tick = f.tick;
      const swapping = f.move && f.move.def.key === 'special_down';
      d.state = swapping ? ST.VICTORY : (Math.abs(tr.vx) > 1 ? ST.RUN : ST.IDLE);
      d.stateTime = swapping ? f.move.frame : 60;
      ctx.save(); ctx.globalAlpha = 0.93;
      R.drawFighter(ctx, d, { noTrail: true });
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(tr.x, tr.y - d.h - 12, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  });
})(window.NX = window.NX || {});
