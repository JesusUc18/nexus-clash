/* NEXUS CLASH — js/fighters/roster/37-nyra.js · luchador 37 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, fighter, spend, flameDraw, windOf } = NX.RosterLib;

  /* ======================================================================
   * V1.4 · NYRA — Jinete de Dragón
   * Siempre montada en su dragón: lenta y pesada, pero pega muchísimo.
   *  - Normales: mordiscos del dragón (y coletazos hacia atrás).
   *  - Especiales: aliento de fuego. Todos gastan FUEGO.
   *  - Pasiva "Fragua Interior": el FUEGO se recarga solo (más rápido en el
   *    suelo). 4 saltos aéreos y PLANEO (mantén SALTO al caer, hasta 2,5 s).
   * Se dibuja con su propio render (dragón + jinete); la cabeza de Nyra va
   * en J.head para que retratos e íconos la encuadren a ella.
   * ==================================================================== */
  const FIRE_MAX = 100;
  const COST = { neutral: 25, side: 8, up: 15, down: 30 };
  const REGEN_GROUND = 0.45, REGEN_AIR = 0.22;
  const GLIDE_MAX = 150, GLIDE_FALL = 1.9;

  /* ------------------------------ PLANEO -------------------------------- */
  function overGround(f) {
    for (const pl of f.match.platforms()) {
      if (f.x > pl.x - 12 && f.x < pl.x + pl.w + 12 && pl.y > f.y - 4) return true;
    }
    return false;
  }
  function wantsGlide(f) {
    if (f.isHuman) return f.input.isHeld('jump');
    /* Bots: solo planean para volver al escenario, ya sin saltos. */
    return f.jumpsLeft === 0 && !overGround(f);
  }

  /* ------------------------------ FUEGO --------------------------------- */
  function mouth(f) { return { ox: 60, oy: -f.h * 0.7 }; }
  function smokePuff(f) {
    const m = mouth(f), p = f.localToWorld(m.ox, m.oy);
    for (let i = 0; i < 5; i++) {
      f.match.effects.list.push({ type: 'wisp', x: p.x + U.rand(-6, 6), y: p.y + U.rand(-6, 6), vx: f.facing * U.rand(0.4, 1.6), vy: -U.rand(0.3, 1),
        life: 30, max: 30, size: U.rand(5, 9), color: '#8a8590' });
    }
    NX.Audio.play('weak', { pitch: 0.6 });
  }
  function fireballDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    const a = Math.atan2(p.vy, p.vx), r = p.r, fl = 1 + Math.sin(p.t * 0.7) * 0.12;
    ctx.rotate(a);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.2);
    g.addColorStop(0, 'rgba(255,200,90,.55)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5a1a';
    ctx.beginPath(); ctx.moveTo(r * 1.1, 0);
    ctx.quadraticCurveTo(r * 0.2, -r * 1.25 * fl, -r * 3.2, -r * 0.15 * Math.sin(p.t * 0.9));
    ctx.quadraticCurveTo(r * 0.2, r * 1.25 * fl, r * 1.1, 0); ctx.fill();
    const c = ctx.createRadialGradient(r * 0.25, 0, 0, 0, 0, r);
    c.addColorStop(0, '#fffbe0'); c.addColorStop(0.45, '#ffd04a'); c.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.restore();
    if (p.t % 2 === 0) p.match.effects.spawn('flame', p.x - Math.cos(a) * r, p.y - Math.sin(a) * r, { scale: 0.8 });
  }
  function patchDraw(ctx, p) {
    const k = Math.min(1, p.life / 25, p.t / 6), w = p.data.w, gy = p.data.gy;
    ctx.save();
    ctx.globalAlpha = 0.9 * k;
    const g = ctx.createLinearGradient(0, gy - 40, 0, gy);
    g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(0.5, 'rgba(255,120,30,.55)'); g.addColorStop(1, 'rgba(255,220,120,.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(p.x - w, gy);
    for (let i = 0; i <= 8; i++) {
      const x = p.x - w + (w * 2) * (i / 8), h = 18 + 14 * Math.abs(Math.sin(p.t * 0.21 + i * 1.7)) * (i % 2 ? 0.6 : 1);
      ctx.quadraticCurveTo(x - w / 8, gy - h * 1.2, x, gy - (i % 2 ? h * 0.5 : h));
    }
    ctx.lineTo(p.x + w, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(60,20,10,.55)'; ctx.fillRect(p.x - w, gy - 2, w * 2, 3);
    ctx.restore();
  }
  function firePatch(f, x, gy) {
    if (f.data.patch && f.data.patch.active) f.data.patch.destroy('replaced');
    f.data.patch = f.spawnProjectile({
      x, y: gy - 16, vx: 0, vy: 0, r: 30, life: 160, dmg: 3, ang: 80, bkb: 45, kbg: 25, effect: 'fire', burn: { frames: 60, dmg: 1 },
      pierce: true, hits: 99, rehit: 24, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false,
      color: '#ff8a2a', data: { w: 44, gy }, draw: patchDraw,
      update(p, m) { if (p.t % 4 === 0) m.effects.spawn('flame', p.x + U.rand(-p.data.w, p.data.w), gy - 4, { scale: 0.9 }); },
      onDestroy(p) { p.match.effects.spawn('dust', p.x, gy, { n: 4 }); }
    });
    f.fx('explosion', x, gy - 10, { r: 36 });
    NX.Audio.play('fire', { pitch: 0.8 });
  }

  /* ------------------------------ DIBUJO -------------------------------- */
  function wing(ctx, x, y, a, span, spread, col, bone) {
    const wr = { x: x + Math.cos(a) * span * 0.48, y: y + Math.sin(a) * span * 0.48 };
    const tips = [0, 1, 2].map(i => {
      const fa = a + 0.15 - i * (0.32 + 0.38 * spread), L = span * (0.62 - i * 0.07);
      return { x: wr.x + Math.cos(fa) * L, y: wr.y + Math.sin(fa) * L };
    });
    const back = { x: x - span * 0.32, y: y + 7 };
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(wr.x, wr.y); ctx.lineTo(tips[0].x, tips[0].y);
    let prev = tips[0];
    for (const tp of tips.slice(1).concat([back])) {
      const mx = (prev.x + tp.x) / 2, my = (prev.y + tp.y) / 2;
      ctx.quadraticCurveTo(mx + (wr.x - mx) * 0.3, my + (wr.y - my) * 0.3, tp.x, tp.y);
      prev = tp;
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = bone; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(wr.x, wr.y); ctx.stroke();
    ctx.lineWidth = 1.6;
    for (const tp of tips) { ctx.beginPath(); ctx.moveTo(wr.x, wr.y); ctx.lineTo(tp.x, tp.y); ctx.stroke(); }
    R.disc(ctx, wr.x, wr.y, 2.4, bone);
    R.poly(ctx, [[wr.x - 1, wr.y - 2], [wr.x + Math.cos(a) * 7, wr.y + Math.sin(a) * 7 - 2], [wr.x + 2, wr.y + 1]], '#efe2c4');
  }
  /* Pata del dragón a partir de una cadena del esqueleto (cadera→rodilla→pie). */
  function legFrom(root, a, b, c, k) {
    return [root, { x: root.x + (b.x - a.x) * k, y: root.y + (b.y - a.y) * k }, { x: root.x + (c.x - a.x) * k, y: root.y + (c.y - a.y) * k }];
  }
  function groundK(root, a, c, planted, fallback) {
    const vy = c.y - a.y;
    return planted && vy > 6 ? U.clamp(-root.y / vy, 0.3, 0.95) : fallback;
  }
  function paw(ctx, pts, col, claw, w, ground) {
    R.limb(ctx, pts, w, col, [w, w * 0.8]);
    const e = pts[1], h = pts[2];
    const ang = ground ? 0 : Math.atan2(h.y - e.y, h.x - e.x) - PI / 2;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);
    R.ellipse(ctx, 2, 0, w * 0.75, w * 0.5, 0, col);
    for (let i = -1; i <= 1; i++) R.poly(ctx, [[w * 0.5 + i * 0.6, -2 + i * 2.4], [w * 1.25 + 2, -0.5 + i * 3.2], [w * 0.55 + i * 0.6, 1 + i * 2.4]], claw);
    ctx.restore();
  }
  /* windOf() da NaN en los muñecos de retratos (sin velocidad); aquí se protege. */
  function wind(f) { return (f.vx == null || f.lvx == null) ? 0 : windOf(f); }
  function curls(ctx, list, col, hi) {
    for (const c of list) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2] + 1.7, 0, TAU); ctx.fillStyle = OUT; ctx.fill(); }
    for (const c of list) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, TAU); ctx.fillStyle = col; ctx.fill(); }
    ctx.strokeStyle = hi; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    for (const c of list) { ctx.beginPath(); ctx.arc(c[0] - c[2] * 0.1, c[1] - c[2] * 0.05, c[2] * 0.55, c[3] || 0, (c[3] || 0) + 3.6); ctx.stroke(); }
  }

  /* Normales = MORDISCOS (y coletazos hacia atrás): punto local de la hitbox
   * activa, la próxima o la última del ataque en curso, y cuánto se estira
   * la cabeza/cola hacia él (w < 0 = se encoge para coger impulso). */
  function biteInfo(f, rig) {
    const mv = f.move;
    if (f.state !== ST.ATTACK || !mv || !mv.def.hitboxes || !mv.def.hitboxes.length || mv.def.key.indexOf('special') === 0) return null;
    const hbs = mv.def.hitboxes, fr = mv.frame;
    let hb = hbs.find(h => fr >= h.f[0] && fr <= h.f[1]), phase = 'hit';
    if (!hb) {
      const next = hbs.filter(h => h.f[0] > fr).sort((a, b) => a.f[0] - b.f[0])[0];
      if (next) { hb = next; phase = 'wind'; } else { hb = hbs.reduce((a, b) => (b.f[1] > a.f[1] ? b : a)); phase = 'rec'; }
    }
    const k = (f.hbScale ? f.hbScale() : 1) / R.fighterScale(f, rig);
    const wk = Math.min(1, fr / Math.max(1, hb.f[0]));
    const w = phase === 'hit' ? 1 : phase === 'wind' ? (mv.charging ? -0.3 : -0.3 * wk) : Math.max(0, 1 - (fr - hb.f[1]) / 10);
    const open = phase === 'wind' ? (mv.charging ? 1 : wk) : phase === 'hit' ? 0.1 : 0.3 * w;
    return { x: hb.x * k, y: hb.y * k, w, phase, open };
  }

  function render(ctx, f, J, p, pal, rig) {
    const t = f.tick || 0, d = f.data || {};
    const tone = R.tone;
    const scale = pal.primary, belly = pal.secondary, dark = tone(scale, -0.3), hornC = pal.horn || '#efe2c4', clawC = pal.claw || '#f3ead2';
    const air = !f.ground && f.state !== ST.LEDGE;
    const mv = f.move, atk = f.state === ST.ATTACK && mv;
    const hip = J.hip, L = J.lean;
    const C = { x: hip.x - 2, y: hip.y + 15 };
    const bi = biteInfo(f, rig);
    /* Ataques que voltean el sprite (sx < 0, p. ej. aéreo atrás): el dragón se gira y muerde. */
    if (bi && (p.sx || 1) < 0) bi.x = -bi.x;
    const tailHit = bi && bi.x < -10, biteHit = bi && !tailHit;
    const jaw = Math.max(d.jaw || 0, biteHit ? bi.open : 0);

    /* Alas: plegadas en el suelo, aleteo en el aire, extendidas al planear. */
    let wa, ws, span;
    if (d.glide) { wa = -2.55 + Math.sin(t * 0.08) * 0.05; ws = 1; span = 64; }
    else if (air) {
      const big = (f.airJumpAnim || 0) / 18;
      wa = -2.15 + Math.sin(t * 0.32) * 0.55 + big * 0.9; ws = 0.75; span = 50;
    } else { wa = -2.75 + Math.sin(t * 0.05) * 0.04; ws = 0.25; span = 34; }
    const wingRoot = { x: C.x - 2, y: C.y - 12 };
    const wingCol = tone(scale, 0.12);
    wing(ctx, wingRoot.x + 5, wingRoot.y - 1, wa - 0.18, span * 0.92, ws, tone(wingCol, -0.3), tone(scale, -0.45));

    /* Cola. */
    const tb = { x: C.x - 26, y: C.y + 1 }, tw = wind(f) * 0.5, pts = [tb];
    for (let i = 1; i <= 6; i++) {
      const k = i / 6;
      pts.push({ x: tb.x - k * (42 + tw), y: tb.y + k * 12 - k * k * 22 + Math.sin(t * 0.12 + i * 0.8) * 3 * k });
    }
    if (tailHit) {
      const w = bi.w;
      for (let i = 1; i <= 6; i++) {
        const k = i / 6, tx = tb.x + (bi.x - tb.x) * k, ty = tb.y + (bi.y - tb.y) * k - Math.sin(k * PI) * 10;
        pts[i] = { x: pts[i].x + (tx - pts[i].x) * w, y: pts[i].y + (ty - pts[i].y) * w };
      }
    }
    R.limb(ctx, pts, 8, scale, [10, 9, 8, 6.5, 5, 4]);
    const te = pts[6], tp = pts[5], ta = Math.atan2(te.y - tp.y, te.x - tp.x);
    ctx.save(); ctx.translate(te.x, te.y); ctx.rotate(ta);
    R.poly(ctx, [[-2, 0], [6, -7], [13, 0], [6, 7]], dark);
    ctx.restore();

    /* Patas traseras/delanteras del lado lejano (sombreadas). */
    const planted = !!p.planted && !air;
    const hindRootB = { x: C.x - 14, y: C.y + 5 }, foreRootB = { x: C.x + 15, y: C.y + 2 };
    paw(ctx, legFrom(hindRootB, J.hipB, J.knB, J.ftB, groundK(hindRootB, J.hipB, J.ftB, planted, 0.55)), dark, clawC, 9, planted);
    const foreB = legFrom(foreRootB, J.hipF, J.knF, J.ftF, groundK(foreRootB, J.hipF, J.ftF, planted, 0.5));
    paw(ctx, foreB, dark, clawC, 7.5, planted);

    /* Cuerpo. */
    R.ellipse(ctx, C.x, C.y, 31, 15.5, 0, scale);
    ctx.save(); ctx.beginPath(); ctx.ellipse(C.x, C.y, 31, 15.5, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(C.x + 4, C.y + 13, 28, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = tone(belly, -0.25); ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(C.x + 4 + i * 7, C.y + 5); ctx.lineTo(C.x + 4 + i * 7, C.y + 16); ctx.stroke(); }
    ctx.strokeStyle = tone(scale, -0.22); ctx.lineWidth = 1;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(C.x - 20 + i * 8 + r * 4, C.y - 5 + r * 6, 3.4, 0.2, PI - 0.2); ctx.stroke(); }
    ctx.fillStyle = R.volumeRadial(ctx, C.x + 8, C.y - 9, 40, 0.24, 0.32); ctx.fillRect(C.x - 33, C.y - 17, 66, 34);
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(C.x, C.y, 31, 15.5, 0, 0, TAU); ctx.stroke();
    /* Cresta del lomo (detrás de la jinete). */
    for (let i = 0; i < 4; i++) {
      const x = C.x - 24 + i * 6.5, y = C.y - 13 + Math.abs(i - 1.5) * 0.6;
      R.poly(ctx, [[x - 3, y + 1], [x, y - 6 - (i % 2) * 2], [x + 3, y + 1]], hornC);
    }

    /* Silla de montar. */
    R.poly(ctx, [[hip.x - 13, hip.y - 1], [hip.x + 10, hip.y - 1], [hip.x + 13, hip.y + 7], [hip.x - 15, hip.y + 7]], pal.saddle || '#6b3f22');
    ctx.fillStyle = pal.belt; ctx.fillRect(hip.x - 4, hip.y + 7, 5, 20);
    R.disc(ctx, hip.x - 1.5, hip.y + 17, 2.2, pal.belt);

    /* Pata trasera cercana. */
    const hindRootF = { x: C.x - 12, y: C.y + 7 };
    paw(ctx, legFrom(hindRootF, J.hipF, J.knF, J.ftF, groundK(hindRootF, J.hipF, J.ftF, planted, 0.55)), scale, clawC, 10, planted);

    /* Ala cercana. */
    wing(ctx, wingRoot.x, wingRoot.y, wa, span, ws, wingCol, tone(scale, -0.35));

    /* Cuello y cabeza del dragón. */
    let ha = L * 0.5 + (p.headTilt || 0) * 0.6;
    const nb = { x: C.x + 22, y: C.y - 7 };
    const hp = { x: C.x + 41 + (d.jaw || 0) * 4 + Math.sin(L) * 6, y: C.y - 33 + Math.cos(t * 0.06) * 1.2 + (air ? 2 : 0) };
    if (biteHit) {
      /* Golpes centrados (aéreo neutro): chasquido hacia delante. Si no, la boca va a la hitbox. */
      const T = Math.abs(bi.x) < 12 ? { x: hp.x + 14, y: hp.y + 4 } : { x: bi.x, y: bi.y };
      const ta = Math.atan2(T.y - nb.y, T.x - nb.x);
      const aim = U.clamp(ta, -1.45, 1.35), w = bi.w;
      ha = ha + (aim - ha) * Math.max(0, w);
      const goal = { x: T.x - Math.cos(ha) * 18, y: T.y - Math.sin(ha) * 18 };
      let gx = goal.x - nb.x, gy = goal.y - nb.y;
      const gl = Math.hypot(gx, gy), maxL = 72;
      if (gl > maxL) { gx *= maxL / gl; gy *= maxL / gl; }
      hp.x += (nb.x + gx - hp.x) * w; hp.y += (nb.y + gy - hp.y) * w;
    }
    const nm = { x: (nb.x + hp.x) / 2 + 5, y: (nb.y + hp.y) / 2 + 2 };
    R.limb(ctx, [nb, nm, { x: hp.x - 4, y: hp.y + 2 }], 12, scale, [14, 11]);
    ctx.strokeStyle = belly; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(nb.x + 6, nb.y + 3); ctx.quadraticCurveTo(nm.x + 5, nm.y + 3, hp.x + 2, hp.y + 6); ctx.stroke();
    ctx.save(); ctx.translate(hp.x, hp.y); ctx.rotate(ha);
    /* Cuernos. */
    R.poly(ctx, [[-4, -6], [-19, -15], [-15, -9], [-6, -2]], hornC);
    R.poly(ctx, [[0, -7], [-11, -19], [-9, -11], [-2, -4]], tone(hornC, -0.12));
    /* Mandíbula (se abre al echar fuego). */
    ctx.save(); ctx.translate(2, 3); ctx.rotate(jaw * 0.5);
    R.poly(ctx, [[0, -1], [17, 0], [16, 4], [0, 5]], tone(scale, -0.1));
    ctx.fillStyle = clawC; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 4, -1); ctx.lineTo(7.5 + i * 4, -3.5); ctx.lineTo(9 + i * 4, -1); ctx.fill(); }
    ctx.restore();
    if (jaw > 0.1) {
      const g = ctx.createRadialGradient(14, 3, 0, 14, 3, 10);
      g.addColorStop(0, 'rgba(255,245,190,.95)'); g.addColorStop(1, 'rgba(255,110,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(14, 3, 10, 0, TAU); ctx.fill();
    }
    /* Cráneo y hocico. */
    R.ellipse(ctx, 0, -1, 11, 8, 0, scale);
    R.poly(ctx, [[5, -6], [21, -3.5], [22, 2], [5, 4]], scale);
    ctx.fillStyle = R.volumeRadial(ctx, 3, -6, 18, 0.25, 0.25); ctx.beginPath(); ctx.ellipse(0, -1, 11, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.quadraticCurveTo(5, -10, 10, -6.5); ctx.stroke();
    R.disc(ctx, 3, -3, 2.6, pal.dragonEye || '#ffd23a');
    ctx.fillStyle = '#1a0d08'; ctx.fillRect(2.6, -5, 0.9, 4);
    R.disc(ctx, 19, -2, 1.1, '#2a0d08', false);
    /* Brasa en la boca con el FUEGO al máximo. */
    if (f.meter >= FIRE_MAX && jaw < 0.1) {
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.25);
      R.disc(ctx, 21, 2.2, 2.2, '#ffb02a', false);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* Pata delantera cercana (apoyada en el suelo; recogida en el aire). */
    const foreRootF = { x: C.x + 19, y: C.y + 3 };
    const foreF = legFrom(foreRootF, J.hipB, J.knB, J.ftB, groundK(foreRootF, J.hipB, J.ftB, planted, 0.5));
    paw(ctx, foreF, scale, clawC, 8.5, planted);
    /* Estela del mordisco / coletazo (en coordenadas locales). */
    if (!d.ct) d.ct = [];
    if (bi && bi.phase === 'hit') {
      const tip = tailHit ? pts[6] : { x: hp.x + Math.cos(ha) * 20, y: hp.y + Math.sin(ha) * 20 };
      d.ct.push({ x: tip.x, y: tip.y, life: 8 });
      if (biteHit && mv.frame === mv.def.hitboxes.find(h => mv.frame >= h.f[0] && mv.frame <= h.f[1]).f[0]) {
        ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(tip.x + 3, tip.y, 11, s > 0 ? 0.3 : PI + 0.3, s > 0 ? PI - 0.3 : TAU - 0.3); ctx.stroke(); }
        ctx.restore();
      }
    }
    for (const c of d.ct) c.life--;
    d.ct = d.ct.filter(c => c.life > 0);
    if (d.ct.length > 1) {
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 1; i < d.ct.length; i++) {
        const a = d.ct[i - 1], b = d.ct[i];
        ctx.globalAlpha = b.life / 8 * 0.8;
        for (let k = -1; k <= 1; k++) {
          ctx.strokeStyle = k ? '#ffe9c0' : '#ffffff'; ctx.lineWidth = k ? 1.6 : 2.6;
          ctx.beginPath(); ctx.moveTo(a.x + k * 3, a.y + k * 3); ctx.lineTo(b.x + k * 3, b.y + k * 3); ctx.stroke();
        }
      }
      ctx.restore();
    }

    /* ============================ JINETE ============================== */
    /* Pierna (por el costado del dragón). */
    R.limb(ctx, [{ x: hip.x + 1, y: hip.y - 1 }, { x: hip.x + 11, y: hip.y + 5 }, { x: hip.x + 9, y: hip.y + 16 }], 7, pal.legs, [7.5, 6.5]);
    R.shoe(ctx, hip.x + 12, hip.y + 17, 5.5, 3.4, 0, pal.feet);
    /* Brazo lejano a las riendas. */
    const rein = { x: hip.x + 17 + Math.sin(L) * 6, y: hip.y - 5 };
    R.limb(ctx, [J.shB, { x: J.shB.x + 5, y: J.shB.y + 10 }, { x: rein.x - 2, y: rein.y }], 5, tone(pal.arms, -0.25));
    R.orb(ctx, rein.x - 2, rein.y, 3.4, tone(pal.hand, -0.2));
    /* Torso. */
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(L);
    R.roundTrap(ctx, rig.torsoW, rig.hipW, rig.torsoH, rig.torsoRound);
    ctx.fillStyle = pal.armor || pal.arms; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.moveTo(rig.torsoW * 0.1, -rig.torsoH + 2); ctx.lineTo(rig.torsoW * 0.45, -rig.torsoH * 0.55); ctx.lineTo(rig.torsoW * 0.15, -rig.torsoH * 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.belt; ctx.fillRect(-rig.hipW / 2, -5, rig.hipW, 4);
    /* Hombrera de escamas. */
    R.ellipse(ctx, 0, -rig.torsoH + 3, 7, 4.5, 0.2, scale);
    ctx.save(); ctx.beginPath(); R.roundTrap(ctx, rig.torsoW, rig.hipW, rig.torsoH, rig.torsoRound); ctx.clip();
    ctx.fillStyle = R.volumeLinear(ctx, rig.torsoW * 0.55, -rig.torsoH, -rig.torsoW * 0.5, -rig.torsoH * 0.05, 0.2, 0.3);
    ctx.fillRect(-rig.torsoW, -rig.torsoH - 2, rig.torsoW * 2, rig.torsoH + 4);
    ctx.restore();
    ctx.restore();
    /* Cuello de la jinete. */
    R.limb(ctx, [J.top, { x: (J.top.x + J.head.x) / 2, y: (J.top.y + J.head.y) / 2 + 2 }], 5, tone(pal.skin, -0.1));

    /* Cabeza con cabello negro rizado. */
    const hr = rig.headR, hairC = pal.hair, hairHi = tone(hairC, 0.2);
    const sway = Math.sin(t * 0.1) * 1.5 - wind(f) * 0.35;
    ctx.save(); ctx.translate(J.head.x, J.head.y); ctx.rotate(J.headAng);
    const back = [];
    for (let i = 0; i < 10; i++) {
      const a = PI * 0.62 + i * (PI * 1.02 / 9);
      back.push([Math.cos(a) * hr * 0.98, Math.sin(a) * hr * 0.95, hr * (0.44 + (i % 2) * 0.06), i]);
    }
    for (let col = 0; col < 3; col++) for (let k = 0; k < 3; k++) {
      back.push([-hr * (0.95 - col * 0.28) + sway * (k + 1) * 0.5, hr * (0.55 + k * 0.48), hr * (0.36 - k * 0.04), col + k]);
    }
    curls(ctx, back, hairC, hairHi);
    ctx.beginPath(); ctx.ellipse(0, 0, hr, hr, 0, 0, TAU);
    ctx.fillStyle = pal.skin; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = R.volumeRadial(ctx, hr * 0.3, -hr * 0.42, hr * 1.75, 0.26, 0.3); ctx.fillRect(-hr - 2, -hr - 2, hr * 2 + 4, hr * 2 + 4);
    ctx.fillStyle = 'rgba(255,90,110,.2)'; ctx.beginPath(); ctx.ellipse(hr * 0.5, hr * 0.3, hr * 0.2, hr * 0.12, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, hr, hr, 0, 0, TAU); ctx.stroke();
    R.drawFace(ctx, f, rig, pal, hr, 0);
    const top = [];
    for (let i = 0; i < 6; i++) {
      const a = -PI * 0.98 + i * (PI * 0.72 / 5);
      top.push([Math.cos(a) * hr * 0.88, Math.sin(a) * hr * 0.86, hr * (0.32 + (i % 2) * 0.05), i * 1.3]);
    }
    top.push([hr * 0.05, -hr * 0.78, hr * 0.28, 2]);
    curls(ctx, top, hairC, hairHi);
    /* Diadema con gema de fuego. */
    ctx.strokeStyle = pal.belt; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, hr * 0.92, -PI * 0.58, -PI * 0.12); ctx.stroke();
    R.disc(ctx, hr * 0.42, -hr * 0.82, 1.9, pal.accent);
    ctx.restore();

    /* Brazo cercano a las riendas. */
    R.limb(ctx, [J.shF, { x: J.shF.x + 6, y: J.shF.y + 9 }, rein], 5, pal.arms);
    R.orb(ctx, rein.x, rein.y, 3.6, pal.hand);
    ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(rein.x, rein.y); ctx.quadraticCurveTo((rein.x + hp.x) / 2, rein.y + 6, hp.x + 4, hp.y + 4); ctx.stroke();
  }

  fighter({
    id: 'nyra', name: 'Nyra', title: 'Jinete de Dragón',
    passive: 'Fragua Interior: el FUEGO de su dragón se recarga solo (más rápido en el suelo). 4 saltos aéreos y planeo (mantén SALTO al caer).',
    palette: { primary: '#8e2430', secondary: '#e3b25a', skin: '#c98f65', head: '#c98f65', hand: '#c98f65', arms: '#2b2f3d', legs: '#2b2f3d', armor: '#2b2f3d',
      feet: '#1d1a22', accent: '#ff8a2a', eye: '#2a1a12', belt: '#f0a83a', hair: '#15111a', horn: '#efe2c4', claw: '#f3ead2', saddle: '#6b3f22', dragonEye: '#ffd23a' },
    stats: { weight: 124, height: 100, width: 60, walk: 2.2, run: 4.9, dash: 5.5, traction: 0.55, airSpeed: 3.2, airAccel: 0.26, gravity: 0.5, fall: 8.6, fastFall: 13,
      jump: 12.4, shortHop: 8, airJump: 10.2, airJumps: 4, airJumpDecay: 0.05, rollSpeed: 0.85 },
    profile: { style: 'heavy', reach: 1.15, power: 1.2, speed: 0.86 },
    flipJump: false,
    meter: { max: FIRE_MAX, start: FIRE_MAX, label: 'FUEGO', short: 'FUEGO', color: '#ff7a1a',
      text: f => (f.data.glide ? 'PLANEANDO · ' : '') + 'FUEGO' },
    ai: { recovery: 'up', projectile: 'neutral', range: 95, zoner: true, heavy: true, extraJumps: true },
    init(f) { f.data.glideT = 0; },
    onLifeReset(f) { f.meter = FIRE_MAX; f.data.glide = false; f.data.glideT = 0; f.data.jaw = 0; f.data.breath = 0; },
    onAirJump(f) { f.fx('dust', f.x, f.y - 6, { n: 6, scale: 1.3 }); NX.Audio.play('dash', { pitch: 0.7 }); f.data.glide = false; },
    onUpdate(f) {
      const d = f.data;
      /* Pasiva: recarga del fuego. */
      if (d.breath > 0) d.breath--;
      else if (f.meter < FIRE_MAX) {
        f.meter = Math.min(FIRE_MAX, f.meter + (f.ground ? REGEN_GROUND : REGEN_AIR));
        if (f.meter >= FIRE_MAX && f.inPlay()) {
          const m = f.localToWorld(64, -f.h * 0.68);
          for (let i = 0; i < 3; i++) f.fx('flame', m.x, m.y, { scale: 0.7 });
          NX.Audio.play('fire', { pitch: 1.6 });
        }
      }
      /* Planeo. */
      if (f.ground || f.state === ST.LEDGE || f.state === ST.RESPAWN) d.glideT = 0;
      const can = !f.ground && (f.state === ST.AIR || f.state === ST.HELPLESS) && (d.glideT || 0) < GLIDE_MAX && !f.fastFalling && f.vy + f.lvy > 0.6 && Math.abs(f.lvy) < 1.5;
      const was = d.glide;
      d.glide = can && wantsGlide(f);
      if (d.glide) {
        d.glideT = (d.glideT || 0) + 1;
        if (!was) { NX.Audio.play('dash', { pitch: 0.55 }); f.fx('ring', f.x, f.y - f.h * 0.6, { r: 34, color: '#ffffff', life: 10 }); }
        if (d.glideT % 9 === 0) f.match.effects.list.push({ type: 'streak', x: f.x - f.facing * 30, y: f.y - f.h * 0.6 + U.rand(-16, 16), vx: -f.facing * 4, vy: 0, life: 10, max: 10, len: 18, color: '#ffffff' });
      }
    },
    statMod(f, k, v) {
      if (!f.data.glide) return v;
      if (k === 'fall') return GLIDE_FALL;
      if (k === 'airSpeed') return v * 1.3;
      if (k === 'airAccel') return v * 1.4;
      return v;
    },
    rig: {
      thigh: 22, shin: 22, footH: 6, legW: 8, footL: 10,
      torsoH: 20, torsoW: 18, hipW: 15, torsoRound: 6, neck: 3, headR: 10.5,
      upperArm: 12, foreArm: 11, armW: 5, handR: 3.6
    },
    render,
    /* Mordiscos aéreos: el abajo y el arriba se adelantan un poco para que la boca llegue sin cruzar el cuerpo. */
    moves: {
      dair: m => Object.assign({}, m, { hitboxes: m.hitboxes.map(h => Object.assign({}, h, { x: h.x + 22 })) }),
      uair: m => Object.assign({}, m, { hitboxes: m.hitboxes.map(h => Object.assign({}, h, { x: h.x + 16 })) })
    },
    specials: {
      /* Bola de Fuego: proyectil de largo alcance, se apunta un poco con ↑/↓. */
      neutral: {
        frames: 44, pose: 'shoot', gravity: 0.5, drift: 0.5,
        onStart(f, mv) { mv.data.ok = spend(f, COST.neutral); f.data.breath = 40; },
        onFrame(f, fr, mv) {
          f.data.jaw = fr >= 8 && fr <= 24 ? Math.min(1, (fr - 7) / 6) : Math.max(0, (f.data.jaw || 0) - 0.15);
          if (fr === 10 && mv.data.ok) NX.Audio.play('charge', { pitch: 0.6 });
          if (fr !== 17) return;
          if (!mv.data.ok) { smokePuff(f); return; }
          const aim = U.clamp(f.input.y, -1, 1) * 0.3, sp = 8.5, m = mouth(f);
          shoot(f, { ox: m.ox, oy: m.oy, speed: 0, vx: Math.cos(aim) * sp * f.facing, vy: Math.sin(aim) * sp, r: 15, life: 95,
            dmg: 13, ang: 40, bkb: 42, kbg: 78, effect: 'fire', burn: { frames: 80, dmg: 1 }, color: '#ff8a2a', glow: true, draw: fireballDraw,
            onDestroy(p, reason) { if (reason !== 'out') { p.match.effects.spawn('explosion', p.x, p.y, { r: 26 }); } } });
          NX.Audio.play('fire', { pitch: 0.7 });
          f.match.camera.shake(3);
          if (!f.ground) f.vx -= f.facing * 1.2;
        },
        onEnd(f) { f.data.jaw = 0; }
      },
      /* Llamarada: lanzallamas continuo mientras mantengas B (gasta FUEGO). */
      side: {
        frames: 72, pose: 'shoot', gravity: 0.3, drift: 0.25,
        onStart(f, mv) { mv.data.ok = spend(f, COST.side); f.data.breath = 30; if (!f.ground) { f.vy = Math.min(f.vy, 0) * 0.5; } },
        onFrame(f, fr, mv) {
          const d = f.data;
          if (!mv.data.ok) { if (fr === 12) smokePuff(f); if (fr === 14) mv.frame = 52; d.jaw = 0; return; }
          if (fr < 10) { d.jaw = fr / 10; return; }
          if (mv.data.stop) { d.jaw = Math.max(0, d.jaw - 0.12); return; }
          const held = f.isHuman ? f.input.isHeld('special') : fr < 44;
          if ((fr > 26 && !held) || f.meter <= 0 || fr >= 64) {
            mv.data.stop = true; mv.frame = Math.max(fr, 56);
            const m = mouth(f);
            shoot(f, { ox: m.ox, oy: m.oy, speed: 10 * 1, r: 16, life: 22, dmg: 4, ang: 40, bkb: 55, kbg: 55, effect: 'fire', reflectable: false,
              glow: false, color: '#ff8a2a', draw: flameDraw('#ff7a1a'), update(p) { p.r = Math.min(28, p.r + 0.6); } });
            return;
          }
          d.jaw = 1; d.breath = 30;
          f.meter = Math.max(0, f.meter - 0.9);
          if (!f.ground) f.vy = Math.min(f.vy, 1.2);
          if (fr % 3 === 0) {
            const aim = U.clamp(f.input.y, -1, 1) * 2, m = mouth(f);
            shoot(f, { ox: m.ox, oy: m.oy, speed: 0, vx: U.rand(9, 10.5) * f.facing, vy: aim + U.rand(-0.6, 0.6), r: 10, life: 30,
              dmg: 1.6, ang: 45, bkb: 6, kbg: 12, effect: 'fire', burn: { frames: 40, dmg: 1 }, reflectable: false, destructible: false,
              glow: false, color: '#ff8a2a', draw: flameDraw('#ff7a1a'), update(p) { p.r = Math.min(22, p.r + 0.45); p.vx *= 0.985; } });
          }
          if (fr % 9 === 0) NX.Audio.play('fire', { pitch: 0.9 + Math.sin(fr) * 0.1 });
        },
        onEnd(f) { f.data.jaw = 0; }
      },
      /* Vuelo del Dragón: gran aletazo dirigible con estallido de fuego bajo las garras. */
      up: {
        frames: 56, pose: 'rise', helpless: true, helplessLag: 22, drift: 0.8,
        hitboxes: [{ f: [9, 18], x: 0, y: -54, r: 36, dmg: 9, ang: 80, bkb: 55, kbg: 60, effect: 'heavy', dir: 'auto' }],
        onStart(f, mv) {
          mv.data.fire = f.meter >= COST.up;
          if (mv.data.fire) f.meter -= COST.up;
          f.data.breath = 20; f.data.glide = false;
        },
        onFrame(f, fr, mv) {
          const I = f.input;
          if (fr < 8) { f.vy *= 0.5; f.vx *= 0.9; mv.velY = true; mv.velX = true; return; }
          if (fr === 8) {
            NX.Audio.play('airjump', { pitch: 0.65 });
            f.fx('ring', f.x, f.y - f.h * 0.4, { r: 56, color: '#ffffff', w: 5 });
            if (mv.data.fire) {
              NX.FighterKit.boom(f, f.x, f.y + 8, { r: 52, dmg: 8, ang: 60, bkb: 45, kbg: 55, effect: 'fire', burn: { frames: 60, dmg: 1 } });
            } else f.fx('dust', f.x, f.y, { n: 8 });
          }
          if (fr <= 30) {
            f.vy = U.approach(f.vy, -12.5, 3); mv.velY = true;
            f.vx = U.approach(f.vx, I.x * 4.4, 0.4); mv.velX = true;
            if (Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x);
            if (fr % 5 === 0) f.fx('dust', f.x - f.facing * 20, f.y - f.h * 0.5, { n: 1 });
          }
        }
      },
      /* Lluvia de Brasas: escupe una brasa en arco que, al tocar el suelo, deja un charco de fuego. */
      down: {
        frames: 48, pose: 'slam', gravity: 0.5, drift: 0.5,
        onStart(f, mv) { mv.data.ok = spend(f, COST.down); f.data.breath = 40; },
        onFrame(f, fr, mv) {
          f.data.jaw = fr >= 9 && fr <= 22 ? Math.min(1, (fr - 8) / 5) : Math.max(0, (f.data.jaw || 0) - 0.15);
          if (fr !== 16) return;
          if (!mv.data.ok) { smokePuff(f); return; }
          const m = mouth(f), gr = !!f.ground;
          shoot(f, { ox: m.ox - 6, oy: m.oy + 6, speed: 0, vx: f.facing * (gr ? 5.2 : 3.6), vy: gr ? -5.5 : 2.5, gravity: 0.42, maxFall: 12,
            r: 13, life: 140, dmg: 10, ang: 60, bkb: 40, kbg: 70, effect: 'fire', burn: { frames: 90, dmg: 1 }, passCollide: true,
            color: '#ff8a2a', glow: true, draw: fireballDraw,
            onGround(p, pl) { if (p.owner) firePatch(p.owner, p.x, pl.y); p.destroy('ground'); },
            onDestroy(p, reason) { if (reason !== 'ground' && reason !== 'out') p.match.effects.spawn('explosion', p.x, p.y, { r: 24 }); } });
          NX.Audio.play('fire', { pitch: 0.6 });
        },
        onEnd(f) { f.data.jaw = 0; }
      }
    }
  });

})(window.NX = window.NX || {});
