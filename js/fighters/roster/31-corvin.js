/* NEXUS CLASH — js/fighters/roster/31-corvin.js · luchador 31 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, spend, hairCap, spikes, windOf, cape, orbDraw, boltDraw, flameDraw, fighter, plasmaDraw } = NX.RosterLib;

  /* ======================================================================
   * v6 · CORVIN — Estratega Arcano (táctico de tomos, kit tipo Robin)
   * Los hechizos gastan MANÁ, que se regenera solo. Trueno cargable en 4
   * niveles (Rayo · Rayo+ · Megarrayo · Gigarrayo; Escudo lo guarda),
   * Fuego Arcano (deja un pilar de fuego), Ventisca Doble (dos impulsos
   * de viento) y Sangría (agarre que drena vida). Espada rúnica eléctrica.
   * ==================================================================== */
  const MANA_MAX = 100, THUNDER_MAX = 90;
  const THUNDER_LV = [0, 22, 50, 86];
  const THUNDER_COST = [3, 6, 10, 16];
  const THUNDER_NAME = ['RAYO', 'RAYO+', 'MEGARRAYO', 'GIGARRAYO'];
  function thunderLevel(c) { let l = 0; for (let i = 0; i < 4; i++) if (c >= THUNDER_LV[i]) l = i; return l; }
  function windBladeDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.globalAlpha = Math.min(1, p.life / 8);
    ctx.fillStyle = '#b8ffcf'; ctx.strokeStyle = '#2f9a5a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.r * 1.2, 0);
    ctx.quadraticCurveTo(-p.r * 0.2, -p.r * 1.3, -p.r * 1.1, -p.r * 1.1);
    ctx.quadraticCurveTo(-p.r * 0.1, -p.r * 0.4, -p.r * 0.4, 0);
    ctx.quadraticCurveTo(-p.r * 0.1, p.r * 0.4, -p.r * 1.1, p.r * 1.1);
    ctx.quadraticCurveTo(-p.r * 0.2, p.r * 1.3, p.r * 1.2, 0);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function firePillarDraw(ctx, p) {
    const k = Math.min(1, p.t / 6, p.life / 10), h = p.data.h * k;
    ctx.save();
    const g = ctx.createLinearGradient(0, p.data.gy, 0, p.data.gy - h);
    g.addColorStop(0, 'rgba(255,90,20,.95)'); g.addColorStop(0.5, 'rgba(255,170,40,.8)'); g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(p.x - 22, p.data.gy);
    for (let i = 0; i <= 6; i++) { const yy = p.data.gy - h * i / 6; ctx.lineTo(p.x - 22 + Math.sin(p.t * 0.5 + i) * 5 + i * 1.5, yy); }
    for (let i = 6; i >= 0; i--) { const yy = p.data.gy - h * i / 6; ctx.lineTo(p.x + 22 + Math.sin(p.t * 0.5 + i + 2) * 5 - i * 1.5, yy); }
    ctx.closePath(); ctx.fill(); ctx.restore();
    if (p.t % 3 === 0) p.match.effects.spawn('flame', p.x + U.rand(-16, 16), p.data.gy - U.rand(0, h), { scale: 0.8 });
  }
  function firePillar(owner, x, gy) {
    owner.spawnProjectile({
      x, y: gy - 40, vx: 0, vy: 0, r: 26, life: 54, dmg: 1.7, ang: 88, bkb: 32, kbg: 14, effect: 'fire', rehit: 8, hits: 99,
      pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, transcendent: true, glow: false,
      data: { gy, h: 96 }, draw: firePillarDraw,
      update(p) { p.y = gy - 40; if (p.life === 6) { p.dmg = 4; p.kbg = 75; p.bkb = 45; p.hitSet.clear(); } }
    });
    NX.Audio.play('fire', { pitch: 0.7 });
  }
  fighter({
    id: 'corvin', name: 'Corvin', title: 'Estratega Arcano',
    passive: 'Tomos con MANÁ (se regenera solo). Trueno se carga en 4 niveles y se guarda con Escudo. Sangría roba vida.',
    palette: { primary: '#2b2d6e', secondary: '#1a1b44', skin: '#f0c9a4', head: '#f0c9a4', hand: '#3a2a52', arms: '#2b2d6e', legs: '#24243a', feet: '#3a2618', accent: '#e8c35a', hair: '#cfc6ff', eye: '#4a2a8a', belt: '#e8c35a' },
    stats: { weight: 95, height: 88, width: 32, walk: 2.4, run: 5.7, dash: 6.1, airSpeed: 3.2, gravity: 0.5, fall: 9.4, fastFall: 14, jump: 13.4, shortHop: 8.4, airJump: 12.4 },
    profile: { style: 'sword', reach: 1.0, power: 1.02, speed: 0.95 },
    meter: { max: MANA_MAX, start: MANA_MAX, label: 'MANÁ', short: 'MANÁ', color: '#b48aff', gainOnHit: 0.25,
      text: f => (f.data.stored || 0) > THUNDER_LV[1] ? 'MANÁ · ' + THUNDER_NAME[thunderLevel(f.data.stored)] : 'MANÁ' },
    ai: { recovery: 'up', projectile: 'neutral', range: 140, zoner: true, sword: true },
    init(f) { f.data.stored = 0; },
    onLifeReset(f) { f.data.stored = 0; f.meter = MANA_MAX; },
    onUpdate(f) {
      if (f.inPlay() && f.meter < MANA_MAX) f.meter = Math.min(MANA_MAX, f.meter + 0.055);
      if ((f.data.stored || 0) >= THUNDER_LV[3] && f.tick % 7 === 0 && f.inPlay()) f.fx('sparkle', f.x - f.facing * 10, f.y - f.h * 0.5, { color: '#ffe14a' });
    },
    rig: {
      headR: 11.5, torsoW: 23, hipW: 21, torsoH: 28, armW: 7.5, upperArm: 14, foreArm: 13, handR: 5, legW: 8.5,
      weapon: { type: 'sword', len: 46, w: 9, color: '#ffe98a', glow: '#ffe14a', guard: '#e8c35a', hilt: '#3a2a52', trail: '#ffe14a' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f);
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.4);
          ctx.quadraticCurveTo(-r * 1.6 - w * 0.3, r * 0.2, -r * 1.3 - w * 0.5, r * 1.1 + Math.sin(a.f.tick * 0.15) * 2);
          ctx.quadraticCurveTo(-r * 0.9, r * 0.5, -r * 0.4, r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.5 });
          spikes(ctx, r * 0.95, a.pal.hair, 5, 0.32, PI * 1.12, PI * 1.85);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.05, r * 0.24, 0, TAU); ctx.stroke();
        },
        back(ctx, a) { cape(ctx, a, '#1a1b44', 44, 13, '#e8c35a'); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.15, -r.torsoH); ctx.lineTo(r.torsoW * 0.18, -r.torsoH * 0.35); ctx.lineTo(r.torsoW * 0.05, -6); ctx.stroke();
          R.poly(ctx, [[-r.torsoW * 0.45, -r.torsoH * 1.02], [r.torsoW * 0.35, -r.torsoH * 1.02], [r.torsoW * 0.2, -r.torsoH * 0.82], [-r.torsoW * 0.5, -r.torsoH * 0.85]], '#3b3e8a');
          R.disc(ctx, r.torsoW * 0.22, -r.torsoH * 0.62, 2.6, '#b48aff');
        },
        front(ctx, a) {
          const h = a.J.haB, casting = a.f.move && /^special/.test(a.f.move.def.key);
          ctx.save(); ctx.translate(h.x + 2, h.y + 1); ctx.rotate(a.J.foreB * -0.4 + (casting ? -0.3 : 0.2));
          const s = casting ? 1.25 : 1;
          R.poly(ctx, [[-7 * s, -9 * s], [7 * s, -9 * s], [7 * s, 9 * s], [-7 * s, 9 * s]], '#6a2ad0');
          ctx.fillStyle = '#e8c35a'; ctx.fillRect(-7 * s, -9 * s, 2.5 * s, 18 * s);
          ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(1 * s, 0, 3.2 * s, 0, TAU); ctx.stroke();
          if (casting) { ctx.globalAlpha = 0.35; R.disc(ctx, 0, 0, 14, '#b48aff', false); }
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 30, pose: 'cast', charge: { at: 7, max: THUNDER_MAX, key: 'special', mult: 1 },
        onStart(f, mv) {
          mv.charge = Math.min(THUNDER_MAX, f.data.stored || 0);
          if (mv.charge >= THUNDER_MAX) mv.chargeDone = true;
          f.data.stored = 0;
        },
        onCharge(f, mv) {
          f.data.stored = mv.charge;
          for (let i = 1; i < 4; i++) if (mv.charge === THUNDER_LV[i]) {
            f.fx('text', f.x, f.y - f.h - 18, { text: THUNDER_NAME[i], color: '#ffe14a', size: 16 + i * 2 });
            f.fx('ring', f.x, f.y - f.h * 0.5, { r: 24 + i * 10, color: '#ffe14a' });
          }
          const I = f.input;
          if (mv.charge >= THUNDER_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.stored = mv.charge;
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          if (fr !== 9) return;
          const lv = thunderLevel(mv.charge);
          f.data.stored = 0;
          if (!spend(f, THUNDER_COST[lv])) return;
          const Y = '#ffe14a';
          if (lv === 0) {
            NX.Audio.play('elec', { pitch: 1.4 });
            shoot(f, { ox: 34, speed: 9, r: 8, life: 38, dmg: 5, ang: 50, bkb: 20, kbg: 35, effect: 'elec', color: Y, draw: boltDraw(Y, 14) });
          } else if (lv === 1) {
            NX.Audio.play('elec', { pitch: 1.0 });
            shoot(f, { ox: 34, speed: 6.5, r: 13, life: 70, dmg: 7, ang: 45, bkb: 30, kbg: 50, effect: 'elec', color: Y, draw: orbDraw(Y, '#fffbe0'),
              onDestroy(p) { if (p.data.done) return; p.data.done = true; boom(p.owner, p.x, p.y, { r: 34, dmg: 3, ang: 60, bkb: 40, kbg: 45, effect: 'elec' }); } });
          } else if (lv === 2) {
            NX.Audio.play('beam', { pitch: 1.3 });
            shoot(f, { ox: 34, speed: 17, r: 10, life: 34, dmg: 9, ang: 40, bkb: 40, kbg: 62, effect: 'elec', pierce: true, trail: 10, color: Y, draw: boltDraw(Y, 30) });
            f.fx('text', f.x, f.y - f.h - 18, { text: 'MEGARRAYO', color: Y, size: 18 });
          } else {
            NX.Audio.play('beam', { pitch: 0.7 }); f.match.camera.shake(6);
            shoot(f, { ox: 40, speed: 6, r: 26, life: 72, dmg: 1.6, ang: 70, bkb: 18, kbg: 10, effect: 'elec', pierce: true, hits: 99, rehit: 5,
              reflectable: true, color: Y, trail: 8, draw: plasmaDraw(Y, '#ffa800'),
              onDestroy(p) { if (p.data.done) return; p.data.done = true; boom(p.owner, p.x, p.y, { r: 46, dmg: 7, ang: 45, bkb: 55, kbg: 92, effect: 'elec' }); } });
            f.fx('text', f.x, f.y - f.h - 18, { text: 'GIGARRAYO', color: Y, size: 22 });
            if (!f.ground) f.vx -= f.facing * 2.5;
          }
        }
      },
      side: {
        frames: 40, pose: 'cast', gravity: 0.6,
        onFrame(f, fr) {
          if (fr !== 12 || !spend(f, 12)) return;
          NX.Audio.play('fire', { pitch: 1.2 });
          shoot(f, { ox: 34, speed: 5.5, vy: -1.5, gravity: 0.16, r: 11, life: 110, dmg: 4, ang: 80, bkb: 30, kbg: 20, effect: 'fire', passCollide: true, color: '#ff8a2a', draw: flameDraw('#ff8a2a'),
            onGround(p, pl) { const o = p.owner; p.destroy('stage'); firePillar(o, p.x, pl.y); },
            onHit(p, t) { const pl = t.ground; if (pl) firePillar(p.owner, t.x, pl.y); },
            onDestroy(p, reason) { if (reason === 'stage' || reason === 'out') return; p.match.effects.spawn('pop', p.x, p.y, { color: '#ff8a2a', r: 14 }); } });
        }
      },
      up: {
        frames: 52, pose: 'rise', helplessLag: 20, drift: 0.7,
        onStart(f, mv) { mv.data.ok = spend(f, 10); },
        onFrame(f, fr, mv) {
          if (!mv.data.ok) { if (fr === 1) f.fx('pop', f.x, f.y - f.h / 2, { color: '#b8ffcf', r: 12 }); return; }
          const blade = () => {
            NX.Audio.play('swing', { pitch: 1.3 });
            shoot(f, { ox: 10, oy: -6, speed: 0, vx: f.facing * 1.6, vy: 7.5, r: 14, life: 22, dmg: 5, ang: 80, bkb: 45, kbg: 45, effect: 'wind',
              stageCollide: false, reflectable: false, absorbable: false, glow: false, draw: windBladeDraw });
            for (let i = 0; i < 4; i++) f.fx('dust', f.x + U.rand(-14, 14), f.y + U.rand(0, 10), { n: 1, color: '#b8ffcf' });
          };
          if (fr === 4) blade();
          if (fr >= 4 && fr <= 13) { f.vy = -11.5; mv.velY = true; }
          if (fr === 20) blade();
          if (fr >= 20 && fr <= 29) { f.vy = -10; mv.velY = true; }
        }
      },
      down: {
        frames: 66, pose: 'cast', grabs: [{ f: [16, 21], x: 36, y: -46, r: 20, command: true }],
        canUse(f) { return spend(f, 22); },
        onStart(f) { NX.Audio.play('magic', { pitch: 0.8 }); },
        onGrab(f, t, mv) {
          f.capture(t, { max: 100 }); mv.data.t = t; mv.frame = 24;
          f.fx('text', t.x, t.y - t.h - 16, { text: '¡SANGRÍA!', color: '#c06aff', size: 22 });
        },
        onFrame(f, fr, mv) {
          if (fr < 16 && fr % 3 === 0) f.fx('sparkle', f.x + f.facing * 34, f.y - f.h * 0.55, { color: '#c06aff' });
          const t = mv.data.t;
          if (!t || f.captive !== t) return;
          t.x = f.x + f.facing * (f.w / 2 + t.w / 2 - 6); t.y = f.y; t.facing = -f.facing;
          if (fr >= 28 && fr <= 52 && fr % 6 === 4) {
            t.addDamage(2.4, f); f.stats.damageDealt += 2.4; t.hitlag = 4; t.shaking = true; t.flashTimer = 4;
            f.percent = Math.max(0, f.percent - 2.4);
            f.match.effects.list.push({ type: 'wisp', x: t.x, y: t.y - t.h / 2, vx: (f.x - t.x) / 14, vy: -1, life: 16, max: 16, size: 8, color: '#c06aff' });
            NX.Audio.play('weak', { pitch: 0.7 });
          }
          if (fr === 56) { f.releaseCaptive({ dmg: 3, ang: 45, bkb: 60, kbg: 55, effect: 'dark' }); f.fx('text', f.x, f.y - f.h - 16, { text: '+VIDA', color: '#7dffb0', size: 18 }); }
        }
      }
    }
  });

})(window.NX = window.NX || {});
