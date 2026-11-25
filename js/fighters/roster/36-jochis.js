/* NEXUS CLASH — js/fighters/roster/36-jochis.js · luchador 36 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, boom, nearestFoe, steer, hairCap, starDraw, fighter, counterMove, glasses } = NX.RosterLib;

  /* ======================================================================
   * v1.1 · JOCHIS — Tarotista Gamer (ligero, velocidad media, buen daño)
   * Normales con su MANDO rosa estilo consola; especiales con cartas de TAROT.
   * Pasiva "Arcano Mayor": si sobrevive 1:00 sin perder la vida gana +25% de
   * alcance y +30% de peso hasta que la pierda.
   * ==================================================================== */
  const SURVIVE_T = 60 * 60;   // V1.2.1: 1:30 → 1:00
  const ARCANA = {
    sol: { name: 'EL SOL', col: '#ffb02a' }, luna: { name: 'LA LUNA', col: '#bcd4ff' }, torre: { name: 'LA TORRE', col: '#ffe14a' },
    estrella: { name: 'LA ESTRELLA', col: '#7ff0ff' }, muerte: { name: 'LA MUERTE', col: '#f0f0f6' }, loco: { name: 'EL LOCO', col: '#7dff8a' },
    rueda: { name: 'LA RUEDA', col: '#ff8fd0' }, carro: { name: 'EL CARRO', col: '#ffd23a' }, justicia: { name: 'LA JUSTICIA', col: '#ff6fb5' }
  };
  const DRAW_TABLE = [['sol', 22], ['luna', 20], ['torre', 18], ['estrella', 14], ['loco', 16], ['muerte', 10]];
  function pickWeighted(list) {
    let s = 0; list.forEach(e => { s += e[1]; });
    let r = Math.random() * s;
    for (const e of list) { r -= e[1]; if (r < 0) return e[0]; }
    return list[0][0];
  }
  function tarotSymbol(ctx, key, s, col) {
    ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.9, s * 0.16); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (key) {
      case 'sol':
        for (let i = 0; i < 8; i++) { const a = i * PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, TAU); ctx.fill(); break;
      case 'luna':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.8, PI * 0.35, PI * 1.65); ctx.arc(s * 0.35, 0, s * 0.62, PI * 1.45, PI * 0.55, true); ctx.closePath(); ctx.fill(); break;
      case 'torre':
        ctx.fillRect(-s * 0.3, -s * 0.5, s * 0.6, s * 1.3);
        ctx.beginPath(); ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.15, -s * 0.35); ctx.lineTo(s * 0.15, -s * 0.35); ctx.lineTo(-s * 0.2, s * 0.2); ctx.stroke(); break;
      case 'estrella':
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? s * 0.4 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); break;
      case 'muerte':
        ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.6, 0, TAU); ctx.fill(); ctx.fillRect(-s * 0.35, s * 0.3, s * 0.7, s * 0.4);
        ctx.fillStyle = '#2a1846'; ctx.beginPath(); ctx.arc(-s * 0.22, -s * 0.15, s * 0.16, 0, TAU); ctx.arc(s * 0.22, -s * 0.15, s * 0.16, 0, TAU); ctx.fill(); break;
      case 'loco':
        ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.5); ctx.lineTo(-s * 0.45, -s * 0.7); ctx.lineTo(0, s * 0.1); ctx.lineTo(s * 0.45, -s * 0.7); ctx.lineTo(s * 0.8, s * 0.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(-s * 0.45, -s * 0.78, s * 0.15, 0, TAU); ctx.arc(s * 0.45, -s * 0.78, s * 0.15, 0, TAU); ctx.fill(); break;
      case 'rueda':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = i * PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8); ctx.lineTo(-Math.cos(a) * s * 0.8, -Math.sin(a) * s * 0.8); ctx.stroke(); }
        break;
      case 'carro':
        ctx.fillRect(-s * 0.7, -s * 0.5, s * 1.4, s * 0.7);
        ctx.beginPath(); ctx.arc(-s * 0.4, s * 0.45, s * 0.3, 0, TAU); ctx.arc(s * 0.4, s * 0.45, s * 0.3, 0, TAU); ctx.fill(); break;
      case 'justicia':
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 0.8); ctx.moveTo(-s * 0.8, -s * 0.55); ctx.lineTo(s * 0.8, -s * 0.55); ctx.moveTo(-s * 0.4, s * 0.8); ctx.lineTo(s * 0.4, s * 0.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(-s * 0.7, -s * 0.1, s * 0.28, 0, PI); ctx.arc(s * 0.7, -s * 0.1, s * 0.28, 0, PI); ctx.fill(); break;
    }
    ctx.restore();
  }
  function tarotShape(ctx, w, h, key) {
    const A = ARCANA[key] || ARCANA.sol;
    ctx.fillStyle = '#2a1846'; ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = Math.max(1.1, w * 0.09);
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = U.rgba('#e8c35a', 0.55); ctx.lineWidth = Math.max(0.6, w * 0.04);
    ctx.strokeRect(-w * 0.36, -h * 0.4, w * 0.72, h * 0.8);
    tarotSymbol(ctx, key, w * 0.27, A.col);
  }
  function tarotProjDraw(key, spin) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * (spin || 0.35) * U.sign(p.vx || 1));
      tarotShape(ctx, p.r * 1.5, p.r * 2.2, key); ctx.restore();
    };
  }
  function sunDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.12);
    ctx.globalAlpha = 0.3; R.disc(ctx, 0, 0, p.r * 1.7, '#ffb02a', false); ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff7a1a';
    for (let i = 0; i < 8; i++) { ctx.rotate(PI / 4); ctx.beginPath(); ctx.moveTo(p.r * 0.8, -4); ctx.lineTo(p.r * 1.45, 0); ctx.lineTo(p.r * 0.8, 4); ctx.fill(); }
    R.disc(ctx, 0, 0, p.r, '#ffd23a'); R.disc(ctx, 0, 0, p.r * 0.55, '#fff3a8', false);
    ctx.restore();
  }
  function moonDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.28; R.disc(ctx, 0, 0, p.r * 1.8, '#9fc4ff', false); ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8f0ff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, p.r, PI * 0.35, PI * 1.65); ctx.arc(p.r * 0.45, 0, p.r * 0.78, PI * 1.45, PI * 0.55, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function wheelDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.4);
    ctx.globalAlpha = 0.25; R.disc(ctx, 0, 0, p.r * 1.35, '#ff8fd0', false); ctx.globalAlpha = 1;
    R.disc(ctx, 0, 0, p.r, '#2a1846');
    ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.92, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * p.r * 0.25, Math.sin(a) * p.r * 0.25); ctx.lineTo(Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9); ctx.stroke(); }
    R.disc(ctx, 0, 0, p.r * 0.28, '#ff6fb5');
    ctx.restore();
  }
  function padDraw(ctx, w) {
    /* Mando rosa estilo consola de sobremesa (asas, sticks, cruceta y botones ABXY). */
    ctx.save(); ctx.translate(0, w.len * 0.55); ctx.rotate(PI / 2);
    ctx.fillStyle = '#e0559c'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(-11, -8.5, 7, 3); ctx.rect(4, -8.5, 7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff6fb5'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, -6);
    ctx.quadraticCurveTo(13, -6, 13, 0); ctx.quadraticCurveTo(14, 9, 10, 10); ctx.quadraticCurveTo(7, 10, 5, 5);
    ctx.lineTo(-5, 5); ctx.quadraticCurveTo(-7, 10, -10, 10); ctx.quadraticCurveTo(-14, 9, -13, 0); ctx.quadraticCurveTo(-13, -6, -8, -6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, -3.6, 4, 1.2, 0, 0, TAU); ctx.fill();
    R.disc(ctx, -7.5, -1, 2.5, '#2a2a30', false); R.disc(ctx, -7.5, -1, 1.4, '#48484f', false);
    R.disc(ctx, 3, 2.6, 2.2, '#2a2a30', false); R.disc(ctx, 3, 2.6, 1.2, '#48484f', false);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(-4.6, 1.6, 3.4, 1.1); ctx.fillRect(-3.45, 0.45, 1.1, 3.4);
    R.disc(ctx, 8, -3.4, 1.2, '#ffd400', false); R.disc(ctx, 8, 1.4, 1.2, '#2fdc5a', false);
    R.disc(ctx, 5.6, -1, 1.2, '#2f8cff', false); R.disc(ctx, 10.4, -1, 1.2, '#ff2b3a', false);
    R.disc(ctx, 0, -3, 1.6, '#f5f5f5', false);
    ctx.restore();
  }
  function floatCard(f, key, life) {
    f.spawnProjectile({ x: f.x, y: f.y - f.h - 34, vx: 0, vy: 0, r: 1, life: life || 34, dmg: 0, harmless: true, pierce: true, stageCollide: false,
      reflectable: false, absorbable: false, destructible: false, glow: false,
      update(p) { const o = p.owner; p.x = o.x; p.y = o.y - o.h - 30 - Math.min(10, p.t); },
      onDestroy() {},
      draw(ctx, p) {
        const k = Math.min(1, p.t / 8), fade = Math.min(1, p.life / 8);
        ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = fade;
        ctx.save(); ctx.globalAlpha = 0.3 * fade; R.disc(ctx, 0, 0, 26, (ARCANA[key] || ARCANA.sol).col, false); ctx.restore();
        ctx.scale(Math.max(0.05, k), 1); tarotShape(ctx, 22, 34, key);
        ctx.restore();
      } });
  }
  const TAROT = {
    sol(f) {
      NX.Audio.play('fire', { pitch: 1.1 });
      shoot(f, { ox: 26, speed: 7.5, r: 16, life: 70, dmg: 12, ang: 45, bkb: 40, kbg: 72, effect: 'fire', color: '#ffb02a', glow: false, draw: sunDraw });
    },
    luna(f) {
      NX.Audio.play('magic', { pitch: 0.8 });
      shoot(f, { ox: 24, speed: 4.2, r: 12, life: 150, dmg: 8, ang: 60, bkb: 35, kbg: 62, effect: 'magic', color: '#bcd4ff', glow: false,
        update(p) { if (p.t > 10) steer(p, 0.06, 700); }, draw: moonDraw });
    },
    torre(f) {
      const t = nearestFoe(f, f.x, f.y - f.h / 2, 900);
      const tx = t ? t.x : f.x + f.facing * 180, ty = t ? t.y - t.h / 2 : f.y - f.h / 2;
      NX.Audio.play('charge', { pitch: 1.6 });
      f.spawnProjectile({ x: tx, y: ty, vx: 0, vy: 0, r: 30, life: 26, dmg: 11, ang: 80, bkb: 45, kbg: 74, effect: 'elec', harmless: true, pierce: true, hits: 99,
        stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, color: '#ffe14a',
        update(p, m) {
          if (p.t === 18) {
            p.harmless = false;
            m.effects.spawn('bolt', p.x + U.rand(-10, 10), p.y - 320, { x2: p.x, y2: p.y + 24, color: '#ffe14a', w: 6, life: 12 });
            m.effects.spawn('ring', p.x, p.y, { r: 40, color: '#ffe14a', w: 5 });
            NX.Audio.play('elec'); m.camera.shake(5);
          }
          if (p.t > 21) p.harmless = true;
        },
        onDestroy() {},
        draw(ctx, p) {
          if (p.t >= 18) return;
          ctx.save(); ctx.globalAlpha = p.t % 4 < 2 ? 0.55 : 0.25; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.moveTo(p.x, p.y - 320); ctx.lineTo(p.x, p.y + 20); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); ctx.restore();
        } });
    },
    estrella(f) {
      NX.Audio.play('heal');
      const heal = Math.min(8, f.percent);
      f.percent -= heal;
      f.fx('text', f.x, f.y - f.h - 12, { text: '-' + Math.round(heal) + '%', color: '#7ff0ff', size: 20 });
      for (let i = 0; i < 6; i++) f.fx('sparkle', f.x + U.rand(-20, 20), f.y - U.rand(0, f.h), { color: '#7ff0ff' });
      [-0.25, 0, 0.25].forEach(a => shoot(f, { ox: 24, speed: 0, vx: Math.cos(a) * 9 * f.facing, vy: Math.sin(a) * 9, r: 8, life: 36, dmg: 3, ang: 50, bkb: 25, kbg: 35,
        effect: 'magic', color: '#7ff0ff', glow: false, draw: starDraw('#7ff0ff', 5) }));
    },
    muerte(f, mv) {
      NX.Audio.play('slash', { pitch: 0.6 }); f.match.camera.shake(6);
      mv.data.death = true;
      f.fx('ring', f.x + f.facing * 40, f.y - f.h * 0.5, { r: 46, color: '#f0f0f6', w: 6 });
    },
    loco(f) {
      f.addDamage(3, null); f.flashTimer = 10;
      f.fx('text', f.x, f.y - f.h - 12, { text: '¡UPS!', color: '#7dff8a', size: 20 });
      boom(f, f.x + f.facing * 10, f.y - f.h / 2, { r: 44, dmg: 6, ang: 80, bkb: 50, kbg: 45, effect: 'magic' });
    }
  };
  fighter({
    id: 'jochis', name: 'Jochis', title: 'Tarotista Gamer',
    passive: 'Arcano Mayor: si sobrevive 1:00 sin perder la vida gana +25% de alcance y +30% de peso hasta que la pierda.',
    palette: { primary: '#7a4e2c', secondary: '#2c3442', skin: '#e0b088', head: '#e0b088', hand: '#e0b088', arms: '#7a4e2c', legs: '#2c3442', feet: '#f0f0f0', accent: '#ff6fb5', hair: '#141414', eye: '#1a1208' },
    stats: { weight: 76, height: 68, width: 28, walk: 3.1, run: 7.0, dash: 7.6, airSpeed: 4.0, gravity: 0.6, fall: 10.2, fastFall: 15, jump: 14, shortHop: 9, airJump: 13 },
    profile: { style: 'sword', reach: 0.9, power: 1.14, speed: 1.0, effect: 'hit' },
    meter: { max: SURVIVE_T, label: 'AGUANTE', short: 'AGUANTE', color: '#c77dff',
      text: f => f.data.awake ? 'ARCANO MAYOR' : 'AGUANTE ' + Math.max(0, Math.ceil((SURVIVE_T - (f.data.surv || 0)) / 60)) + 's' },
    ai: { recovery: 'up', projectile: 'neutral', range: 85, counter: 'down' },
    onLifeReset(f) { f.data.surv = 0; f.data.awake = false; f.reachMult = 1; },
    onUpdate(f) {
      f.meter = Math.min(SURVIVE_T, f.data.surv || 0);
      if (!f.inPlay() || f.state === ST.RESPAWN || f.state === ST.ENTRY) return;
      if (!f.data.awake) {
        f.data.surv = (f.data.surv || 0) + 1;
        if (f.data.surv >= SURVIVE_T) {
          f.data.awake = true;
          f.fx('text', f.x, f.y - f.h - 34, { text: '¡ARCANO MAYOR!', color: '#c77dff', size: 24 });
          f.fx('ring', f.x, f.y - f.h / 2, { r: 80, color: '#c77dff', w: 6 });
          NX.Audio.play('chargeFull'); NX.Audio.play('magic', { pitch: 0.7 });
        }
        return;
      }
      f.reachMult = 1.25;
      if (!f.hidden && f.tick % 7 === 0) f.fx('sparkle', f.x + U.rand(-f.w, f.w), f.y - U.rand(0, f.h), { color: U.pick(['#c77dff', '#ff8fd0', '#e8c35a']) });
    },
    statMod(f, k, v) { return f.data.awake && k === 'weight' ? v * 1.3 : v; },
    drawOverlay(ctx, f) {
      if (!f.data || !f.data.awake || f.hidden) return;
      /* Dos cartas de tarot orbitan a su alrededor mientras dura el Arcano Mayor. */
      const t = f.tick || 0, cx = f.x, cy = f.y - f.h * 0.55;
      for (let i = 0; i < 2; i++) {
        const a = t * 0.06 + i * PI, x = cx + Math.cos(a) * f.w * 1.35, y = cy + Math.sin(a) * f.h * 0.22;
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.sin(a) > 0 ? 0.95 : 0.6; ctx.rotate(Math.sin(a) * 0.3);
        tarotShape(ctx, 10, 15, i ? 'estrella' : 'sol'); ctx.restore();
      }
    },
    rig: {
      headR: 11, torsoW: 20, hipW: 17, torsoH: 21, torsoRound: 6, armW: 6.5, upperArm: 11, foreArm: 10, handR: 4.5,
      thigh: 11, shin: 11, legW: 7.5, footL: 9.5, footH: 5.5,
      weapon: { type: 'controller', len: 22, w: 18, trail: '#ff8fd0' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.3 });
          /* Cabello negro corto con mechones sueltos sobre la frente. */
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.6);
          ctx.quadraticCurveTo(-r * 0.1, -r * 1.3, r * 0.75, -r * 0.92);
          ctx.quadraticCurveTo(r * 1.05, -r * 0.7, r * 0.95, -r * 0.4);
          ctx.lineTo(r * 0.72, -r * 0.52); ctx.lineTo(r * 0.58, -r * 0.3); ctx.lineTo(r * 0.42, -r * 0.55); ctx.lineTo(r * 0.22, -r * 0.36); ctx.lineTo(r * 0.05, -r * 0.6);
          ctx.quadraticCurveTo(-r * 0.4, -r * 0.62, -r * 0.85, -r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
          glasses(ctx, r);
        },
        torso(ctx, a) {
          const r = a.rig;
          /* Camisa café con cuello, botones y bolsillo. */
          R.poly(ctx, [[-r.torsoW * 0.22, -r.torsoH], [r.torsoW * 0.06, -r.torsoH * 0.72], [r.torsoW * 0.06, -r.torsoH]], '#9a6a40');
          R.poly(ctx, [[r.torsoW * 0.34, -r.torsoH], [r.torsoW * 0.06, -r.torsoH * 0.72], [r.torsoW * 0.06, -r.torsoH]], '#9a6a40');
          ctx.strokeStyle = '#5a3820'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(r.torsoW * 0.06, -r.torsoH * 0.72); ctx.lineTo(r.torsoW * 0.06, -2); ctx.stroke();
          for (let i = 0; i < 3; i++) R.disc(ctx, r.torsoW * 0.12, -r.torsoH * (0.6 - i * 0.2), 1, '#e8d8c0', false);
          ctx.strokeRect(r.torsoW * 0.18, -r.torsoH * 0.66, r.torsoW * 0.2, r.torsoH * 0.2);
        },
        weapon(ctx, f, w) {
          if (f.move && /^special/.test(f.move.def.key)) return;
          padDraw(ctx, w);
        },
        front(ctx, a) {
          const mv = a.f.move;
          if (!mv || !/^special/.test(mv.def.key)) return;
          const k = mv.def.key, h = a.J.haF;
          const key = k === 'special_down' ? 'justicia' : k === 'special_side' ? 'rueda' : k.indexOf('special_up') === 0 ? 'carro' : (mv.data.card || 'sol');
          if (k === 'special_side' && mv.frame >= 11) return;
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(-0.3); ctx.translate(0, -8);
          tarotShape(ctx, 11, 16, key); ctx.restore();
        }
      }
    },
    specials: {
      /* Tirada de Tarot: saca un arcano al azar (Sol, Luna, Torre, Estrella, Loco o Muerte). */
      neutral: {
        frames: 40, pose: 'cast', limb: [],
        onStart(f, mv) { mv.data.card = pickWeighted(DRAW_TABLE); },
        onFrame(f, fr, mv) {
          const c = mv.data.card, A = ARCANA[c];
          if (fr === 5) { floatCard(f, c, 34); f.fx('text', f.x, f.y - f.h - 62, { text: A.name, color: A.col, size: 18 }); NX.Audio.play('magic', { pitch: 1.5 }); }
          if (fr === 14) TAROT[c](f, mv);
          mv.extraBoxes = (mv.data.death && fr >= 14 && fr <= 17) ? [
            { x: 40, y: -34, r: 30, dmg: 17, ang: 40, bkb: 45, kbg: 98, effect: 'dark' },
            { x: 18, y: -50, r: 20, dmg: 15, ang: 45, bkb: 45, kbg: 94, effect: 'dark' }] : null;
        }
      },
      /* Rueda de la Fortuna: rueda giratoria de varios golpes que frena y estalla. */
      side: {
        frames: 36, pose: 'shoot', limb: [],
        canUse(f) { return !(f.data.wheel && f.data.wheel.active); },
        onFrame(f, fr) {
          if (fr !== 11) return;
          NX.Audio.play('spin', { pitch: 1.5 });
          f.data.wheel = shoot(f, { ox: 26, speed: 9.5, r: 15, life: 100, dmg: 2.4, ang: 60, bkb: 22, kbg: 15, effect: 'magic', pierce: true, hits: 99, rehit: 9,
            stageCollide: false, reflectable: true, color: '#ff8fd0', glow: false, draw: wheelDraw,
            update(p, m) {
              p.vx *= 0.955;
              if (p.t === 64) {
                p.dmg = 7; p.bkb = 45; p.kbg = 82; p.ang = 50; p.r = 26; p.rehit = 0; p.hitSet.clear(); p.life = 6;
                m.effects.spawn('ring', p.x, p.y, { r: 46, color: '#ff8fd0', w: 6 }); NX.Audio.play('magic', { pitch: 1.2 });
              }
            } });
        }
      },
      /* El Carro: sube en diagonal montado en una carta gigante. */
      up: {
        frames: 56, pose: 'rise', limb: [], helplessLag: 20, drift: 0.6,
        hitboxes: [
          { f: [6, 10], x: 4, y: -34, r: 24, dmg: 5, ang: 78, bkb: 45, kbg: 35, effect: 'magic', group: 1 },
          { f: [13, 17], x: 4, y: -34, r: 24, dmg: 3, ang: 80, bkb: 40, kbg: 25, effect: 'magic', group: 2 },
          { f: [21, 24], x: 6, y: -44, r: 26, dmg: 6, ang: 65, bkb: 50, kbg: 82, effect: 'magic', group: 3 }],
        onStart(f, mv) { const ix = f.input.x; mv.data.dx = Math.abs(ix) > 0.3 ? U.sign(ix) : 0; if (mv.data.dx) f.facing = mv.data.dx; },
        onFrame(f, fr, mv) {
          if (fr === 5) {
            NX.Audio.play('magic', { pitch: 1.7 });
            f.spawnProjectile({ x: f.x, y: f.y + 6, vx: 0, vy: 0, r: 1, life: 24, dmg: 0, harmless: true, pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, data: { mv },
              update(p) { const o = p.owner; if (o.move !== p.data.mv) { p.destroy('end'); return false; } p.x = o.x; p.y = o.y + 6; },
              onDestroy() {},
              draw(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(PI / 2 + Math.sin(p.t * 0.4) * 0.08); tarotShape(ctx, 18, 46, 'carro'); ctx.restore(); } });
          }
          if (fr >= 6 && fr <= 24) {
            f.vy = -12.5; f.vx = mv.data.dx * 4.2 + f.input.x * 1.4; mv.velX = mv.velY = true;
            if (fr % 2 === 0) f.fx('sparkle', f.x - f.facing * 10, f.y + 6, { color: '#ffd23a' });
          }
        }
      },
      /* La Justicia: contraataque que devuelve el golpe ×1.3. */
      down: Object.assign(counterMove({ mult: 1.3, min: 9, kbg: 95, color: '#ff6fb5', text: '¡JUSTICIA!' }), { limb: [] })
    }
  });
})(window.NX = window.NX || {});
