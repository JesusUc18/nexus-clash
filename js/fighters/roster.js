/* ==========================================================================
 * NEXUS CLASH — js/fighters/roster.js
 * Plantel completo de 34 luchadores ORIGINALES (v7): estadísticas, rig visual
 * procedural (accesorios, siluetas, paletas), pasivas, medidores y sus
 * 4 ataques especiales (Neutral, Lateral, Arriba, Abajo) 100% funcionales.
 * Incluye pistas `ai` para los bots de la Parte 3.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;

  /* ===================== UTILIDADES PARA ESPECIALES ===================== */
  function shoot(f, o) {
    const ox = o.ox != null ? o.ox : 30, oy = o.oy != null ? o.oy : -f.h * 0.55;
    const p = f.localToWorld(ox, oy);
    const sp = o.speed != null ? o.speed : 8;
    const opts = Object.assign({ x: p.x, y: p.y, vx: sp * f.facing, vy: 0, facing: f.facing }, o);
    delete opts.ox; delete opts.oy; delete opts.speed;
    return f.spawnProjectile(opts);
  }

  /* Explosión radial estacionaria (dirección automática desde el centro). */
  function boom(f, x, y, o) {
    o = o || {};
    f.fx('explosion', x, y, { r: o.r || 50 });
    NX.Audio.play('explosion', { pitch: o.r > 60 ? 1.3 : 0.8 });
    f.match.camera.shake(Math.min(16, (o.r || 50) / 5));
    return f.spawnProjectile(Object.assign({
      x, y, vx: 0, vy: 0, r: 50, life: 4, dmg: 10, ang: 55, bkb: 45, kbg: 80, dir: 'auto', effect: 'fire',
      reflectable: false, absorbable: false, destructible: false, transcendent: true, stageCollide: false,
      pierce: true, glow: false, draw() {}
    }, o));
  }

  function nearestFoe(owner, x, y, maxD) {
    let best = null, bd = maxD || Infinity;
    for (const t of owner.match.fighters) {
      if (t === owner || !t.inPlay() || t.hidden) continue;
      const d = U.dist(x, y, t.x, t.y - t.h / 2);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  function steer(p, rate, maxD) {
    const t = nearestFoe(p.owner, p.x, p.y, maxD || 900);
    if (!t) return;
    const a = Math.atan2(t.y - t.h / 2 - p.y, t.x - p.x), cur = Math.atan2(p.vy, p.vx);
    let d = a - cur;
    while (d > PI) d -= TAU;
    while (d < -PI) d += TAU;
    const na = cur + U.clamp(d, -rate, rate), sp = Math.hypot(p.vx, p.vy);
    p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
  }

  /* Plataforma bajo un punto (para ondas que viajan por el suelo). */
  function groundAt(match, x, y, tol) {
    for (const pl of match.platforms()) {
      if (x >= pl.x && x <= pl.x + pl.w && Math.abs(pl.y - y) <= (tol || 3)) return pl;
    }
    return null;
  }

  /* Onda de choque que recorre el suelo en ambas direcciones o en una. */
  function groundWave(f, dir, o) {
    if (!f.ground) return null;
    const gy = f.ground.y;
    const r = o.r || 16;
    return f.spawnProjectile(Object.assign({
      x: f.x + dir * 20, y: gy - r, vx: dir * (o.speed || 8), vy: 0, r, life: o.life || 24, dmg: 8, ang: 80, bkb: 50,
      kbg: 60, effect: 'heavy', stageCollide: false, reflectable: false, absorbable: false, destructible: false,
      pierce: true, dir: dir, glow: false,
      update(p, m) {
        if (!groundAt(m, p.x, gy, 4)) { p.destroy('edge'); return false; }
        if (p.t % 3 === 0) m.effects.spawn('debris', p.x, gy, { n: 1, color: o.color || '#8a7a6a' });
      },
      draw(ctx, p) {
        ctx.save(); ctx.translate(p.x, gy);
        const k = p.life / p.maxLife;
        ctx.fillStyle = U.rgba(o.color || '#cbb89a', 0.85 * k + 0.15);
        ctx.beginPath(); ctx.moveTo(-p.r * 1.4, 0);
        ctx.quadraticCurveTo(-p.r * 0.4, -p.r * 2.4, 0, -p.r * 2.6 * (0.6 + 0.4 * k));
        ctx.quadraticCurveTo(p.r * 0.4, -p.r * 2.4, p.r * 1.4, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
    }, o));
  }

  /* Comprueba si el luchador puede gastar medidor. */
  function spend(f, cost) {
    if (f.meter >= cost) { f.meter -= cost; return true; }
    f.fx('text', f.x, f.y - f.h - 24, { text: 'SIN ' + (f.def.meter.short || 'MEDIDOR'), color: '#aaa', size: 18 });
    NX.Audio.play('menuBack');
    return false;
  }

  /* Intenta agarrar un borde a distancia (recuperación con látigo/cadena). */
  function tetherLedge(f, reach) {
    if (f.ground) return false;
    for (const L of f.match.ledges) {
      /* Un borde izquierdo (face = 1) se agarra mirando a la derecha, y viceversa. */
      if (L.plat.removed || L.face !== f.facing) continue;
      const toward = (L.x - f.x) * f.facing;
      if (toward < 0 || toward > reach) continue;
      if (Math.abs(L.y - (f.y - f.h * 0.6)) > 90) continue;
      const occ = f.match.ledgeOwner.get(L.id);
      if (occ && occ !== f) continue;
      f.enterLedge(L);
      return true;
    }
    return false;
  }

  /* ======================= ACCESORIOS DE CABEZA ========================= */
  function hairCap(ctx, Rr, col, o) {
    o = o || {};
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, Rr * 1.06, PI + (o.a0 || 0.15), (o.a1 != null ? o.a1 : -0.35));
    ctx.quadraticCurveTo(Rr * 0.3, -Rr * 0.35, -Rr * 0.2, -Rr * 0.25);
    ctx.quadraticCurveTo(-Rr * 0.8, -Rr * 0.1, -Rr * 1.0, Rr * 0.35);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function spikes(ctx, Rr, col, n, len, a0, a1) {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const r = i % 2 ? Rr * (1 + len) : Rr * 0.9;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function earsPointy(ctx, Rr, col, inner) {
    [[-0.15, 0], [-0.7, 1]].forEach(([dx, back]) => {
      ctx.save(); ctx.translate(Rr * dx, -Rr * 0.75); ctx.rotate(back ? -0.35 : 0.1);
      R.poly(ctx, [[-Rr * 0.32, 0], [0, -Rr * 0.75], [Rr * 0.32, 0]], col);
      if (inner) R.poly(ctx, [[-Rr * 0.16, -2], [0, -Rr * 0.5], [Rr * 0.16, -2]], inner, false);
      ctx.restore();
    });
  }
  function earsRound(ctx, Rr, col, inner) {
    [[-0.1, -0.85], [-0.75, -0.6]].forEach(([dx, dy]) => {
      R.disc(ctx, Rr * dx, Rr * dy, Rr * 0.34, col);
      if (inner) R.disc(ctx, Rr * dx, Rr * dy, Rr * 0.18, inner, false);
    });
  }
  function earsLong(ctx, Rr, col, inner, sway) {
    [[0.05, 0.12], [-0.4, -0.18]].forEach(([dx, tilt], i) => {
      ctx.save(); ctx.translate(Rr * dx, -Rr * 0.7); ctx.rotate(tilt + sway * (i ? 1.3 : 1));
      R.ellipse(ctx, 0, -Rr * 0.95, Rr * 0.26, Rr * 1.0, 0, col);
      if (inner) R.ellipse(ctx, 0, -Rr * 0.9, Rr * 0.12, Rr * 0.75, 0, inner, false);
      ctx.restore();
    });
  }
  function elfEar(ctx, Rr, col) {
    R.poly(ctx, [[-Rr * 0.3, -Rr * 0.05], [-Rr * 1.15, -Rr * 0.65], [-Rr * 0.45, Rr * 0.3]], col);
  }
  function goggles(ctx, Rr, strap, lens, y) {
    y = y == null ? -Rr * 0.45 : y;
    ctx.fillStyle = strap; ctx.fillRect(-Rr * 1.02, y - Rr * 0.12, Rr * 2.04, Rr * 0.24);
    R.ellipse(ctx, Rr * 0.32, y, Rr * 0.28, Rr * 0.22, 0, lens);
    R.ellipse(ctx, -Rr * 0.18, y, Rr * 0.24, Rr * 0.2, 0, lens);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(Rr * 0.22, y - Rr * 0.12, Rr * 0.12, Rr * 0.06);
  }
  function headband(ctx, Rr, col, t, flow) {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -Rr * 0.32, Rr * 1.04, Rr * 0.2, 0, PI * 0.95, PI * 2.05); ctx.lineTo(Rr * 1.02, -Rr * 0.18);
    ctx.ellipse(0, -Rr * 0.18, Rr * 1.02, Rr * 0.18, 0, 0, PI, false); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const w = Math.sin(t * 0.18 + i) * 3;
      ctx.beginPath(); ctx.moveTo(-Rr * 0.95, -Rr * 0.25);
      ctx.quadraticCurveTo(-Rr * 1.6 - flow * 0.5, -Rr * 0.2 + w + i * 4, -Rr * 2.1 - flow, Rr * 0.1 + w * 1.5 + i * 6);
      ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 2.4; ctx.strokeStyle = col; ctx.stroke();
    }
  }
  function hood(ctx, Rr, col, inner) {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(Rr * 0.75, Rr * 0.9);
    ctx.quadraticCurveTo(Rr * 1.35, -Rr * 0.4, Rr * 0.4, -Rr * 1.25);
    ctx.quadraticCurveTo(-Rr * 0.8, -Rr * 1.55, -Rr * 1.5, -Rr * 0.2);
    ctx.quadraticCurveTo(-Rr * 1.4, Rr * 0.9, -Rr * 0.6, Rr * 1.2);
    ctx.lineTo(-Rr * 0.3, Rr * 0.6);
    ctx.quadraticCurveTo(-Rr * 0.9, -Rr * 0.6, Rr * 0.1, -Rr * 0.95);
    ctx.quadraticCurveTo(Rr * 0.95, -Rr * 0.6, Rr * 0.75, Rr * 0.9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (inner) { ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(Rr * 0.05, -Rr * 0.2, Rr * 0.95, PI * 1.05, PI * 1.9); ctx.fill(); }
  }

  /* ======================= ACCESORIOS DE CUERPO ========================= */
  function windOf(f) { return U.clamp(Math.abs(f.vx + f.lvx) * 1.8, 0, 22) + (f.ground ? 0 : 6); }
  function cape(ctx, a, col, len, wid, inner) {
    const { J, f } = a; const t = f.tick, w = windOf(f);
    const top = J.top, sh = J.sh;
    const wave = Math.sin(t * 0.17) * 4;
    ctx.save();
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(top.x + wid * 0.3, top.y + 2);
    ctx.lineTo(top.x - wid * 0.5, top.y + 3);
    ctx.quadraticCurveTo(sh.x - wid - w, sh.y + len * 0.55 + wave, sh.x - wid * 1.1 - w * 1.6, sh.y + len + wave * 0.6);
    ctx.lineTo(sh.x - wid * 0.2 - w * 1.2, sh.y + len * 1.05 - wave * 0.4);
    ctx.lineTo(sh.x + wid * 0.25 - w * 0.6, sh.y + len * 0.92);
    ctx.quadraticCurveTo(sh.x + wid * 0.3, sh.y + len * 0.4, top.x + wid * 0.3, top.y + 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (inner) {
      ctx.fillStyle = inner; ctx.beginPath();
      ctx.moveTo(top.x - wid * 0.3, top.y + 6);
      ctx.quadraticCurveTo(sh.x - wid * 0.8 - w, sh.y + len * 0.5, sh.x - wid * 0.6 - w * 1.4, sh.y + len * 0.95);
      ctx.lineTo(sh.x - wid * 0.25 - w * 1.1, sh.y + len * 0.98);
      ctx.quadraticCurveTo(sh.x - wid * 0.2, sh.y + len * 0.4, top.x - wid * 0.3, top.y + 6);
      ctx.fill();
    }
    ctx.restore();
  }
  function scarf(ctx, a, col, len) {
    const { J, f } = a; const t = f.tick, w = windOf(f);
    const n = a.J.top;
    ctx.save(); ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? col : OUT; ctx.lineWidth = pass ? 6 : 9;
      ctx.beginPath(); ctx.moveTo(n.x, n.y + 2);
      for (let i = 1; i <= 5; i++) {
        const k = i / 5;
        ctx.lineTo(n.x - k * (len * 0.6 + w * 1.6), n.y + 2 + k * len * 0.3 + Math.sin(t * 0.25 - i * 0.9) * (3 + w * 0.2) * k);
      }
      ctx.stroke();
    }
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(n.x + 1, n.y + 2, 9, 5, J.lean, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function tail(ctx, a, kind, col, tip) {
    const { J, f } = a; const t = f.tick;
    const base = { x: J.hip.x - 8, y: J.hip.y - 4 };
    ctx.save(); ctx.lineCap = 'round';
    if (kind === 'puff') { R.disc(ctx, base.x - 3, base.y, 7, col); ctx.restore(); return; }
    if (kind === 'stub') { R.ellipse(ctx, base.x - 4, base.y, 7, 5, 0.3, col); ctx.restore(); return; }
    const pts = [base];
    for (let i = 1; i <= 6; i++) {
      const k = i / 6;
      pts.push({ x: base.x - k * 28, y: base.y - Math.sin(k * 2.6) * 26 + Math.sin(t * 0.15 + i * 0.7) * 5 * k });
    }
    R.limb(ctx, pts, kind === 'thick' ? 9 : 5, col);
    if (tip) R.disc(ctx, pts[6].x, pts[6].y, 4, tip);
    ctx.restore();
  }
  function wingPair(ctx, a, col, edge, span, flap) {
    const { J } = a;
    const s = J.sh;
    for (let i = 0; i < 2; i++) {
      const sg = i ? 0.8 : 1;
      ctx.save(); ctx.translate(s.x - 4 - i * 3, s.y + 2); ctx.rotate(-0.4 - flap * sg - i * 0.25);
      ctx.fillStyle = i ? U.shade(col, -0.25) : col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-span * 0.5, -span * 0.65, -span * sg, -span * 0.35);
      for (let k = 0; k < 4; k++) ctx.lineTo(-span * sg * (0.85 - k * 0.2), -span * 0.1 + k * 6 + 8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-span * 0.45, -span * 0.55, -span * sg * 0.9, -span * 0.3); ctx.stroke(); }
      ctx.restore();
    }
  }
  function torsoStripes(ctx, a, col, n) {
    const rig = a.rig;
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) ctx.fillRect(-rig.torsoW * 0.5, -rig.torsoH * (0.3 + i * 0.22), rig.torsoW, 3);
  }

  /* ======================= DIBUJO DE PROYECTILES ======================== */
  function orbDraw(col, core) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.7, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, p.r);
      g.addColorStop(0, core || '#fff'); g.addColorStop(0.55, col); g.addColorStop(1, U.rgba(col, 0.2));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba('#ffffff', 0.6); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, p.r * 0.8, p.t * 0.2, p.t * 0.2 + 2); ctx.stroke();
      ctx.restore();
    };
  }
  function rockDraw(col) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.12 * U.sign(p.vx));
      const r = p.r;
      R.poly(ctx, [[-r, -r * 0.3], [-r * 0.5, -r], [r * 0.4, -r * 0.9], [r, -r * 0.2], [r * 0.7, r * 0.8], [-r * 0.4, r], [-r * 0.95, r * 0.4]], col);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.4); ctx.lineTo(r * 0.2, r * 0.2); ctx.lineTo(r * 0.5, -r * 0.1); ctx.stroke();
      ctx.restore();
    };
  }
  function boltDraw(col, len) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(-len * 0.5, -p.r * 0.45); ctx.lineTo(-len, -p.r * 0.3);
      ctx.lineTo(-len, p.r * 0.3); ctx.lineTo(-len * 0.5, p.r * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
  }
  function starDraw(col, pts) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.6);
      ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) { const r = i % 2 ? p.r * 0.35 : p.r; const a = i * PI / pts; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      R.disc(ctx, 0, 0, p.r * 0.2, '#333', false);
      ctx.restore();
    };
  }
  function flameDraw(col) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y);
      const a = Math.atan2(p.vy, p.vx);
      ctx.rotate(a);
      const fl = 1 + Math.sin(p.t * 0.8) * 0.15;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 1.8);
      g.addColorStop(0, '#fff6c0'); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(p.r * 1.1, 0);
      ctx.quadraticCurveTo(0, -p.r * 1.2 * fl, -p.r * 2.4, 0); ctx.quadraticCurveTo(0, p.r * 1.2 * fl, p.r * 1.1, 0); ctx.fill();
      ctx.restore();
      if (p.t % 3 === 0) p.match.effects.spawn('flame', p.x, p.y, { scale: 0.6 });
    };
  }
  function cloudDraw(col, alpha) {
    return (ctx, p) => {
      ctx.save();
      const k = Math.min(1, p.life / 20, p.t / 6);
      ctx.globalAlpha = (alpha || 0.7) * k;
      ctx.fillStyle = col;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + p.t * 0.02, rr = p.r * (0.45 + 0.15 * Math.sin(p.t * 0.05 + i));
        ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * p.r * 0.5, p.y + Math.sin(a) * p.r * 0.35, rr, 0, TAU); ctx.fill();
      }
      ctx.restore();
    };
  }

  /* Registro interno del plantel. */
  const ROSTER = [];
  function fighter(def) { ROSTER.push(def); return def; }

  /* ======================================================================
   * 01 · GORRAK — Coloso de Roca (superpesado)
   * Pasiva "Piel de Piedra": recibe un 10% menos de daño.
   * ==================================================================== */
  const gorrakShard = (p, x, y, vx) => p.owner.spawnProjectile({
    x, y, vx, vy: -5, gravity: 0.5, r: 7, dmg: 3, ang: 70, bkb: 20, kbg: 40, life: 40, effect: 'hit', glow: false,
    draw: rockDraw('#6f6a63'), onDestroy(q, w, m) { m.effects.spawn('debris', q.x, q.y, { n: 3, color: '#6f6a63' }); }
  });
  fighter({
    id: 'gorrak', name: 'Gorrak', title: 'Coloso de Roca',
    passive: 'Piel de Piedra: recibe un 10% menos de daño.',
    palette: { primary: '#6f6a63', secondary: '#45413b', skin: '#8a837a', head: '#8a837a', hand: '#7a736a', accent: '#ff7a1a', eye: '#ffb030', feet: '#3a3632', legs: '#5a554e', arms: '#7a736a' },
    stats: { weight: 138, height: 104, width: 50, walk: 2.4, run: 5.6, dash: 6.2, airSpeed: 3.4, airAccel: 0.26, gravity: 0.62, fall: 11, fastFall: 15.5, jump: 13.8, shortHop: 8.9, airJump: 12.8, traction: 0.62 },
    profile: { style: 'heavy', reach: 1.15, power: 1.15, speed: 0.9 },
    onIncoming: (f, dmg) => dmg * 0.9,
    ai: { recovery: 'up', projectile: 'neutral', range: 75, heavy: true },
    rig: {
      torsoW: 40, hipW: 32, torsoH: 30, torsoRound: 10, headR: 12, headW: 1.15, neck: 0, shoulderY: 6,
      upperArm: 17, foreArm: 16, armW: 14, handR: 9, thigh: 15, shin: 13, legW: 15, footL: 15, footH: 8,
      eyes: 'glow', mouth: false,
      parts: {
        back(ctx, a) {
          const t = a.J.top;
          [[-6, 2, 1], [-14, 8, 0.8], [2, 0, 0.7]].forEach(([dx, dy, k]) => {
            R.poly(ctx, [[t.x + dx - 6 * k, t.y + dy + 4], [t.x + dx - 2, t.y + dy - 22 * k], [t.x + dx + 5 * k, t.y + dy + 4]], '#9a5cff');
          });
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2; ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(a.f.tick * 0.1);
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.1, -r.torsoH * 0.9); ctx.lineTo(r.torsoW * 0.05, -r.torsoH * 0.6);
          ctx.lineTo(-r.torsoW * 0.15, -r.torsoH * 0.4); ctx.lineTo(r.torsoW * 0.1, -r.torsoH * 0.12);
          ctx.moveTo(r.torsoW * 0.05, -r.torsoH * 0.6); ctx.lineTo(r.torsoW * 0.3, -r.torsoH * 0.55); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-r.hipW / 2, -5, r.hipW, 5);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.95, -r * 0.4], [r * 1.25, -r * 0.6], [r * 1.1, -r * 0.18], [-r * 0.6, -r * 0.12]], a.pal.secondary);
          R.poly(ctx, [[r * 0.1, r * 0.55], [r * 1.05, r * 0.35], [r * 0.85, r * 0.85], [r * 0.1, r * 0.95]], a.pal.secondary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.1); ctx.lineTo(-r * 0.2, r * 0.45); ctx.lineTo(-r * 0.4, r * 0.8); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 18) return;
          NX.Audio.play('swing', { size: 1.5 });
          shoot(f, {
            ox: 16, oy: -f.h * 0.95, speed: 6.5, vy: -6, gravity: 0.38, maxFall: 14, r: 17, dmg: 13, ang: 45, bkb: 40, kbg: 85,
            effect: 'heavy', life: 120, destructible: false, absorbable: false, color: '#8a837a', glow: false, draw: rockDraw('#8a837a'),
            onDestroy(p, why, m) {
              m.effects.spawn('debris', p.x, p.y, { n: 10, color: '#7a736a' }); NX.Audio.play('stomp');
              if (why === 'stage' || why === 'hit') for (let i = -1; i <= 1; i++) gorrakShard(p, p.x, p.y - 8, i * 4);
            }
          });
        }
      },
      side: {
        frames: 48, pose: 'dashattack', oncePerAir: true, drift: 0, gravity: 0.3,
        armor: { f: [6, 24], kb: 110 }, vel: [{ f: [8, 24], vx: 8.5 }],
        hitboxes: [{ f: [8, 24], x: 28, y: -62, r: 28, dmg: 14, ang: 40, bkb: 55, kbg: 80, effect: 'heavy' }],
        onFrame(f, fr) {
          if (fr === 8) NX.Audio.play('dash');
          if (fr >= 8 && fr <= 24 && fr % 3 === 0 && f.ground) f.fx('dust', f.x - f.facing * 20, f.y, { n: 2, vx: -f.facing * 3 });
        }
      },
      up: {
        frames: 54, pose: 'rise', vel: [{ f: [6, 22], vy: -14, vx: 1.5 }],
        hitboxes: [
          { f: [5, 12], x: 0, y: -10, r: 34, dmg: 10, ang: 85, bkb: 60, kbg: 70, effect: 'fire', dir: 'auto' },
          { f: [13, 22], x: 8, y: -100, r: 24, dmg: 6, ang: 80, bkb: 45, kbg: 80, effect: 'heavy', group: 1 }],
        onStart(f) { NX.Audio.play('explosion', { pitch: 0.6 }); f.fx('debris', f.x, f.y, { n: 10, color: '#7a736a' }); },
        onFrame(f, fr) { if (fr <= 22 && fr % 2 === 0) f.fx('flame', f.x + U.rand(-14, 14), f.y + 6, { scale: 1.4 }); }
      },
      down: {
        frames: 50, pose: 'stomp',
        hitboxes: [{ f: [16, 18], x: 0, y: -12, r: 46, dmg: 12, ang: 80, bkb: 55, kbg: 70, effect: 'heavy', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr !== 16) return;
          groundWave(f, 1, { dmg: 8, color: '#a89a88' }); groundWave(f, -1, { dmg: 8, color: '#a89a88' });
          f.fx('shockwave', f.x, f.y, { r: 170 }); NX.Audio.play('stomp'); f.match.camera.shake(12);
        }
      },
      down_air: {
        frames: 40, pose: 'slam', vel: [{ f: [1, 8], vy: -3 }],
        hitboxes: [{ f: [9, 30], x: 0, y: 4, r: 30, dmg: 13, ang: 280, bkb: 30, kbg: 85, effect: 'heavy', meteor: true }],
        onStart(f, mv) { mv.noDrift = true; f.vx *= 0.3; },
        onFrame(f, fr, mv) {
          if (fr > 8) { f.vy = 16; mv.velY = true; }
          if (fr === 30 && !f.ground) mv.frame = 29;
        },
        onLand(f) {
          boom(f, f.x, f.y - 12, { r: 70, dmg: 11, ang: 70, bkb: 55, kbg: 70, effect: 'heavy' });
          groundWave(f, 1, { dmg: 7, color: '#a89a88' }); groundWave(f, -1, { dmg: 7, color: '#a89a88' });
          f.endMoveCleanup(true); f.startLand(22);
          return 'continue';
        }
      }
    }
  });

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

  /* ======================================================================
   * 03 · IRONCLAD — Ogro Mecánico (superpesado con 3 saltos de propulsor)
   * ==================================================================== */
  fighter({
    id: 'ironclad', name: 'Ironclad', title: 'Ogro Mecánico',
    passive: 'Propulsores: 3 saltos aéreos con impulso decreciente.',
    palette: { primary: '#c46a1c', secondary: '#3a3f4a', skin: '#8c96a4', head: '#9aa4b2', hand: '#5a626e', accent: '#ffd23a', visor: '#5ff3ff', feet: '#2a2e36', legs: '#3a3f4a', arms: '#8c96a4' },
    stats: { weight: 128, height: 98, width: 48, walk: 2.6, run: 5.8, dash: 6.4, airSpeed: 3.3, gravity: 0.6, fall: 10.5, fastFall: 15, jump: 12.8, shortHop: 8.4, airJump: 10.8, airJumps: 3, airJumpDecay: 0.1 },
    profile: { style: 'heavy', reach: 1.1, power: 1.1, speed: 0.92 },
    ai: { recovery: 'up', projectile: 'neutral', range: 90, heavy: true, extraJumps: true },
    onAirJump(f) {
      for (let i = 0; i < 5; i++) f.fx('flame', f.x - f.facing * 14 + U.rand(-6, 6), f.y - f.h * 0.35, { scale: 1.3 });
      NX.Audio.play('fire', { pitch: 1.3 });
    },
    rig: {
      torsoW: 38, hipW: 30, torsoH: 32, torsoRound: 6, headR: 12.5, headW: 1.15, neck: 2, armW: 13, upperArm: 15, foreArm: 15,
      handR: 8, legW: 14, thigh: 14, shin: 14, footL: 14, footH: 8, eyes: 'visor', mouth: false,
      parts: {
        back(ctx, a) {
          const { J, f } = a;
          ctx.save(); ctx.translate(J.sh.x - 16, J.sh.y + 4); ctx.rotate(J.lean);
          R.poly(ctx, [[-10, -16], [10, -16], [10, 22], [-10, 22]], a.pal.secondary);
          R.poly(ctx, [[-14, 18], [-4, 18], [-6, 30], [-12, 30]], '#5a626e');
          R.poly(ctx, [[2, 18], [12, 18], [10, 30], [4, 30]], '#5a626e');
          if (f.airJumpAnim > 0 || (f.move && f.move.def.key === 'special_up' && f.move.frame >= 8 && f.move.frame <= 26)) {
            for (const x of [-9, 7]) {
              const g = ctx.createLinearGradient(0, 30, 0, 64);
              g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ff9a2a'); g.addColorStop(1, 'rgba(255,60,0,0)');
              ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 5, 30); ctx.lineTo(x + 5, 30); ctx.lineTo(x, 58 + Math.random() * 10); ctx.closePath(); ctx.fill();
            }
          }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.42, -r.torsoH * 0.95], [r.torsoW * 0.42, -r.torsoH * 0.95], [r.torsoW * 0.32, -r.torsoH * 0.45], [-r.torsoW * 0.32, -r.torsoH * 0.45]], '#d9dee6');
          ctx.fillStyle = a.pal.accent;
          for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(-r.hipW * 0.5 + i * 8 + 2, -7); ctx.rotate(0.6); ctx.fillRect(-2, -5, 4, 10); ctx.restore(); }
          ctx.fillStyle = '#4a4f5a';
          [[-0.3, -0.85], [0.3, -0.85], [-0.25, -0.55], [0.25, -0.55]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r.torsoW, y * r.torsoH, 1.8, 0, TAU); ctx.fill(); });
        },
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r); ctx.lineTo(-r * 0.5, -r * 1.7); ctx.stroke();
          R.disc(ctx, -r * 0.5, -r * 1.75, 3, (a.f.tick % 40 < 20) ? '#ff3b3b' : '#7a1010');
          R.poly(ctx, [[r * 0.1, r * 0.5], [r * 1.05, r * 0.4], [r * 0.95, r * 0.9], [r * 0.1, r * 0.95]], '#5a626e');
          ctx.strokeStyle = '#2a2e36'; ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(r * (0.25 + i * 0.2), r * 0.52); ctx.lineTo(r * (0.25 + i * 0.2), r * 0.9); ctx.stroke(); }
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_side' || !mv.data.ball) return;
      const hx = f.x + 14 * f.facing, hy = f.y - f.h * 0.62;
      const bx = f.x + mv.data.ball.x * f.facing, by = f.y + mv.data.ball.y;
      ctx.save();
      ctx.strokeStyle = '#555c66'; ctx.lineWidth = 4; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      const g = ctx.createRadialGradient(bx - 6, by - 6, 2, bx, by, 22);
      g.addColorStop(0, '#9aa4b2'); g.addColorStop(1, '#2a2e36');
      ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(bx, by, 22, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 40, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 10 && fr !== 16 && fr !== 22) return;
          NX.Audio.play('laser', { pitch: 0.7 });
          shoot(f, { ox: 34, oy: -f.h * 0.58, speed: 13, vy: U.rand(-0.4, 0.4), r: 7, dmg: 3, ang: 30, bkb: 12, kbg: 30, life: 40, effect: 'hit', color: '#c0c8d2', glow: false, draw: boltDraw('#c0c8d2', 11) });
          f.fx('spark', f.x + f.facing * 36, f.y - f.h * 0.58, { n: 3, power: 0.4 });
        }
      },
      side: {
        frames: 54, pose: 'fsmash', oncePerAir: true, drift: 0.3, gravity: 0.5,
        onFrame(f, fr, mv) {
          if (fr >= 10 && fr <= 34) {
            const k = (fr - 10) / 24, ang = -1.9 + k * 2.75, L = 95;
            const bx = 14 + Math.cos(ang) * L, by = -f.h * 0.62 + Math.sin(ang) * L;
            mv.data.ball = { x: bx, y: by };
            mv.extraBoxes = (fr >= 16 && fr <= 34) ? [{ x: bx, y: by, r: 24, dmg: 15, ang: 45, bkb: 45, kbg: 90, effect: 'heavy' }] : null;
            if (fr === 16) NX.Audio.play('swing', { size: 2 });
          } else { mv.extraBoxes = null; if (fr > 34) mv.data.ball = null; }
        }
      },
      up: {
        frames: 50, pose: 'rise',
        hitboxes: [{ f: [8, 26], x: 0, y: -50, r: 30, dmg: 9, ang: 75, bkb: 50, kbg: 72, effect: 'fire', dir: 'auto' }],
        onStart(f, mv) {
          let x = f.input.x, y = Math.min(-0.4, f.input.y);
          if (Math.hypot(x, y) < 0.45) { x = 0; y = -1; }
          mv.data.a = U.clamp(Math.atan2(x, -y), -0.75, 0.75);
          if (Math.abs(x) > 0.2) f.facing = Math.sign(x);
        },
        onFrame(f, fr, mv) {
          if (fr < 8) { f.vy *= 0.7; f.vx *= 0.8; mv.velY = mv.velX = true; }
          else if (fr <= 26) {
            f.vx = Math.sin(mv.data.a) * 12.5; f.vy = -Math.cos(mv.data.a) * 12.5; mv.velX = mv.velY = true;
            if (fr % 2 === 0) f.fx('flame', f.x - Math.sin(mv.data.a) * 20, f.y + 4, { scale: 1.5 });
          }
          if (fr === 8) NX.Audio.play('fire');
        }
      },
      down: {
        frames: 48, pose: 'roar',
        hitboxes: [
          { f: [14, 30], x: 0, y: -48, r: 62, dmg: 1.5, rehit: 5, fkb: 30, bkb: 0, kbg: 100, ang: 361, dir: 'auto', effect: 'fire', burn: { frames: 120, dmg: 1 } },
          { f: [31, 33], x: 0, y: -48, r: 66, dmg: 6, ang: 361, bkb: 55, kbg: 80, dir: 'auto', effect: 'fire', group: 1 }],
        onFrame(f, fr) {
          if (fr === 14) NX.Audio.play('beam', { pitch: 0.5 });
          if (fr >= 14 && fr <= 32) for (let i = 0; i < 2; i++) {
            const a = Math.random() * TAU;
            f.fx('dust', f.x + Math.cos(a) * 40, f.y - f.h / 2 + Math.sin(a) * 40, { n: 1, scale: 1.3 });
          }
        }
      }
    }
  });

  /* ======================================================================
   * 04 · ROOK — Ingeniera de Chatarra (constructora con medidor)
   * Medidor CHATARRA: se llena con el tiempo y golpeando. Muros y torretas.
   * ==================================================================== */
  function crateDraw(ctx, b) {
    ctx.save();
    const blink = b.life < 90 && Math.floor(b.life / 6) % 2 === 0;
    ctx.globalAlpha = blink ? 0.55 : 1;
    ctx.fillStyle = '#7d8691'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    ctx.fillStyle = '#f2b632';
    for (let i = -b.h; i < b.w + b.h; i += 16) { ctx.beginPath(); ctx.moveTo(b.x + i, b.y); ctx.lineTo(b.x + i + 8, b.y); ctx.lineTo(b.x + i + 8 - b.h * 0.6, b.y + b.h); ctx.lineTo(b.x + i - b.h * 0.6, b.y + b.h); ctx.closePath(); ctx.globalAlpha = (blink ? 0.3 : 0.5); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = '#3a3f4a';
    [[4, 4], [b.w - 4, 4], [4, b.h - 4], [b.w - 4, b.h - 4]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(b.x + x, b.y + y, 2, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  fighter({
    id: 'rook', name: 'Rook', title: 'Ingeniera de Chatarra',
    passive: 'Constructora: genera CHATARRA para muros (25) y torretas (50).',
    palette: { primary: '#2e5a88', secondary: '#f2b632', skin: '#c98d64', head: '#c98d64', hand: '#3a3a3a', accent: '#ff6a2a', hair: '#5a2d1a', eye: '#1b1b1b', feet: '#3a2a20', legs: '#2e5a88', arms: '#c98d64', belt: '#5a3a20' },
    stats: { weight: 92, height: 78, width: 34, run: 6.8, airSpeed: 3.8 },
    profile: { style: 'fist', reach: 1, power: 1, speed: 1 },
    meter: { max: 100, start: 30, label: 'CHATARRA', short: 'CHATARRA', color: '#ffb02e', gainOnHit: 0.8, text: f => 'CHATARRA ' + Math.floor(f.meter) },
    ai: { recovery: 'up', projectile: 'neutral', range: 160, builder: true },
    onUpdate(f) { if (f.inPlay() && f.state !== ST.RESPAWN) f.addMeter(0.04); },
    rig: {
      headR: 12, torsoW: 22, hipW: 20, torsoH: 25, thigh: 14, shin: 14, armW: 7.5,
      weapon: { type: 'sword', len: 30, w: 6, trail: '#ffd27a' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, sw = Math.sin(a.f.tick * 0.15) * 3 - windOf(a.f) * 0.3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.5);
          ctx.quadraticCurveTo(-r * 1.9, -r * 0.6 + sw, -r * 1.7 + sw, r * 0.7);
          ctx.quadraticCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair);
          goggles(ctx, r, '#3a2a20', '#7fe9ff', -r * 0.62);
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.32, -r.torsoH * 0.7], [r.torsoW * 0.32, -r.torsoH * 0.7], [r.hipW * 0.45, -2], [-r.hipW * 0.45, -2]], a.pal.secondary);
          ctx.fillStyle = OUT;
          ctx.fillRect(-r.torsoW * 0.32, -r.torsoH * 0.98, 3, r.torsoH * 0.3); ctx.fillRect(r.torsoW * 0.32 - 3, -r.torsoH * 0.98, 3, r.torsoH * 0.3);
          ctx.fillStyle = '#d99a20'; ctx.fillRect(-5, -r.torsoH * 0.5, 10, 7);
        },
        weapon(ctx, f, w) {
          ctx.fillStyle = '#9aa4ae'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.rect(-2.5, -4, 5, w.len - 6); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-8, w.len - 8); ctx.lineTo(8, w.len - 8); ctx.lineTo(8, w.len + 4); ctx.lineTo(3, w.len + 4);
          ctx.lineTo(3, w.len - 2); ctx.lineTo(-3, w.len - 2); ctx.lineTo(-3, w.len + 4); ctx.lineTo(-8, w.len + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_up' || mv.frame > 50) return;
      const x = f.x, y = f.y - f.h - 8, a = f.tick * 0.9;
      ctx.save();
      ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#c0c8d2';
      for (let i = 0; i < 2; i++) { const s = Math.cos(a + i * PI); ctx.beginPath(); ctx.ellipse(x + s * 13, y, Math.abs(s) * 14 + 2, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      R.disc(ctx, x, y, 3.5, '#ff6a2a');
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 36, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 8 && fr !== 13 && fr !== 18) return;
          NX.Audio.play('laser', { pitch: 1.8 });
          shoot(f, { ox: 30, oy: -f.h * 0.55, speed: 14, vy: U.rand(-0.6, 0.6), r: 6, dmg: 2.5, ang: 20, bkb: 8, kbg: 22, life: 30, color: '#d9dee6', glow: false, draw: boltDraw('#d9dee6', 8) });
        }
      },
      side: {
        frames: 30, pose: 'cast',
        onStart(f, mv) { mv.data.ok = spend(f, 25); },
        onFrame(f, fr, mv) {
          if (fr !== 10 || !mv.data.ok) return;
          const m = f.match;
          let b;
          if (f.ground) b = { x: f.x + f.facing * 58 - 20, y: f.ground.y - 64, w: 40, h: 64 };
          else b = { x: f.x + f.facing * 30 - 36, y: f.y + 14, w: 72, h: 18 };
          const blk = m.addSolid(Object.assign(b, { type: 'solid', life: 420, owner: f, color: '#7d8691', draw: crateDraw }));
          f.data.blocks = (f.data.blocks || []).filter(x => !x.removed);
          f.data.blocks.push(blk);
          if (f.data.blocks.length > 2) m.removeSolid(f.data.blocks.shift());
          f.spawnProjectile({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: 0, vy: 0, r: Math.max(b.w, b.h) * 0.6, life: 3, dmg: 6, ang: 60, bkb: 40, kbg: 60, dir: 'auto', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false, draw() {} });
          f.fx('debris', b.x + b.w / 2, b.y + b.h, { n: 6, color: '#7d8691' });
          NX.Audio.play('block');
        }
      },
      up: {
        frames: 62, pose: 'rise', drift: 1,
        hitboxes: [{ f: [4, 46], x: 0, y: -92, r: 22, dmg: 1.2, rehit: 6, fkb: 18, bkb: 0, kbg: 100, ang: 80, effect: 'hit', dir: 'auto' }],
        onFrame(f, fr, mv) {
          if (fr >= 4 && fr <= 46) {
            f.vy = fr < 30 ? -6.6 : -3.5; mv.velY = true;
            if (fr % 6 === 0) NX.Audio.play('spin', { pitch: 1.4 });
          }
        }
      },
      down: {
        frames: 40, pose: 'kneel',
        onStart(f, mv) { mv.data.ok = spend(f, 50); },
        onFrame(f, fr, mv) {
          if (fr !== 16 || !mv.data.ok) return;
          if (f.data.turret && f.data.turret.active) f.data.turret.destroy('replace');
          NX.Audio.play('block');
          f.data.turret = f.spawnProjectile({
            x: f.x + f.facing * 36, y: f.y - 16, vx: 0, vy: 0, gravity: 0.6, maxFall: 12, r: 16, dmg: 0, harmless: true,
            life: 420, reflectable: false, absorbable: false, destructible: false, passCollide: true, facing: f.facing, glow: false,
            onGround(p, pl) { p.y = pl.y - p.r; p.vy = 0; p.data.grounded = true; },
            update(p) {
              if (!p.data.grounded || p.t % 45 !== 20) return;
              const foe = nearestFoe(p.owner, p.x, p.y, 640);
              if (!foe) return;
              p.facing = U.sign(foe.x - p.x);
              p.owner.spawnProjectile({ x: p.x + p.facing * 18, y: p.y - 8, vx: p.facing * 11, vy: 0, r: 6, dmg: 3, ang: 30, bkb: 15, kbg: 30, life: 60, color: '#ffd23a', glow: false, draw: boltDraw('#ffd23a', 9) });
              NX.Audio.play('laser', { pitch: 1.6 });
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y);
              const blink = p.life < 90 && Math.floor(p.life / 6) % 2 === 0;
              if (blink) ctx.globalAlpha = 0.5;
              ctx.strokeStyle = OUT; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.moveTo(-12, 16); ctx.lineTo(0, 2); ctx.lineTo(12, 16); ctx.stroke();
              R.disc(ctx, 0, -2, 11, '#f2b632');
              ctx.fillStyle = '#3a3f4a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.rect(p.facing > 0 ? 4 : -20, -6, 16, 7); ctx.fill(); ctx.stroke();
              R.disc(ctx, 0, -3, 3, p.t % 45 < 8 ? '#ff3b3b' : '#7fe9ff', false);
              ctx.restore();
            }
          });
        }
      }
    }
  });

  /* ======================================================================
   * 05 · KAITO REN — Puño de Jade (equilibrado, artes marciales)
   * ==================================================================== */
  fighter({
    id: 'kaito', name: 'Kaito Ren', title: 'Puño de Jade',
    passive: 'Disciplina: kit equilibrado con contraataque.',
    palette: { primary: '#1f8a5b', secondary: '#f0e6d2', skin: '#e2b48a', head: '#e2b48a', hand: '#e2b48a', accent: '#7dffb0', hair: '#1a1a1a', belt: '#111111', feet: '#f0e6d2', legs: '#145c3d', arms: '#e2b48a' },
    stats: { weight: 98, height: 82, width: 34, run: 7.2, airSpeed: 4.1 },
    profile: { style: 'fist', reach: 1, power: 1, speed: 1.05 },
    ai: { recovery: 'up', projectile: 'neutral', range: 70, counter: 'down' },
    rig: {
      headR: 12, torsoW: 22, hipW: 18, torsoH: 26,
      parts: {
        headBack(ctx, a) { const r = a.rig.headR; R.disc(ctx, -r * 0.55, -r * 0.95, r * 0.38, a.pal.hair); },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.5 });
          headband(ctx, r, '#c8202a', a.f.tick, windOf(a.f));
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.3, -r.torsoH); ctx.lineTo(r.torsoW * 0.1, -r.torsoH * 0.45); ctx.lineTo(r.torsoW * 0.35, -r.torsoH); ctx.stroke();
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2 - 1, -7, r.hipW + 2, 6);
          ctx.fillRect(-r.hipW / 2 - 4, -5, 5, 12);
        }
      }
    },
    specials: {
      neutral: {
        frames: 38, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('magic', { pitch: 0.9 });
          shoot(f, {
            ox: 30, speed: 9, r: 13, dmg: 7, ang: 45, bkb: 35, kbg: 55, effect: 'magic', life: 50, color: '#7dffb0', trail: 5,
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.vx), 1);
              ctx.globalAlpha = 0.4; R.disc(ctx, 0, 0, p.r * 1.5, '#7dffb0', false); ctx.globalAlpha = 1;
              R.ellipse(ctx, 2, 0, p.r, p.r * 0.75, 0, '#bfffd9');
              ctx.fillStyle = '#1f8a5b'; for (let i = 0; i < 4; i++) ctx.fillRect(p.r * 0.2, -p.r * 0.55 + i * p.r * 0.3, p.r * 0.7, 2);
              ctx.restore();
            }
          });
        }
      },
      side: {
        frames: 44, pose: 'kick', oncePerAir: true, drift: 0,
        vel: [{ f: [6, 20], vx: 9, vy: 0 }],
        hitboxes: [
          { f: [6, 14], x: 28, y: -42, r: 17, dmg: 2.5, rehit: 4, fkb: 35, bkb: 0, kbg: 100, ang: 30, effect: 'hit' },
          { f: [16, 20], x: 32, y: -42, r: 20, dmg: 8, ang: 40, bkb: 50, kbg: 85, effect: 'hit', group: 1 }],
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('dash'); if (fr >= 6 && fr <= 20 && fr % 2 === 0) f.fx('sparkle', f.x - f.facing * 16, f.y - f.h / 2, { color: '#7dffb0' }); }
      },
      up: {
        frames: 46, pose: 'spin', vel: [{ f: [4, 20], vy: -12.5, vx: 2 }],
        hitboxes: [
          { f: [4, 10], x: 0, y: -52, r: 24, dmg: 10, ang: 85, bkb: 55, kbg: 80, effect: 'hit', dir: 'auto' },
          { f: [11, 20], x: 0, y: -52, r: 22, dmg: 5, ang: 80, bkb: 40, kbg: 70, effect: 'hit', group: 1, dir: 'auto' }],
        onFrame(f, fr) { if (fr === 4) NX.Audio.play('spin'); }
      },
      down: {
        frames: 50, pose: 'counter',
        counter: { f: [6, 26], mult: 1.3, range: 150, hit: { ang: 40, bkb: 60, kbg: 82, effect: 'magic' } }
      }
    }
  });

  /* ======================================================================
   * 06 · SYLRA — Guardabosques Espinosa (zoner de plantas)
   * ==================================================================== */
  function briarDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y + 22);
    const k = Math.min(1, p.t / 10, p.life / 20);
    ctx.scale(1, k);
    ctx.strokeStyle = '#3d5a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 9, 0);
      ctx.quadraticCurveTo(i * 12 + Math.sin(p.t * 0.05 + i) * 4, -22, i * 6, -36 + Math.abs(i) * 4); ctx.stroke();
    }
    ctx.fillStyle = '#d6ff6b';
    for (let i = 0; i < 9; i++) { const x = Math.sin(i * 2.3) * 26, y = -8 - (i * 7 % 30); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 3); ctx.lineTo(x + 1, y + 2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ff5a8a';
    [[-12, -30], [14, -26], [0, -38]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function briar(f, x, gy, life) {
    if (f.data.briar && f.data.briar.active) f.data.briar.destroy('replace');
    f.data.briar = f.spawnProjectile({
      x, y: gy - 22, vx: 0, vy: 0, r: 34, life: life || 160, dmg: 2.5, ang: 80, fkb: 35, bkb: 0, kbg: 100, rehit: 18, hits: 99,
      pierce: true, effect: 'hit', stageCollide: false, reflectable: false, absorbable: false, destructible: false,
      transcendent: true, dir: 'auto', glow: false, draw: briarDraw
    });
    f.fx('debris', x, gy, { n: 5, color: '#4f7a2a' });
    return f.data.briar;
  }
  const seedDraw = (ctx, p) => { R.ellipse(ctx, p.x, p.y, p.r, p.r * 0.75, p.t * 0.3, '#8a5a2a'); ctx.fillStyle = '#d6ff6b'; ctx.fillRect(p.x - 1, p.y - p.r - 3, 2, 4); };
  fighter({
    id: 'sylra', name: 'Sylra', title: 'Guardabosques Espinosa',
    passive: 'Control de zona: zarzales que castigan el terreno.',
    palette: { primary: '#4f7a2a', secondary: '#6b4a2b', skin: '#e8c9a0', head: '#e8c9a0', hand: '#e8c9a0', accent: '#d6ff6b', hair: '#c26a2a', eye: '#2a5a1a', feet: '#4a3220', legs: '#6b4a2b', arms: '#e8c9a0' },
    stats: { weight: 90, height: 84, width: 32, run: 6.6, airSpeed: 3.9, gravity: 0.52 },
    profile: { style: 'kick', reach: 1.05, power: 0.96, speed: 1.02 },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 200, zoner: true },
    rig: {
      headR: 11.5, torsoW: 19, hipW: 18, torsoH: 26, thigh: 16, shin: 16, armW: 6.5,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f), sw = Math.sin(a.f.tick * 0.12) * 2;
          const pts = [{ x: -r * 0.6, y: 0 }];
          for (let i = 1; i <= 4; i++) pts.push({ x: -r * 0.8 - i * (2 + w * 0.15), y: i * r * 0.5 + sw * i * 0.4 });
          R.limb(ctx, pts, 7, a.pal.hair);
          R.disc(ctx, pts[4].x, pts[4].y + 3, 3, a.pal.accent);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          elfEar(ctx, r, a.pal.skin);
          hairCap(ctx, r, a.pal.hair);
          ctx.fillStyle = '#7fbf3a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-r * 0.2 + i * r * 0.4, -r * 0.95); ctx.rotate(-0.6 + i * 0.6); ctx.beginPath(); ctx.ellipse(0, -3, 2.5, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
        },
        back(ctx, a) {
          const { J, f } = a, w = windOf(f), t = J.top;
          ctx.fillStyle = '#3d5a1a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(t.x + 4, t.y);
          for (let i = 0; i <= 5; i++) ctx.lineTo(t.x - 8 - i * 3 - w * (i / 5), t.y + 6 + i * 6 + (i % 2) * 5);
          ctx.lineTo(t.x - 2, t.y + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-r.hipW / 2, -7, r.hipW, 5);
          R.poly(ctx, [[r.hipW * 0.1, -4], [r.hipW * 0.45, -4], [r.hipW * 0.4, 6], [r.hipW * 0.12, 6]], '#8a5a2a');
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(0, -r.torsoH * 0.95); ctx.lineTo(0, -r.torsoH * 0.35); ctx.stroke();
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_side' || mv.frame < 8 || mv.frame > 24) return;
      const fr = mv.frame, ext = fr <= 12 ? (fr - 8) / 4 : fr <= 16 ? 1 : 1 - (fr - 16) / 8;
      const hx = f.x + f.facing * 18, hy = f.y - f.h * 0.55, len = 110 * ext;
      ctx.save(); ctx.lineCap = 'round';
      const ex = hx + f.facing * len, ey = hy + 4;
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ex) / 2, hy - 14 * ext, ex, ey); ctx.stroke();
      ctx.strokeStyle = '#4f7a2a'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.fillStyle = '#7fbf3a';
      for (let i = 1; i < 5; i++) { const k = i / 5; ctx.beginPath(); ctx.ellipse(hx + (ex - hx) * k, hy - 10 * ext * Math.sin(k * PI) - 3, 3, 6, f.facing * 0.8, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 36, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 14) return;
          NX.Audio.play('swing');
          shoot(f, {
            ox: 18, oy: -f.h * 0.85, speed: 6, vy: -7, gravity: 0.4, r: 9, dmg: 5, ang: 50, bkb: 25, kbg: 45, life: 100,
            effect: 'hit', passCollide: true, glow: false, draw: seedDraw,
            onGround(p, pl) { briar(p.owner, p.x, pl.y, 140); p.destroy('sprout'); },
            onHit(p, t) { boom(p.owner, p.x, p.y, { r: 30, dmg: 6, ang: 60, bkb: 40, kbg: 50, effect: 'hit' }); }
          });
        }
      },
      side: {
        frames: 44, pose: 'shoot',
        hitboxes: [
          { f: [12, 16], x: 100, y: -46, r: 20, dmg: 7, ang: 20, fkb: 62, bkb: 0, kbg: 100, reverse: true, effect: 'hit' },
          { f: [12, 16], x: 60, y: -46, r: 16, dmg: 6, ang: 20, fkb: 55, bkb: 0, kbg: 100, reverse: true, effect: 'hit' }],
        onFrame(f, fr) {
          if (fr === 9) NX.Audio.play('swing', { pitch: 1.4 });
          if (fr >= 12 && fr <= 16) tetherLedge(f, 150);
        }
      },
      up: {
        frames: 44, pose: 'rise', vel: [{ f: [5, 16], vy: -14, vx: 1.5 }],
        hitboxes: [{ f: [5, 9], x: 0, y: -10, r: 26, dmg: 9, ang: 88, bkb: 60, kbg: 70, effect: 'hit', dir: 'auto' }],
        onStart(f) { NX.Audio.play('spin', { pitch: 0.8 }); },
        onFrame(f, fr) {
          if (fr === 5) { f.fx('debris', f.x, f.y + 4, { n: 6, color: '#4f7a2a' }); f.fx('ring', f.x, f.y, { r: 36, color: '#d6ff6b' }); }
          if (fr >= 5 && fr <= 18 && fr % 3 === 0) f.fx('feather', f.x + U.rand(-15, 15), f.y, { color: '#7fbf3a' });
        }
      },
      down: {
        frames: 40, pose: 'kneel',
        onFrame(f, fr) {
          if (fr !== 14) return;
          NX.Audio.play('block');
          if (f.ground) {
            const gx = f.x + f.facing * 55;
            briar(f, groundAt(f.match, gx, f.ground.y, 4) ? gx : f.x, f.ground.y, 180);
          } else {
            shoot(f, { ox: 0, oy: -10, speed: 0, vy: 8, gravity: 0.5, r: 8, dmg: 4, ang: 280, bkb: 20, kbg: 40, life: 90, passCollide: true, glow: false, draw: seedDraw,
              onGround(p, pl) { briar(p.owner, p.x, pl.y, 160); p.destroy('sprout'); } });
          }
        }
      }
    }
  });

  /* ======================================================================
   * 07 · NYX — Gata Sombra (ligera y veloz)
   * Pasiva "Velo": tras la Bomba de Humo se vuelve casi invisible.
   * ==================================================================== */
  fighter({
    id: 'nyx', name: 'Nyx', title: 'Gata Sombra',
    passive: 'Velo: tras la Bomba de Humo es casi invisible.',
    palette: { primary: '#2b2b3a', secondary: '#121218', skin: '#2b2b3a', head: '#34344a', hand: '#34344a', accent: '#ff3b7a', eye: '#111', sclera: '#ffe14d', feet: '#121218', legs: '#1c1c28', arms: '#34344a' },
    stats: { weight: 76, height: 72, width: 30, walk: 3.4, run: 8.4, dash: 9, airSpeed: 4.4, gravity: 0.66, fall: 11, fastFall: 16.5, jump: 13.6, shortHop: 8.6, airJump: 12.6, traction: 0.62 },
    profile: { style: 'fist', reach: 0.95, power: 0.88, speed: 1.15, effect: 'slash' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 60, rushdown: true },
    onUpdate(f) {
      if (f.data.vanish > 0) { f.data.vanish--; f.tint = 'shadow'; if (f.data.vanish === 0) f.tint = null; }
    },
    onHurt(f) { f.data.vanish = 0; f.tint = null; },
    poseMod(f, p) { if (f.data.vanish > 0) return { alpha: p.alpha * (f.isHuman ? 0.4 : 0.22) }; return null; },
    rig: {
      headR: 13, headW: 1.05, torsoW: 17, hipW: 15, torsoH: 21, thigh: 14, shin: 14, legW: 8, armW: 6, handR: 4.5, footL: 9,
      mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          earsPointy(ctx, r, a.pal.head, '#ff8ab0');
          R.poly(ctx, [[-r * 0.2, r * 0.15], [r * 1.05, r * 0.05], [r * 0.85, r * 0.75], [-r * 0.1, r * 0.85]], a.pal.secondary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-r * 0.1, r * 0.12, r * 1.1, 2.5);
        },
        tail(ctx, a) { tail(ctx, a, 'thin', a.pal.head, a.pal.accent); },
        back(ctx, a) { scarf(ctx, a, a.pal.accent, 30); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.4, -r.torsoH * 0.9); ctx.lineTo(r.torsoW * 0.4, -r.torsoH * 0.2); ctx.stroke();
          ctx.fillStyle = '#121218'; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 4);
        },
        hand(ctx, a) {
          const h = a.J.haF; ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.2;
          for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(h.x + 2, h.y + i * 2.5); ctx.lineTo(h.x + 7, h.y + i * 3); ctx.stroke(); }
        }
      }
    },
    specials: {
      neutral: {
        frames: 28, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('slash', { pitch: 1.5 });
          [-1.1, 1.1].forEach(vy => shoot(f, { ox: 26, oy: -f.h * 0.55, speed: 13, vy, r: 8, dmg: 3, ang: 45, bkb: 15, kbg: 40, life: 34, effect: 'slash', color: '#cfd6e0', glow: false, draw: starDraw('#cfd6e0', 4) }));
        }
      },
      side: {
        frames: 40, pose: 'dashattack', oncePerAir: true, drift: 0, intangible: [6, 16],
        vel: [{ f: [6, 16], vx: 13, vy: 0 }, { f: [17, 22], vx: 3 }],
        hitboxes: [{ f: [6, 16], x: 6, y: -36, r: 24, dmg: 9, ang: 40, bkb: 45, kbg: 70, effect: 'slash' }],
        onFrame(f, fr) {
          if (fr === 6) { NX.Audio.play('slash'); f.tint = 'shadow'; }
          if (fr >= 6 && fr <= 16 && fr % 2 === 0) f.match.effects.list.push({ type: 'wisp', x: f.x - f.facing * 10, y: f.y - f.h / 2, vx: 0, vy: -0.3, life: 14, max: 14, size: 12, color: '#5a3a7a' });
          if (fr === 17 && !(f.data.vanish > 0)) f.tint = null;
        },
        onEnd(f) { if (!(f.data.vanish > 0)) f.tint = null; }
      },
      up: {
        frames: 40, pose: 'flip',
        vel: [{ f: [4, 12], vy: -12, vx: 3 }, { f: [16, 24], vy: -10, vx: 2 }],
        hitboxes: [
          { f: [4, 10], x: 10, y: -40, r: 20, dmg: 6, ang: 80, bkb: 45, kbg: 60, effect: 'slash' },
          { f: [16, 22], x: 10, y: -46, r: 22, dmg: 7, ang: 85, bkb: 50, kbg: 85, effect: 'slash', group: 1 }],
        onFrame(f, fr) { if (fr === 4 || fr === 16) { NX.Audio.play('airjump', { pitch: 1.3 }); f.fx('ring', f.x, f.y, { r: 20, color: '#ff3b7a' }); } }
      },
      down: {
        frames: 34, pose: 'kneel', intangible: [8, 14],
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('explosion', { pitch: 1.6 });
          f.spawnProjectile({
            x: f.x, y: f.y - f.h * 0.45, vx: 0, vy: 0, r: 62, life: 70, dmg: 3, ang: 60, fkb: 40, bkb: 0, kbg: 100, hits: 99, pierce: true,
            effect: 'dark', stageCollide: false, reflectable: false, absorbable: false, destructible: false, transcendent: true, dir: 'auto', glow: false,
            update(p) { if (p.t > 6) p.harmless = true; },
            draw: cloudDraw('#6a6a7a', 0.8)
          });
          f.data.vanish = 110;
        }
      }
    }
  });

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

  /* ======================================================================
   * 09 · VALKYR-7 — Guardiana Autómata (zoner pesada)
   * ==================================================================== */
  fighter({
    id: 'valkyr', name: 'Valkyr-7', title: 'Guardiana Autómata',
    passive: 'Blindaje: dos reflectores en su kit.',
    palette: { primary: '#e8ecf2', secondary: '#2a3a5a', skin: '#9fb0c8', head: '#e8ecf2', hand: '#2a3a5a', accent: '#38d0ff', visor: '#38d0ff', feet: '#2a3a5a', legs: '#c9d2de', arms: '#c9d2de' },
    stats: { weight: 108, height: 90, width: 38, run: 6.2, airSpeed: 3.5, gravity: 0.55, fall: 9.6, jump: 13, airJump: 11.8 },
    profile: { style: 'fist', reach: 1.05, power: 1.02, speed: 0.96 },
    ai: { recovery: 'up', projectile: 'neutral', range: 230, zoner: true, reflect: 'down' },
    rig: {
      headR: 12, headH: 1.05, torsoW: 24, hipW: 20, torsoH: 28, armW: 8, legW: 10, handR: 5.5, eyes: 'visor', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.8, -r * 0.6], [-r * 0.2, -r * 1.75], [r * 0.25, -r * 0.95]], a.pal.accent);
          R.disc(ctx, -r * 0.35, r * 0.05, r * 0.3, a.pal.secondary);
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.98], [r.torsoW * 0.5, -r.torsoH * 0.98], [r.torsoW * 0.36, -r.torsoH * 0.6], [-r.torsoW * 0.36, -r.torsoH * 0.6]], '#c9d2de');
          const pulse = 0.6 + 0.4 * Math.sin(a.f.tick * 0.12);
          ctx.fillStyle = U.rgba('#38d0ff', pulse); ctx.beginPath(); ctx.arc(0, -r.torsoH * 0.58, 5, 0, TAU); ctx.fill();
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 6);
        },
        back(ctx, a) {
          const s = a.J.sh;
          R.poly(ctx, [[s.x - 14, s.y - 6], [s.x - 4, s.y - 8], [s.x - 6, s.y + 14], [s.x - 16, s.y + 10]], '#9fb0c8');
        }
      }
    },
    specials: {
      neutral: {
        frames: 44, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 16) return;
          NX.Audio.play('laser', { pitch: 0.5 });
          shoot(f, {
            ox: 20, oy: -f.h * 0.8, speed: 5.5 + f.input.x * f.facing * 1.5, vy: -10, gravity: 0.4, maxFall: 14, r: 10, dmg: 6, ang: 50, bkb: 30, kbg: 50,
            effect: 'fire', life: 140, passCollide: true, color: '#38d0ff', glow: false,
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
              R.ellipse(ctx, 0, 0, p.r * 1.3, p.r * 0.8, 0, '#d9dee6');
              ctx.fillStyle = '#38d0ff'; ctx.fillRect(-p.r * 0.2, -p.r * 0.8, 3, p.r * 1.6);
              ctx.restore();
            },
            onDestroy(p, why) { if (why !== 'out' && why !== 'replace') boom(p.owner, p.x, p.y, { r: 52, dmg: 11, ang: 60, bkb: 50, kbg: 75, effect: 'fire' }); }
          });
        }
      },
      side: {
        frames: 42, pose: 'guard', oncePerAir: true, drift: 0.2,
        vel: [{ f: [6, 18], vx: 8 }],
        reflect: { f: [6, 18], x: 26, y: -46, r: 36, mult: 1.3, color: '#38d0ff' },
        hitboxes: [{ f: [6, 18], x: 28, y: -46, r: 22, dmg: 10, ang: 50, bkb: 50, kbg: 70, effect: 'hit' }],
        onFrame(f, fr) { if (fr === 6) NX.Audio.play('dash'); }
      },
      up: {
        frames: 48, pose: 'uppercut', vel: [{ f: [6, 22], vy: -13, vx: 1.5 }],
        hitboxes: [
          { f: [6, 12], x: 18, y: -72, r: 20, dmg: 12, ang: 82, bkb: 55, kbg: 85, effect: 'hit' },
          { f: [13, 22], x: 10, y: -72, r: 18, dmg: 6, ang: 80, bkb: 40, kbg: 70, effect: 'hit', group: 1 }],
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('fire', { pitch: 1.4 });
          if (fr >= 6 && fr <= 22 && fr % 2 === 0) f.fx('flame', f.x - f.facing * 10, f.y - f.h * 0.4, { scale: 1.1 });
        }
      },
      down: {
        frames: 56, pose: 'guard', gravity: 0.3,
        reflect: { f: [8, 40], x: 0, y: -46, r: 62, mult: 1.5, color: '#38d0ff' },
        hitboxes: [{ f: [8, 9], x: 0, y: -46, r: 52, dmg: 4, ang: 361, bkb: 60, kbg: 30, dir: 'auto', effect: 'elec' }],
        onFrame(f, fr) { if (fr === 8) NX.Audio.play('reflect'); }
      }
    }
  });

  /* ======================================================================
   * 10 · JETT — Piloto Ígnea (rushdown de caída rápida)
   * ==================================================================== */
  fighter({
    id: 'jett', name: 'Jett', title: 'Piloto Ígnea',
    passive: 'Botas propulsoras: la caída más rápida del plantel.',
    palette: { primary: '#d62a2a', secondary: '#1b1b22', skin: '#c48a5e', head: '#c48a5e', hand: '#1b1b22', accent: '#ffb030', hair: '#f2f2f2', feet: '#3a3a44', legs: '#1b1b22', arms: '#d62a2a', belt: '#1b1b22' },
    stats: { weight: 82, height: 80, width: 32, walk: 3.4, run: 8.0, dash: 8.6, airSpeed: 4.0, gravity: 0.78, fall: 12.5, fastFall: 18, jump: 15.2, shortHop: 9.6, airJump: 13.6, traction: 0.65 },
    profile: { style: 'kick', reach: 0.95, power: 0.94, speed: 1.18 },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 60, rushdown: true },
    rig: {
      headR: 12, torsoW: 20, hipW: 17, torsoH: 24, thigh: 15, shin: 15, footL: 12,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          spikes(ctx, r, a.pal.hair, 9, 0.35, PI * 1.0, PI * 2.05);
          goggles(ctx, r, '#3a3a44', '#ffb030', -r * 0.7);
        },
        back(ctx, a) {
          const s = a.J.sh;
          R.poly(ctx, [[s.x - 8, s.y - 4], [s.x - 22, s.y + 2], [s.x - 18, s.y + 16], [s.x - 6, s.y + 12]], '#3a3a44');
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.62, r.torsoW, 3);
          R.disc(ctx, r.torsoW * 0.22, -r.torsoH * 0.82, 3, '#ffe14d');
        },
        front(ctx, a) {
          const f = a.f;
          if (f.ground || f.vy + f.lvy > 1) return;
          for (const ft of [a.J.ftF, a.J.ftB]) {
            ctx.save(); ctx.globalAlpha = 0.85;
            const g = ctx.createLinearGradient(ft.x, ft.y, ft.x, ft.y + 18);
            g.addColorStop(0, '#fff6c0'); g.addColorStop(1, 'rgba(255,90,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ft.x - 4, ft.y + 2); ctx.lineTo(ft.x + 4, ft.y + 2); ctx.lineTo(ft.x, ft.y + 16 + Math.random() * 6); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
        }
      }
    },
    specials: {
      neutral: {
        frames: 30, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 9) return;
          NX.Audio.play('laser', { pitch: 0.8 });
          shoot(f, {
            ox: 28, speed: 10, vy: 1.2, r: 8, dmg: 5, ang: 50, bkb: 30, kbg: 50, life: 50, effect: 'fire', trail: 6, color: '#ffb030', glow: false,
            update(p) { p.vx *= 1.03; },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
              R.poly(ctx, [[12, 0], [4, -4], [-8, -4], [-11, -7], [-11, 7], [-8, 4], [4, 4]], '#d9dee6');
              ctx.fillStyle = '#d62a2a'; ctx.fillRect(4, -4, 4, 8);
              ctx.restore();
            },
            onDestroy(p, why) { if (why !== 'out') boom(p.owner, p.x, p.y, { r: 30, dmg: 4, ang: 50, bkb: 30, kbg: 40, effect: 'fire' }); }
          });
        }
      },
      side: {
        frames: 40, pose: 'dashattack', oncePerAir: true, drift: 0,
        vel: [{ f: [6, 18], vx: 14, vy: 0 }, { f: [19, 24], vx: 4 }],
        hitboxes: [{ f: [6, 18], x: 10, y: -40, r: 22, dmg: 8, ang: 361, bkb: 40, kbg: 70, effect: 'fire' }],
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('fire', { pitch: 1.2 });
          if (fr >= 6 && fr <= 18) f.fx('flame', f.x - f.facing * 22, f.y - f.h * 0.4, { scale: 1.3 });
        }
      },
      up: {
        frames: 50, pose: 'rise',
        onStart(f, mv) { mv.data.vx = U.clamp(f.input.x, -1, 1) * 3; },
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 20) {
            f.vy = -14; f.vx = mv.data.vx; mv.velX = mv.velY = true;
            f.fx('flame', f.x + U.rand(-8, 8), f.y + 6, { scale: 1.4 });
          }
          if (fr === 5) NX.Audio.play('fire');
        },
        hitboxes: [
          { f: [5, 20], x: 0, y: 2, r: 22, dmg: 2, rehit: 4, fkb: 25, bkb: 0, kbg: 100, ang: 90, effect: 'fire' },
          { f: [21, 23], x: 0, y: -44, r: 28, dmg: 6, ang: 80, bkb: 50, kbg: 80, effect: 'fire', group: 1, dir: 'auto' }]
      },
      down: {
        frames: 40, pose: 'roar',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('explosion', { pitch: 1.8 });
          f.fx('flash', 0, 0, { color: '#fff3c0', alpha: 0.35, life: 8 });
          f.fx('ring', f.x, f.y - f.h / 2, { r: 70, color: '#fff3c0', w: 8 });
          f.spawnProjectile({ x: f.x + f.facing * 10, y: f.y - f.h / 2, vx: 0, vy: 0, r: 58, life: 5, dmg: 4, ang: 80, fkb: 20, bkb: 0, kbg: 100, stun: 40,
            effect: 'fire', dir: 'auto', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false, draw() {} });
        }
      }
    }
  });

  /* ======================================================================
   * 11 · GRIZZLA — Osa Luchadora (grappler pesada)
   * ==================================================================== */
  fighter({
    id: 'grizzla', name: 'Grizzla', title: 'Osa Luchadora',
    passive: 'Llave maestra: agarres y lanzamientos más fuertes.',
    palette: { primary: '#c8202a', secondary: '#7a4a2a', skin: '#7a4a2a', head: '#7a4a2a', hand: '#6a3e22', accent: '#ffd23a', eye: '#1b1b1b', feet: '#3a2214', legs: '#7a4a2a', arms: '#7a4a2a', belt: '#ffd23a' },
    stats: { weight: 125, height: 96, width: 48, walk: 2.8, run: 6.0, dash: 6.6, airSpeed: 3.4, gravity: 0.6, fall: 10.2, jump: 13, airJump: 11.6, traction: 0.58 },
    profile: { style: 'heavy', reach: 1.0, power: 1.1, speed: 0.95 },
    ai: { recovery: 'up', projectile: null, range: 60, grappler: true, heavy: true },
    moves: {
      grab: std => Object.assign({}, std, { grabs: std.grabs.map(g => Object.assign({}, g, { x: g.x * 1.15, r: g.r * 1.3 })) }),
      throw_back: std => Object.assign({}, std, { hit: Object.assign({}, std.hit, { dmg: 13, kbg: 82 }) }),
      throw_up: std => Object.assign({}, std, { hit: Object.assign({}, std.hit, { dmg: 10, kbg: 74 }) })
    },
    rig: {
      torsoW: 36, hipW: 32, torsoH: 30, torsoRound: 12, headR: 14, armW: 12, upperArm: 15, foreArm: 14, handR: 8,
      legW: 13, thigh: 14, shin: 12, footL: 13, belly: '#c49a6c',
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          earsRound(ctx, r, a.pal.head, '#c49a6c');
          R.ellipse(ctx, r * 0.6, r * 0.38, r * 0.48, r * 0.34, 0, '#c49a6c');
          R.ellipse(ctx, r * 0.95, r * 0.25, r * 0.16, r * 0.12, 0, '#1b1b1b');
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.primary;
          ctx.fillRect(-r.torsoW * 0.35, -r.torsoH, 6, r.torsoH * 0.7); ctx.fillRect(r.torsoW * 0.35 - 6, -r.torsoH, 6, r.torsoH * 0.7);
          R.poly(ctx, [[-r.hipW / 2, -r.torsoH * 0.35], [r.hipW / 2, -r.torsoH * 0.35], [r.hipW / 2, 0], [-r.hipW / 2, 0]], a.pal.primary);
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2, -r.torsoH * 0.4, r.hipW, 6);
          R.ellipse(ctx, 0, -r.torsoH * 0.37, 7, 5, 0, '#fff0a0');
        },
        tail(ctx, a) { tail(ctx, a, 'stub', a.pal.head); }
      }
    },
    specials: {
      neutral: {
        frames: 52, grabs: [{ f: [8, 12], x: 38, y: -52, r: 22, command: true }],
        poseFn(f, mv, k, POSES) {
          if (mv.data.t) { const s = Math.sin(mv.frame * 0.8) * 0.1; return { aF1: 1.5, aF2: 1.4 + s, aB1: 1.4, aB2: 1.5 + s, lean: 0.1 + s }; }
          return k < 1 ? POSES.grab.wind : POSES.grab.strike;
        },
        onGrab(f, t, mv) { f.capture(t, { max: 90 }); mv.data.t = t; mv.frame = 20; f.fx('text', t.x, t.y - t.h - 16, { text: '¡ABRAZO!', color: '#ffd23a', size: 22 }); },
        onFrame(f, fr, mv) {
          const t = mv.data.t;
          if (!t || f.captive !== t) return;
          t.x = f.x + f.facing * (f.w / 2 + t.w / 2 - 12); t.y = f.y; t.facing = -f.facing;
          if (fr >= 24 && fr <= 40 && fr % 8 === 0) {
            t.addDamage(2.5, f); f.stats.damageDealt += 2.5; t.hitlag = 4; t.shaking = true; t.flashTimer = 4;
            f.fx('spark', t.x, t.y - t.h / 2, { n: 4, power: 0.6 }); NX.Audio.play('weak');
          }
          if (fr === 44) { f.releaseCaptive({ dmg: 7, ang: 55, bkb: 65, kbg: 72, effect: 'heavy' }); NX.Audio.play('throw'); }
        }
      },
      side: {
        frames: 50, pose: 'spin', oncePerAir: true, gravity: 0.5, drift: 0.3,
        vel: [{ f: [8, 34], vx: 4 }],
        hitboxes: [
          { f: [8, 34], x: 0, y: -52, r: 36, dmg: 2.2, rehit: 6, fkb: 35, bkb: 0, kbg: 100, ang: 361, dir: 'auto', effect: 'heavy' },
          { f: [35, 37], x: 0, y: -52, r: 40, dmg: 7, ang: 361, bkb: 50, kbg: 85, dir: 'auto', effect: 'heavy', group: 1 }],
        onFrame(f, fr) { if (fr % 8 === 0 && fr >= 8 && fr <= 34) NX.Audio.play('spin', { pitch: 0.7 }); }
      },
      up: {
        frames: 44, pose: 'rise', vel: [{ f: [5, 18], vy: -13.5, vx: 2 }],
        hitboxes: [{ f: [5, 12], x: 20, y: -84, r: 22, dmg: 11, ang: 80, bkb: 55, kbg: 80, effect: 'slash' }],
        onFrame(f, fr) { if (fr === 5) NX.Audio.play('slash', { pitch: 0.7 }); }
      },
      down: {
        frames: 46, pose: 'slam',
        hitboxes: [{ f: [14, 17], x: 0, y: -12, r: 46, dmg: 12, ang: 85, bkb: 60, kbg: 75, effect: 'heavy', dir: 'auto' }],
        onFrame(f, fr) { if (fr === 14) { NX.Audio.play('stomp'); f.match.camera.shake(10); f.fx('shockwave', f.x, f.y, { r: 120 }); f.fx('dust', f.x, f.y, { n: 8 }); } }
      },
      down_air: {
        frames: 40, pose: 'dive',
        hitboxes: [{ f: [8, 30], x: 0, y: -30, r: 34, dmg: 10, ang: 60, bkb: 50, kbg: 70, effect: 'heavy', dir: 'auto' }],
        onStart(f, mv) { mv.noDrift = true; f.vx *= 0.5; },
        onFrame(f, fr, mv) { if (fr > 6) { f.vy = 13; mv.velY = true; } if (fr === 30 && !f.ground) mv.frame = 29; },
        onLand(f) {
          boom(f, f.x, f.y - 14, { r: 56, dmg: 9, ang: 85, bkb: 55, kbg: 65, effect: 'heavy' });
          f.endMoveCleanup(true); f.startLand(18); return 'continue';
        }
      }
    }
  });

  /* ======================================================================
   * 12 · ZEPHYR — Liebre del Vendaval (el más rápido del juego)
   * ==================================================================== */
  fighter({
    id: 'zephyr', name: 'Zephyr', title: 'Liebre del Vendaval',
    passive: 'Vendaval: la mayor velocidad de carrera del juego.',
    palette: { primary: '#2d7fd6', secondary: '#e9e4d8', skin: '#e9e4d8', head: '#e9e4d8', hand: '#e9e4d8', accent: '#7affd6', eye: '#2a1a3a', feet: '#d64a2a', legs: '#e9e4d8', arms: '#e9e4d8' },
    stats: { weight: 84, height: 78, width: 30, walk: 3.8, run: 11, dash: 10.5, dashFrames: 8, airSpeed: 4.2, gravity: 0.6, fall: 10, fastFall: 15, jump: 13.8, shortHop: 8.8, airJump: 12.6, traction: 0.4 },
    profile: { style: 'kick', reach: 1, power: 0.92, speed: 1.12, effect: 'wind' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 70, rushdown: true },
    rig: {
      headR: 12, torsoW: 18, hipW: 16, torsoH: 23, thigh: 16, shin: 16, legW: 8, armW: 6, footL: 13,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR, sway = -windOf(a.f) * 0.025 + Math.sin(a.f.tick * 0.1) * 0.05;
          earsLong(ctx, r, a.pal.head, '#ffc0c8', sway);
          R.disc(ctx, r * 0.95, r * 0.25, r * 0.13, '#ff8aa0', false);
        },
        back(ctx, a) { scarf(ctx, a, '#2fd6a8', 46); },
        tail(ctx, a) { tail(ctx, a, 'puff', '#ffffff'); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.5, -r.torsoH], [r.torsoW * 0.5, -r.torsoH], [r.hipW * 0.5, -r.torsoH * 0.35], [-r.hipW * 0.5, -r.torsoH * 0.35]], a.pal.primary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-1, -r.torsoH, 2, r.torsoH * 0.65);
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv || mv.def.key !== 'special_side' || mv.frame < 8 || mv.frame > 36) return;
      ctx.save(); ctx.translate(f.x, f.y - f.h * 0.5);
      for (let i = 0; i < 5; i++) {
        const y = -f.h * 0.55 + i * f.h * 0.27, w = 22 + i * 5;
        ctx.strokeStyle = U.rgba(i % 2 ? '#7affd6' : '#e8fff6', 0.7); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, y, w, 6, 0, f.tick * 0.5 + i, f.tick * 0.5 + i + 4.2); ctx.stroke();
      }
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 34, pose: 'kick',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('slash', { pitch: 0.8 });
          shoot(f, {
            ox: 28, oy: -f.h * 0.5, speed: 10, r: 20, dmg: 6, ang: 45, bkb: 30, kbg: 55, life: 40, effect: 'wind', pierce: true, color: '#7affd6', glow: false,
            update(p) { p.vx *= 0.975; },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.vx), 1);
              ctx.globalAlpha = Math.min(1, p.life / 12);
              ctx.fillStyle = '#e8fff6'; ctx.strokeStyle = '#2fd6a8'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(-6, 0, p.r, -1.2, 1.2); ctx.arc(-14, 0, p.r * 0.85, 1.1, -1.1, true); ctx.closePath(); ctx.fill(); ctx.stroke();
              ctx.restore();
            }
          });
        }
      },
      side: {
        frames: 50, pose: 'spin', oncePerAir: true, drift: 0,
        vel: [{ f: [8, 32], vx: 10.5, vy: 0.4 }],
        hitboxes: [
          { f: [8, 32], x: 4, y: -40, r: 28, dmg: 1.6, rehit: 5, fkb: 30, bkb: 0, kbg: 100, ang: 70, effect: 'wind', dir: 'auto' },
          { f: [33, 35], x: 4, y: -40, r: 32, dmg: 6, ang: 55, bkb: 55, kbg: 80, effect: 'wind', group: 1 }],
        onFrame(f, fr) { if (fr % 6 === 2 && fr >= 8 && fr <= 32) NX.Audio.play('spin', { pitch: 1.2 }); }
      },
      up: {
        frames: 50, pose: 'rise', vel: [{ f: [4, 22], vy: -13.5 }],
        hitboxes: [{ f: [4, 10], x: 0, y: -40, r: 26, dmg: 7, ang: 88, bkb: 55, kbg: 70, effect: 'wind', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr !== 4) return;
          NX.Audio.play('spin', { pitch: 0.6 });
          f.spawnProjectile({
            x: f.x, y: f.y - 30, vx: 0, vy: 0, r: 48, life: 40, dmg: 1, windbox: true, push: 0, lift: 7, stageCollide: false,
            reflectable: false, absorbable: false, destructible: false, transcendent: true, pierce: true, glow: false,
            draw(ctx, p) {
              ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 15) * 0.6; ctx.strokeStyle = '#e8fff6'; ctx.lineWidth = 2;
              for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(p.x, p.y + 30 - i * 22 - (p.t * 3) % 22, 26 - i * 3, 6, 0, 0, TAU); ctx.stroke(); }
              ctx.restore();
            }
          });
        }
      },
      down: {
        frames: 40, pose: 'cast',
        hitboxes: [{ f: [8, 9], x: 34, y: -42, r: 26, dmg: 3, ang: 30, bkb: 40, kbg: 30, effect: 'wind' }],
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('spin', { pitch: 0.9 });
          shoot(f, {
            ox: 50, oy: -f.h * 0.5, speed: 2, r: 50, life: 24, dmg: 1, windbox: true, push: 7, stageCollide: false, reflectable: false,
            absorbable: false, destructible: false, transcendent: true, pierce: true, glow: false,
            update(p, m) {
              for (const q of m.projectiles) {
                if (q === p || !q.active || q.owner === p.owner || !q.reflectable || q.harmless) continue;
                if (U.dist(q.x, q.y, p.x, p.y) < p.r + q.r) q.reflect(p.owner, 1.2);
              }
            },
            draw(ctx, p) {
              ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 8) * 0.65; ctx.strokeStyle = '#7affd6'; ctx.lineWidth = 3;
              for (let i = 0; i < 4; i++) { const yy = p.y - 36 + i * 24; ctx.beginPath(); ctx.moveTo(p.x - 30 * p.facing, yy); ctx.quadraticCurveTo(p.x, yy - 10 + (p.t * 2 % 10), p.x + 34 * p.facing, yy + 4); ctx.stroke(); }
              ctx.restore();
            }
          });
        }
      }
    }
  });

  /* ======================================================================
   * 13 · ARIA SOLENNE — Espada Resonante (espadachina con medidor)
   * Medidor RESONANCIA: al llenarse, el siguiente especial es "Crescendo".
   * ==================================================================== */
  function empower(f, mv) {
    if (f.meter < 100) return;
    f.meter = 0; mv.data.emp = true; mv.chargeMult = 1.4; f.flashTimer = 12;
    f.fx('ring', f.x, f.y - f.h / 2, { r: 60, color: '#7ad0ff', w: 6 });
    f.fx('text', f.x, f.y - f.h - 20, { text: 'CRESCENDO!', color: '#7ad0ff', size: 24 });
    NX.Audio.play('chargeFull');
  }
  function echoDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.dir || 1), 1);
    ctx.globalAlpha = Math.min(1, p.life / 4) * 0.8;
    ctx.fillStyle = '#bfe8ff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-p.r * 1.4, -4); ctx.lineTo(p.r * 1.2, -2); ctx.lineTo(p.r * 1.5, 0); ctx.lineTo(p.r * 1.2, 2); ctx.lineTo(-p.r * 1.4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha *= 0.4; R.disc(ctx, 0, 0, p.r, '#7ad0ff', false);
    ctx.restore();
  }
  fighter({
    id: 'aria', name: 'Aria Solenne', title: 'Espada Resonante',
    passive: 'Resonancia: con el medidor lleno, el siguiente especial se potencia.',
    palette: { primary: '#f4f1ea', secondary: '#2a3b6b', skin: '#f0cfb0', head: '#f0cfb0', hand: '#2a3b6b', accent: '#7ad0ff', hair: '#d8b04a', eye: '#2a3b6b', feet: '#2a3b6b', legs: '#2a3b6b', arms: '#f4f1ea', belt: '#2a3b6b' },
    stats: { weight: 95, height: 84, width: 32, run: 7.0, airSpeed: 3.9 },
    profile: { style: 'sword', reach: 1.05, power: 1, speed: 1.02 },
    meter: { max: 100, label: 'RESONANCIA', short: 'RESONANCIA', color: '#7ad0ff', gainOnHit: 1.1, text: f => f.meter >= 100 ? 'RESONANCIA MÁX' : 'RESONANCIA' },
    onDamaged(f, d) { f.addMeter(d * 0.5); },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 95, counter: 'down', sword: true },
    rig: {
      headR: 11.5, torsoW: 19, hipW: 18, torsoH: 26, thigh: 16, shin: 16, armW: 6.5,
      weapon: { type: 'sword', len: 52, w: 6, color: '#cfe6ff', glow: '#7ad0ff', trail: '#9fe0ff', guard: '#d6c06a', hilt: '#2a3b6b' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f), sw = Math.sin(a.f.tick * 0.14) * 3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8);
          ctx.quadraticCurveTo(-r * 2.2 - w * 0.5, -r * 0.6 + sw, -r * 2.0 - w, r * 1.6 + sw);
          ctx.quadraticCurveTo(-r * 1.4, r * 0.4, -r * 0.7, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
          R.disc(ctx, -r * 0.85, -r * 0.6, 3.5, a.pal.accent);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.15 });
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.95); ctx.quadraticCurveTo(r * 1.0, -r * 0.6, r * 0.75, -r * 0.05); ctx.lineTo(r * 0.45, -r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        back(ctx, a) { cape(ctx, a, a.pal.secondary, 40, 10, '#7ad0ff'); },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.7, 12], [-r.hipW * 0.7, 12]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 5);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.35, -r.torsoH); ctx.lineTo(0, -r.torsoH * 0.5); ctx.lineTo(r.torsoW * 0.35, -r.torsoH); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 42, pose: 'shoot', vel: [{ f: [6, 12], vx: 7 }],
        hitboxes: [
          { f: [8, 12], x: 56, y: -46, r: 16, dmg: 9, ang: 30, bkb: 40, kbg: 75, effect: 'slash' },
          { f: [8, 12], x: 30, y: -46, r: 14, dmg: 7, ang: 30, bkb: 40, kbg: 70, effect: 'slash' }],
        onStart(f, mv) { empower(f, mv); },
        onFrame(f, fr, mv) {
          if (fr === 12) { mv.data.echo = f.localToWorld(56, -46); mv.data.dir = f.facing; }
          if (fr === 30 && mv.data.echo) {
            const e = mv.data.echo, emp = mv.data.emp;
            f.spawnProjectile({ x: e.x, y: e.y, vx: 0, vy: 0, r: emp ? 46 : 30, life: 8, dmg: emp ? 15 : 7, ang: 35, bkb: emp ? 60 : 40, kbg: emp ? 100 : 70,
              effect: 'slash', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, dir: mv.data.dir, glow: false, draw: echoDraw });
            NX.Audio.play('slash', { pitch: 1.3 });
          }
        }
      },
      side: {
        frames: 34, pose: 'ftilt', act: [5, 12], oncePerAir: true, drift: 0.2, gravity: 0.4,
        vel: [{ f: [4, 12], vx: 9, vy: 0 }],
        onStart(f, mv) { empower(f, mv); mv.data.stage = 1; },
        onFrame(f, fr, mv) {
          const st = mv.data.stage, big = st === 3;
          mv.extraBoxes = (fr >= 5 && fr <= 12) ? [{ x: 32, y: -44, r: big ? 26 : 22, dmg: big ? 10 : 6, ang: big ? 40 : 50, bkb: big ? 50 : 35, kbg: big ? 88 : 35, effect: 'slash' }] : null;
          if (fr === 5) NX.Audio.play('slash', { pitch: 0.9 + st * 0.15 });
          if (fr >= 14 && fr <= 30 && st < 3 && f.input.pressed('special')) {
            f.input.consume('special');
            mv.data.stage++; mv.frame = 0; mv.hitSets = {}; mv.swung = false;
            if (Math.abs(f.input.x) > 0.3) f.facing = Math.sign(f.input.x);
          }
        }
      },
      up: {
        frames: 46, pose: 'rise',
        hitboxes: [
          { f: [5, 12], x: 16, y: -84, r: 22, dmg: 9, ang: 85, bkb: 50, kbg: 70, effect: 'slash' },
          { f: [13, 20], x: 10, y: -84, r: 20, dmg: 5, ang: 80, bkb: 40, kbg: 80, effect: 'slash', group: 1 }],
        onStart(f, mv) { empower(f, mv); },
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 20) { f.vy = mv.data.emp ? -15.5 : -13; f.vx = f.facing * 1.5; mv.velX = mv.velY = true; }
          if (fr === 5) NX.Audio.play('slash', { pitch: 1.1 });
          if (fr === 20 && mv.data.emp) {
            f.spawnProjectile({ x: f.x, y: f.y - f.h - 10, vx: 0, vy: -9, r: 26, life: 26, dmg: 8, ang: 88, bkb: 50, kbg: 80, effect: 'slash', stageCollide: false, pierce: true, glow: false, dir: f.facing,
              draw(ctx, p) { ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 8); ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y + 14, p.r, PI * 1.15, PI * 1.85); ctx.stroke(); ctx.restore(); } });
          }
        }
      },
      down: {
        frames: 46, pose: 'counter', counter: { f: [5, 22] },
        onStart(f, mv) { empower(f, mv); mv.data.mult = mv.data.emp ? 1.9 : 1.35; },
        onCounter(f, atk, box, mv) {
          if (atk && atk !== f) {
            f.facing = U.sign(atk.x - f.x);
            const base = box && box.def ? box.def.dmg || 6 : 6;
            if (Math.abs(atk.x - f.x) < 160 && Math.abs(atk.y - f.y) < 130)
              f.hitTarget(atk, { dmg: Math.max(9, base * mv.data.mult), ang: 40, bkb: 60, kbg: 85, effect: 'slash' }, { dir: U.sign(atk.x - f.x) });
            atk.hitlag = Math.max(atk.hitlag, 8);
          }
          f.intangible = Math.max(f.intangible, 24); f.addMeter(35);
          mv.frame = Math.max(mv.frame, mv.def.frames - 20);
          f.fx('ring', f.x, f.y - f.h / 2, { r: 70, color: '#7ad0ff', w: 6 });
        }
      }
    }
  });

  /* ======================================================================
   * 14 · MORGRATH — Segador Espectral (guadaña de largo alcance)
   * ==================================================================== */
  fighter({
    id: 'morgrath', name: 'Morgrath', title: 'Segador Espectral',
    passive: 'Alcance de guadaña: los normales llegan más lejos que nadie.',
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

  /* ======================================================================
   * 15 · BRAKK — Gladiador de Hierro (brawler pesado)
   * Pasiva "Impulso de Combo": golpes encadenados (≤70 f) suben su daño
   * un 3% por acierto hasta +15%.
   * ==================================================================== */
  fighter({
    id: 'brakk', name: 'Brakk', title: 'Gladiador de Hierro',
    passive: 'Impulso de Combo: cada golpe encadenado suma +3% de daño (máx. +15%).',
    palette: { primary: '#8a2a1a', secondary: '#3a3a3a', skin: '#b07a52', head: '#b07a52', hand: '#c0c4cc', accent: '#e0e0e0', hair: '#2a1a12', feet: '#2a1a12', legs: '#3a3a3a', arms: '#b07a52', belt: '#5a3a20' },
    stats: { weight: 115, height: 92, width: 42, walk: 3, run: 6.3, dash: 6.9, airSpeed: 3.5, gravity: 0.6, fall: 10.2, jump: 13.2, airJump: 12 },
    profile: { style: 'fist', reach: 1.05, power: 1.08, speed: 0.97 },
    ai: { recovery: 'up', projectile: 'neutral', range: 75, heavy: true },
    init(f) { f.data.combo = 0; f.data.comboT = 0; },
    onLifeReset(f) { f.data.combo = 0; f.data.comboT = 0; },
    onHitConfirm(f) { f.data.combo = Math.min(5, (f.data.combo || 0) + 1); f.data.comboT = 70; },
    damageMod(f) { return 1 + 0.03 * (f.data.combo || 0); },
    onUpdate(f) { if (f.data.comboT > 0 && --f.data.comboT === 0) f.data.combo = 0; },
    onDamaged(f, d) { if (f.move && f.move.def.key === 'special_down') f.move.data.abs = (f.move.data.abs || 0) + d; },
    rig: {
      torsoW: 32, hipW: 26, torsoH: 29, torsoRound: 9, headR: 12.5, armW: 11, upperArm: 15, foreArm: 14, handR: 7,
      legW: 12, thigh: 15, shin: 14, footL: 13, brows: true,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.6, -r * 0.7], [-r * 0.3, -r * 1.55], [0, -r * 0.95], [r * 0.25, -r * 1.5], [r * 0.45, -r * 0.85], [-r * 0.1, -r * 0.6]], a.pal.hair);
          R.poly(ctx, [[-r * 0.1, r * 0.3], [r * 0.95, r * 0.25], [r * 0.7, r * 1.15], [r * 0.1, r * 1.0]], a.pal.hair);
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.45, -r.torsoH * 0.95); ctx.lineTo(r.torsoW * 0.35, -r.torsoH * 0.1); ctx.stroke();
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 7);
          R.disc(ctx, 0, -4.5, 4, '#c0c4cc');
          R.poly(ctx, [[-r.hipW * 0.5, -1], [r.hipW * 0.5, -1], [r.hipW * 0.45, 12], [-r.hipW * 0.45, 12]], a.pal.primary);
        },
        back(ctx, a) {
          const s = a.J.shF;
          R.ellipse(ctx, s.x + 2, s.y + 2, 10, 7, a.J.lean, '#8c929c');
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'overhead',
        onFrame(f, fr) {
          if (fr !== 18) return;
          NX.Audio.play('stomp');
          if (f.ground) {
            const gy = f.ground.y;
            f.fx('debris', f.x + f.facing * 20, gy, { n: 8, color: '#7a5a3a' });
            shoot(f, {
              ox: 30, oy: -16, speed: 8.5, r: 16, life: 46, dmg: 12, ang: 60, bkb: 45, kbg: 75, effect: 'heavy', stageCollide: false,
              destructible: false, reflectable: true, color: '#7a5a3a', glow: false, draw: rockDraw('#8a6a48'),
              update(p, m) {
                if (p.vy === 0 && !groundAt(m, p.x, p.y + p.r, 5)) { p.gravity = 0.5; p.stageCollide = true; }
                if (p.t % 4 === 0 && p.gravity === 0) m.effects.spawn('dust', p.x, p.y + p.r, { n: 1 });
              },
              onDestroy(p, w, m) { m.effects.spawn('debris', p.x, p.y, { n: 8, color: '#7a5a3a' }); }
            });
          } else {
            shoot(f, { ox: 24, oy: -f.h * 0.6, speed: 6, vy: 6, gravity: 0.3, r: 15, life: 70, dmg: 11, ang: 60, bkb: 40, kbg: 70, effect: 'heavy',
              destructible: false, color: '#7a5a3a', glow: false, draw: rockDraw('#8a6a48'),
              onDestroy(p, w, m) { m.effects.spawn('debris', p.x, p.y, { n: 8, color: '#7a5a3a' }); } });
          }
        }
      },
      side: {
        frames: 44, pose: 'fsmash', oncePerAir: true, drift: 0, gravity: 0.35,
        armor: { f: [4, 18], kb: 90 }, vel: [{ f: [8, 18], vx: 9 }],
        hitboxes: [{ f: [12, 18], x: 34, y: -50, r: 21, dmg: 13, ang: 38, bkb: 50, kbg: 88, effect: 'heavy' }],
        onFrame(f, fr) { if (fr === 8) NX.Audio.play('dash'); if (fr === 12) NX.Audio.play('swing', { size: 2 }); }
      },
      up: {
        frames: 46, pose: 'uppercut', vel: [{ f: [4, 20], vy: -13.5, vx: 1.5 }],
        hitboxes: [
          { f: [4, 9], x: 18, y: -74, r: 22, dmg: 13, ang: 84, bkb: 55, kbg: 88, effect: 'heavy' },
          { f: [10, 20], x: 12, y: -74, r: 20, dmg: 6, ang: 80, bkb: 40, kbg: 70, effect: 'hit', group: 1 }],
        onFrame(f, fr) { if (fr === 4) NX.Audio.play('swing', { size: 1.5 }); if (fr >= 4 && fr <= 20 && fr % 2 === 0) f.fx('flame', f.x + f.facing * 10, f.y - f.h, { scale: 0.9 }); }
      },
      down: {
        frames: 60, pose: 'guard', armor: { f: [4, 44], kb: 999 },
        onStart(f, mv) { mv.data.abs = 0; NX.Audio.play('block'); },
        onFrame(f, fr, mv) {
          f.damageTakenMult = (fr >= 4 && fr <= 44) ? 0.5 : 0;
          if (fr >= 4 && fr <= 44 && fr % 10 === 4) f.flashArmor = 5;
          mv.extraBoxes = (fr >= 45 && fr <= 48) ? [{ x: 0, y: -46, r: 48, dmg: Math.min(22, 8 + mv.data.abs * 0.8), ang: 361, bkb: 60, kbg: 80, dir: 'auto', effect: 'heavy' }] : null;
          if (fr === 45) { NX.Audio.play('stomp'); f.fx('shockwave', f.x, f.y, { r: 120 }); f.match.camera.shake(8); }
        },
        onEnd(f) { f.damageTakenMult = 0; }
      }
    }
  });

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

  /* ======================================================================
   * ===================== V2 · 8 LUCHADORES NUEVOS =======================
   * ==================================================================== */

  /* ======================================================================
   * 17 · KAEL — Mente Psiónica (flotante, cañón de cristal)
   * Pasiva: el Orbe del Vacío se puede almacenar (Escudo durante la carga)
   * y se guarda solo al llegar al máximo. La barra ORBE muestra la carga.
   * ==================================================================== */
  const KAEL_MAX = 120;
  fighter({
    id: 'kael', name: 'Kael', title: 'Mente Psiónica',
    passive: 'Orbe almacenable: carga el Orbe del Vacío y guárdalo con Escudo.',
    palette: { primary: '#eef3f6', secondary: '#1fb5a8', skin: '#cfe4e8', head: '#cfe4e8', hand: '#1fb5a8', accent: '#e8c35a', eye: '#2fd8c8', feet: '#1fb5a8', legs: '#16857c', arms: '#eef3f6', belt: '#e8c35a' },
    stats: { weight: 79, height: 92, width: 34, walk: 3.0, run: 7.4, dash: 8.0, airSpeed: 4.0, airAccel: 0.3, gravity: 0.42, fall: 8.2, fastFall: 13, jump: 13.2, shortHop: 8.4, airJump: 12.8 },
    profile: { style: 'magic', reach: 1.1, power: 1.02, speed: 1.0 },
    meter: { max: KAEL_MAX, label: 'ORBE', short: 'ORBE', color: '#7af0e4', text: f => (f.data.stored || 0) >= KAEL_MAX ? 'ORBE MÁX' : 'ORBE' },
    ai: { recovery: 'up', projectile: 'neutral', range: 140, zoner: true },
    init(f) { f.data.stored = 0; },
    onLifeReset(f) { f.data.stored = 0; f.meter = 0; },
    onUpdate(f) {
      f.meter = f.data.stored || 0;
      if (f.data.stored >= KAEL_MAX && f.tick % 7 === 0 && f.inPlay()) f.fx('sparkle', f.x + U.rand(-18, 18), f.y - U.rand(10, f.h), { color: '#7af0e4' });
    },
    poseMod(f, p) { return f.ground ? null : { oy: (p.oy || 0) + Math.sin(f.tick * 0.12) * 1.5 }; },
    rig: {
      headR: 11, headH: 1.12, torsoW: 20, hipW: 16, torsoH: 30, thigh: 17, shin: 17, legW: 7.5, armW: 6, upperArm: 15, foreArm: 14,
      handR: 5, footL: 9, eyes: 'glow', mouth: false,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.2, r * 0.6], [-r * 1.25, r * 0.9], [-r * 0.9, r * 1.5], [r * 0.2, r * 1.3]], a.pal.secondary);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.02, PI * 1.1, PI * 1.9); ctx.stroke();
          R.poly(ctx, [[r * 0.45, -r * 0.62], [r * 0.62, -r * 0.9], [r * 0.79, -r * 0.62], [r * 0.62, -r * 0.36]], a.pal.accent);
          R.disc(ctx, r * 0.62, -r * 0.63, 2.4, '#2fd8c8', false);
          ctx.strokeStyle = U.rgba('#1fb5a8', 0.7); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.6); ctx.quadraticCurveTo(-r * 0.2, -r * 1.05, r * 0.2, -r * 0.95); ctx.stroke();
        },
        back(ctx, a) {
          const { J, f } = a, t = f.tick;
          cape(ctx, a, a.pal.secondary, 52, 12, '#e8c35a');
          for (let i = 0; i < 3; i++) {
            const ang = t * 0.04 + i * TAU / 3, x = J.sh.x - 14 + Math.cos(ang) * 22, y = J.sh.y - 4 + Math.sin(ang) * 10;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
            R.poly(ctx, [[0, -9], [4, 0], [0, 9], [-4, 0]], i === 1 ? '#bff6f0' : '#7af0e4');
            ctx.restore();
          }
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.35, -r.torsoH); ctx.lineTo(-r.hipW * 0.2, 0); ctx.moveTo(r.torsoW * 0.35, -r.torsoH); ctx.lineTo(r.hipW * 0.2, 0); ctx.stroke();
          R.poly(ctx, [[0, -r.torsoH * 0.8], [5, -r.torsoH * 0.65], [0, -r.torsoH * 0.5], [-5, -r.torsoH * 0.65]], '#2fd8c8');
          R.poly(ctx, [[-r.hipW * 0.5, -4], [r.hipW * 0.5, -4], [r.hipW * 0.8, 22], [-r.hipW * 0.8, 22]], a.pal.primary);
        },
        hand(ctx, a) {
          const mv = a.f.move;
          if (!mv || mv.def.key !== 'special_neutral') return;
          const k = Math.min(1, (mv.charge || 0) / KAEL_MAX);
          const h = a.J.haF, r = 6 + 12 * k;
          ctx.save();
          const g = ctx.createRadialGradient(h.x + 6, h.y, 1, h.x + 6, h.y, r * 1.6);
          g.addColorStop(0, '#0a1414'); g.addColorStop(0.5, '#1fb5a8'); g.addColorStop(1, 'rgba(47,216,200,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x + 6, h.y, r * 1.6, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'charge', charge: { at: 8, max: KAEL_MAX, key: 'special', mult: 1 },
        onStart(f, mv) {
          mv.charge = Math.min(KAEL_MAX, f.data.stored || 0);
          if (mv.charge >= KAEL_MAX) mv.chargeDone = true;
          f.data.stored = 0;
        },
        onCharge(f, mv) {
          f.data.stored = mv.charge;
          if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 28, f.y - f.h * 0.55, { color: '#7af0e4' });
          const I = f.input;
          if (mv.charge >= KAEL_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.stored = mv.charge;
            if (mv.charge >= KAEL_MAX) { f.fx('text', f.x, f.y - f.h - 18, { text: 'ORBE LISTO', color: '#7af0e4', size: 20 }); NX.Audio.play('chargeFull'); }
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / KAEL_MAX;
          f.data.stored = 0;
          NX.Audio.play(k > 0.6 ? 'beam' : 'magic', { pitch: 1.3 - k * 0.6 });
          shoot(f, {
            ox: 30, speed: 7 + 2.5 * k, r: 8 + 16 * k, dmg: 2.5 + 22.5 * k, ang: 40, bkb: 30 + 30 * k, kbg: 45 + 45 * k,
            effect: 'magic', life: 90, color: '#2fd8c8', trail: k > 0.5 ? 8 : 0, draw: orbDraw('#1fb5a8', '#062020')
          });
          if (k > 0.9) f.match.camera.shake(6);
        }
      },
      side: {
        frames: 36, pose: 'cast', oncePerAir: true, gravity: 0.3,
        reflect: { f: [8, 18], x: 30, y: -52, r: 32, mult: 1.4, color: '#7af0e4' },
        hitboxes: [{ f: [9, 14], x: 32, y: -52, r: 24, dmg: 6, ang: 70, fkb: 50, bkb: 0, kbg: 100, effect: 'magic' }],
        onStart(f) { if (!f.ground) f.vy = Math.min(f.vy, 0) * 0.3; NX.Audio.play('magic', { pitch: 1.6 }); },
        onHit(f, t) { t.facing = -t.facing; f.fx('ring', t.x, t.y - t.h / 2, { r: 34, color: '#7af0e4' }); }
      },
      up: {
        frames: 40, intangible: [1, 24], helplessLag: 16,
        poseFn() { return { aF1: 1.0, aF2: 0.5, aB1: -0.6, aB2: 0.5, lean: 0.2, lF1: 0.4, lF2: -0.6, lB1: -0.1, lB2: -0.4, planted: false }; },
        onStart(f, mv) {
          let x = f.input.x, y = f.input.y;
          if (Math.hypot(x, y) < 0.35) { x = 0; y = -1; }
          mv.data.a = Math.atan2(x, -y);
          if (Math.abs(x) > 0.2) f.facing = Math.sign(x);
        },
        onFrame(f, fr, mv) {
          if (fr === 4) { f.hidden = true; f.fx('ring', f.x, f.y - f.h / 2, { r: 44, color: '#7af0e4' }); NX.Audio.play('magic', { pitch: 2 }); }
          if (fr >= 4 && fr < 6) { f.vx = 0; f.vy = 0; mv.velX = mv.velY = true; }
          if (fr >= 6 && fr <= 17) { f.vx = Math.sin(mv.data.a) * 17; f.vy = -Math.cos(mv.data.a) * 17; mv.velX = mv.velY = true; }
          if (fr === 18) {
            f.hidden = false; f.vx *= 0.1; f.vy = Math.min(0, f.vy * 0.1);
            f.fx('ring', f.x, f.y - f.h / 2, { r: 50, color: '#7af0e4' });
            for (let i = 0; i < 6; i++) f.fx('sparkle', f.x, f.y - f.h / 2, { color: '#bff6f0' });
          }
        },
        onEnd(f) { f.hidden = false; }
      },
      down: {
        frames: 40, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('magic', { pitch: 0.4 });
          shoot(f, {
            ox: 24, oy: -f.h * 0.8, speed: 13, r: 16, life: 16, dmg: 1, ang: 80, fkb: 0, bkb: 0, kbg: 0, effect: 'magic',
            reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false,
            filter(owner, t) { return Math.sign(owner.x - t.x) === t.facing || Math.abs(owner.x - t.x) < 12; },
            onHit(p, t) { t.pendingStun = Math.min(200, 90 + Math.floor(t.percent * 0.6)); p.match.effects.spawn('text', t.x, t.y - t.h - 12, { text: '¡PARALIZADO!', color: '#7af0e4', size: 18 }); },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y); ctx.scale(U.sign(p.vx), 1);
              ctx.globalAlpha = Math.min(1, p.life / 6);
              for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? '#7af0e4' : '#bff6f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-i * 9, 0, p.r - i * 4, -0.9, 0.9); ctx.stroke(); }
              ctx.restore();
            }
          });
        }
      }
    }
  });

  /* ======================================================================
   * 18 · VOLGUR — Señor de la Forja (superpesado, 4 saltos aéreos)
   * Fuelle Voraz inhala rivales y proyectiles; martillo de vapor cargable.
   * ==================================================================== */
  function spikeBallDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.x * 0.05);
    ctx.fillStyle = '#6a6f78'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.25) * p.r * 0.9, Math.sin(a - 0.25) * p.r * 0.9);
      ctx.lineTo(Math.cos(a) * p.r * 1.55, Math.sin(a) * p.r * 1.55); ctx.lineTo(Math.cos(a + 0.25) * p.r * 0.9, Math.sin(a + 0.25) * p.r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 2, 0, 0, p.r);
    g.addColorStop(0, '#9aa0aa'); g.addColorStop(1, '#2a2e36');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d4823a'; ctx.fillRect(-p.r, -2, p.r * 2, 4);
    ctx.restore();
  }
  fighter({
    id: 'volgur', name: 'Volgur', title: 'Señor de la Forja',
    passive: 'Fuelles: 4 saltos aéreos cortos.',
    palette: { primary: '#3a2a1e', secondary: '#6a4a32', skin: '#8a5a3c', head: '#8a5a3c', hand: '#5a3a26', accent: '#d4823a', eye: '#1b1b1b', feet: '#2a1a12', legs: '#4a3a2a', arms: '#8a5a3c', belt: '#d4823a', hair: '#2a1a12' },
    stats: { weight: 127, height: 104, width: 54, walk: 2.4, run: 5.6, dash: 6.0, airSpeed: 3.4, gravity: 0.55, fall: 9.5, fastFall: 14, jump: 12.6, shortHop: 8.2, airJump: 9.6, airJumps: 4, airJumpDecay: 0.06, traction: 0.6 },
    profile: { style: 'heavy', reach: 1.2, power: 1.12, speed: 0.9 },
    poseStyle: 'sword',
    flipJump: false,
    ai: { recovery: 'up', projectile: 'side', range: 85, heavy: true, extraJumps: true, grappler: true, inhale: true },
    onAirJump(f) { f.fx('dust', f.x, f.y - 10, { n: 5, scale: 1.2 }); NX.Audio.play('dash'); },
    rig: {
      torsoW: 44, hipW: 40, torsoH: 32, torsoRound: 16, headR: 14, headW: 1.15, neck: 0, armW: 12, upperArm: 15, foreArm: 15,
      handR: 8, thigh: 13, shin: 12, legW: 14, footL: 14, footH: 8, belly: '#a8774f', brows: true,
      weapon: { type: 'hammer', len: 46, w: 14, trail: '#ffb070' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          [[-0.15, -0.85], [-0.7, -0.6]].forEach(([dx, dy]) => R.poly(ctx, [[r * dx - 5, r * dy + 4], [r * dx, r * dy - 9], [r * dx + 5, r * dy + 4]], a.pal.skin));
          spikes(ctx, r * 0.95, a.pal.hair, 7, 0.32, PI * 1.15, PI * 1.85);
          R.ellipse(ctx, r * 0.9, r * 0.35, r * 0.42, r * 0.32, 0, '#c48a6a');
          R.disc(ctx, r * 1.05, r * 0.3, 2, '#3a1a10', false); R.disc(ctx, r * 0.82, r * 0.32, 2, '#3a1a10', false);
          ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.6); ctx.quadraticCurveTo(r * 0.75, r * 0.05, r * 0.5, -r * 0.05); ctx.lineTo(r * 0.5, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.3, -r.torsoH * 0.82], [r.torsoW * 0.36, -r.torsoH * 0.82], [r.hipW * 0.48, 8], [-r.hipW * 0.36, 8]], a.pal.primary);
          ctx.fillStyle = a.pal.accent;
          [[-0.2, -0.75], [0.25, -0.75], [-0.25, -0.1], [0.3, -0.1]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r.torsoW, y * r.torsoH, 2.2, 0, TAU); ctx.fill(); });
          ctx.fillStyle = '#2a1a12'; ctx.fillRect(-r.torsoW * 0.3, -r.torsoH * 0.86, 4, -6);
        },
        back(ctx, a) {
          const s = a.J.sh;
          ctx.save(); ctx.translate(s.x - 22, s.y + 6); ctx.rotate(a.J.lean);
          for (let i = 0; i < 4; i++) R.poly(ctx, [[-9 + i, -14 + i * 7], [9 - i, -14 + i * 7], [7 - i, -9 + i * 7], [-7 + i, -9 + i * 7]], i % 2 ? '#6a4a32' : '#8a6a4a');
          R.disc(ctx, 0, 16, 4, '#d4823a');
          ctx.restore();
        },
        weapon(ctx, f, w) {
          R.limb(ctx, [{ x: 0, y: -10 }, { x: 0, y: w.len }], 5, '#5a3b1f');
          ctx.save(); ctx.translate(0, w.len + 6);
          R.poly(ctx, [[-20, -10], [20, -10], [20, 12], [-20, 12]], '#4a4f5a');
          ctx.fillStyle = '#d4823a'; ctx.fillRect(-20, -6, 40, 3); ctx.fillRect(-20, 6, 40, 3);
          R.poly(ctx, [[20, -6], [27, -4], [27, 4], [20, 6]], '#2a2e36');
          ctx.restore();
          if (f.move && f.move.def.key === 'special_down' && f.move.charging && f.tick % 3 === 0) {
            ctx.save(); ctx.globalAlpha = 0.5; R.disc(ctx, 30, w.len + 6, 6 + Math.random() * 4, '#ffffff', false); ctx.restore();
          }
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'cast',
        absorb: { f: [10, 22], x: 40, y: -50, r: 56, mult: 0, onAbsorb(f) { f.data.ammo = Math.min(3, (f.data.ammo || 0) + 1); } },
        onStart(f, mv) { mv.data.t = 0; NX.Audio.play('spin', { pitch: 0.5 }); },
        onFrame(f, fr, mv) {
          const I = f.input;
          if (mv.data.cap) {
            const c = mv.data.cap;
            if (f.captive !== c) { mv.data.cap = null; mv.noFriction = false; return; }
            c.x = f.x + f.facing * 8; c.y = f.y;
            mv.data.hold++;
            if (f.ground) { f.vx = I.x * 1.8; mv.noFriction = true; if (Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x); }
            if ((mv.data.hold > 12 && I.pressed('special')) || mv.data.hold > 100) {
              I.consume('special');
              f.releaseCaptive({ dmg: 10, ang: 30, bkb: 55, kbg: 60, effect: 'hit' });
              mv.data.cap = null; mv.noFriction = false; mv.frame = 28;
              f.fx('ring', f.x + f.facing * 30, f.y - f.h * 0.5, { r: 40, color: '#ffd27a' }); NX.Audio.play('throw');
            } else mv.frame = 24;
            return;
          }
          if (fr >= 10 && fr <= 22) {
            mv.data.t++;
            if (fr % 2 === 0) {
              const px = f.x + f.facing * U.rand(80, 170), py = f.y - U.rand(10, f.h);
              f.match.effects.list.push({ type: 'streak', x: px, y: py, vx: -f.facing * 7, vy: (f.y - f.h * 0.5 - py) * 0.08, life: 12, max: 12, len: 16, color: '#e8f0ff' });
            }
            for (const t of f.opponents()) {
              if (!t.canBeGrabbed({ def: { command: true, air: true }, owner: f })) continue;
              const dx = (t.x - f.x) * f.facing;
              if (dx < 0 || dx > 170 || Math.abs(t.y - f.y) > 90) continue;
              t.lvx = U.approach(t.lvx, -f.facing * 6, 1.5);
              if (dx < 58) {
                f.capture(t, { hide: true, max: 140 }); mv.data.cap = t; mv.data.hold = 0; mv.frame = 24;
                NX.Audio.play('grab'); f.fx('text', f.x, f.y - f.h - 18, { text: '¡ÑAM!', color: '#ffd27a', size: 22 });
                return;
              }
            }
            if (fr === 22 && I.isHeld('special') && mv.data.t < 100) mv.frame = 14;
          }
          if (fr === 24 && (f.data.ammo || 0) > 0) {
            const n = f.data.ammo; f.data.ammo = 0;
            for (let i = 0; i < n; i++) shoot(f, { ox: 36, oy: -f.h * 0.55, speed: 9, vy: (i - (n - 1) / 2) * 1.5, r: 11, dmg: 9, ang: 45, bkb: 35, kbg: 60, life: 60, effect: 'fire', color: '#ffb070', glow: false, draw: rockDraw('#c8642a') });
            NX.Audio.play('throw');
          }
        },
        onEnd(f, mv) { mv.noFriction = false; }
      },
      side: {
        frames: 40, pose: 'overhead',
        canUse: f => !(f.data.ball && f.data.ball.active),
        onFrame(f, fr) {
          if (fr !== 16) return;
          NX.Audio.play('swing', { size: 1.5 });
          f.data.ball = shoot(f, {
            ox: 30, oy: -f.h * 0.7, speed: 5.5, vy: -7, gravity: 0.45, maxFall: 12, r: 15, dmg: 13, ang: 50, bkb: 45, kbg: 70, life: 200,
            bounce: 4, bounceDamp: 0.85, passCollide: true, destructible: false, absorbable: false, effect: 'heavy', glow: false, draw: spikeBallDraw
          });
        }
      },
      up: {
        frames: 60, pose: 'rise', drift: 0.7, helplessLag: 26,
        hitboxes: [
          { f: [6, 14], x: 0, y: -60, r: 34, dmg: 8, ang: 85, bkb: 60, kbg: 60, effect: 'heavy', dir: 'auto' },
          { f: [33, 40], x: 0, y: 0, r: 34, dmg: 15, ang: 275, bkb: 30, kbg: 85, effect: 'heavy', meteor: true, group: 1 }],
        onFrame(f, fr, mv) {
          const I = f.input;
          if (fr < 6) { f.vy = 0; mv.velY = true; return; }
          if (fr === 6) { NX.Audio.play('stomp'); f.fx('dust', f.x, f.y, { n: 8 }); }
          if (fr <= 20) { f.vy = -15; mv.velY = true; return; }
          if (fr <= 32) {
            f.vy = U.approach(f.vy, 0, 1.6); mv.velY = true;
            if (I.pressed('shield')) {
              I.consume('shield'); f.endMoveCleanup(true);
              f.state = ST.HELPLESS; f.stateTime = 0; f.helplessLag = 26;
            }
            return;
          }
          f.vy = 17; mv.velY = true; mv.data.dive = true;
          if (fr === 33) NX.Audio.play('swing', { size: 2 });
          if (fr >= 40 && !f.ground) mv.frame = 39;
        },
        onLand(f, mv) {
          if (mv.data.dive) {
            boom(f, f.x, f.y - 14, { r: 66, dmg: 12, ang: 70, bkb: 55, kbg: 70, effect: 'heavy' });
            groundWave(f, 1, { dmg: 6, color: '#ffd27a' }); groundWave(f, -1, { dmg: 6, color: '#ffd27a' });
          }
          const lag = mv.data.dive ? 24 : 14;
          f.endMoveCleanup(true); f.startLand(lag);
          return 'continue';
        }
      },
      down: {
        frames: 48, pose: 'fsmash', charge: { at: 8, max: 90, key: 'special', mult: 1.8 },
        hitboxes: [
          { f: [14, 18], x: 54, y: -44, r: 26, dmg: 14, ang: 361, bkb: 40, kbg: 95, effect: 'heavy' },
          { f: [14, 18], x: 26, y: -52, r: 18, dmg: 11, ang: 361, bkb: 35, kbg: 90, effect: 'heavy' }],
        onStart(f, mv) { mv.noFriction = true; },
        onCharge(f, mv) {
          if (f.ground) { f.vx = f.input.x * 1.7; if (Math.abs(f.input.x) > 0.3) f.facing = Math.sign(f.input.x); }
          else f.vx *= 0.95;
          if (mv.charge % 4 === 0) f.fx('dust', f.x - f.facing * 20, f.y - f.h * 0.9, { n: 1 });
          if (mv.charge % 10 === 0) NX.Audio.play('charge', { pitch: 0.6 + mv.charge / 90 });
        },
        onRelease(f, mv) { mv.noFriction = false; NX.Audio.play('explosion', { pitch: 1.3 }); }
      }
    }
  });

  /* ======================================================================
   * 19 · CHRONIA — Relojera del Tiempo (control de tiempo)
   * ==================================================================== */
  fighter({
    id: 'chronia', name: 'Chronia', title: 'Relojera del Tiempo',
    passive: 'Rebobinar: su Up-B la devuelve a donde estaba hace ~1,3 s.',
    palette: { primary: '#24304a', secondary: '#c9a04a', skin: '#efcfb4', head: '#efcfb4', hand: '#24304a', accent: '#3ac0b0', hair: '#e9e2d0', eye: '#24304a', feet: '#3a2a1a', legs: '#1a2236', arms: '#24304a', belt: '#c9a04a' },
    stats: { weight: 86, height: 82, width: 32, run: 6.8, airSpeed: 3.9, gravity: 0.5, fall: 9 },
    profile: { style: 'magic', reach: 1.15, power: 0.98, speed: 1.0 },
    ai: { recovery: 'up', projectile: 'side', range: 150, zoner: true },
    init(f) { f.data.hist = []; },
    onLifeReset(f) { f.data.hist = []; },
    onUpdate(f) {
      if (!f.inPlay() || f.state === ST.RESPAWN || f.hitlag > 0) return;
      const h = f.data.hist || (f.data.hist = []);
      h.push({ x: f.x, y: f.y, g: !!f.ground });
      if (h.length > 80) h.shift();
    },
    poseMod(f, p) {
      const mv = f.move;
      if (mv && mv.def.key === 'special_up' && mv.frame <= 18) return { alpha: Math.abs(mv.frame - 10) / 10 };
      return null;
    },
    rig: {
      headR: 11.5, torsoW: 19, hipW: 20, torsoH: 26, thigh: 15, shin: 15, armW: 6,
      weapon: { type: 'staff', len: 46, w: 8, trail: '#3ac0b0' },
      parts: {
        headBack(ctx, a) { const r = a.rig.headR; R.disc(ctx, -r * 0.75, -r * 0.35, r * 0.45, a.pal.hair); },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.3 });
          R.poly(ctx, [[-r * 0.7, -r * 0.75], [r * 0.75, -r * 0.75], [r * 0.6, -r * 1.75], [-r * 0.55, -r * 1.75]], a.pal.primary);
          R.poly(ctx, [[-r * 1.05, -r * 0.7], [r * 1.1, -r * 0.7], [r * 1.1, -r * 0.88], [-r * 1.05, -r * 0.88]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 0.62, -r * 1.05, r * 1.32, r * 0.18);
          ctx.save(); ctx.translate(r * 0.15, -r * 1.35); ctx.rotate(a.f.tick * 0.03);
          for (let i = 0; i < 6; i++) { ctx.rotate(PI / 3); ctx.fillStyle = a.pal.secondary; ctx.fillRect(-1.5, -5.5, 3, 3); }
          R.disc(ctx, 0, 0, 3.5, a.pal.secondary); ctx.restore();
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.08, r * 0.3, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.22); ctx.quadraticCurveTo(r * 0.2, r * 0.8, -r * 0.1, r * 0.9); ctx.stroke();
        },
        back(ctx, a) {
          const s = a.J.sh;
          ctx.save(); ctx.translate(s.x - 10, s.y + 4); ctx.rotate(a.f.tick * 0.01);
          ctx.fillStyle = a.pal.secondary; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < 24; i++) { const r = i % 2 ? 22 : 18; const ang = i * TAU / 24; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          R.disc(ctx, 0, 0, 13, '#f4ecd8');
          ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.moveTo(0, 0); ctx.lineTo(6, 2); ctx.stroke();
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.8, 18], [-r.hipW * 0.8, 18]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r.torsoW * 0.12, -r.torsoH * (0.8 - i * 0.22), 2, 0, TAU); ctx.fill(); }
          ctx.strokeStyle = a.pal.secondary; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(r.torsoW * 0.12, -r.torsoH * 0.5); ctx.quadraticCurveTo(r.torsoW * 0.35, -r.torsoH * 0.35, r.torsoW * 0.3, -r.torsoH * 0.2); ctx.stroke();
        },
        weapon(ctx, f, w) {
          R.limb(ctx, [{ x: 0, y: -12 }, { x: 0, y: w.len }], 4, '#5a3b1f');
          ctx.save(); ctx.translate(0, w.len + 9);
          R.disc(ctx, 0, 0, 10, '#c9a04a');
          R.disc(ctx, 0, 0, 7.5, '#f4ecd8', false);
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.rotate(f.tick * 0.08);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); ctx.stroke();
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 40, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 14) return;
          if (f.data.field && f.data.field.active) f.data.field.destroy('replace');
          NX.Audio.play('magic', { pitch: 0.7 });
          f.data.field = f.spawnProjectile({
            x: f.x + f.facing * 120, y: f.y - 50, vx: 0, vy: 0, r: 78, life: 200, dmg: 0, harmless: true, stageCollide: false,
            reflectable: false, absorbable: false, destructible: false, glow: false,
            update(p, m) {
              for (const t of m.fighters) {
                if (t === p.owner || !t.inPlay()) continue;
                if (U.dist(t.x, t.y - t.h / 2, p.x, p.y) < p.r && m.frame % 2 === 0) t.hitlag = Math.max(t.hitlag, 1);
              }
              for (const q of m.projectiles) {
                if (q === p || !q.active || q.owner === p.owner) continue;
                if (U.dist(q.x, q.y, p.x, p.y) < p.r) { q.x -= q.vx * 0.55; q.y -= q.vy * 0.55; }
              }
            },
            draw(ctx, p) {
              const k = Math.min(1, p.t / 10, p.life / 20);
              ctx.save(); ctx.translate(p.x, p.y);
              ctx.globalAlpha = 0.22 * k; R.disc(ctx, 0, 0, p.r, '#3ac0b0', false);
              ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = '#3ac0b0'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.stroke();
              for (let i = 0; i < 12; i++) { const ang = i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * p.r * 0.85, Math.sin(ang) * p.r * 0.85); ctx.lineTo(Math.cos(ang) * p.r, Math.sin(ang) * p.r); ctx.stroke(); }
              ctx.lineWidth = 3; ctx.rotate(p.t * 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -p.r * 0.6); ctx.stroke();
              ctx.rotate(p.t * 0.2); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -p.r * 0.8); ctx.stroke();
              ctx.restore();
            }
          });
        }
      },
      side: {
        frames: 34, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('slash', { pitch: 1.4 });
          [-0.8, 0.6].forEach((vy, i) => shoot(f, {
            ox: 26, oy: -f.h * (0.55 + i * 0.1), speed: 11, vy, r: 10, dmg: 5, ang: 45, bkb: 25, kbg: 45, life: 70, rehit: 20, pierce: true,
            effect: 'slash', color: '#c9a04a', glow: false, stageCollide: true,
            update(p) { if (p.t > 8) { p.vx *= 0.9; p.vy *= 0.9; } },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y);
              ctx.rotate(Math.abs(p.vx) > 1 ? p.t * 0.5 : (p.facing > 0 ? 0 : PI));
              R.poly(ctx, [[14, 0], [4, -4], [-10, -2], [-10, 2], [4, 4]], '#c9a04a');
              R.disc(ctx, -10, 0, 3, '#24304a', false);
              ctx.restore();
            }
          }));
        }
      },
      up: {
        frames: 36, intangible: [1, 20], helplessLag: 12,
        poseFn() { return { aF1: 2.2, aF2: 0.3, aB1: -0.6, lean: -0.1, planted: false }; },
        onStart(f, mv) {
          const h = f.data.hist || [];
          let pick = null;
          for (let i = 0; i < Math.min(h.length, 30); i++) if (h[i].g) { pick = h[i]; break; }
          mv.data.to = pick || h[0] || null;
          NX.Audio.play('magic', { pitch: 0.5 });
        },
        onFrame(f, fr, mv) {
          if (fr < 10) { f.vx *= 0.6; f.vy *= 0.5; mv.velX = mv.velY = true; return; }
          if (fr === 10) {
            const to = mv.data.to;
            if (to) {
              f.fx('bolt', f.x, f.y - f.h / 2, { x2: to.x, y2: to.y - f.h / 2, color: '#3ac0b0', life: 14 });
              f.fx('ring', f.x, f.y - f.h / 2, { r: 40, color: '#3ac0b0' });
              f.x = to.x; f.y = to.y - 2; f.vx = 0; f.vy = 0; f.lvx = 0; f.lvy = 0; f.ground = null;
              f.fx('ring', f.x, f.y - f.h / 2, { r: 50, color: '#c9a04a' });
              NX.Audio.play('reflect');
            } else mv.data.rise = true;
          }
          if (mv.data.rise && fr >= 10 && fr <= 22) { f.vy = -12; mv.velY = true; }
        },
        onLand(f) { f.endMoveCleanup(true); f.startLand(8); return 'continue'; }
      },
      down: {
        frames: 46, pose: 'charge',
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('tick');
          if (fr !== 14) return;
          NX.Audio.play('reflect');
          f.fx('ring', f.x, f.y - f.h / 2, { r: 90, color: '#3ac0b0', w: 6, life: 18 });
          f.spawnProjectile({ x: f.x, y: f.y - f.h / 2, vx: 0, vy: 0, r: 80, life: 4, dmg: 4, ang: 80, fkb: 0, bkb: 0, kbg: 0, stun: 45, effect: 'magic',
            dir: 'auto', stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false, draw() {} });
        }
      }
    }
  });

  /* ======================================================================
   * 20 · HEXA — Caballero Avispa (veneno, 3 saltos aéreos)
   * ==================================================================== */
  fighter({
    id: 'hexa', name: 'Hexa', title: 'Caballero Avispa',
    passive: 'Veneno: sus especiales envenenan (daño continuo).',
    palette: { primary: '#f2c230', secondary: '#1b1b1b', skin: '#d9a87a', head: '#f2c230', hand: '#1b1b1b', accent: '#9aff6a', visor: '#7a1a1a', feet: '#1b1b1b', legs: '#1b1b1b', arms: '#f2c230', belt: '#1b1b1b' },
    stats: { weight: 84, height: 80, width: 32, run: 7.2, airSpeed: 4.3, gravity: 0.52, fall: 9, airJump: 11.5, airJumps: 3, airJumpDecay: 0.05 },
    profile: { style: 'sword', reach: 1.25, power: 0.95, speed: 1.05 },
    ai: { recovery: 'up', projectile: 'neutral', range: 110, extraJumps: true },
    flipJump: false,
    rig: {
      headR: 12, torsoW: 20, hipW: 16, torsoH: 25, thigh: 15, shin: 15, armW: 6.5, eyes: 'visor', mouth: false,
      weapon: { type: 'sword', len: 62, w: 5, trail: '#fff07a' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.fillStyle = '#1b1b1b';
          ctx.fillRect(-r * 0.9, -r * 0.62, r * 1.8, r * 0.2); ctx.fillRect(-r * 0.95, r * 0.3, r * 1.9, r * 0.2);
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
          for (const [sx, k] of [[0.1, 1], [-0.35, 0.85]]) {
            ctx.beginPath(); ctx.moveTo(r * sx, -r * 0.9); ctx.quadraticCurveTo(r * (sx + 0.4) * k, -r * 1.9, r * (sx + 0.9), -r * 1.8); ctx.stroke();
            R.disc(ctx, r * (sx + 0.9), -r * 1.8, 2.5, '#1b1b1b');
          }
        },
        back(ctx, a) {
          const f = a.f, flap = f.ground ? Math.sin(f.tick * 0.2) * 0.1 : Math.sin(f.tick * 1.6) * 0.45;
          ctx.save(); ctx.globalAlpha = 0.55; wingPair(ctx, a, '#dff4ff', '#9ad4ff', 30, flap); ctx.restore();
        },
        tail(ctx, a) {
          const h = a.J.hip;
          ctx.save(); ctx.translate(h.x - 10, h.y - 2); ctx.rotate(0.5);
          R.ellipse(ctx, -6, 6, 11, 7, 0, '#f2c230');
          ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-12, 3, 4, 7); ctx.fillRect(-4, 2, 4, 9);
          R.poly(ctx, [[-17, 4], [-25, 8], [-16, 9]], '#1b1b1b');
          ctx.restore();
        },
        torso(ctx, a) { torsoStripes(ctx, a, '#1b1b1b', 3); },
        weapon(ctx, f, w) {
          ctx.fillStyle = '#c0c8d2'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.rect(-2, -10, 4, w.len - 14); ctx.fill(); ctx.stroke();
          ctx.save(); ctx.translate(0, w.len - 24);
          R.poly(ctx, [[-6, 0], [6, 0], [3, 14], [-3, 14]], '#f2c230');
          ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-5, 4, 10, 3);
          R.poly(ctx, [[-3, 14], [3, 14], [0, 26]], '#1b1b1b');
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 28, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 8) return;
          NX.Audio.play('laser', { pitch: 2 });
          shoot(f, { ox: 30, oy: -f.h * 0.55, speed: 14, r: 6, dmg: 4, ang: 40, bkb: 15, kbg: 30, life: 40, effect: 'hit',
            burn: { frames: 150, dmg: 1, kind: 'poison' }, color: '#9aff6a', glow: false, draw: boltDraw('#9aff6a', 10) });
        }
      },
      side: {
        frames: 42, pose: 'dashattack', oncePerAir: true, drift: 0, landingLag: 14,
        hitboxes: [{ f: [8, 20], x: 34, y: -32, r: 20, dmg: 11, ang: 45, bkb: 40, kbg: 80, effect: 'slash', burn: { frames: 90, dmg: 1, kind: 'poison' } }],
        onStart(f, mv) { mv.data.air = !f.ground; NX.Audio.play('spin', { pitch: 1.8 }); },
        onFrame(f, fr, mv) {
          if (fr >= 8 && fr <= 20) {
            f.vx = f.facing * (mv.data.air ? 9 : 11); mv.velX = true;
            if (mv.data.air) { f.vy = 7; mv.velY = true; }
          }
        },
        onLand(f, mv) { if (mv.data.air) { f.endMoveCleanup(true); f.startLand(14); } return 'continue'; }
      },
      up: {
        frames: 56, pose: 'rise', helplessLag: 16,
        hitboxes: [{ f: [4, 42], x: 0, y: -50, r: 26, dmg: 1, rehit: 6, fkb: 20, bkb: 0, kbg: 100, ang: 80, effect: 'hit', dir: 'auto' }],
        onFrame(f, fr, mv) {
          if (fr < 4 || fr > 42) return;
          const I = f.input;
          let x = I.x, y = I.y;
          const a = Math.hypot(x, y) < 0.3 ? 0 : Math.atan2(x, -y);
          f.vx = Math.sin(a) * 6.8; f.vy = -Math.cos(a) * 6.8; mv.velX = mv.velY = true;
          if (Math.abs(x) > 0.3) f.facing = Math.sign(x);
          if (fr % 5 === 0) NX.Audio.play('spin', { pitch: 2.2 });
        }
      },
      down: {
        frames: 40, pose: 'roar',
        canUse: f => !(f.data.drones || []).some(d => d.active),
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('spin', { pitch: 2.5 });
          f.data.drones = [0, 1, 2].map(i => f.spawnProjectile({
            x: f.x, y: f.y - f.h * 0.6, vx: 0, vy: 0, r: 7, life: 160, dmg: 3, ang: 60, bkb: 20, kbg: 35, effect: 'hit',
            burn: { frames: 60, dmg: 1, kind: 'poison' }, stageCollide: false, glow: false, data: { i },
            update(p) {
              const o = p.owner;
              if (p.t < 30) {
                const ang = p.t * 0.2 + p.data.i * 2.1;
                p.x = o.x + Math.cos(ang) * 40; p.y = o.y - o.h * 0.6 + Math.sin(ang) * 18; p.vx = 0; p.vy = 0;
                return;
              }
              if (!p.data.go) {
                p.data.go = true;
                const t = nearestFoe(o, p.x, p.y, 900);
                const a = t ? Math.atan2(t.y - t.h / 2 - p.y, t.x - p.x) : (o.facing > 0 ? 0 : PI);
                p.vx = Math.cos(a) * 7; p.vy = Math.sin(a) * 7;
              }
              steer(p, 0.08, 900);
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y);
              ctx.globalAlpha = 0.6; ctx.fillStyle = '#e6f6ff';
              const fl = Math.abs(Math.sin(p.t * 1.5)) * 4 + 2;
              ctx.beginPath(); ctx.ellipse(-2, -5, 3, fl, -0.4, 0, TAU); ctx.ellipse(3, -5, 3, fl, 0.4, 0, TAU); ctx.fill();
              ctx.globalAlpha = 1; R.ellipse(ctx, 0, 0, 6, 4, 0, '#f2c230');
              ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-1, -4, 2, 8);
              ctx.restore();
            }
          }));
        }
      }
    }
  });

  /* ======================================================================
   * 21 · KUMO — Acechadora Arácnida (telarañas y trampas)
   * ==================================================================== */
  function webDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.1);
    ctx.strokeStyle = 'rgba(245,245,255,.9)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * p.r, Math.sin(a) * p.r); ctx.stroke(); }
    for (const k of [0.35, 0.65, 0.95]) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * TAU / 8; ctx.lineTo(Math.cos(a) * p.r * k, Math.sin(a) * p.r * k); } ctx.stroke(); }
    ctx.restore();
  }
  fighter({
    id: 'kumo', name: 'Kumo', title: 'Acechadora Arácnida',
    passive: 'Seda: telarañas que paralizan y un hilo para recuperarse.',
    palette: { primary: '#3a2450', secondary: '#14101c', skin: '#c8b8d8', head: '#3a2450', hand: '#14101c', accent: '#e2263a', eye: '#e2263a', feet: '#14101c', legs: '#2a1a3a', arms: '#3a2450', hair: '#14101c' },
    stats: { weight: 80, height: 80, width: 30, walk: 3.3, run: 7.8, dash: 8.4, airSpeed: 4.2, gravity: 0.6, fall: 10.5, fastFall: 15.5, jump: 13.6 },
    profile: { style: 'fist', reach: 1, power: 0.95, speed: 1.1, effect: 'slash' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 70, rushdown: true },
    rig: {
      headR: 12, torsoW: 18, hipW: 16, torsoH: 24, thigh: 16, shin: 16, legW: 8, armW: 6, eyes: 'glow', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          ctx.fillStyle = a.pal.accent;
          [[0.1, -0.55], [0.4, -0.6], [0.2, -0.78], [0.5, -0.8]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r, y * r, 1.6, 0, TAU); ctx.fill(); });
          ctx.fillStyle = '#c8b8d8'; ctx.fillRect(r * 0.15, r * 0.3, r * 0.75, r * 0.25);
        },
        back(ctx, a) {
          const { J, f } = a, t = f.tick;
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            const base = { x: J.sh.x - 6, y: J.sh.y + 4 + i * 4 };
            const sw = Math.sin(t * 0.15 + i * 1.3) * 0.25;
            const a1 = -2.2 + i * 0.35 + sw;
            const k1 = { x: base.x + Math.sin(a1) * 18, y: base.y + Math.cos(a1) * 18 };
            const k2 = { x: k1.x + Math.sin(a1 + 1.6) * 16, y: k1.y + Math.cos(a1 + 1.6) * 16 };
            R.limb(ctx, [base, k1, k2], 3, i % 2 ? '#2a1a3a' : '#3a2450');
          }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-4, -r.torsoH * 0.8], [4, -r.torsoH * 0.8], [0, -r.torsoH * 0.6]], a.pal.accent, false);
          R.poly(ctx, [[-4, -r.torsoH * 0.4], [4, -r.torsoH * 0.4], [0, -r.torsoH * 0.6]], a.pal.accent, false);
          ctx.fillStyle = '#14101c'; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 4);
        }
      }
    },
    drawOverlay(ctx, f) {
      const mv = f.move;
      if (!mv) return;
      const hx = f.x + f.facing * 16, hy = f.y - f.h * 0.6;
      let ex = null, ey = null;
      if (mv.def.key === 'special_side' && mv.frame >= 8 && mv.frame <= 30) {
        if (mv.data.zip) { ex = mv.data.zip.x; ey = mv.data.zip.y - mv.data.zip.h / 2; }
        else { const ext = Math.min(1, (mv.frame - 7) / 6) * (mv.frame > 18 ? Math.max(0, 1 - (mv.frame - 18) / 8) : 1); ex = hx + f.facing * 170 * ext; ey = hy; }
      }
      if (mv.def.key === 'special_up' && mv.frame >= 4 && mv.frame <= 26) {
        if (!mv.data.anchor) mv.data.anchor = { x: f.x + f.facing * 10, y: f.y - f.h - 200 };
        ex = mv.data.anchor.x; ey = mv.data.anchor.y;
      }
      if (ex == null) return;
      ctx.save(); ctx.strokeStyle = 'rgba(245,245,255,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
    },
    specials: {
      neutral: {
        frames: 32, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('swing', { pitch: 1.6 });
          shoot(f, { ox: 28, oy: -f.h * 0.55, speed: 10, r: 13, dmg: 3, ang: 60, fkb: 10, bkb: 0, kbg: 100, stun: 35, life: 40, effect: 'hit', color: '#f5f5ff', glow: false, draw: webDraw });
        }
      },
      side: {
        frames: 46, pose: 'shoot',
        onFrame(f, fr, mv) {
          if (fr === 8) NX.Audio.play('swing', { pitch: 1.3 });
          if (fr >= 12 && fr <= 14 && !mv.data.zip) {
            for (const t of f.opponents()) {
              const dx = (t.x - f.x) * f.facing;
              if (dx > 0 && dx < 180 && Math.abs((t.y - t.h / 2) - (f.y - f.h * 0.6)) < 45 && t.canBeHit()) { mv.data.zip = t; mv.data.zt = 0; break; }
            }
            if (!mv.data.zip && !f.ground) tetherLedge(f, 180);
          }
          const t = mv.data.zip;
          if (t) {
            if (!t.inPlay() || mv.data.zt > 24) { mv.data.zip = null; return; }
            mv.data.zt++;
            const dx = t.x - f.x;
            if (Math.abs(dx) > 42) {
              f.vx = Math.sign(dx) * 14; f.vy = U.clamp((t.y - f.y) * 0.3, -10, 10); f.facing = Math.sign(dx);
              mv.velX = mv.velY = true; mv.frame = Math.min(mv.frame, 20);
              mv.extraBoxes = null;
            } else {
              mv.extraBoxes = [{ x: 22, y: -40, r: 24, dmg: 10, ang: 40, bkb: 50, kbg: 75, effect: 'slash' }];
              f.vx *= 0.4; mv.data.zip = null; mv.frame = 26;
              NX.Audio.play('slash');
            }
          } else if (fr > 30) mv.extraBoxes = null;
        }
      },
      up: {
        frames: 50, pose: 'rise', vel: [{ f: [6, 24], vy: -12, vx: 1 }],
        hitboxes: [{ f: [20, 24], x: 6, y: -82, r: 20, dmg: 6, ang: 80, bkb: 45, kbg: 70, effect: 'slash' }],
        onFrame(f, fr) { if (fr === 5) NX.Audio.play('swing', { pitch: 0.8 }); }
      },
      down: {
        frames: 36, pose: 'kneel',
        onFrame(f, fr) {
          if (fr !== 14) return;
          if (f.data.trap && f.data.trap.active) f.data.trap.destroy('replace');
          NX.Audio.play('block');
          const gx = f.x + f.facing * (f.ground ? 40 : 0);
          f.data.trap = f.spawnProjectile({
            x: gx, y: f.ground ? f.ground.y - 4 : f.y, vx: 0, vy: f.ground ? 0 : 4, gravity: 0.5, maxFall: 12, r: 6, dmg: 0, harmless: true,
            life: 600, passCollide: true, reflectable: false, absorbable: false, destructible: false, glow: false,
            onGround(p, pl) { p.y = pl.y - 4; p.vy = 0; p.data.armed = true; },
            update(p, m) {
              if (!p.data.armed || p.t < 24) return;
              for (const t of m.fighters) {
                if (t === p.owner || !t.inPlay() || !t.canBeHit()) continue;
                if (Math.abs(t.x - p.x) < 36 && Math.abs(t.y - (p.y + 4)) < 24) {
                  p.owner.hitTarget(t, { dmg: 4, fkb: 0, bkb: 0, kbg: 0, ang: 90, stun: 70, effect: 'hit' }, { x: p.x, y: p.y });
                  m.effects.spawn('text', t.x, t.y - t.h - 12, { text: '¡ATRAPADO!', color: '#f5f5ff', size: 18 });
                  p.destroy('trigger'); return false;
                }
              }
            },
            draw(ctx, p) {
              ctx.save(); ctx.translate(p.x, p.y + 3); ctx.scale(1, 0.3);
              ctx.globalAlpha = p.data.armed ? 0.85 : 0.4;
              webDraw(ctx, { x: 0, y: 0, r: 34, t: 0 });
              ctx.restore();
            }
          });
        }
      }
    }
  });

  /* ======================================================================
   * 22 · RITMO — Bailarín de Capoeira (combos y patadas giratorias)
   * Pasiva "Ginga": tras una esquiva, el siguiente golpe hace +20% (70 f).
   * ==================================================================== */
  fighter({
    id: 'ritmo', name: 'Ritmo', title: 'Bailarín de Capoeira',
    passive: 'Ginga: tras una esquiva, +20% de daño durante 70 frames.',
    palette: { primary: '#1aa36a', secondary: '#f4f1e8', skin: '#7a4a2a', head: '#7a4a2a', hand: '#7a4a2a', arms: '#7a4a2a', legs: '#f4f1e8', feet: '#7a4a2a', accent: '#ffd23a', hair: '#1a120c', belt: '#ffd23a', eye: '#1a120c' },
    stats: { weight: 88, height: 82, width: 32, walk: 3.4, run: 7.8, dash: 8.4, airSpeed: 4.3, gravity: 0.6, jump: 14, shortHop: 9 },
    profile: { style: 'kick', reach: 1.1, power: 0.97, speed: 1.1 },
    ai: { recovery: 'up', projectile: null, range: 75, rushdown: true },
    init(f) { f.data.ginga = 0; },
    onUpdate(f) {
      const dodging = f.state === ST.DODGE || f.state === ST.AIRDODGE;
      if (dodging) f.data.wasDodge = true;
      else if (f.data.wasDodge) { f.data.wasDodge = false; f.data.ginga = 70; f.fx('text', f.x, f.y - f.h - 14, { text: 'GINGA', color: '#ffd23a', size: 16 }); }
      if (f.data.ginga > 0) { f.data.ginga--; if (f.tick % 6 === 0) f.fx('sparkle', f.x, f.y - f.h / 2, { color: '#ffd23a' }); }
    },
    damageMod(f) { return f.data.ginga > 0 ? 1.2 : 1; },
    onHitConfirm(f) { if (f.data.ginga > 0) f.data.ginga = 0; },
    rig: {
      headR: 11.5, torsoW: 20, hipW: 17, torsoH: 25, thigh: 17, shin: 17, legW: 9,
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, t = a.f.tick, w = windOf(a.f);
          for (let i = 0; i < 5; i++) {
            const x0 = -r * 0.9 + i * 3, y0 = -r * 0.3 + i * 2;
            const pts = [{ x: x0, y: y0 }];
            for (let k = 1; k <= 3; k++) pts.push({ x: x0 - k * (3 + w * 0.15), y: y0 + k * 6 + Math.sin(t * 0.18 + i + k) * 2 });
            R.limb(ctx, pts, 4, a.pal.hair);
          }
        },
        head(ctx, a) { hairCap(ctx, a.rig.headR, a.pal.hair, { a1: -0.6 }); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.skin; ctx.fillRect(-r.torsoW * 0.18, -r.torsoH, r.torsoW * 0.36, r.torsoH * 0.85);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 6);
          ctx.fillStyle = a.pal.belt; ctx.fillRect(-r.hipW / 2, -8, r.hipW, 3);
          ctx.strokeStyle = a.pal.belt; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-r.hipW * 0.3, -6); ctx.lineTo(-r.hipW * 0.45, 8 + Math.sin(a.f.tick * 0.2) * 2); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 38, pose: 'spin',
        hitboxes: [{ f: [10, 16], x: 0, y: -42, r: 42, dmg: 9, ang: 45, bkb: 40, kbg: 75, dir: 'auto', effect: 'hit' }],
        onFrame(f, fr) { if (fr === 10) NX.Audio.play('swing', { size: 1.6 }); }
      },
      side: {
        frames: 40, pose: 'dtilt', act: [6, 16], oncePerAir: true, drift: 0,
        vel: [{ f: [6, 16], vx: 9.5 }],
        hitboxes: [{ f: [6, 16], x: 24, y: -10, r: 20, dmg: 8, ang: 85, bkb: 55, kbg: 40, effect: 'hit' }],
        onStart(f, mv) { if (!f.ground) { f.vy = Math.min(f.vy, 0); mv.noGrav = true; } },
        onFrame(f, fr, mv) { if (fr === 6) NX.Audio.play('dash'); if (fr === 17) mv.noGrav = false; if (f.ground && fr >= 6 && fr <= 16 && fr % 3 === 0) f.fx('dust', f.x, f.y, { n: 2, vx: -f.facing * 2 }); }
      },
      up: {
        frames: 46, pose: 'spin', vel: [{ f: [4, 20], vy: -12.5, vx: 2.5 }],
        hitboxes: [
          { f: [4, 18], x: 0, y: -46, r: 26, dmg: 2, rehit: 4, fkb: 35, bkb: 0, kbg: 100, ang: 80, dir: 'auto', effect: 'hit' },
          { f: [19, 21], x: 0, y: -50, r: 30, dmg: 6, ang: 80, bkb: 50, kbg: 85, effect: 'hit', group: 1, dir: 'auto' }],
        onFrame(f, fr) { if (fr % 6 === 4 && fr <= 20) NX.Audio.play('spin', { pitch: 1.3 }); }
      },
      down: {
        frames: 50,
        poseFn(f, mv) {
          const s = mv.frame * 0.55;
          if (mv.frame < 6 || mv.frame > 40) return { lF1: 1.2, lF2: -2.0, lB1: 0.2, lB2: -1.5, lean: 0.5, aF1: 1.3, aB1: 1.2 };
          return { rot: PI, oy: -6, aF1: 0.1, aF2: 0, aB1: -0.1, aB2: 0, lF1: 1.4 * Math.sin(s), lF2: -0.1, lB1: -1.4 * Math.sin(s), lB2: -0.1, planted: false };
        },
        hitboxes: [
          { f: [10, 34], x: 0, y: -50, r: 40, dmg: 1.8, rehit: 5, fkb: 30, bkb: 0, kbg: 100, ang: 361, dir: 'auto', effect: 'hit' },
          { f: [35, 37], x: 0, y: -50, r: 44, dmg: 7, ang: 361, bkb: 55, kbg: 80, dir: 'auto', effect: 'hit', group: 1 }],
        onFrame(f, fr, mv) {
          if (fr >= 10 && fr <= 34) { f.vx = f.input.x * 2.5; mv.velX = true; }
          if (fr % 6 === 4 && fr >= 10 && fr <= 34) NX.Audio.play('spin', { pitch: 1.1 });
        }
      }
    }
  });

  /* ======================================================================
   * 23 · VOLTA — Inventora Galvánica (electricidad e imanes)
   * ==================================================================== */
  function chainZap(f, from, range, dmg, exclude) {
    let best = null, bd = range;
    for (const t of f.opponents()) {
      if (exclude.indexOf(t) >= 0 || !t.canBeHit()) continue;
      const d = U.dist(from.x, from.y, t.x, t.y - t.h / 2);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) return null;
    const to = { x: best.x, y: best.y - best.h / 2 };
    f.fx('bolt', from.x, from.y, { x2: to.x, y2: to.y, color: '#5fd0ff', life: 12 });
    if (best.isShielding()) { best.shieldHP -= dmg * 1.2; f.fx('ring', to.x, to.y, { r: 30, color: best.color }); NX.Audio.play('shieldHit'); }
    else f.hitTarget(best, { dmg, ang: 45, bkb: 35, kbg: 50, effect: 'elec' }, { dir: U.sign(best.x - from.x), x: to.x, y: to.y });
    exclude.push(best);
    return to;
  }
  fighter({
    id: 'volta', name: 'Volta', title: 'Inventora Galvánica',
    passive: 'Rayo encadenado: su descarga salta entre varios rivales.',
    palette: { primary: '#f4f6f8', secondary: '#2a3a5a', skin: '#f0c8a8', head: '#f0c8a8', hand: '#c87a3a', arms: '#f4f6f8', legs: '#2a3a5a', feet: '#3a2a1a', accent: '#5fd0ff', hair: '#ff8a3a', eye: '#2a3a5a', belt: '#c87a3a' },
    stats: { weight: 90, height: 80, width: 32, run: 7.0, airSpeed: 3.9 },
    profile: { style: 'magic', reach: 1, power: 0.98, speed: 1.02, effect: 'elec' },
    ai: { recovery: 'up', projectile: 'neutral', range: 160, zoner: true },
    rig: {
      headR: 12, torsoW: 20, hipW: 20, torsoH: 25, armW: 6.5,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          spikes(ctx, r * 1.05, a.pal.hair, 13, 0.45, PI * 0.85, PI * 2.15);
          if (a.f.tick % 30 < 4) { ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(-r * 0.7, -r * 1.4); ctx.lineTo(-r * 0.4, -r * 1.1); ctx.stroke(); }
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.08, r * 0.24, 0, TAU); ctx.stroke();
        },
        back(ctx, a) {
          const s = a.J.sh, t = a.f.tick;
          ctx.save(); ctx.translate(s.x - 14, s.y + 6); ctx.rotate(a.J.lean);
          R.poly(ctx, [[-9, -12], [9, -12], [9, 16], [-9, 16]], '#c87a3a');
          for (const x of [-5, 5]) { R.limb(ctx, [{ x, y: -12 }, { x, y: -26 }], 3, '#8a5a2a'); R.disc(ctx, x, -28, 3.5, '#5fd0ff'); }
          if (t % 12 < 6) { ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-5, -28); ctx.lineTo(-1, -32); ctx.lineTo(1, -26); ctx.lineTo(5, -28); ctx.stroke(); }
          ctx.restore();
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.7, 16], [-r.hipW * 0.7, 16]], a.pal.primary);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.torsoW * 0.12, -r.torsoH, r.torsoW * 0.24, r.torsoH * 0.9);
          ctx.fillStyle = '#d62a2a'; ctx.fillRect(r.torsoW * 0.22, -r.torsoH * 0.7, 2, 6); ctx.fillStyle = '#2a7ad6'; ctx.fillRect(r.torsoW * 0.28, -r.torsoH * 0.7, 2, 6);
        }
      }
    },
    specials: {
      neutral: {
        frames: 40, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 12) return;
          NX.Audio.play('elec');
          const from = f.localToWorld(30, -f.h * 0.55);
          let first = null, bd = 260;
          for (const t of f.opponents()) {
            const dx = (t.x - f.x) * f.facing;
            if (dx < 0 || dx > 260 || Math.abs(t.y - f.y) > 100 || !t.canBeHit()) continue;
            if (dx < bd) { bd = dx; first = t; }
          }
          if (!first) { f.fx('bolt', from.x, from.y, { x2: from.x + f.facing * 200, y2: from.y + U.rand(-20, 20), color: '#5fd0ff', life: 10 }); return; }
          const p1 = chainZap(f, from, 400, 8, f.opponents().filter(o => o !== first));
          if (p1) chainZap(f, p1, 220, 5, [first]);
        }
      },
      side: {
        frames: 44, pose: 'cast',
        hitboxes: [{ f: [26, 28], x: 50, y: -45, r: 34, dmg: 7, ang: 50, bkb: 45, kbg: 70, effect: 'elec' }],
        onFrame(f, fr) {
          if (fr === 8) {
            NX.Audio.play('beam', { pitch: 0.4 });
            shoot(f, {
              ox: 120, oy: -f.h * 0.5, speed: 0, r: 110, life: 18, dmg: 0, harmless: true, stageCollide: false, reflectable: false,
              absorbable: false, destructible: false, transcendent: true, pierce: true, glow: false,
              update(p, m) {
                const o = p.owner;
                for (const t of m.fighters) {
                  if (t === o || !t.inPlay() || !t.canBeHit()) continue;
                  if (U.dist(t.x, t.y - t.h / 2, p.x, p.y) > p.r) continue;
                  const d = t.x - o.x;
                  if (Math.abs(d) > 46) t.lvx = U.approach(t.lvx, -Math.sign(d) * 4.5, 0.9);
                  else t.lvx *= 0.5;
                }
              },
              draw(ctx, p) {
                ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 6) * 0.6; ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) { const rr = p.r * (1 - ((p.t * 0.06 + i / 3) % 1)); ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke(); }
                ctx.restore();
              }
            });
          }
          if (fr === 26) NX.Audio.play('elec');
        }
      },
      up: {
        frames: 48, pose: 'rise', vel: [{ f: [6, 22], vy: -13, vx: 1.5 }],
        onFrame(f, fr) {
          if (fr === 6) NX.Audio.play('elec');
          if (fr >= 6 && fr <= 22 && fr % 3 === 0) {
            f.spawnProjectile({ x: f.x, y: f.y + 6, vx: 0, vy: 0, r: 15, life: 20, dmg: 3, ang: 90, fkb: 30, bkb: 0, kbg: 100, effect: 'elec',
              stageCollide: false, reflectable: false, absorbable: false, destructible: false, pierce: true, glow: false,
              draw(ctx, p) { ctx.save(); ctx.globalAlpha = p.life / 20; ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 8); ctx.lineTo(p.x + 3, p.y - 2); ctx.lineTo(p.x - 3, p.y + 2); ctx.lineTo(p.x + 8, p.y + 8); ctx.stroke(); ctx.restore(); } });
          }
        }
      },
      down: {
        frames: 50, pose: 'roar',
        hitboxes: [{ f: [16, 22], x: 0, y: -45, r: 64, dmg: 11, ang: 70, bkb: 50, kbg: 80, effect: 'elec', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr < 16 && fr % 3 === 0) f.fx('sparkle', f.x + U.rand(-20, 20), f.y - U.rand(10, f.h), { color: '#5fd0ff' });
          if (fr === 16) {
            NX.Audio.play('elec'); NX.Audio.play('explosion', { pitch: 1.5 });
            for (let i = 0; i < 6; i++) { const a = i * TAU / 6; f.fx('bolt', f.x, f.y - f.h / 2, { x2: f.x + Math.cos(a) * 70, y2: f.y - f.h / 2 + Math.sin(a) * 70, color: '#5fd0ff', life: 10 }); }
          }
        }
      }
    }
  });

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
    profile: { style: 'sword', reach: 1.2, power: 1.08, speed: 0.92 },
    ai: { recovery: 'up', projectile: 'neutral', range: 110, heavy: true },
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

  /* ======================================================================
   * ================ V3 · LUCHADORES MULTIFORMA (1 slot cada uno) ========
   * Un slot con `forms: [...]` agrupa varias formas completas. El especial
   * Abajo cambia de forma conservando daño, vidas y posición.
   * ==================================================================== */
  function swapMove(o) {
    o = o || {};
    const at = o.at || 16, total = o.frames || 40;
    return {
      frames: total, intangible: [1, total - 6], drift: 0.5,
      poseFn(f, mv) { return { rot: mv.frame < at ? mv.frame * 0.35 : 0, aF1: 2.6, aF2: 0.3, aB1: 2.4, aB2: 0.3, lean: -0.1, planted: !!f.ground }; },
      onStart(f, mv) { mv.data.next = f.formIndex + 1; NX.Audio.play('magic', { pitch: 1.3 }); if (o.onStart) o.onStart(f, mv); },
      onFrame(f, fr, mv) {
        if (fr < at) f.drawScale = Math.max(0.15, 1 - fr / at);
        if (fr === at) {
          f.setForm(mv.data.next); f.drawScale = 0.15;
          f.fx('ring', f.x, f.y - f.h / 2, { r: 60, color: o.color || '#ffffff', w: 6 });
          for (let i = 0; i < 8; i++) f.fx('sparkle', f.x, f.y - f.h / 2, { color: o.color || '#ffffff' });
          NX.Audio.play('chargeFull');
          if (o.onSwap) o.onSwap(f);
        }
        if (fr > at) f.drawScale = Math.min(1, 0.15 + (fr - at) / 12);
      },
      onEnd(f) { f.drawScale = 1; }
    };
  }

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

  /* ======================================================================
   * v3.1 · HALDOR — Mercenario del Alba (mandoble pesado, kit tipo Ike)
   * Erupción cargable (autodaño al máximo), Tajo Relámpago cargable,
   * Éter (lanza la espada, la recoge y cae) y Contraataque.
   * ==================================================================== */
  const ERUPT_MAX = 150;
  /* Arrastra al rival junto al atacante en ataques de varios golpes. */
  function autolink(f, t, mv) {
    (mv.data.links || (mv.data.links = new Set())).add(t);
  }
  function linkTick(f, mv, pull) {
    if (!mv.data.links) return;
    for (const t of mv.data.links) {
      if (t.hitlag > 0 || (t.state !== ST.HITSTUN && t.state !== ST.TUMBLE)) continue;
      const tx = f.x + f.facing * 8, ty = f.y - 6;
      t.lvx = (tx - t.x) * pull + f.vx; t.lvy = (ty - t.y) * pull + f.vy;
    }
  }
  function swordSpinDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.6);
    ctx.globalAlpha = 0.35; R.disc(ctx, 0, 0, p.r, '#ffd28a', false); ctx.globalAlpha = 1;
    R.poly(ctx, [[-7, -30], [7, -30], [9, 18], [0, 30], [-9, 18]], '#b9c2cc');
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(-12, -32, 24, 5);
    ctx.fillStyle = '#4a2a1a'; ctx.fillRect(-3, -44, 6, 12);
    ctx.restore();
  }
  function counterMove(o) {
    return {
      frames: 50, pose: 'counter', counter: { f: [6, 28] },
      onCounter(f, atk, box, mv) {
        if (atk && atk !== f) {
          f.facing = U.sign(atk.x - f.x);
          const base = box && box.def ? box.def.dmg || 6 : 6;
          if (Math.abs(atk.x - f.x) < 170 && Math.abs(atk.y - f.y) < 140)
            f.hitTarget(atk, { dmg: Math.max(o.min, base * o.mult), ang: o.ang || 361, bkb: 60, kbg: o.kbg || 90, effect: 'slash' }, { dir: U.sign(atk.x - f.x) });
          atk.hitlag = Math.max(atk.hitlag, 8);
        }
        f.intangible = Math.max(f.intangible, 24);
        mv.frame = Math.max(mv.frame, mv.def.frames - 20);
        f.fx('ring', f.x, f.y - f.h / 2, { r: 72, color: o.color, w: 6 });
        f.fx('text', f.x, f.y - f.h - 22, { text: o.text, color: o.color, size: 22 });
      }
    };
  }
  fighter({
    id: 'haldor', name: 'Haldor', title: 'Mercenario del Alba',
    passive: 'Mandoble de dos manos: golpes lentos con alcance y potencia enormes. Erupción al máximo le cuesta 10%.',
    palette: { primary: '#4a5a2a', secondary: '#6a3e22', skin: '#d8a27a', head: '#d8a27a', hand: '#5a3a22', arms: '#d8a27a', legs: '#3a2a1e', feet: '#2a1a12', accent: '#ffb03a', hair: '#a8481e', eye: '#2a1a0a', belt: '#c9a43a' },
    stats: { weight: 107, height: 92, width: 38, walk: 2.9, run: 6.7, dash: 7.2, airSpeed: 3.8, gravity: 0.62, fall: 10.4, fastFall: 15.5, jump: 13.2, shortHop: 8.6, airJump: 12.2, traction: 0.55 },
    profile: { style: 'sword', reach: 1.22, power: 1.24, speed: 0.85 },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 115, counter: 'down', sword: true, heavy: true },
    onLifeReset(f) { f.data.swordUp = false; },
    rig: {
      headR: 11.5, torsoW: 25, hipW: 22, torsoH: 28, armW: 8, upperArm: 16, foreArm: 15, handR: 6, legW: 9, brows: true,
      weapon: { type: 'sword', len: 60, w: 13, trail: '#ffd28a' },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f);
          ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.35); ctx.quadraticCurveTo(-r * 1.6 - w * 0.4, -r * 0.1, -r * 2.0 - w * 0.6, r * 0.5 + Math.sin(a.f.tick * 0.2) * 2); ctx.stroke();
        },
        head(ctx, a) {
          const r = a.rig.headR;
          spikes(ctx, r * 0.98, a.pal.hair, 6, 0.38, PI * 1.05, PI * 1.95);
          hairCap(ctx, r, a.pal.hair, { a1: -0.35 });
          ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.0, PI * 1.12, PI * 1.88); ctx.stroke();
          ctx.strokeStyle = U.rgba('#8a3a2a', 0.9); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.05); ctx.lineTo(r * 0.75, r * 0.45); ctx.stroke();
        },
        back(ctx, a) {
          const s = a.J.shB;
          R.ellipse(ctx, s.x, s.y + 2, 10, 7, 0.3, '#7a7f86');
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.5, -r.torsoH], [r.torsoW * 0.1, -r.torsoH], [-r.torsoW * 0.05, -6], [-r.torsoW * 0.5, -6]], a.pal.secondary);
          ctx.strokeStyle = '#c9a43a'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.45, -r.torsoH * 0.95); ctx.lineTo(r.torsoW * 0.42, -r.torsoH * 0.2); ctx.stroke();
          R.ellipse(ctx, r.torsoW * 0.32, -r.torsoH * 0.9, 9, 6, -0.3, '#8a9098');
          R.poly(ctx, [[-r.hipW * 0.55, -4], [r.hipW * 0.55, -4], [r.hipW * 0.7, 14], [-r.hipW * 0.7, 14]], '#3a2a1e');
        },
        weapon(ctx, f, w) {
          if (f.data && f.data.swordUp) return;
          ctx.fillStyle = '#4a2a1a'; ctx.fillRect(-3, -16, 6, 18);
          R.disc(ctx, 0, -17, 3.5, '#c9a43a');
          R.poly(ctx, [[-13, 2], [13, 2], [11, 8], [-11, 8]], '#c9a43a');
          R.poly(ctx, [[-8, 8], [8, 8], [9, w.len * 0.8], [0, w.len], [-9, w.len * 0.8]], '#b9c2cc');
          ctx.strokeStyle = U.rgba('#ffb03a', 0.85); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, w.len * 0.82); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 48, pose: 'slam', gravity: 0.45, charge: { at: 8, max: ERUPT_MAX, key: 'special', mult: 1 },
        onCharge(f, mv) {
          if (mv.charge % 4 === 0) f.fx('flame', f.x + f.facing * U.rand(20, 50), f.y - U.rand(0, 20), { scale: 0.7 + mv.charge / ERUPT_MAX });
          if (mv.charge === ERUPT_MAX - 1) f.fx('text', f.x, f.y - f.h - 22, { text: '¡AL LÍMITE!', color: '#ffb03a', size: 20 });
        },
        onRelease(f, mv) {
          mv.data.k = mv.charge / ERUPT_MAX;
          if (mv.charge >= ERUPT_MAX) { f.addDamage(10, null); f.flashTimer = 10; mv.data.self = true; }
        },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.data.k || 0, x = f.x + f.facing * 46, y = f.y - 26;
          boom(f, x, y, { r: 40 + 26 * k, dmg: 10 + 20 * k, ang: 80, bkb: 50 + 25 * k, kbg: 70 + 25 * k, effect: 'fire' });
          for (let i = 0; i < 6 + k * 8; i++) f.fx('flame', x + U.rand(-24, 24), y - U.rand(0, 70 + 60 * k), { scale: 1 + k });
        }
      },
      side: {
        frames: 62, pose: 'dashattack', oncePerAir: true, gravity: 0.25, drift: 0, ledgeGrab: true,
        charge: { at: 6, max: 80, key: 'special', mult: 1 },
        onStart(f) { if (!f.ground) f.vy = Math.min(f.vy, 1); },
        onCharge(f, mv) { f.vx *= 0.8; if (mv.charge % 5 === 0) f.fx('sparkle', f.x - f.facing * 10, f.y - f.h * 0.5, { color: '#ffd28a' }); },
        onRelease(f, mv) {
          const k = mv.charge / 80;
          mv.data.len = Math.round(9 + 15 * k); mv.data.dmg = 6 + 9 * k;
          NX.Audio.play('dash', { pitch: 1.2 });
        },
        onFrame(f, fr, mv) {
          const len = mv.data.len || 9, end = 7 + len;
          if (fr >= 7 && fr < end && !mv.data.hit) {
            f.vx = f.facing * 15; f.vy = 0; mv.velX = mv.velY = true;
            mv.extraBoxes = [{ x: 18, y: -44, r: 30, dmg: mv.data.dmg || 6, ang: 30, bkb: 60, kbg: 72, effect: 'slash' }];
            if (fr % 2 === 0) f.match.effects.list.push({ type: 'streak', x: f.x - f.facing * 20, y: f.y - U.rand(10, f.h), vx: -f.facing * 8, vy: 0, life: 10, max: 10, len: 22, color: '#ffd28a' });
          } else if (!mv.data.stopped && (fr >= end || mv.data.hit)) {
            mv.data.stopped = true; mv.extraBoxes = null; f.vx = f.facing * 3;
            NX.Audio.play('slash', { pitch: 0.8 });
            mv.frame = Math.max(fr, mv.def.frames - 22);
          }
          if (fr >= mv.def.frames - 1 && !f.ground && !mv.data.hit) {
            f.endMoveCleanup(true); f.state = ST.HELPLESS; f.stateTime = 0; f.helplessLag = 20;
          }
        },
        onHit(f, t, mv) { mv.data.hit = true; }
      },
      up: {
        frames: 80, pose: 'rise', drift: 0.25, helplessLag: 24, armor: { f: [3, 16], kb: 120 },
        hitboxes: [
          { f: [6, 9], x: 6, y: -60, r: 26, dmg: 2, ang: 90, bkb: 55, kbg: 12, effect: 'slash', group: 1 },
          { f: [10, 13], x: 6, y: -60, r: 26, dmg: 2, ang: 90, bkb: 55, kbg: 12, effect: 'slash', group: 2 },
          { f: [14, 17], x: 6, y: -60, r: 26, dmg: 2, ang: 90, bkb: 55, kbg: 12, effect: 'slash', group: 3 },
          { f: [27, 40], x: 8, y: -14, r: 30, dmg: 5, ang: 270, bkb: 30, kbg: 50, effect: 'slash', meteor: true, group: 4 }],
        onFrame(f, fr, mv) {
          if (fr === 4) {
            f.data.swordUp = true; NX.Audio.play('swing', { size: 1.4 });
            shoot(f, { ox: 8, oy: -f.h, speed: 0, vy: -14.5, r: 24, life: 17, dmg: 6, ang: 88, bkb: 60, kbg: 30, effect: 'slash',
              reflectable: false, absorbable: false, destructible: false, stageCollide: false, pierce: true, glow: false, draw: swordSpinDraw });
          }
          if (fr >= 5 && fr <= 20) { f.vy = -14; mv.velY = true; linkTick(f, mv, 0.25); }
          else if (fr > 20 && fr <= 26) {
            linkTick(f, mv, 0.3);
            f.vy = 0; mv.velY = true;
            if (fr === 21) { f.data.swordUp = false; f.fx('ring', f.x, f.y - f.h, { r: 40, color: '#ffd28a' }); NX.Audio.play('slash', { pitch: 1.2 }); }
          } else if (fr > 26) {
            f.vy = 16; mv.velY = true; mv.data.dive = true;
            if (fr % 2 === 0) f.fx('flame', f.x, f.y - 6, { scale: 1.1 });
            linkTick(f, mv, 0.3);
            if (fr >= 40 && !f.ground) mv.frame = 39;
          }
        },
        onHit(f, t, mv) { if (mv.frame <= 40) autolink(f, t, mv); },
        onEnd(f) { f.data.swordUp = false; },
        onLand(f, mv) {
          f.data.swordUp = false;
          if (mv.data.dive) boom(f, f.x + f.facing * 10, f.y - 16, { r: 56, dmg: 6, ang: 60, bkb: 60, kbg: 110, effect: 'fire' });
          f.endMoveCleanup(true); f.startLand(mv.data.dive ? 22 : 12);
          return 'continue';
        }
      },
      down: counterMove({ mult: 1.2, min: 8, kbg: 92, color: '#ffd28a', text: '¡CONTRA!' })
    }
  });

  /* ======================================================================
   * v3.1 · ILYRA — Princesa Enmascarada (esgrimista, kit tipo Lucina)
   * Sin punta especial: la hoja golpea igual en toda su longitud.
   * ==================================================================== */
  const DB_TABLE = {
    1: { side: { x: 34, y: -44, r: 26, dmg: 4, ang: 70, bkb: 32, kbg: 10 } },
    2: { up: { x: 24, y: -70, r: 26, dmg: 4, ang: 82, bkb: 34, kbg: 10 }, side: { x: 36, y: -46, r: 26, dmg: 4, ang: 65, bkb: 32, kbg: 10 }, down: { x: 36, y: -22, r: 24, dmg: 4, ang: 40, bkb: 30, kbg: 10 } },
    3: { up: { x: 24, y: -74, r: 26, dmg: 5, ang: 85, bkb: 34, kbg: 12 }, side: { x: 38, y: -46, r: 26, dmg: 5, ang: 62, bkb: 32, kbg: 12 }, down: { x: 36, y: -20, r: 24, dmg: 3, ang: 40, bkb: 30, kbg: 10 } },
    4: { up: { x: 18, y: -84, r: 30, dmg: 8, ang: 86, bkb: 60, kbg: 88 }, side: { x: 40, y: -46, r: 28, dmg: 7, ang: 40, bkb: 55, kbg: 98 }, down: { x: 36, y: -24, r: 26, dmg: 1.6, ang: 70, bkb: 30, kbg: 10 } }
  };
  fighter({
    id: 'ilyra', name: 'Ilyra', title: 'Princesa Enmascarada',
    passive: 'Filo uniforme: su espada hace el mismo daño en toda la hoja, sin depender de la punta.',
    palette: { primary: '#eaf4f4', secondary: '#1f5a6a', skin: '#f2d2bc', head: '#f2d2bc', hand: '#1f5a6a', arms: '#eaf4f4', legs: '#16404c', feet: '#1f5a6a', accent: '#5ae0d0', hair: '#4a2a5a', eye: '#1f5a6a', belt: '#c9a43a' },
    stats: { weight: 90, height: 84, width: 32, walk: 3.3, run: 7.6, dash: 8.2, airSpeed: 4.1, gravity: 0.62, fall: 10.5, fastFall: 16, jump: 13.8, shortHop: 9, airJump: 12.9, traction: 0.6 },
    profile: { style: 'sword', reach: 1.1, power: 1.03, speed: 1.05 },
    ai: { recovery: 'up', projectile: null, range: 98, counter: 'down', sword: true },
    rig: {
      headR: 11, torsoW: 18, hipW: 17, torsoH: 26, thigh: 17, shin: 16, armW: 6,
      weapon: { type: 'sword', len: 54, w: 5.5, color: '#d8f4ff', glow: '#5ae0d0', trail: '#8af0e4', guard: '#c9a43a', hilt: '#1f5a6a', taper: 0.6 },
      parts: {
        headBack(ctx, a) {
          const r = a.rig.headR, w = windOf(a.f), sw = Math.sin(a.f.tick * 0.16) * 3;
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.9);
          ctx.quadraticCurveTo(-r * 1.9 - w * 0.6, -r * 0.4 + sw, -r * 1.6 - w, r * 2.2 + sw);
          ctx.quadraticCurveTo(-r * 1.0, r * 0.8, -r * 0.6, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
          R.disc(ctx, -r * 1.05, -r * 0.4, 3, a.pal.accent);
        },
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.1 });
          /* Antifaz con aberturas: tapa los ojos salvo dos rendijas brillantes. */
          ctx.fillStyle = '#f6f2ff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.4); ctx.quadraticCurveTo(r * 0.3, -r * 0.62, r * 0.98, -r * 0.42);
          ctx.lineTo(r * 1.02, r * 0.05); ctx.quadraticCurveTo(r * 0.55, r * 0.22, r * 0.2, r * 0.02); ctx.quadraticCurveTo(-r * 0.05, r * 0.18, -r * 0.25, r * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.42); ctx.quadraticCurveTo(r * 0.3, -r * 0.7, r * 0.95, -r * 0.5); ctx.stroke();
          R.ellipse(ctx, r * 0.6, -r * 0.16, r * 0.17, r * 0.07, -0.1, '#1f5a6a', false);
          R.ellipse(ctx, r * 0.08, -r * 0.14, r * 0.13, r * 0.06, 0.1, '#1f5a6a', false);
          R.poly(ctx, [[r * 0.05, -r * 1.05], [r * 0.25, -r * 1.35], [r * 0.45, -r * 1.02]], '#c9a43a');
        },
        back(ctx, a) { cape(ctx, a, a.pal.secondary, 34, 9, '#5ae0d0'); },
        torso(ctx, a) {
          const r = a.rig;
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.62, r.torsoW, 4);
          R.poly(ctx, [[-r.hipW * 0.5, -4], [r.hipW * 0.5, -4], [r.hipW * 0.75, 16], [-r.hipW * 0.75, 16]], a.pal.primary);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(0, -r.torsoH); ctx.lineTo(0, -6); ctx.stroke();
        }
      }
    },
    specials: {
      neutral: {
        frames: 46, pose: 'jab', gravity: 0.5, charge: { at: 8, max: 60, key: 'special', mult: 3 },
        vel: [{ f: [12, 16], vx: 5 }],
        hitboxes: [
          { f: [13, 17], x: 72, y: -44, r: 16, dmg: 8, ang: 361, bkb: 40, kbg: 75, effect: 'slash', shieldMult: 2.2, shieldDmg: 22 },
          { f: [13, 17], x: 40, y: -44, r: 14, dmg: 8, ang: 361, bkb: 40, kbg: 75, effect: 'slash', shieldMult: 2.2, shieldDmg: 22 }],
        onCharge(f, mv) { if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 24, f.y - f.h * 0.55, { color: '#8af0e4' }); },
        onFrame(f, fr) { if (fr === 13) f.match.effects.list.push({ type: 'streak', x: f.x + f.facing * 70, y: f.y - 44, vx: f.facing * 9, vy: 0, life: 10, max: 10, len: 36, color: '#d8f4ff' }); }
      },
      side: {
        frames: 32, oncePerAir: true, drift: 0.2, gravity: 0.4, act: [5, 10],
        poseFn(f, mv, k) {
          const v = mv.data.v || 'side', lib = R.SWORD[v === 'up' ? 'utilt' : v === 'down' ? 'dtilt' : 'ftilt'] || R.POSES.ftilt;
          return k < 1 ? lib.wind : lib.strike;
        },
        onStart(f, mv) { mv.data.stage = 1; mv.data.v = 'side'; if (!f.ground) f.vy = Math.min(f.vy, 0) * 0.4; },
        onFrame(f, fr, mv) {
          const st = mv.data.stage, v = mv.data.v, spec = DB_TABLE[st][v] || DB_TABLE[st].side;
          if (fr >= 4 && fr <= 8 && (st === 1 || f.ground)) { f.vx = f.facing * (st === 1 ? 6 : 3.5); mv.velX = true; }
          if (st === 4 && v === 'down') {
            if (fr >= 5 && fr <= 20 && (fr - 5) % 3 === 0) { mv.hitSets = {}; mv.extraBoxes = [spec]; NX.Audio.play('slash', { pitch: 1.6 }); }
            else if (fr === 22) { mv.hitSets = {}; mv.extraBoxes = [{ x: 38, y: -30, r: 28, dmg: 5, ang: 45, bkb: 50, kbg: 100, effect: 'slash' }]; NX.Audio.play('slash', { pitch: 0.9 }); }
            else mv.extraBoxes = null;
          } else {
            mv.extraBoxes = (fr >= 5 && fr <= 9) ? [Object.assign({ effect: 'slash' }, spec)] : null;
            if (fr === 5) NX.Audio.play('slash', { pitch: 0.9 + st * 0.12 });
          }
          if (st < 4 && fr >= 5 && f.input.pressed('special')) {
            f.input.consume('special'); mv.data.q = { y: f.input.y, x: f.input.x };
          }
          if (fr >= 12 && fr <= 26 && st < 4 && mv.data.q) {
            const I = mv.data.q; mv.data.q = null;
            mv.data.stage++; mv.data.v = I.y < -0.5 ? 'up' : (I.y > 0.5 ? 'down' : 'side');
            if (mv.data.stage === 2 && mv.data.v === 'side' && Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x);
            mv.frame = 0; mv.hitSets = {}; mv.swung = false; mv.extraBoxes = null;
          }
        }
      },
      up: {
        frames: 46, pose: 'rise', intangible: [1, 5], helplessLag: 20, drift: 0.5,
        hitboxes: [
          { f: [5, 8], x: 14, y: -70, r: 26, dmg: 11, ang: 80, bkb: 60, kbg: 70, effect: 'slash' },
          { f: [9, 16], x: 10, y: -84, r: 20, dmg: 6, ang: 80, bkb: 40, kbg: 70, effect: 'slash', group: 1 }],
        onStart(f, mv) { mv.data.vx = U.clamp(f.input.x, -1, 1) * 3.5; if (Math.abs(f.input.x) > 0.3) f.facing = Math.sign(f.input.x); },
        onFrame(f, fr, mv) {
          if (fr >= 5 && fr <= 17) { f.vy = -16.5; f.vx = mv.data.vx + f.facing * 0.8; mv.velX = mv.velY = true; }
          if (fr === 5) NX.Audio.play('slash', { pitch: 1.25 });
        }
      },
      down: counterMove({ mult: 1.2, min: 8, kbg: 88, color: '#8af0e4', text: '¡CONTRA!' })
    }
  });

  /* ======================================================================
   * v3.1 · KESTRA — Cazadora Orbital (exotraje con cañón, kit tipo Samus)
   * Disparo Cargado almacenable, misiles (teledirigido / súper con
   * pulsación rápida), Barrena en Espiral y Bomba de esfera.
   * ==================================================================== */
  const KESTRA_MAX = 75;
  function plasmaDraw(core, glow) {
    return (ctx, p) => {
      ctx.save();
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 1.5);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, core); g.addColorStop(1, U.rgba(glow, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba('#ffffff', 0.6); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + 0.15 * Math.sin(p.t * 0.6)), 0, TAU); ctx.stroke();
      ctx.restore();
    };
  }
  function missileDraw(col) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      R.poly(ctx, [[-12, -4], [6, -4], [12, 0], [6, 4], [-12, 4]], col);
      R.poly(ctx, [[-12, -4], [-16, -8], [-10, -4]], '#3a3f46'); R.poly(ctx, [[-12, 4], [-16, 8], [-10, 4]], '#3a3f46');
      R.disc(ctx, -15, 0, 3 + Math.random() * 2, '#ffb03a', false);
      ctx.restore();
    };
  }
  function bombDraw(ctx, p) {
    const blink = p.life < 24 && Math.floor(p.t / 3) % 2 === 0;
    R.disc(ctx, p.x, p.y, p.r, blink ? '#ffffff' : '#ff5ac8');
    R.disc(ctx, p.x - 2, p.y - 2, p.r * 0.35, '#ffd6f0', false);
  }
  fighter({
    id: 'kestra', name: 'Kestra', title: 'Cazadora Orbital',
    passive: 'Disparo almacenable: carga el cañón y guárdalo con Escudo. Agarre de rayo de largo alcance.',
    palette: { primary: '#3a4048', secondary: '#e8ecef', skin: '#3a4048', head: '#3a4048', hand: '#2a2f36', arms: '#e8ecef', legs: '#3a4048', feet: '#2a2f36', accent: '#b6ff3a', eye: '#ff5ac8', visor: '#ff5ac8', belt: '#b6ff3a' },
    stats: { weight: 108, height: 94, width: 34, walk: 2.8, run: 6.3, dash: 6.8, airSpeed: 3.6, airAccel: 0.25, gravity: 0.42, fall: 8.4, fastFall: 13.5, jump: 14.6, shortHop: 9.2, airJump: 13.2 },
    profile: { style: 'kick', reach: 1.05, power: 1.04, speed: 0.95 },
    meter: { max: KESTRA_MAX, label: 'CAÑÓN', short: 'CAÑÓN', color: '#b6ff3a', text: f => (f.data.stored || 0) >= KESTRA_MAX ? 'CAÑÓN MÁX' : 'CAÑÓN' },
    ai: { recovery: 'up', projectile: 'neutral', range: 150, zoner: true },
    init(f) { f.data.stored = 0; f.data.bombs = 0; },
    onLifeReset(f) { f.data.stored = 0; f.meter = 0; },
    onUpdate(f) {
      f.meter = f.data.stored || 0;
      if (f.data.stored >= KESTRA_MAX && f.tick % 6 === 0 && f.inPlay()) f.fx('sparkle', f.x + f.facing * 26, f.y - f.h * 0.55, { color: '#b6ff3a' });
    },
    moves: {
      grab: std => Object.assign({}, std, { frames: 52, grabs: [{ f: [12, 20], x: 92, y: -46, r: 16 }],
        onFrame(f, fr) { if (fr >= 8 && fr <= 24) beamFx(f, fr <= 20 ? 100 * Math.min(1, (fr - 7) / 6) : 100 * (24 - fr) / 4); } }),
      dashgrab: std => Object.assign({}, std, { frames: 58, grabs: [{ f: [14, 22], x: 100, y: -46, r: 16 }],
        onFrame(f, fr) { if (fr >= 10 && fr <= 26) beamFx(f, fr <= 22 ? 108 * Math.min(1, (fr - 9) / 6) : 108 * (26 - fr) / 4); } })
    },
    rig: {
      headR: 12.5, headH: 1.08, torsoW: 26, hipW: 22, torsoH: 28, torsoRound: 10, armW: 9, upperArm: 15, foreArm: 15, handR: 6,
      thigh: 17, shin: 17, legW: 10, footL: 12, footH: 7, eyes: 'visor', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.poly(ctx, [[-r * 0.1, -r * 1.02], [-r * 0.65, -r * 1.42], [-r * 0.95, -r * 0.85]], a.pal.accent);
          ctx.strokeStyle = U.rgba('#ffffff', 0.4); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, PI * 1.15, PI * 1.5); ctx.stroke();
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 0.9, r * 0.45, r * 1.2, r * 0.3);
        },
        back(ctx, a) {
          const s = a.J.shB;
          R.disc(ctx, s.x, s.y, 11, U.shade('#e8ecef', -0.25));
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.32, -r.torsoH * 0.85], [r.torsoW * 0.32, -r.torsoH * 0.85], [r.torsoW * 0.2, -r.torsoH * 0.35], [-r.torsoW * 0.2, -r.torsoH * 0.35]], a.pal.secondary);
          R.disc(ctx, 0, -r.torsoH * 0.6, 3.5, a.pal.accent);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-r.hipW * 0.4, -10); ctx.lineTo(r.hipW * 0.4, -10); ctx.stroke();
        },
        hand(ctx, a) {
          const J = a.J, el = J.elF, h = J.haF, ang = Math.atan2(h.y - el.y, h.x - el.x);
          R.disc(ctx, J.shF.x, J.shF.y, 11, a.pal.secondary);
          ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(ang);
          const L = Math.hypot(h.x - el.x, h.y - el.y) + 14;
          ctx.fillStyle = '#e8ecef'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(-2, -8, L, 16); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#3a4048'; ctx.fillRect(L - 6, -6, 6, 12);
          ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(4, 8); ctx.moveTo(10, -8); ctx.lineTo(10, 8); ctx.stroke();
          const mv = a.f.move;
          const k = mv && mv.def.key === 'special_neutral' ? Math.min(1, (mv.charge || 0) / KESTRA_MAX) : ((a.f.data && a.f.data.stored) || 0) / KESTRA_MAX;
          if (k > 0.05) {
            const g = ctx.createRadialGradient(L + 2, 0, 1, L + 2, 0, 6 + 12 * k);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#b6ff3a'); g.addColorStop(1, 'rgba(182,255,58,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L + 2, 0, 6 + 12 * k, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'shoot', charge: { at: 8, max: KESTRA_MAX, key: 'special', mult: 1 },
        onStart(f, mv) {
          mv.charge = Math.min(KESTRA_MAX, f.data.stored || 0);
          if (mv.charge >= KESTRA_MAX) mv.chargeDone = true;
          f.data.stored = 0;
        },
        onCharge(f, mv) {
          f.data.stored = mv.charge;
          if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 30, f.y - f.h * 0.55, { color: '#b6ff3a' });
          const I = f.input;
          if (mv.charge >= KESTRA_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.stored = mv.charge;
            if (mv.charge >= KESTRA_MAX) { f.fx('text', f.x, f.y - f.h - 18, { text: 'CAÑÓN LISTO', color: '#b6ff3a', size: 20 }); NX.Audio.play('chargeFull'); }
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / KESTRA_MAX;
          f.data.stored = 0;
          NX.Audio.play(k > 0.6 ? 'beam' : 'laser', { pitch: 1.4 - k * 0.6 });
          shoot(f, {
            ox: 40, speed: 8 + 3 * k, r: 7 + 15 * k, dmg: 5 + 23 * k, ang: 40, bkb: 25 + 25 * k, kbg: 45 + 40 * k,
            effect: 'fire', life: 90, color: '#b6ff3a', trail: k > 0.5 ? 8 : 0, draw: plasmaDraw('#b6ff3a', '#4aff9a')
          });
          if (!f.ground) f.vx -= f.facing * 2 * k;
          if (k > 0.9) f.match.camera.shake(6);
        }
      },
      side: {
        frames: 40, pose: 'shoot', gravity: 0.5,
        onStart(f, mv) { mv.data.sup = f.input.tapSide > 0 || f.input.smashPressed(); },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          if (mv.data.sup) {
            NX.Audio.play('fire', { pitch: 0.7 });
            shoot(f, { ox: 40, speed: 3, r: 10, life: 110, dmg: 10, ang: 45, bkb: 35, kbg: 70, effect: 'fire', glow: false, draw: missileDraw('#e8ecef'),
              update(p) { if (p.t > 10) p.vx = U.approach(p.vx, U.sign(p.vx) * 12.5, 0.8); } });
            f.fx('text', f.x, f.y - f.h - 18, { text: 'SÚPER MISIL', color: '#e8ecef', size: 16 });
          } else {
            NX.Audio.play('fire', { pitch: 1.2 });
            shoot(f, { ox: 40, speed: 5, r: 9, life: 120, dmg: 7, ang: 50, bkb: 30, kbg: 50, effect: 'fire', glow: false, draw: missileDraw('#b6ff3a'),
              update(p) { if (p.t > 12) steer(p, 0.045, 700); } });
          }
        }
      },
      up: {
        frames: 52, pose: 'spin', helplessLag: 18, drift: 0.9, intangible: [1, 3],
        hitboxes: (function () {
          const a = [];
          for (let i = 0; i < 7; i++) a.push({ f: [4 + i * 4, 6 + i * 4], x: 0, y: -46, r: 30, dmg: 1.6, ang: 90, bkb: 40, kbg: 8, effect: 'hit', dir: 'auto', group: i + 1 });
          a.push({ f: [32, 34], x: 0, y: -46, r: 34, dmg: 2.5, ang: 65, bkb: 55, kbg: 120, effect: 'hit', dir: 'auto', group: 9 });
          return a;
        })(),
        onFrame(f, fr, mv) {
          if (fr === 3) NX.Audio.play('spin', { pitch: 1.3 });
          if (fr >= 3 && fr <= 30) { f.vy = fr < 14 ? -11 : -11 + (fr - 14) * 0.7; mv.velY = true; }
          if (fr < 32) linkTick(f, mv, 0.3);
          if (fr >= 3 && fr <= 34 && fr % 2 === 0) f.fx('sparkle', f.x + U.rand(-22, 22), f.y - U.rand(10, f.h), { color: '#ff5ac8' });
        },
        onHit(f, t, mv) { if (mv.frame < 32) autolink(f, t, mv); }
      },
      down: {
        frames: 40, pose: 'ball', drift: 1, gravity: 0.45,
        onStart(f, mv) { if (!f.ground) f.vy = Math.min(f.vy, -4.5); },
        onFrame(f, fr, mv) {
          if (f.ground) { f.vx = f.input.x * 3.2; mv.velX = true; }
          if (fr !== 8 || (f.data.bombs || 0) >= 3) return;
          f.data.bombs = (f.data.bombs || 0) + 1;
          NX.Audio.play('tick');
          f.spawnProjectile({
            x: f.x, y: f.y - 12, vx: 0, vy: 0.4, r: 8, life: 34, dmg: 0, effect: 'fire', glow: false,
            reflectable: false, absorbable: false, destructible: false, stageCollide: false, pierce: true,
            filter() { return false; },
            update(p) {
              for (const t of p.owner.opponents()) if (!t.hidden && U.dist(p.x, p.y, t.x, t.y - t.h / 2) < t.w / 2 + 14) { p.destroy('touch'); return false; }
            },
            onDestroy(p) {
              const o = p.owner;
              o.data.bombs = Math.max(0, (o.data.bombs || 1) - 1);
              boom(o, p.x, p.y, { r: 32, dmg: 4, ang: 80, bkb: 45, kbg: 30, effect: 'fire',
                filter(owner, t) { return t !== owner; } });
              if (o.inPlay() && U.dist(p.x, p.y, o.x, o.y - 14) < 72 && !o.ground) { o.vy = Math.min(o.vy, -8); o.fastFalling = false; }
            },
            draw: bombDraw
          });
        }
      }
    }
  });
  function beamFx(f, len) {
    if (len <= 2) return;
    const s = f.localToWorld(26, -46);
    f.spawnProjectile({ x: s.x, y: s.y, vx: 0, vy: 0, r: 1, life: 1, dmg: 0, pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false,
      filter() { return false; },
      draw(ctx, p) {
        ctx.save(); ctx.strokeStyle = U.rgba('#b6ff3a', 0.9); ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + f.facing * len, p.y); ctx.stroke();
        ctx.setLineDash([]); R.disc(ctx, p.x + f.facing * len, p.y, 5, '#ff5ac8'); ctx.restore();
      } });
  }

  /* ======================================================================
   * v3.1 · TAMBA — Titán de la Selva (simio superpesado, kit tipo DK)
   * Puñetazo Gigante almacenable, Cabezazo que entierra, Kong Giratorio
   * (gran recuperación horizontal), Palmada al suelo y lanzamiento de carga.
   * ==================================================================== */
  const PUNCH_MAX = 120;
  function cargoRelease(f, mv, hit, dir) {
    const t = mv.data.victim;
    if (!t || t.grabbedBy !== f) return;
    t.grabbedBy = null; mv.data.victim = null;
    t.state = ST.AIR; t.stateTime = 0; t.ground = null;
    f.match.combat.applyHit(f, t, Object.assign({ ang: 45, bkb: 60, kbg: 60, effect: 'heavy' }, hit), { dir, noAttackerLag: true });
    NX.Audio.play('throw');
    mv.frame = Math.max(mv.frame, mv.def.frames - 16);
  }
  fighter({
    id: 'tamba', name: 'Tamba', title: 'Titán de la Selva',
    passive: 'Carga del titán: al lanzar hacia delante levanta al rival y puede caminar y saltar con él antes de arrojarlo.',
    palette: { primary: '#4a5a6e', secondary: '#d8c8a8', skin: '#d8c8a8', head: '#4a5a6e', hand: '#3a4656', arms: '#4a5a6e', legs: '#4a5a6e', feet: '#3a4656', accent: '#e8b82a', eye: '#2a1a0a', belt: '#3a8a3a' },
    stats: { weight: 127, height: 98, width: 52, walk: 3.0, run: 7.3, dash: 7.8, airSpeed: 4.0, gravity: 0.62, fall: 10.5, fastFall: 15.5, jump: 13.2, shortHop: 8.6, airJump: 12.2, traction: 0.55 },
    profile: { style: 'heavy', reach: 1.22, power: 1.14, speed: 0.92 },
    meter: { max: PUNCH_MAX, label: 'PUÑO', short: 'PUÑO', color: '#e8b82a', text: f => (f.data.punch || 0) >= PUNCH_MAX ? 'PUÑO MÁX' : 'PUÑO' },
    ai: { recovery: 'up', sideRecovery: true, projectile: null, range: 80, heavy: true, grappler: true },
    init(f) { f.data.punch = 0; },
    onLifeReset(f) { f.data.punch = 0; f.meter = 0; },
    onUpdate(f) {
      f.meter = f.data.punch || 0;
      if (f.data.punch >= PUNCH_MAX && f.tick % 8 === 0 && f.inPlay()) f.fx('sparkle', f.x + f.facing * 30, f.y - f.h * 0.5, { color: '#ffd23a' });
    },
    moves: {
      throw_fwd: {
        frames: 190, release: 999, path: 'up',
        poseFn(f, mv) { const s = Math.sin(mv.frame * 0.25) * 0.15; return { aF1: 3.0, aF2: 0.25, aB1: 2.9, aB2: 0.3, lF1: 0.3 + s, lB1: -0.3 - s }; },
        victimPath(f, t) { t.x = f.x; t.y = f.y - f.h - 2; t.facing = f.facing; },
        onFrame(f, fr, mv) {
          const I = f.input, t = mv.data.victim;
          if (!t) return;
          if (fr === 1) { mv.data.mash = 0; f.fx('text', f.x, f.y - f.h - 50, { text: '¡CARGA!', color: '#e8b82a', size: 20 }); }
          if (f.ground) { f.vx = I.x * 2.6; mv.velX = true; if (I.pressed('jump') || I.pressed('tapjump')) { I.consume('jump'); I.consume('tapjump'); f.vy = -11; f.ground = null; NX.Audio.play('airjump'); } }
          if (t.input.mashed) mv.data.mash++;
          if (mv.data.mash > 22 + t.percent / 8) {
            t.grabbedBy = null; mv.data.victim = null; t.state = ST.AIR; t.stateTime = 0; t.ground = null; t.vy = -6; t.actionLock = 8;
            mv.frame = Math.max(fr, mv.def.frames - 14); return;
          }
          if (fr > 12 && (I.pressed('attack') || I.pressed('grab') || I.pressed('special') || I.smashPressed())) {
            ['attack', 'grab', 'special', 'smash'].forEach(k => I.consume(k));
            const d = I.dir(), back = d === 'side' && Math.sign(I.x) !== f.facing;
            if (d === 'up') cargoRelease(f, mv, { dmg: 8, ang: 88, bkb: 70, kbg: 66 }, f.facing);
            else if (d === 'down') cargoRelease(f, mv, { dmg: 7, ang: 70, bkb: 60, kbg: 50 }, f.facing);
            else if (back) cargoRelease(f, mv, { dmg: 11, ang: 45, bkb: 60, kbg: 78 }, -f.facing);
            else cargoRelease(f, mv, { dmg: 9, ang: 42, bkb: 62, kbg: 66 }, f.facing);
            return;
          }
          if (fr >= 170) cargoRelease(f, mv, { dmg: 9, ang: 42, bkb: 62, kbg: 66 }, f.facing);
        }
      },
      throw_back: std => Object.assign({}, std, { hit: Object.assign({}, std.hit, { dmg: 11, kbg: 80 }) })
    },
    rig: {
      torsoW: 46, hipW: 34, torsoH: 34, torsoRound: 16, headR: 15, headW: 1.05, neck: 0, armW: 13, upperArm: 21, foreArm: 20, handR: 10,
      thigh: 11, shin: 10, legW: 13, footL: 14, footH: 8, belly: '#d8c8a8', brows: true,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.ellipse(ctx, r * 0.45, r * 0.15, r * 0.62, r * 0.55, 0, '#d8c8a8');
          R.ellipse(ctx, r * 0.95, r * 0.05, r * 0.1, r * 0.07, 0, '#2a1a0a', false);
          R.ellipse(ctx, r * 0.7, r * 0.05, r * 0.1, r * 0.07, 0, '#2a1a0a', false);
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r * 0.45, r * 0.5); ctx.quadraticCurveTo(r * 0.75, r * 0.6, r * 1.0, r * 0.45); ctx.stroke();
          ctx.fillStyle = U.shade('#4a5a6e', -0.2); ctx.fillRect(-r * 0.1, -r * 0.62, r * 1.05, r * 0.2);
          spikes(ctx, r * 0.95, U.shade('#4a5a6e', -0.15), 5, 0.22, PI * 1.25, PI * 1.75);
          R.disc(ctx, -r * 0.55, -r * 0.05, r * 0.28, '#d8c8a8');
        },
        torso(ctx, a) {
          const r = a.rig;
          ctx.strokeStyle = '#3a8a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.42, -r.torsoH * 0.95); ctx.lineTo(r.torsoW * 0.35, -r.torsoH * 0.12); ctx.stroke();
          for (let i = 0; i < 3; i++) R.poly(ctx, [[-r.torsoW * 0.2 + i * 10, -r.torsoH * 0.65 + i * 7], [-r.torsoW * 0.1 + i * 10, -r.torsoH * 0.8 + i * 7], [-r.torsoW * 0.02 + i * 10, -r.torsoH * 0.6 + i * 7]], '#5aba4a');
        },
        hand(ctx, a) {
          const J = a.J, el = J.elF, h = J.haF;
          const mx = el.x + (h.x - el.x) * 0.6, my = el.y + (h.y - el.y) * 0.6, ang = Math.atan2(h.y - el.y, h.x - el.x);
          ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
          ctx.fillStyle = '#e8b82a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.rect(-4, -8, 8, 16); ctx.fill(); ctx.stroke();
          ctx.restore();
          const mv = a.f.move;
          const k = mv && mv.def.key === 'special_neutral' ? Math.min(1, (mv.charge || 0) / PUNCH_MAX) : ((a.f.data && a.f.data.punch) || 0) / PUNCH_MAX;
          if (k > 0.3) { ctx.save(); ctx.globalAlpha = 0.25 + 0.35 * k; R.disc(ctx, h.x, h.y, a.rig.handR * (1.2 + k), '#ffd23a', false); ctx.restore(); }
        }
      }
    },
    specials: {
      neutral: {
        frames: 44, pose: 'fsmash', charge: { at: 8, max: PUNCH_MAX, key: 'special', mult: 1 },
        poseFn(f, mv, k, POSES) {
          if (mv.charging) { const s = Math.sin(mv.charge * 0.35); return { aF1: 1.2 + s * 1.6, aF2: 0.3, aB1: -0.4, aB2: 0.4, lean: -0.1, lF1: 0.3, lB1: -0.3 }; }
          return k < 1 ? POSES.fsmash.wind : POSES.fsmash.strike;
        },
        onStart(f, mv) {
          mv.charge = Math.min(PUNCH_MAX, f.data.punch || 0);
          if (mv.charge >= PUNCH_MAX) mv.chargeDone = true;
          f.data.punch = 0;
        },
        onCharge(f, mv) {
          f.data.punch = mv.charge;
          if (mv.charge % 12 === 0) NX.Audio.play('swing', { size: 0.6 });
          const I = f.input;
          if (mv.charge >= PUNCH_MAX || I.pressed('shield')) {
            I.consume('shield');
            f.data.punch = mv.charge;
            if (mv.charge >= PUNCH_MAX) { f.fx('text', f.x, f.y - f.h - 18, { text: 'PUÑO LISTO', color: '#ffd23a', size: 20 }); NX.Audio.play('chargeFull'); }
            f.endMoveCleanup(true);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
          }
        },
        onFrame(f, fr, mv) {
          const k = (mv.charge || 0) / PUNCH_MAX, full = k >= 1;
          if (fr === 9) { f.data.punch = 0; mv.data.k = k; if (full) f.fx('text', f.x, f.y - f.h - 20, { text: '¡PUÑO GIGANTE!', color: '#ffd23a', size: 22 }); }
          if (full && fr <= 16) f.armorKB = 999;
          if (fr >= 10 && fr <= 14) { f.vx = f.facing * (3 + 5 * k); mv.velX = true; }
          mv.extraBoxes = (fr >= 12 && fr <= 15) ? [
            { x: 52, y: -48, r: 24, dmg: 10 + 18 * k, ang: full ? 45 : 50, bkb: 30 + 30 * k, kbg: 60 + 32 * k, effect: 'heavy' },
            { x: 26, y: -50, r: 18, dmg: 9 + 16 * k, ang: 50, bkb: 30 + 25 * k, kbg: 58 + 30 * k, effect: 'heavy' }] : null;
          if (fr === 12) { NX.Audio.play(full ? 'explosion' : 'swing', { size: 1 + k, pitch: 0.8 }); if (full) f.match.camera.shake(8); }
        }
      },
      side: {
        frames: 46, pose: 'overhead', armor: { f: [5, 16], kb: 90 }, gravity: 0.6, drift: 0.4,
        hitboxes: [
          { f: [14, 18], x: 34, y: -46, r: 26, dmg: 10, ang: 270, bkb: 40, kbg: 60, effect: 'heavy', meteor: true, bury: true },
          { f: [14, 18], x: 12, y: -62, r: 18, dmg: 9, ang: 270, bkb: 40, kbg: 60, effect: 'heavy', meteor: true, bury: true }],
        onStart(f) { if (!f.ground) f.vy = Math.min(f.vy, -2.5); },
        onFrame(f, fr) { if (fr === 14) { NX.Audio.play('stomp'); f.match.camera.shake(4); } }
      },
      up: {
        frames: 66, pose: 'spin', helplessLag: 22, drift: 0, gravity: 0.35,
        hitboxes: (function () {
          const a = [{ f: [6, 9], x: 0, y: -46, r: 40, dmg: 6, ang: 80, bkb: 50, kbg: 20, effect: 'heavy', dir: 'auto', group: 1 }];
          for (let i = 0; i < 6; i++) a.push({ f: [13 + i * 6, 15 + i * 6], x: 0, y: -46, r: 40, dmg: 1.2, ang: 85, bkb: 40, kbg: 10, effect: 'heavy', dir: 'auto', group: i + 2 });
          a.push({ f: [50, 52], x: 0, y: -46, r: 44, dmg: 3, ang: 50, bkb: 55, kbg: 135, effect: 'heavy', dir: 'auto', group: 9 });
          return a;
        })(),
        onStart(f, mv) { mv.data.air = !f.ground; if (mv.data.air) f.vy = -7.5; },
        onFrame(f, fr, mv) {
          const I = f.input;
          if (fr === 6) NX.Audio.play('spin', { pitch: 0.6 });
          if (fr >= 6 && fr <= 52) {
            f.vx = U.approach(f.vx, Math.abs(I.x) > 0.2 ? I.x * (mv.data.air ? 6.4 : 5) : f.facing * 1.5, 0.6); mv.velX = true;
            if (mv.data.air) { f.vy = U.approach(f.vy, fr < 30 ? -2.2 : 1.6, 0.35); mv.velY = true; }
          }
          if (fr < 50) linkTick(f, mv, 0.25);
          if (fr % 4 === 0 && fr <= 52) f.fx('dust', f.x + U.rand(-30, 30), f.y - U.rand(0, 40), { n: 1 });
        },
        onHit(f, t, mv) { if (mv.frame < 50) autolink(f, t, mv); },
        onLand(f, mv) { if (!mv.data.air) return; f.endMoveCleanup(true); f.startLand(20); return 'continue'; }
      },
      down: {
        frames: 52, pose: 'slam',
        onStart(f, mv) { mv.data.air = !f.ground; mv.data.slaps = 0; },
        onFrame(f, fr, mv) {
          if (mv.data.air) {
            mv.extraBoxes = (fr >= 10 && fr <= 13) ? [{ x: 20, y: -70, r: 30, dmg: 12, ang: 85, bkb: 45, kbg: 85, effect: 'heavy' }] : null;
            if (fr === 10) NX.Audio.play('stomp', { pitch: 1.4 });
            return;
          }
          if (fr >= 10 && fr <= 40 && (fr - 10) % 8 === 0) {
            mv.data.slaps++; mv.hitSets = {};
            const last = fr === 34 || mv.data.slaps >= 9;
            mv.extraBoxes = [
              { x: 52, y: -10, r: 30, dmg: last ? 6 : 3.5, ang: 85, bkb: last ? 65 : 55, kbg: last ? 72 : 30, effect: 'heavy', dir: 'auto' },
              { x: -52, y: -10, r: 30, dmg: last ? 6 : 3.5, ang: 85, bkb: last ? 65 : 55, kbg: last ? 72 : 30, effect: 'heavy', dir: 'auto' }];
            NX.Audio.play('stomp'); f.match.camera.shake(4);
            f.fx('dust', f.x + 52, f.y, { n: 4 }); f.fx('dust', f.x - 52, f.y, { n: 4 });
          } else if ((fr - 10) % 8 >= 3) mv.extraBoxes = null;
          if (fr === 30 && f.input.isHeld('special') && mv.data.slaps < 8) mv.frame = 25;
        }
      }
    }
  });

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

  /* ======================================================================
   * v6 · GYRON-64 — Centinela Retro (robot de juguete sobre ruedas, kit
   * tipo R.O.B.). Láser Óptico que se recarga solo, Rotor de Brazos que
   * refleja, Propulsores con COMBUSTIBLE (vuela mientras mantengas el
   * botón; se recarga en el suelo) y Peonza Giro cargable.
   * ==================================================================== */
  const LASER_MAX = 300, FUEL_MAX = 100;
  function laserDraw(len) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba('#ff3b2a', 0.45); ctx.lineWidth = p.r * 2.4; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#ff7a4a'; ctx.lineWidth = p.r * 1.2; ctx.stroke();
      ctx.strokeStyle = '#fff3e0'; ctx.lineWidth = p.r * 0.45; ctx.stroke();
      ctx.restore();
    };
  }
  function gyroDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    const sp = p.data.spin || 0, r = p.r;
    R.poly(ctx, [[-r * 1.15, -r * 0.1], [r * 1.15, -r * 0.1], [0, r * 1.0]], '#ff7a2a');
    R.ellipse(ctx, 0, -r * 0.1, r * 1.2, r * 0.42, 0, '#f2ecd8');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 1.2, r * 0.42, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#2a8f8a';
    for (let i = 0; i < 4; i++) { const x = ((sp * 9 + i * r * 0.9) % (r * 3.6)) - r * 1.8; ctx.fillRect(x, -r * 0.6, r * 0.32, r); }
    ctx.restore();
    ctx.fillStyle = '#4d5660'; ctx.fillRect(-r * 0.14, -r * 0.95, r * 0.28, r * 0.6);
    ctx.restore();
  }
  fighter({
    id: 'gyron', name: 'Gyron-64', title: 'Centinela Retro',
    passive: 'Sin piernas: rueda sobre su base. Propulsores con COMBUSTIBLE (mantén ↑+B para volar; se recarga en el suelo). Láser que se recarga solo.',
    palette: { primary: '#e9e2cf', secondary: '#2a8f8a', skin: '#e9e2cf', head: '#e9e2cf', hand: '#4d5660', arms: '#9aa3ad', legs: '#9aa3ad', feet: '#4d5660', accent: '#ff7a2a', eye: '#ff3b2a', belt: '#2a8f8a' },
    stats: { weight: 106, height: 96, width: 40, walk: 2.5, run: 5.4, dash: 6.2, airSpeed: 3.4, airAccel: 0.22, gravity: 0.42, fall: 8.8, fastFall: 13.5, jump: 13.0, shortHop: 8.2, airJump: 12.6 },
    profile: { style: 'fist', reach: 1.12, power: 1.06, speed: 0.92 },
    meter: { max: FUEL_MAX, start: FUEL_MAX, label: 'COMBUSTIBLE', short: 'COMBUSTIBLE', color: '#ff7a2a',
      text: f => ((f.data.laser || 0) >= LASER_MAX ? 'LÁSER LISTO · ' : '') + 'COMBUSTIBLE' },
    ai: { recovery: 'up', projectile: 'neutral', range: 125, zoner: true, heavy: true },
    init(f) { f.data.laser = LASER_MAX; f.data.gyroOut = false; },
    onLifeReset(f) { f.data.laser = LASER_MAX; f.meter = FUEL_MAX; f.data.burnUsed = false; f.data.rotorLift = false; f.data.burning = false; },
    onUpdate(f) {
      if ((f.data.laser || 0) < LASER_MAX) { f.data.laser++; if (f.data.laser === LASER_MAX && f.inPlay()) f.fx('sparkle', f.x + f.facing * 14, f.y - f.h * 0.85, { color: '#ff3b2a' }); }
      const burning = f.move && f.move.def.key === 'special_up';
      if (f.ground && !burning) { f.meter = Math.min(FUEL_MAX, f.meter + 1.6); f.data.burnUsed = false; f.data.rotorLift = false; }
    },
    rig: {
      legs: false, thigh: 16, shin: 16, footH: 6, footL: 10,
      headR: 13, headW: 1.15, headH: 0.95, neck: 5, torsoW: 30, hipW: 20, torsoH: 23, torsoRound: 5,
      armW: 8, upperArm: 16, foreArm: 15, handR: 6, eyes: 'none', mouth: false,
      parts: {
        back(ctx, a) {
          const { J, f, p, rig } = a;
          const baseY = p.planted ? -1 : J.hip.y + (rig.thigh + rig.shin) * 0.95 + rig.footH * 0.5;
          const top = J.hip.y - 4, colH = Math.max(4, baseY - 12 - top);
          ctx.fillStyle = '#9aa3ad'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.rect(J.hip.x - 6, top, 12, colH); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#6b737c'; ctx.lineWidth = 1.2;
          for (let y = top + 6; y < top + colH - 2; y += 6) { ctx.beginPath(); ctx.moveTo(J.hip.x - 5, y); ctx.lineTo(J.hip.x + 5, y); ctx.stroke(); }
          if (f.data && f.data.burning) {
            for (const dx of [-14, 14]) {
              const L = 18 + Math.random() * 14;
              const g = ctx.createLinearGradient(0, baseY, 0, baseY + L);
              g.addColorStop(0, '#fff3c0'); g.addColorStop(0.4, '#ff9a2a'); g.addColorStop(1, 'rgba(255,60,0,0)');
              ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(dx - 7, baseY - 2); ctx.lineTo(dx + 7, baseY - 2); ctx.lineTo(dx, baseY + L); ctx.closePath(); ctx.fill();
            }
          }
          R.poly(ctx, [[-22, baseY - 12], [22, baseY - 12], [27, baseY - 3], [-27, baseY - 3]], a.pal.secondary);
          ctx.fillStyle = a.pal.accent; ctx.fillRect(-24, baseY - 8, 48, 2.5);
          const roll = (f.x || 0) * 0.12;
          for (const wx of [-16, 0, 16]) {
            R.disc(ctx, wx, baseY - 2, 4.6, '#2b2f35');
            ctx.strokeStyle = '#8a929b'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(wx + Math.cos(roll) * 3, baseY - 2 + Math.sin(roll) * 3); ctx.lineTo(wx - Math.cos(roll) * 3, baseY - 2 - Math.sin(roll) * 3); ctx.stroke();
          }
        },
        head(ctx, a) {
          const r = a.rig.headR, f = a.f;
          R.poly(ctx, [[-r * 1.15, -r * 0.92], [r * 1.22, -r * 0.92], [r * 1.22, r * 0.88], [-r * 1.15, r * 0.88]], a.pal.head);
          ctx.fillStyle = a.pal.secondary; ctx.fillRect(-r * 1.15, -r * 0.92, r * 2.37, r * 0.3);
          R.poly(ctx, [[-r * 0.25, -r * 0.45], [r * 1.22, -r * 0.45], [r * 1.22, r * 0.38], [-r * 0.25, r * 0.38]], '#20262c');
          const k = f.data && f.data.laser != null ? Math.min(1, f.data.laser / LASER_MAX) : 1;
          const ec = U.mixRgb(U.hexToRgb('#5a2218'), U.hexToRgb(a.pal.eye || '#ff3b2a'), k), eye = `rgb(${ec.r},${ec.g},${ec.b})`;
          if (k >= 1) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(f.tick * 0.2); R.disc(ctx, r * 0.85, -r * 0.04, r * 0.48, '#ff3b2a', false); ctx.globalAlpha = 1; }
          R.disc(ctx, r * 0.85, -r * 0.04, r * 0.27, eye);
          R.disc(ctx, r * 0.22, -r * 0.04, r * 0.23, eye);
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(r * 0.78, -r * 0.2, r * 0.12, r * 0.08);
          R.disc(ctx, -r * 0.65, r * 0.05, r * 0.22, a.pal.accent);
          ctx.fillStyle = '#6b737c'; ctx.fillRect(-r * 0.3, r * 0.88, r * 0.6, r * 0.35);
        },
        torso(ctx, a) {
          const r = a.rig;
          R.poly(ctx, [[-r.torsoW * 0.32, -r.torsoH * 0.88], [r.torsoW * 0.36, -r.torsoH * 0.88], [r.torsoW * 0.3, -r.torsoH * 0.3], [-r.torsoW * 0.26, -r.torsoH * 0.3]], a.pal.secondary);
          ctx.fillStyle = '#ffffff'; ctx.font = '700 8px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('64', r.torsoW * 0.04, -r.torsoH * 0.6);
          ctx.strokeStyle = '#b9b19a'; ctx.lineWidth = 1.4;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r.hipW * 0.35, -4 - i * 3.4); ctx.lineTo(r.hipW * 0.35, -4 - i * 3.4); ctx.stroke(); }
        },
        hand(ctx, a) {
          const J = a.J, el = J.elF, h = J.haF, ang = Math.atan2(h.y - el.y, h.x - el.x);
          const open = a.f.move ? 0.55 : 0.3;
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);
          for (const s of [-1, 1]) {
            ctx.save(); ctx.rotate(s * open);
            R.poly(ctx, [[0, -2.5], [11, -2], [13, 0], [11, 2], [0, 2.5]], '#4d5660');
            ctx.restore();
          }
          R.disc(ctx, 0, 0, 4.5, '#6b737c');
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'shoot', gravity: 0.6,
        onFrame(f, fr) {
          if (fr !== 10) return;
          const k = Math.min(1, (f.data.laser || 0) / LASER_MAX), full = k >= 1;
          f.data.laser = 0;
          const aim = U.clamp(f.input.y, -1, 1) * 0.32, sp = 15;
          NX.Audio.play('laser', { pitch: full ? 0.8 : 1.4 });
          shoot(f, { ox: 18, oy: -f.h * 0.84, speed: 0, vx: Math.cos(aim) * sp * f.facing, vy: Math.sin(aim) * sp, r: full ? 7 : 4.5, life: full ? 46 : 30,
            dmg: full ? 9 : 2 + 4 * k, ang: 40, bkb: full ? 40 : 15, kbg: full ? 70 : 30, effect: 'fire', bounce: full ? 2 : 0, bounceDamp: 1,
            color: '#ff3b2a', glow: false, draw: laserDraw(full ? 70 : 34) });
          if (full) f.fx('text', f.x, f.y - f.h - 16, { text: 'LÁSER MÁX', color: '#ff3b2a', size: 16 });
          if (!f.ground) f.vx -= f.facing * 1.5;
        }
      },
      side: {
        frames: 46, pose: 'spin', gravity: 0.35, drift: 0.6,
        reflect: { f: [6, 30], x: 0, y: -50, r: 48, mult: 1.25, color: '#ffb36a' },
        hitboxes: (function () {
          const a = [];
          for (let i = 0; i < 5; i++) a.push({ f: [7 + i * 5, 9 + i * 5], x: 0, y: -50, r: 36, dmg: 1.8, ang: 70, bkb: 30, kbg: 10, effect: 'hit', dir: 'auto', group: i + 1 });
          a.push({ f: [32, 34], x: 0, y: -50, r: 40, dmg: 4, ang: 361, bkb: 45, kbg: 95, effect: 'hit', dir: 'auto', group: 9 });
          return a;
        })(),
        onStart(f, mv) { if (!f.ground && !f.data.rotorLift) { f.data.rotorLift = true; mv.data.lift = true; } },
        onFrame(f, fr, mv) {
          if (mv.data.lift && fr >= 7 && fr <= 24) { f.vy = Math.min(f.vy, -2.4); mv.velY = true; }
          if (fr >= 7 && fr <= 32 && fr % 6 === 1) NX.Audio.play('spin', { pitch: 1.2 });
          if (fr < 32) linkTick(f, mv, 0.2);
        },
        onHit(f, t, mv) { if (mv.frame < 32) autolink(f, t, mv); }
      },
      up: {
        frames: 200, pose: 'rise', helpless: false, oncePerAir: true, drift: 0,
        hitboxes: [{ f: [1, 8], x: 0, y: -2, r: 30, dmg: 6, ang: 80, bkb: 50, kbg: 55, effect: 'fire', dir: 'auto' }],
        canUse(f) { return f.meter > 4 && !f.data.burnUsed; },
        onStart(f, mv) { f.data.burnUsed = true; f.data.burning = true; mv.data.min = 22; NX.Audio.play('fire', { pitch: 0.6 }); },
        onFrame(f, fr, mv) {
          const I = f.input;
          const held = f.isHuman ? I.isHeld('special') : fr < 70;
          const burning = (fr <= mv.data.min || held) && f.meter > 0 && fr < 199;
          if (!burning) {
            f.data.burning = false;
            f.endMoveCleanup(false);
            f.state = f.ground ? ST.IDLE : ST.AIR; f.stateTime = 0;
            return;
          }
          f.meter = Math.max(0, f.meter - 1.15);
          f.vy = U.approach(f.vy, -7.2, 0.95); mv.velY = true;
          f.vx = U.approach(f.vx, I.x * 4.2, 0.35); mv.velX = true;
          if (Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x);
          if (fr % 2 === 0) f.fx('flame', f.x + U.rand(-14, 14), f.y + 6, { scale: 0.7 });
          if (fr % 12 === 0) NX.Audio.play('fire', { pitch: 0.5 });
        },
        onEnd(f) { f.data.burning = false; },
        onLand(f, mv) {
          if (mv.frame < 10) return;
          f.data.burning = false; f.endMoveCleanup(true); f.startLand(6);
          return 'continue';
        }
      },
      down: {
        frames: 36, pose: 'slam', charge: { at: 6, max: 60, key: 'special', mult: 1 },
        canUse(f) { return !f.data.gyroOut; },
        onCharge(f, mv) { if (mv.charge % 5 === 0) f.fx('sparkle', f.x + f.facing * 20, f.y - 14, { color: '#ff7a2a' }); },
        onRelease(f, mv) { mv.data.k = mv.charge / 60; },
        onFrame(f, fr, mv) {
          if (fr !== 9) return;
          const k = mv.data.k || 0;
          f.data.gyroOut = true;
          NX.Audio.play('spin', { pitch: 1.5 });
          f.spawnProjectile({
            x: f.x + f.facing * 30, y: f.y - 16, vx: f.facing * (3.5 + 6 * k), vy: f.ground ? 0 : 2, gravity: 0.5, maxFall: 10,
            r: 12, life: 420, dmg: 5 + 5 * k, ang: 40, bkb: 30, kbg: 55, effect: 'hit', pierce: true, hits: 99, rehit: 24,
            passCollide: true, reflectable: false, absorbable: false, destructible: true, glow: false, color: '#ff7a2a',
            data: { spin: 0 }, draw: gyroDraw,
            filter() { return Math.abs(this.vx) > 1.6; },
            update(p) {
              p.data.spin += Math.abs(p.vx) * 0.4 + 0.3;
              if (p.data.grounded) p.vx *= 0.986;
              p.dmg = Math.max(2, 2 + Math.abs(p.vx) * 0.9);
              if (p.t % 8 === 0 && p.data.grounded && Math.abs(p.vx) > 1) p.match.effects.spawn('dust', p.x, p.y + p.r, { n: 1 });
              p.data.grounded = false;
            },
            onGround(p, pl) { p.y = pl.y - p.r; p.vy = 0; p.data.grounded = true; },
            onWall(p) { p.vx = -p.vx * 0.7; p.x += p.vx * 2; NX.Audio.play('block'); },
            onHit(p) { p.vx = -p.vx * 0.55; p.vy = -3; },
            onDestroy(p) { if (p.owner) p.owner.data.gyroOut = false; p.match.effects.spawn('pop', p.x, p.y, { color: '#ff7a2a', r: 14 }); }
          });
        }
      }
    }
  });

  /* ======================================================================
   * v7 · MONOCROMO — Hombre LCD (silueta plana de cristal líquido, kit
   * tipo Mr. Game & Watch). Animación entrecortada (def.lcd), pitidos en
   * cada ataque, comida en la sartén, Juez con número del 1 al 9,
   * Trampolín de bomberos y Cubo que absorbe 3 proyectiles y los vierte.
   * ==================================================================== */
  const LCD = '#141414';
  const JUDGE = {
    1: { dmg: 2, ang: 60, bkb: 20, kbg: 40, effect: 'hit', self: 12 },
    2: { dmg: 4, ang: 60, bkb: 30, kbg: 55, effect: 'hit' },
    3: { dmg: 6, ang: 361, bkb: 35, kbg: 70, effect: 'hit' },
    4: { dmg: 7, ang: 45, bkb: 40, kbg: 78, effect: 'heavy' },
    5: { dmg: 8, ang: 361, bkb: 40, kbg: 80, effect: 'elec' },
    6: { dmg: 12, ang: 361, bkb: 45, kbg: 88, effect: 'fire' },
    7: { dmg: 13, ang: 50, bkb: 45, kbg: 90, effect: 'heavy' },
    8: { dmg: 9, ang: 70, bkb: 50, kbg: 86, effect: 'water' },
    9: { dmg: 32, ang: 45, bkb: 60, kbg: 104, effect: 'heavy' }
  };
  function foodDraw(kind) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y);
      const step = Math.floor(p.t / 5) * (PI / 4) * U.sign(p.vx || 1);
      ctx.rotate(step);
      ctx.fillStyle = LCD;
      if (kind === 0) { ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.3, p.r * 0.55, 0, 0, TAU); ctx.fill(); }
      else if (kind === 1) {
        ctx.beginPath(); ctx.ellipse(-p.r * 0.2, 0, p.r * 1.0, p.r * 0.55, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.r * 0.6, 0); ctx.lineTo(p.r * 1.4, -p.r * 0.6); ctx.lineTo(p.r * 1.4, p.r * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d8d8c8'; ctx.beginPath(); ctx.arc(-p.r * 0.7, -p.r * 0.12, p.r * 0.14, 0, TAU); ctx.fill();
      } else { ctx.beginPath(); ctx.ellipse(0, 0, p.r * 0.9, p.r * 1.1, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    };
  }
  function firemenDraw(ctx, p) {
    const x = p.x, y = p.y, k = Math.floor(p.t / 4) % 2;
    ctx.save(); ctx.fillStyle = LCD; ctx.strokeStyle = LCD; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const fx = x + s * 24;
      ctx.beginPath(); ctx.arc(fx, y - 30, 5, 0, TAU); ctx.fill();
      ctx.fillRect(fx - 5, y - 37, 10, 3);
      ctx.beginPath(); ctx.moveTo(fx, y - 25); ctx.lineTo(fx, y - 12); ctx.moveTo(fx, y - 12); ctx.lineTo(fx - 4, y); ctx.moveTo(fx, y - 12); ctx.lineTo(fx + 4, y);
      ctx.moveTo(fx, y - 21); ctx.lineTo(fx - s * 10, y - 18); ctx.stroke();
    }
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 16, y - 18 + k * 2); ctx.quadraticCurveTo(x, y - 12 + k * 4, x + 16, y - 18 + k * 2); ctx.stroke();
    ctx.restore();
  }
  fighter({
    id: 'monocromo', name: 'Monocromo', title: 'Hombre LCD',
    passive: 'Silueta de cristal líquido: ligero y flotante, se mueve a saltos de fotograma. El Cubo guarda 3 proyectiles y luego vierte aceite ardiente.',
    palette: { primary: LCD, secondary: LCD, skin: LCD, head: LCD, hand: LCD, arms: LCD, legs: LCD, feet: LCD, accent: '#e8e8e0', eye: LCD },
    stats: { weight: 75, height: 82, width: 30, walk: 2.6, run: 6.0, dash: 6.6, airSpeed: 3.6, airAccel: 0.24, gravity: 0.45, fall: 8.8, fastFall: 13, jump: 13.6, shortHop: 8.6, airJump: 12.8 },
    profile: { style: 'fist', reach: 1.05, power: 1.04, speed: 1.0 },
    lcd: 4,
    meter: { max: 3, label: 'CUBO', short: 'CUBO', color: '#e8e8e0', text: f => (f.data.oil || 0) >= 3 ? '¡CUBO LLENO!' : 'CUBO ' + (f.data.oil || 0) + '/3' },
    ai: { recovery: 'up', projectile: 'neutral', range: 90, absorb: 'down' },
    init(f) { f.data.oil = 0; },
    onLifeReset(f) { f.data.oil = 0; },
    onUpdate(f) { f.meter = f.data.oil || 0; },
    onMoveStart(f) { NX.Audio.play('beep', { pitch: 1 + Math.random() * 0.4 }); },
    rig: {
      headR: 11, headW: 1.05, neck: 2, torsoH: 22, torsoW: 15, hipW: 13, torsoRound: 7, armW: 5, upperArm: 13, foreArm: 12, handR: 4.5,
      legW: 6, thigh: 14, shin: 14, footL: 9, footH: 5, eyes: 'none', mouth: false,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          R.disc(ctx, r * 1.0, r * 0.18, r * 0.36, LCD, false);
          ctx.fillStyle = '#e8e8e0'; ctx.beginPath(); ctx.ellipse(r * 0.42, -r * 0.22, r * 0.17, r * 0.22, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = LCD; ctx.beginPath(); ctx.arc(r * 0.48, -r * 0.2, r * 0.08, 0, TAU); ctx.fill();
        },
        hand(ctx, a) {
          const mv = a.f.move; if (!mv) return;
          const k = mv.def.key, h = a.J.haF, ang = a.J.foreF;
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(-ang); ctx.fillStyle = LCD; ctx.strokeStyle = LCD;
          if (k === 'special_neutral') { ctx.fillRect(-1.5, 0, 3, 10); ctx.beginPath(); ctx.ellipse(0, 16, 9, 3.5, 0, 0, TAU); ctx.fill(); }
          else if (k === 'special_side') {
            ctx.fillRect(-1.5, 0, 3, 20); ctx.fillRect(-7, 18, 14, 9);
            const n = mv.data.n;
            if (n) { ctx.save(); ctx.translate(-14, -10); ctx.rotate(ang); ctx.fillStyle = '#e8e8e0'; ctx.fillRect(-8, -10, 16, 20); ctx.strokeStyle = LCD; ctx.lineWidth = 2; ctx.strokeRect(-8, -10, 16, 20); ctx.fillStyle = LCD; ctx.font = '400 15px Anton, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, 1); ctx.restore(); }
          } else if (k === 'special_down') {
            ctx.rotate(ang); R.poly(ctx, [[-10, -2], [10, -2], [8, 16], [-8, 16]], LCD, false);
            ctx.strokeStyle = '#e8e8e0'; ctx.lineWidth = 1.2; for (let i = 0; i < (a.f.data.oil || 0); i++) { ctx.beginPath(); ctx.moveTo(-7, 12 - i * 4); ctx.lineTo(7, 12 - i * 4); ctx.stroke(); }
          }
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 24, pose: 'cast',
        onFrame(f, fr) {
          if (fr !== 8) return;
          const kind = Math.floor(Math.random() * 3);
          NX.Audio.play('beep', { pitch: 1.6 });
          shoot(f, { ox: 26, oy: -f.h * 0.62, speed: U.rand(2.4, 5.6), vy: U.rand(-8.5, -5.5), gravity: 0.38, r: 8, life: 100, dmg: 4, ang: 70, bkb: 25, kbg: 35,
            effect: 'hit', color: LCD, glow: false, draw: foodDraw(kind) });
        }
      },
      side: {
        frames: 40, pose: 'overhead',
        onStart(f, mv) { mv.data.n = 1 + Math.floor(Math.random() * 9); },
        onFrame(f, fr, mv) {
          const n = mv.data.n, J = JUDGE[n];
          if (fr === 5) { NX.Audio.play('beep', { pitch: 0.6 + n * 0.15 }); f.fx('text', f.x, f.y - f.h - 22, { text: String(n), color: n === 9 ? '#ffd23a' : '#e8e8e0', size: 30 }); }
          if (fr >= 12 && fr <= 14) mv.extraBoxes = [Object.assign({ x: 34, y: -46, r: 26 }, J)];
          else mv.extraBoxes = null;
          if (fr === 12) {
            if (J.self) { f.addDamage(J.self, null); f.flashTimer = 10; }
            if (n === 9) { f.match.camera.shake(8); NX.Audio.play('explosion', { pitch: 1.4 }); }
          }
        }
      },
      up: {
        frames: 46, pose: 'rise', helpless: false, oncePerAir: true, drift: 0.9,
        vel: [{ f: [6, 18], vy: -15.5 }],
        hitboxes: [{ f: [5, 9], x: 0, y: -6, r: 26, dmg: 4, ang: 85, bkb: 50, kbg: 40, effect: 'hit', dir: 'auto' }],
        onFrame(f, fr) {
          if (fr === 3) {
            NX.Audio.play('beep', { pitch: 1.9 });
            f.spawnProjectile({ x: f.x, y: f.y + 4, vx: 0, vy: 0, r: 1, life: 26, dmg: 0, pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, filter() { return false; }, draw: firemenDraw });
          }
          if (fr > 24 && f.vy > 3) { f.vy = 3; }
        }
      },
      down: {
        frames: 36, pose: 'guard',
        absorb: { f: [4, 26], x: 26, y: -40, r: 48, mult: 0,
          onAbsorb(f) {
            f.data.oil = Math.min(3, (f.data.oil || 0) + 1);
            f.fx('text', f.x, f.y - f.h - 14, { text: f.data.oil >= 3 ? '¡LLENO!' : 'CUBO ' + f.data.oil + '/3', color: '#e8e8e0', size: 18 });
            NX.Audio.play('beep', { pitch: 1.2 + f.data.oil * 0.2 });
          } },
        onStart(f, mv) { mv.data.dump = (f.data.oil || 0) >= 3; },
        onFrame(f, fr, mv) {
          if (!mv.data.dump) return;
          f.absorber = null;
          if (fr >= 8 && fr <= 12) mv.extraBoxes = [{ x: 46, y: -24, r: 38, dmg: 20, ang: 40, bkb: 50, kbg: 96, effect: 'fire' }];
          else mv.extraBoxes = null;
          if (fr === 8) {
            f.data.oil = 0; NX.Audio.play('water', { pitch: 0.6 }); f.match.camera.shake(6);
            for (let i = 0; i < 10; i++) f.fx('drop', f.x + f.facing * U.rand(20, 70), f.y - U.rand(10, 50), { color: LCD });
            f.fx('text', f.x, f.y - f.h - 16, { text: '¡ACEITE!', color: '#ffb03a', size: 22 });
          }
        }
      }
    }
  });

  /* ======================================================================
   * v7 · LOSGEMELOS — Dúo Gamer (dos gemelos en un slot, estilo Pyra/
   * Mythra). Camisa azul rey y lentes los dos; cambian el pantalón y el
   * peinado. Abajo + B cambia de gemelo conservando daño y posición.
   *  · COPETE: normales a GRITOS; especiales con su consola portátil.
   *  · FLEQUILLO: normales con su LAPTOP; especiales con cartas coleccionables.
   * ==================================================================== */
  const ROYAL = '#1d47c9';
  function glasses(ctx, r) {
    ctx.save(); ctx.strokeStyle = '#151515'; ctx.lineWidth = 1.25;
    ctx.fillStyle = 'rgba(205,238,255,.18)';
    ctx.beginPath(); ctx.ellipse(r * 0.42, -r * 0.1, r * 0.25, r * 0.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-r * 0.04, -r * 0.1, r * 0.19, r * 0.19, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.13); ctx.lineTo(r * 0.17, -r * 0.13);
    ctx.moveTo(-r * 0.23, -r * 0.13); ctx.lineTo(-r * 0.72, -r * 0.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.1, r * 0.17, PI * 1.1, PI * 1.45); ctx.stroke();
    ctx.restore();
  }
  function shirtDetails(ctx, a) {
    const r = a.rig;
    R.poly(ctx, [[-r.torsoW * 0.12, -r.torsoH], [r.torsoW * 0.22, -r.torsoH], [r.torsoW * 0.05, -r.torsoH * 0.8]], '#f2f2f2');
    ctx.strokeStyle = '#163a9e'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(r.torsoW * 0.05, -r.torsoH * 0.8); ctx.lineTo(r.torsoW * 0.05, -6); ctx.stroke();
    for (let i = 0; i < 3; i++) R.disc(ctx, r.torsoW * 0.1, -r.torsoH * (0.68 - i * 0.2), 1.2, '#e8eefc', false);
  }
  function consoleDraw(ctx, joys) {
    ctx.save();
    if (joys) { R.poly(ctx, [[-17, -8], [-11, -8], [-11, 8], [-17, 8]], '#19c3e6'); R.poly(ctx, [[11, -8], [17, -8], [17, 8], [11, 8]], '#ff3c3c'); }
    R.poly(ctx, [[-11, -8], [11, -8], [11, 8], [-11, 8]], '#2b2b30');
    ctx.fillStyle = '#0e2a3a'; ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = 'rgba(120,220,255,.55)'; ctx.fillRect(-7, -4, 6, 4); ctx.fillRect(1, 0, 6, 4);
    if (joys) { R.disc(ctx, -14, -3, 1.8, '#111', false); R.disc(ctx, 14, 3, 1.8, '#111', false); }
    ctx.restore();
  }
  const CARD_TYPES = [
    { c: '#ff5a2a', fx: 'fire' }, { c: '#2a8cff', fx: 'water' }, { c: '#ffd400', fx: 'elec' }, { c: '#3cc85a', fx: 'hit' }];
  function cardShape(ctx, w, h, art) {
    ctx.fillStyle = '#f2c418'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbe8'; ctx.fillRect(-w * 0.4, -h * 0.42, w * 0.8, h * 0.84);
    ctx.fillStyle = art; ctx.fillRect(-w * 0.32, -h * 0.34, w * 0.64, h * 0.4);
    ctx.fillStyle = '#c9c2a8'; ctx.fillRect(-w * 0.32, h * 0.12, w * 0.64, h * 0.05); ctx.fillRect(-w * 0.32, h * 0.22, w * 0.5, h * 0.05);
    ctx.fillStyle = art; ctx.beginPath(); ctx.arc(w * 0.28, -h * 0.36, w * 0.09, 0, TAU); ctx.fill();
  }
  function cardDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.45 * U.sign(p.vx || 1));
    cardShape(ctx, p.r * 1.6, p.r * 2.2, p.data.art || '#ff5a2a');
    ctx.restore();
  }
  function bigCardDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(PI / 2 + Math.sin(p.t * 0.3) * 0.08);
    cardShape(ctx, 34, 50, p.data.art);
    ctx.restore();
  }
  function throwCard(f, o) {
    const T = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
    return shoot(f, Object.assign({ r: 8, life: 40, dmg: 4, ang: 45, bkb: 25, kbg: 38, effect: T.fx, color: T.c, glow: false, data: { art: T.c }, draw: cardDraw }, o));
  }
  function pixelDraw(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    const s = Math.max(3, p.r / 2.2), n = 4;
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#5ae0ff'; ctx.fillRect(-p.r * 1.4, -p.r * 1.4, p.r * 2.8, p.r * 2.8); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 || i === n - 1) && (j === 0 || j === n - 1)) continue;
      ctx.fillStyle = (i + j + Math.floor(p.t / 3)) % 3 === 0 ? '#ffffff' : ((i + j) % 2 ? '#19c3e6' : '#ff3c3c');
      ctx.fillRect(-s * n / 2 + i * s, -s * n / 2 + j * s, s - 0.5, s - 0.5);
    }
    ctx.restore();
  }
  function joyDraw(col) {
    return (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.5);
      R.poly(ctx, [[-4, -10], [4, -10], [4, 10], [-4, 10]], col);
      R.disc(ctx, 0, -4, 2, '#111', false);
      ctx.restore();
    };
  }
  const GEM_NORMALS = new Set(['jab', 'jab2', 'jab3', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair']);
  const gemSwap = col => swapMove({ color: col, at: 10, frames: 30 });

  const COPETE = {
    id: 'gemelos_copete', name: 'Copete', title: 'El Gemelo Gamer',
    passive: 'Ataca a GRITOS y usa su consola portátil para los especiales. Más potencia.',
    palette: { primary: ROYAL, secondary: '#22252e', skin: '#c98f62', head: '#c98f62', hand: '#c98f62', arms: ROYAL, legs: '#22252e', feet: '#f2f2f2', accent: '#19c3e6', hair: '#1e1612', eye: '#2a1a10', belt: '#3a2a1a' },
    stats: { weight: 94, height: 86, width: 32, walk: 2.8, run: 6.4, dash: 7.0, airSpeed: 3.5, gravity: 0.56, fall: 9.8, fastFall: 14.5, jump: 13.4, shortHop: 8.6, airJump: 12.4 },
    profile: { style: 'magic', reach: 1.15, power: 1.12, speed: 0.92, effect: 'wind' },
    ai: { recovery: 'up', projectile: 'neutral', range: 120, zoner: true },
    onLifeReset(f) { f.data.joys = 0; },
    onUpdate(f) {
      const mv = f.move;
      if (!mv || f.state !== ST.ATTACK || !GEM_NORMALS.has(mv.def.key) || !mv.def.act) return;
      const a = mv.def.act, fr = mv.frame;
      if (fr >= a[0] - 1 && fr <= a[1] && (fr - a[0]) % 3 === 0) {
        const m = f.localToWorld(16, -f.h * 0.8);
        f.fx('ring', m.x + f.facing * (fr - a[0]) * 4, m.y, { r: 10 + (fr - a[0]) * 3, color: '#bfe3ff', w: 3 });
      }
      if (fr === a[0] && /smash/.test(mv.def.key)) f.fx('text', f.x + f.facing * 30, f.y - f.h - 14, { text: '¡AAAAH!', color: '#bfe3ff', size: 20 });
    },
    rig: {
      headR: 11.5, torsoW: 23, hipW: 20, torsoH: 26, armW: 7.5, upperArm: 14, foreArm: 13, legW: 8.5,
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          /* Copete "de mango chupado": mechones gruesos, disparejos y despeinados hacia arriba. */
          const T = [[-0.62, -0.75, 0.62], [-0.38, -0.25, 0.85], [-0.12, 0.15, 1.05], [0.12, -0.35, 0.8], [0.32, 0.45, 1.15], [0.5, -0.1, 0.95], [0.66, 0.6, 0.72], [-0.25, 0.55, 0.7], [0.2, 0.05, 0.6]];
          ctx.lineJoin = 'round';
          T.forEach(([bx, lean, len], i) => {
            const sway = Math.sin(a.f.tick * 0.12 + i * 1.7) * 0.05;
            const ang = -PI / 2 + lean * 0.55 + sway, L = r * len, x0 = r * bx, y0 = -r * 0.72, wd = r * 0.2;
            const tx = x0 + Math.cos(ang) * L, ty = y0 + Math.sin(ang) * L;
            const nx = Math.cos(ang + PI / 2) * wd, ny = Math.sin(ang + PI / 2) * wd;
            ctx.fillStyle = i % 3 === 1 ? U.shade(a.pal.hair, 0.12) : a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(x0 - nx, y0 - ny);
            ctx.quadraticCurveTo(x0 + Math.cos(ang) * L * 0.6 - nx * 0.6 + r * 0.06, y0 + Math.sin(ang) * L * 0.6 - ny * 0.6, tx, ty);
            ctx.quadraticCurveTo(x0 + Math.cos(ang) * L * 0.5 + nx * 0.7, y0 + Math.sin(ang) * L * 0.5 + ny * 0.7, x0 + nx, y0 + ny);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          });
          hairCap(ctx, r, a.pal.hair, { a1: -0.6 });
          glasses(ctx, r);
          const mv = a.f.move;
          if (mv && GEM_NORMALS.has(mv.def.key)) R.ellipse(ctx, r * 0.42, r * 0.48, r * 0.2, r * 0.26, 0, '#5a1010');
        },
        torso: shirtDetails,
        front(ctx, a) {
          const mv = a.f.move;
          if (!mv || !/^special_(neutral|side|up)/.test(mv.def.key)) return;
          const h = a.J.haF;
          ctx.save(); ctx.translate(h.x + 4, h.y - 2); ctx.rotate(-0.15);
          consoleDraw(ctx, !(a.f.data && a.f.data.joys > 0));
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 34, pose: 'shoot', charge: { at: 8, max: 60, key: 'special', mult: 1 },
        onCharge(f, mv) { if (mv.charge % 6 === 0) f.fx('sparkle', f.x + f.facing * 26, f.y - f.h * 0.55, { color: '#5ae0ff' }); },
        onFrame(f, fr, mv) {
          if (fr !== 12) return;
          const k = mv.charge / 60;
          NX.Audio.play(k > 0.6 ? 'beam' : 'laser', { pitch: 1.5 - k * 0.5 });
          shoot(f, { ox: 34, speed: 7 + 3 * k, r: 8 + 10 * k, life: 80, dmg: 5 + 14 * k, ang: 40, bkb: 25 + 25 * k, kbg: 40 + 45 * k,
            effect: 'magic', color: '#5ae0ff', glow: false, draw: pixelDraw });
          if (k > 0.9) { f.match.camera.shake(5); f.fx('text', f.x, f.y - f.h - 16, { text: '¡COMBO MÁX!', color: '#5ae0ff', size: 18 }); }
        }
      },
      side: {
        frames: 34, pose: 'shoot',
        canUse(f) { return !(f.data.joys > 0); },
        onFrame(f, fr) {
          if (fr !== 10) return;
          NX.Audio.play('swing', { pitch: 1.4 });
          [['#19c3e6', -0.7], ['#ff3c3c', 0.7]].forEach(([col, vy]) => {
            f.data.joys = (f.data.joys || 0) + 1;
            shoot(f, { ox: 30, speed: 10.5, vy, r: 10, life: 110, dmg: 3, ang: 55, bkb: 30, kbg: 35, effect: 'hit', pierce: true, hits: 99, rehit: 12,
              stageCollide: false, reflectable: true, absorbable: false, color: col, glow: false, draw: joyDraw(col),
              update(p) {
                const o = p.owner;
                if (p.t < 18 || !o) return;
                const dx = o.x - p.x, dy = o.y - o.h * 0.55 - p.y;
                p.vx = U.approach(p.vx, U.sign(dx) * 11, 0.9); p.vy = U.approach(p.vy, U.clamp(dy * 0.12, -9, 9), 0.8);
                if (Math.hypot(dx, dy) < 26) p.destroy('caught');
              },
              onDestroy(p) { const o = p.data.thrower; if (o && o.data.joys > 0) o.data.joys--; },
              data: { thrower: f } });
          });
        }
      },
      up: {
        frames: 72, pose: 'rise', helplessLag: 22, drift: 0.4,
        hitboxes: [
          { f: [5, 8], x: 10, y: -70, r: 24, dmg: 3, ang: 88, bkb: 55, kbg: 12, effect: 'magic', group: 1 },
          { f: [10, 13], x: 10, y: -70, r: 24, dmg: 3, ang: 88, bkb: 55, kbg: 12, effect: 'magic', group: 2 },
          { f: [15, 18], x: 10, y: -70, r: 24, dmg: 3, ang: 88, bkb: 55, kbg: 12, effect: 'magic', group: 3 },
          { f: [28, 44], x: 10, y: -16, r: 28, dmg: 6, ang: 270, bkb: 30, kbg: 55, effect: 'magic', meteor: true, group: 4 }],
        onFrame(f, fr, mv) {
          if (fr === 4) NX.Audio.play('magic', { pitch: 1.4 });
          if (fr >= 5 && fr <= 19) { f.vy = -13.5; mv.velY = true; linkTick(f, mv, 0.25); }
          else if (fr > 19 && fr <= 26) { f.vy = 0; mv.velY = true; linkTick(f, mv, 0.3); }
          else if (fr > 26) {
            f.vy = 15; mv.velY = true; mv.data.dive = true; linkTick(f, mv, 0.3);
            if (fr % 2 === 0) f.fx('sparkle', f.x, f.y - 10, { color: '#5ae0ff' });
            if (fr >= 44 && !f.ground) mv.frame = 43;
          }
        },
        onHit(f, t, mv) { if (mv.frame <= 44) autolink(f, t, mv); },
        onLand(f, mv) {
          if (mv.data.dive) { boom(f, f.x + f.facing * 10, f.y - 16, { r: 54, dmg: 6, ang: 60, bkb: 60, kbg: 105, effect: 'magic' }); f.fx('text', f.x, f.y - f.h - 18, { text: 'GAME OVER', color: '#5ae0ff', size: 18 }); }
          f.endMoveCleanup(true); f.startLand(mv.data.dive ? 20 : 12);
          return 'continue';
        }
      },
      down: gemSwap('#5ae0ff')
    }
  };

  const FLEQUILLO = {
    id: 'gemelos_flequillo', name: 'Flequillo', title: 'El Gemelo de las Cartas',
    passive: 'Golpea con su LAPTOP y lanza cartas coleccionables (fuego, agua, rayo o planta). Más velocidad.',
    palette: { primary: ROYAL, secondary: '#c9a96e', skin: '#c98f62', head: '#c98f62', hand: '#c98f62', arms: ROYAL, legs: '#c9a96e', feet: '#3a2a1a', accent: '#f2c418', hair: '#1e1612', eye: '#2a1a10', belt: '#5a3a1a' },
    stats: { weight: 88, height: 86, width: 30, walk: 3.2, run: 7.8, dash: 8.4, airSpeed: 4.0, gravity: 0.6, fall: 10.4, fastFall: 15.5, jump: 14.2, shortHop: 9.0, airJump: 13 },
    profile: { style: 'sword', reach: 0.82, power: 0.94, speed: 1.12, effect: 'hit' },
    ai: { recovery: 'up', sideRecovery: true, projectile: 'neutral', range: 95, rushdown: true },
    rig: {
      headR: 11.5, torsoW: 23, hipW: 20, torsoH: 26, armW: 7.5, upperArm: 14, foreArm: 13, legW: 8.5,
      weapon: { type: 'laptop', len: 30, w: 14, trail: '#9fe8ff' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.15 });
          /* Flequillo de lado que cae sobre la frente. */
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.55);
          ctx.quadraticCurveTo(-r * 0.2, -r * 1.35, r * 0.8, -r * 0.85);
          ctx.quadraticCurveTo(r * 1.15, -r * 0.6, r * 1.02, -r * 0.18);
          ctx.lineTo(r * 0.78, -r * 0.42); ctx.lineTo(r * 0.62, -r * 0.2); ctx.lineTo(r * 0.45, -r * 0.48);
          ctx.quadraticCurveTo(-r * 0.1, -r * 0.6, -r * 0.9, -r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
          glasses(ctx, r);
        },
        torso: shirtDetails,
        weapon(ctx, f, w) {
          R.poly(ctx, [[-w.w / 2, 2], [w.w / 2, 2], [w.w / 2, w.len], [-w.w / 2, w.len]], '#b9c0c8');
          ctx.fillStyle = '#8a929b'; ctx.fillRect(-w.w / 2, 2, 2.5, w.len - 2);
          ctx.fillStyle = 'rgba(160,240,255,.9)'; ctx.fillRect(w.w / 2 - 2, 4, 2, w.len - 6);
          R.disc(ctx, 0, w.len * 0.55, 2.6, '#e8eefc', false);
        },
        front(ctx, a) {
          const mv = a.f.move;
          if (!mv || !/^special_(neutral|side|up)/.test(mv.def.key)) return;
          const h = a.J.haB;
          ctx.save(); ctx.translate(h.x, h.y);
          [-0.35, 0, 0.35].forEach((rot, i) => { ctx.save(); ctx.rotate(rot - 0.2); ctx.translate(0, -8); cardShape(ctx, 11, 15, CARD_TYPES[i].c); ctx.restore(); });
          ctx.restore();
        }
      }
    },
    specials: {
      neutral: {
        frames: 30, pose: 'shoot',
        onFrame(f, fr) {
          if (fr !== 9) return;
          NX.Audio.play('swing', { pitch: 1.8 });
          [-0.2, 0, 0.2].forEach(a => throwCard(f, { ox: 30, speed: 0, vx: Math.cos(a) * 11.5 * f.facing, vy: Math.sin(a) * 11.5, dmg: a ? 3.5 : 5, kbg: a ? 32 : 48 }));
        }
      },
      side: {
        frames: 40, oncePerAir: true, drift: 0, intangible: [5, 13],
        poseFn() { return { lean: 0.6, aF1: 1.6, aF2: 0, wpn: 0, lF1: 1.0, lB1: -0.9, planted: false }; },
        onFrame(f, fr, mv) {
          if (fr === 5) { NX.Audio.play('swing', { pitch: 2 }); f.fx('ring', f.x, f.y - f.h / 2, { r: 34, color: '#f2c418' }); }
          if (fr >= 6 && fr <= 14) {
            f.vx = f.facing * 18; f.vy = 0; mv.velX = mv.velY = true;
            mv.extraBoxes = [{ x: 10, y: -44, r: 30, dmg: 8, ang: 45, bkb: 45, kbg: 70, effect: 'elec' }];
            if (fr % 2 === 0) f.match.effects.list.push({ type: 'streak', x: f.x - f.facing * 20, y: f.y - U.rand(10, f.h), vx: -f.facing * 8, vy: 0, life: 10, max: 10, len: 22, color: '#f2c418' });
          } else if (fr === 15) { mv.extraBoxes = null; f.vx = f.facing * 3; }
        }
      },
      up: {
        frames: 54, pose: 'rise', helplessLag: 18, vel: [{ f: [4, 17], vy: -14, vx: 1.6 }, { f: [19, 24], vy: 0 }],
        onFrame(f, fr) {
          if (fr === 4) {
            NX.Audio.play('magic', { pitch: 1.6 });
            const T = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
            f.spawnProjectile({ x: f.x, y: f.y + 6, vx: 0, vy: 0, r: 26, life: 16, dmg: 6, ang: 80, bkb: 50, kbg: 55, effect: T.fx, pierce: true,
              stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, data: { art: T.c }, draw: bigCardDraw,
              update(p) { const o = p.owner; p.x = o.x; p.y = o.y + 8; } });
          }
          if (fr === 21) {
            NX.Audio.play('swing', { pitch: 1.6 });
            [60, 78, 96].forEach(deg => { const a = deg * PI / 180; throwCard(f, { ox: 6, oy: -f.h * 0.4, speed: 0, vx: Math.cos(a) * 12 * f.facing, vy: Math.sin(a) * 12, dmg: 4, ang: 60, kbg: 45, life: 34 }); });
          }
        }
      },
      down: gemSwap('#f2c418')
    }
  };

  fighter({
    id: 'gemelos', name: 'LosGemelos', title: 'Dúo Gamer',
    passive: 'Dos gemelos en un slot. Abajo + B alterna entre Copete (gritos y consola, potencia) y Flequillo (laptop y cartas, velocidad).',
    forms: [COPETE, FLEQUILLO], portraitForm: 0
  });

  NX.ROSTER = ROSTER;
  NX.FighterKit = { shoot, boom, steer, nearestFoe, groundAt, groundWave, tetherLedge };
})(window.NX = window.NX || {});
