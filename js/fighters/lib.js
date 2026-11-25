/* ==========================================================================
 * NEXUS CLASH — js/fighters/lib.js
 * Utilidades compartidas por los luchadores de js/fighters/roster/:
 * proyectiles, explosiones, accesorios de dibujo y movimientos comunes.
 * Cada archivo del plantel registra su luchador con NX.RosterLib.fighter().
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
  const ROSTER = NX.ROSTER = [];
  function fighter(def) { ROSTER.push(def); return def; }

  /* ---- compartido (origen: nia) ---- */
  /* Especial de cambio de forma (Nia, Sol y Luna, LosGemelos): encoge, cambia
   * de forma en el fotograma `at` y vuelve a crecer. */
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

  /* ---- compartido (origen: haldor) ---- */
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

  /* ---- compartido (origen: kestra) ---- */
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

  /* ---- compartido (origen: gemelos) ---- */
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

  NX.RosterLib = { shoot, boom, nearestFoe, steer, groundAt, groundWave, spend, tetherLedge, hairCap, spikes, earsPointy, earsRound, earsLong, elfEar, goggles, headband, hood, windOf, cape, scarf, tail, wingPair, torsoStripes, orbDraw, rockDraw, boltDraw, starDraw, flameDraw, cloudDraw, fighter, swapMove, autolink, linkTick, counterMove, plasmaDraw, glasses };
  NX.FighterKit = { shoot, boom, steer, nearestFoe, groundAt, groundWave, tetherLedge };
})(window.NX = window.NX || {});
