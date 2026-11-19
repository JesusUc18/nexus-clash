/* ==========================================================================
 * NEXUS CLASH — js/fighters/details.js  (V1.3 · apartado visual)
 * Capas de detalle por luchador: texturas, costuras, remaches, emblemas,
 * brillos y accesorios. Se dibujan encima de las partes de roster.js
 * mediante los ganchos de renderer.js (def.details):
 *   limbsBack · brazo/pierna traseros  (espacio del luchador, J = articulaciones)
 *   torso     · espacio del torso (origen en la cadera, y negativa hacia arriba)
 *   legFront  · pierna delantera
 *   armFront  · brazo delantero (antes de la mano)
 *   head      · espacio de la cabeza (origen en el centro, R = headR)
 *   front     · encima de todo
 * Luz: arriba y hacia delante (+x = hacia donde mira).
 * ========================================================================== */
(function (NX) {
  'use strict';
  if (!NX.Render || !NX.ROSTER) return;
  const R = NX.Render, U = NX.U, OUT = R.OUT, PI = Math.PI, TAU = PI * 2;
  const T = (c, k) => R.tone(c, k);

  /* ------------------------------ AYUDAS ---------------------------------- */
  const at = (A, B, t) => ({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
  function rnd(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  /* Ancho del torso a una altura y (y < 0). */
  function tw(r, y) { const k = U.clamp(-y / r.torsoH, 0, 1); return r.hipW + (r.torsoW - r.hipW) * k; }
  function clipTorso(ctx, r) { R.roundTrap(ctx, r.torsoW, r.hipW, r.torsoH, r.torsoRound); ctx.clip(); }
  function clipHead(ctx, r) { ctx.beginPath(); ctx.ellipse(0, 0, r.headR * r.headW, r.headR * r.headH, 0, 0, TAU); ctx.clip(); }
  function line(ctx, pts, col, w, cap) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = cap || 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function crease(ctx, pts, a) { line(ctx, pts, `rgba(10,0,30,${a || 0.2})`, 1.1); }
  function rivet(ctx, x, y, r, col) {
    ctx.fillStyle = T(col, -0.15); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.38, 0, TAU); ctx.fill();
  }
  function button(ctx, x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - r * 0.45, y - r * 0.1, r * 0.25, r * 0.25); ctx.fillRect(x + r * 0.2, y - r * 0.1, r * 0.25, r * 0.25);
  }
  function glow(ctx, x, y, r, col, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(/^#/.test(col) ? col : '#ffffff', a == null ? 0.55 : a)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  function star(ctx, x, y, r, col, n, rot) {
    n = n || 5; ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (rot || -PI / 2) + i * PI / n, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function crescent(ctx, x, y, r, col) {
    ctx.beginPath(); ctx.arc(x, y, r, 0.15 * PI, 1.85 * PI, true); ctx.arc(x + r * 0.45, y - r * 0.1, r * 0.78, 1.8 * PI, 0.2 * PI);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function gear(ctx, x, y, r, teeth, col, rot) {
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) { const a = (rot || 0) + i * PI / teeth, rr = i % 2 ? r * 0.78 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, TAU); ctx.fill();
  }
  /* Puntos de textura dentro del torso (piedra, pelaje, óxido...). */
  function speckle(ctx, r, n, cols, seed, size) {
    const q = rnd(seed);
    for (let i = 0; i < n; i++) {
      const y = -r.torsoH * (0.08 + q() * 0.84), w = tw(r, y), x = (q() - 0.5) * w * 0.9;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(x, y, (size || 1.4) * (0.6 + q() * 0.8), (size || 1.4) * (0.5 + q() * 0.6), q() * PI, 0, TAU); ctx.fill();
    }
  }
  /* Pelaje: trazos cortos en el borde. */
  function furStrokes(ctx, r, col, seed, n) {
    const q = rnd(seed); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = 0; i < (n || 14); i++) {
      const y = -r.torsoH * (0.1 + q() * 0.8), w = tw(r, y), x = (q() - 0.5) * w * 0.85;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.2 - q(), y + 2.4 + q() * 1.5); ctx.stroke();
    }
  }
  /* Brillo del pelo sobre la cabeza. */
  function hairShine(ctx, r, a) {
    const Rh = r.headR;
    ctx.strokeStyle = `rgba(255,255,255,${a || 0.38})`; ctx.lineWidth = Math.max(1.2, Rh * 0.13); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-Rh * 0.05, Rh * 0.05, Rh * 0.86, PI * 1.32, PI * 1.6); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, Rh * 0.07);
    ctx.beginPath(); ctx.arc(-Rh * 0.05, Rh * 0.05, Rh * 0.86, PI * 1.66, PI * 1.72); ctx.stroke();
  }
  /* Destello de lentes / visor (recorre el cristal cada pocos segundos). */
  function lensGlint(ctx, f, x, y, w, h) {
    const k = (((f.tick || 0) + 40) % 150) / 22;
    if (k > 1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    const gx = x - w / 2 + (w + h) * k - h;
    ctx.beginPath(); ctx.moveTo(gx, y + h / 2); ctx.lineTo(gx + h * 0.5, y + h / 2); ctx.lineTo(gx + h * 1.2, y - h / 2); ctx.lineTo(gx + h * 0.7, y - h / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* Puño / bota / brazalete sobre una extremidad. */
  function cuff(ctx, A, B, t0, t1, w, col) {
    const p0 = at(A, B, t0), p1 = at(A, B, t1);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 2.4;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    /* El contorno se recorta un poco en cada extremo para que la banda no sobresalga. */
    const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1, e = Math.min(0.9, L * 0.2);
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(p0.x + dx / L * e, p0.y + dy / L * e); ctx.lineTo(p1.x - dx / L * e, p1.y - dy / L * e); ctx.stroke();
    if (typeof col === 'string') {
      let nx = -dy / L, ny = dx / L; if (nx * R.LIGHT.x + ny * R.LIGHT.y < 0) { nx = -nx; ny = -ny; }
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = w * 0.2;
      ctx.beginPath(); ctx.moveTo(p0.x + dx / L * e + nx * w * 0.25, p0.y + dy / L * e + ny * w * 0.25); ctx.lineTo(p1.x - dx / L * e + nx * w * 0.25, p1.y - dy / L * e + ny * w * 0.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,0,30,.18)'; ctx.lineWidth = w * 0.3;
      ctx.beginPath(); ctx.moveTo(p0.x + dx / L * e - nx * w * 0.3, p0.y + dy / L * e - ny * w * 0.3); ctx.lineTo(p1.x - dx / L * e - nx * w * 0.3, p1.y - dy / L * e - ny * w * 0.3); ctx.stroke();
    }
    ctx.lineCap = 'round';
  }
  function wraps(ctx, A, B, t0, t1, w, col, n) {
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.lineCap = 'round';
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (let i = 0; i < n; i++) {
      const p = at(A, B, t0 + (t1 - t0) * (i + 0.5) / n);
      ctx.beginPath(); ctx.moveTo(p.x - nx * w * 0.48 - dx / L, p.y - ny * w * 0.48 - dy / L); ctx.lineTo(p.x + nx * w * 0.48 + dx / L, p.y + ny * w * 0.48 + dy / L); ctx.stroke();
    }
  }
  function kneePad(ctx, J, side, r, col) { const k = side === 'F' ? J.knF : J.knB; R.orb(ctx, k.x + 1, k.y, r * 0.8, col); }
  function pulse(f, sp, lo) { return (lo == null ? 0.65 : lo) + (1 - (lo == null ? 0.65 : lo)) * (0.5 + 0.5 * Math.sin((f.tick || 0) * (sp || 0.08))); }
  const armW = r => r.armW * 0.86, legW = r => r.legW * 0.88;
  /* Sombra de cuello de prenda (collar) en lo alto del torso. */
  function collar(ctx, r, col, depth) {
    const y = -r.torsoH, w = r.torsoW;
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-w * 0.32, y + 0.5); ctx.lineTo(w * 0.05, y + (depth || 6)); ctx.lineTo(w * 0.36, y + 0.5); ctx.lineTo(w * 0.2, y - 1.5); ctx.lineTo(w * 0.05, y + 2.5); ctx.lineTo(-w * 0.16, y - 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function placket(ctx, r, col, n, x) {
    const xx = x == null ? r.torsoW * 0.08 : x;
    crease(ctx, [[xx, -r.torsoH + 4], [xx, -2]], 0.22);
    for (let i = 0; i < n; i++) button(ctx, xx + 1.6, -r.torsoH + 6 + i * ((r.torsoH - 10) / Math.max(1, n - 1)), 1.1, col);
  }
  function pocket(ctx, x, y, w, h, col) {
    ctx.fillStyle = T(col, -0.08); ctx.strokeStyle = 'rgba(10,0,30,.35)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    ctx.setLineDash([1.2, 1.2]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + 0.8, y + 1.6); ctx.lineTo(x + w - 0.8, y + 1.6); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ========================== DETALLES POR LUCHADOR ======================= */
  const D = {};

  /* Gorrak · Coloso de Roca: piedra con grietas, musgo y núcleo de magma. */
  D.gorrak = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      speckle(ctx, r, 26, ['rgba(0,0,0,.22)', 'rgba(255,255,255,.14)', 'rgba(60,50,40,.3)'], 7, 1.8);
      crease(ctx, [[-r.torsoW * 0.35, -r.torsoH * 0.75], [-r.torsoW * 0.22, -r.torsoH * 0.6], [-r.torsoW * 0.3, -r.torsoH * 0.45]], 0.4);
      crease(ctx, [[r.torsoW * 0.32, -r.torsoH * 0.3], [r.torsoW * 0.18, -r.torsoH * 0.2], [r.torsoW * 0.26, -r.torsoH * 0.08]], 0.4);
      ctx.fillStyle = '#5f8a3a';
      [[-0.32, -0.95, 7, 3], [-0.12, -0.98, 5, 2.2], [0.3, -0.97, 4, 2]].forEach(([x, y, w, h]) => { ctx.beginPath(); ctx.ellipse(r.torsoW * x, r.torsoH * y, w, h, 0, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#86b84a'; ctx.beginPath(); ctx.ellipse(-r.torsoW * 0.3, -r.torsoH * 0.97, 3.5, 1.2, 0, 0, TAU); ctx.fill();
      ctx.restore();
      glow(ctx, r.torsoW * 0.02, -r.torsoH * 0.55, 13 * pulse(a.f, 0.1), a.pal.accent, 0.45);
    },
    head(ctx, a) {
      const r = a.rig, Rh = r.headR; ctx.save(); clipHead(ctx, r);
      speckle(ctx, { torsoH: Rh * 2, torsoW: Rh * 2, hipW: Rh * 2 }, 8, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.12)'], 3, 1.2);
      ctx.restore();
      ctx.fillStyle = '#5f8a3a'; ctx.beginPath(); ctx.ellipse(-Rh * 0.3, -Rh * 0.92, Rh * 0.42, Rh * 0.16, -0.2, 0, TAU); ctx.fill();
    },
    armFront(ctx, a) {
      const J = a.J, r = a.rig;
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      [0.3, 0.65].forEach(t => { const p = at(J.shF, J.elF, t); ctx.beginPath(); ctx.ellipse(p.x, p.y, 2.2, 1.4, 0.5, 0, TAU); ctx.fill(); });
      [0.4].forEach(t => { const p = at(J.elF, J.haF, t); ctx.beginPath(); ctx.ellipse(p.x, p.y, 2, 1.3, 0.5, 0, TAU); ctx.fill(); });
      cuff(ctx, J.elF, J.haF, 0.7, 0.9, armW(r) + 3, a.pal.secondary);
    },
    front(ctx, a) {
      const h = a.J.haF, r = a.rig.handR;
      [[0.7, -0.5], [0.95, 0.1], [0.55, 0.65]].forEach(([dx, dy]) => R.orb(ctx, h.x + dx * r, h.y + dy * r, r * 0.34, a.pal.secondary));
    }
  };

  /* Vespera · Bruja Lunar: broche de luna, estrellas bordadas y destellos. */
  D.vespera = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.save(); ctx.globalAlpha *= 0.9;
      [[-0.45, 9, 2.2], [0.2, 13, 1.8], [0.55, 7, 1.5], [-0.15, 17, 1.4], [0.45, 17, 1.6]].forEach(([x, y, s]) => star(ctx, r.hipW * x, y, s, '#ffe9a0', 4, 0));
      ctx.restore();
      crescent(ctx, r.torsoW * 0.18, -r.torsoH * 0.78, 3.2, '#ffe9a0');
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(r.torsoW * 0.18, -r.torsoH * 0.78, 3.2, 0.15 * PI, 1.85 * PI, true); ctx.stroke();
      line(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.55], [r.torsoW * 0.5, -r.torsoH * 0.62]], T(a.pal.accent, -0.1), 1.6);
    },
    head(ctx, a) { hairShine(ctx, a.rig, 0.5); },
    front(ctx, a) {
      const h = a.J.haF, t = a.f.tick || 0;
      for (let i = 0; i < 3; i++) {
        const ang = t * 0.05 + i * TAU / 3, k = 0.5 + 0.5 * Math.sin(t * 0.13 + i * 2);
        star(ctx, h.x + Math.cos(ang) * 9, h.y + Math.sin(ang) * 6 - 3, 1.2 + 1.6 * k, `rgba(220,200,255,${0.4 + 0.5 * k})`, 4, 0);
      }
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.62, 0.92, armW(a.rig) + 3.4, a.pal.secondary); line(ctx, [[at(a.J.elF, a.J.haF, 0.9).x, at(a.J.elF, a.J.haF, 0.9).y], [at(a.J.elF, a.J.haF, 0.92).x, at(a.J.elF, a.J.haF, 0.92).y]], a.pal.accent, armW(a.rig) + 3.4, 'butt'); }
  };

  /* Ironclad · Ogro Mecánico: remaches, rejillas, franjas de peligro y pistones. */
  D.ironclad = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      ctx.fillStyle = '#1e2026';
      for (let i = 0; i < 3; i++) ctx.fillRect(r.torsoW * 0.02, -r.torsoH * 0.78 + i * 3.2, r.torsoW * 0.32, 1.6);
      for (let i = -6; i < 10; i++) { ctx.fillStyle = i % 2 ? '#ffd23a' : '#1e2026'; ctx.beginPath(); ctx.moveTo(i * 5, -1); ctx.lineTo(i * 5 + 5, -1); ctx.lineTo(i * 5 + 1, -7); ctx.lineTo(i * 5 - 4, -7); ctx.closePath(); ctx.fill(); }
      crease(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.42], [r.torsoW * 0.5, -r.torsoH * 0.42]], 0.35);
      ctx.restore();
      [[-0.4, -0.88], [0.4, -0.88], [-0.4, -0.5], [0.4, -0.5], [-0.38, -0.3], [0.38, -0.3]].forEach(([x, y]) => rivet(ctx, tw(r, r.torsoH * y) * x, r.torsoH * y, 1.3, '#c9d2de'));
    },
    head(ctx, a) {
      const Rh = a.rig.headR;
      rivet(ctx, -Rh * 0.6, -Rh * 0.55, 1.1, '#c9d2de'); rivet(ctx, -Rh * 0.75, Rh * 0.2, 1.1, '#c9d2de');
      const sy = -Rh * 0.12 + Math.sin((a.f.tick || 0) * 0.12) * Rh * 0.18;
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(Rh * 0.05, sy, Rh * 0.6, 1);
      glow(ctx, Rh * 0.35, -Rh * 0.12, Rh * 0.9, '#5ff3ff', 0.25);
    },
    armFront(ctx, a) {
      const J = a.J, r = a.rig;
      const p0 = at(J.shF, J.elF, 0.15), p1 = at(J.shF, J.elF, 0.85);
      R.limb(ctx, [{ x: p0.x - 3, y: p0.y }, { x: p1.x - 3, y: p1.y }], 3.2, '#c9d2de');
      R.orb(ctx, J.elF.x, J.elF.y, r.armW * 0.42, '#5a626e'); rivet(ctx, J.elF.x, J.elF.y, 1.2, '#c9d2de');
      cuff(ctx, J.elF, J.haF, 0.75, 0.95, armW(r) + 3, a.pal.primary);
    },
    legFront(ctx, a) { kneePad(ctx, a.J, 'F', a.rig.legW * 0.4, '#5a626e'); rivet(ctx, a.J.knF.x + 1, a.J.knF.y, 1.1, '#c9d2de'); },
    limbsBack(ctx, a) { kneePad(ctx, a.J, 'B', a.rig.legW * 0.36, '#3a3f4a'); }
  };

  /* Rook · Ingeniera de Chatarra: tirantes con botones, bolsillo con lápiz, parche. */
  D.rook = {
    torso(ctx, a) {
      const r = a.rig, w = r.torsoW;
      line(ctx, [[-w * 0.28, -r.torsoH], [-w * 0.2, -r.torsoH * 0.45]], T(a.pal.primary, -0.25), 2.4);
      line(ctx, [[w * 0.3, -r.torsoH], [w * 0.24, -r.torsoH * 0.45]], T(a.pal.primary, -0.25), 2.4);
      button(ctx, -w * 0.2, -r.torsoH * 0.47, 1.4, '#f2b632'); button(ctx, w * 0.24, -r.torsoH * 0.47, 1.4, '#f2b632');
      pocket(ctx, -w * 0.18, -r.torsoH * 0.42, w * 0.38, r.torsoH * 0.2, a.pal.primary);
      line(ctx, [[w * 0.08, -r.torsoH * 0.45], [w * 0.1, -r.torsoH * 0.6]], '#ff6a2a', 1.4);
      ctx.fillStyle = '#c9a43a'; ctx.fillRect(-r.hipW * 0.45, -9, 3.4, 4); ctx.fillRect(-r.hipW * 0.2, -9, 3, 4);
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.6; ctx.strokeRect(-r.hipW * 0.45, -9, 3.4, 4); ctx.strokeRect(-r.hipW * 0.2, -9, 3, 4);
    },
    legFront(ctx, a) {
      const p = at(a.J.hipF, a.J.knF, 0.55);
      ctx.fillStyle = T(a.pal.primary, 0.2); ctx.strokeStyle = 'rgba(10,0,30,.45)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.rect(p.x - 2.5, p.y - 2.5, 5, 5); ctx.fill(); ctx.setLineDash([1, 1]); ctx.stroke(); ctx.setLineDash([]);
      cuff(ctx, a.J.knF, a.J.ftF, 0.78, 0.95, legW(a.rig) + 2.4, T(a.pal.primary, -0.15));
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.78, 0.97, armW(a.rig) + 2.6, '#3a3a3a'); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.3); lensGlint(ctx, a.f, -a.rig.headR * 0.1, -a.rig.headR * 0.85, a.rig.headR * 1.2, a.rig.headR * 0.4); }
  };

  /* Kaito Ren · Puño de Jade: solapa cruzada, colgante de jade, vendas y cinta. */
  D.kaito = {
    torso(ctx, a) {
      const r = a.rig, w = r.torsoW;
      line(ctx, [[-w * 0.38, -r.torsoH], [w * 0.18, -r.torsoH * 0.35]], a.pal.secondary, 2.6);
      line(ctx, [[-w * 0.38, -r.torsoH], [w * 0.18, -r.torsoH * 0.35]], 'rgba(10,0,30,.3)', 0.8);
      crease(ctx, [[-w * 0.3, -r.torsoH * 0.55], [-w * 0.1, -r.torsoH * 0.3]]); crease(ctx, [[w * 0.3, -r.torsoH * 0.75], [w * 0.38, -r.torsoH * 0.45]]);
      line(ctx, [[w * 0.05, -r.torsoH * 0.98], [w * 0.22, -r.torsoH * 0.7]], '#c9a43a', 0.8);
      R.orb(ctx, w * 0.22, -r.torsoH * 0.66, 2, '#3fd98a');
      const t = a.f.tick || 0, sw = Math.sin(t * 0.15) * 1.5;
      line(ctx, [[r.hipW * 0.3, -3], [r.hipW * 0.25 + sw, 6], [r.hipW * 0.12 + sw * 1.4, 11]], a.pal.belt, 2.4);
      line(ctx, [[r.hipW * 0.36, -3], [r.hipW * 0.5 + sw, 5], [r.hipW * 0.48 + sw * 1.4, 10]], a.pal.belt, 2.4);
      ctx.fillStyle = a.pal.belt; ctx.beginPath(); ctx.ellipse(r.hipW * 0.33, -3.5, 2.6, 2, 0, 0, TAU); ctx.fill();
    },
    armFront(ctx, a) { wraps(ctx, a.J.elF, a.J.haF, 0.55, 0.95, armW(a.rig) + 1.2, '#f0e6d2', 4); },
    limbsBack(ctx, a) { wraps(ctx, a.J.elB, a.J.haB, 0.55, 0.95, armW(a.rig) + 1.2, T('#f0e6d2', -0.3), 4); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.4); }
  };

  /* Sylra · Guardabosques: hojas en la túnica, correa con hebilla y brazales de cuero. */
  D.sylra = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      ctx.strokeStyle = 'rgba(214,255,107,.35)'; ctx.lineWidth = 0.9;
      [[-0.2, -0.3], [0.15, -0.62], [-0.05, -0.85]].forEach(([x, y]) => {
        const cx = r.torsoW * x, cy = r.torsoH * y;
        ctx.beginPath(); ctx.ellipse(cx, cy, 3.4, 1.6, -0.6, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 2.6, cy + 1.8); ctx.lineTo(cx + 2.6, cy - 1.8); ctx.stroke();
      });
      ctx.restore();
      line(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.95], [r.hipW * 0.45, -4]], a.pal.secondary, 2.4);
      ctx.fillStyle = '#c9a43a'; ctx.fillRect(-1.5, -r.torsoH * 0.52, 3, 3); ctx.strokeStyle = OUT; ctx.lineWidth = 0.6; ctx.strokeRect(-1.5, -r.torsoH * 0.52, 3, 3);
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.45, 0.9, armW(a.rig) + 2.6, a.pal.secondary); wraps(ctx, a.J.elF, a.J.haF, 0.5, 0.85, armW(a.rig) + 2.6, 'rgba(0,0,0,.35)', 3); },
    limbsBack(ctx, a) { cuff(ctx, a.J.elB, a.J.haB, 0.45, 0.9, armW(a.rig) + 2.6, T(a.pal.secondary, -0.3)); },
    legFront(ctx, a) { cuff(ctx, a.J.knF, a.J.ftF, 0.55, 0.95, legW(a.rig) + 2.2, a.pal.feet); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.35); }
  };

  /* Nyx · Gata Sombra: vendas ninja, faja rosa, kunai y ojos brillantes. */
  D.nyx = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      for (let i = 0; i < 5; i++) line(ctx, [[-r.torsoW * 0.6, -r.torsoH * (0.2 + i * 0.17)], [r.torsoW * 0.6, -r.torsoH * (0.1 + i * 0.17)]], 'rgba(255,255,255,.07)', 1.6);
      ctx.restore();
      line(ctx, [[-r.hipW * 0.5, -3.5], [r.hipW * 0.5, -4.5]], a.pal.accent, 2.6);
      ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.moveTo(-r.hipW * 0.35, -5); ctx.lineTo(-r.hipW * 0.25, -12); ctx.lineTo(-r.hipW * 0.15, -5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
    },
    armFront(ctx, a) { wraps(ctx, a.J.elF, a.J.haF, 0.3, 0.9, armW(a.rig) + 1, 'rgba(255,255,255,.18)', 4); },
    legFront(ctx, a) { wraps(ctx, a.J.knF, a.J.ftF, 0.3, 0.85, legW(a.rig) + 1, 'rgba(255,255,255,.16)', 4); },
    head(ctx, a) { const Rh = a.rig.headR; glow(ctx, Rh * 0.22, -Rh * 0.08, Rh * 0.85, '#ffe14d', 0.28 * pulse(a.f, 0.07)); }
  };

  /* Medu · Medusa Abisal: campana translúcida, brillos y burbujas. */
  D.medu = {
    torso(ctx, a) {
      const r = a.rig, B = r.blobR, t = a.f.tick || 0;
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, B * 1.04, B * 0.98, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, B * 0.9, B * (0.55 + i * 0.22), PI * 1.15, PI * 1.85); ctx.stroke(); }
      glow(ctx, -B * 0.1, B * 0.15, B * 0.7 * pulse(a.f, 0.05, 0.75), '#ff7ae0', 0.25);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(B * 0.35, -B * 0.55, B * 0.32, B * 0.12, -0.45, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(B * 0.68, -B * 0.25, B * 0.06, 0, TAU); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const k = ((t * 0.012 + i * 0.27) % 1);
        ctx.strokeStyle = `rgba(220,245,255,${0.6 * (1 - k)})`; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(-B * 0.7 + i * B * 0.45 + Math.sin(t * 0.05 + i) * 2, -B * 0.9 - k * B * 1.1, 1.5 + i * 0.4, 0, TAU); ctx.stroke();
      }
    }
  };

  /* Valkyr-7 · Guardiana Autómata: líneas de panel, núcleo, rótulas y destello del visor. */
  D.valkyr = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      crease(ctx, [[0, -r.torsoH], [0, -r.torsoH * 0.35], [-r.hipW * 0.4, -2]], 0.3);
      crease(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.62], [r.torsoW * 0.5, -r.torsoH * 0.62]], 0.25);
      ctx.restore();
      const k = pulse(a.f, 0.09);
      glow(ctx, r.torsoW * 0.16, -r.torsoH * 0.72, 9 * k, a.pal.accent, 0.6);
      R.orb(ctx, r.torsoW * 0.16, -r.torsoH * 0.72, 2.6, '#bff2ff');
      [[-0.38, -0.9], [0.4, -0.9], [-0.36, -0.2], [0.36, -0.2]].forEach(([x, y]) => rivet(ctx, tw(r, r.torsoH * y) * x, r.torsoH * y, 0.9, '#c9d2de'));
    },
    armFront(ctx, a) { R.orb(ctx, a.J.elF.x, a.J.elF.y, a.rig.armW * 0.42, a.pal.secondary); cuff(ctx, a.J.elF, a.J.haF, 0.7, 0.92, armW(a.rig) + 2.4, a.pal.primary); },
    legFront(ctx, a) { kneePad(ctx, a.J, 'F', a.rig.legW * 0.48, a.pal.secondary); glow(ctx, a.J.knF.x + 1, a.J.knF.y, 4, a.pal.accent, 0.5); },
    limbsBack(ctx, a) { kneePad(ctx, a.J, 'B', a.rig.legW * 0.45, T(a.pal.secondary, -0.3)); },
    head(ctx, a) { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.35, -Rh * 0.12, Rh, Rh * 0.56); }
  };

  /* Jett · Piloto Ígnea: cremallera, insignia de llama, guantes y propulsores encendidos. */
  D.jett = {
    torso(ctx, a) {
      const r = a.rig;
      line(ctx, [[r.torsoW * 0.1, -r.torsoH + 1], [r.hipW * 0.08, -6]], 'rgba(10,0,30,.45)', 1);
      for (let y = -r.torsoH + 3; y < -7; y += 2.2) line(ctx, [[r.torsoW * 0.1 - 1, y], [r.torsoW * 0.1 + 1, y]], '#e8e8e8', 0.6);
      ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.28, -r.torsoH * 0.55); ctx.quadraticCurveTo(-r.torsoW * 0.36, -r.torsoH * 0.72, -r.torsoW * 0.22, -r.torsoH * 0.88);
      ctx.quadraticCurveTo(-r.torsoW * 0.18, -r.torsoH * 0.72, -r.torsoW * 0.1, -r.torsoH * 0.78); ctx.quadraticCurveTo(-r.torsoW * 0.08, -r.torsoH * 0.6, -r.torsoW * 0.28, -r.torsoH * 0.55); ctx.fill();
      collar(ctx, r, T(a.pal.primary, -0.25), 5);
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.75, 0.97, armW(a.rig) + 2.8, a.pal.hand); },
    legFront(ctx, a) {
      const J = a.J, f = a.f, k = 0.6 + 0.4 * Math.sin((f.tick || 0) * 0.6);
      cuff(ctx, J.knF, J.ftF, 0.62, 0.9, legW(a.rig) + 2.6, '#3a3a44');
      if (!f.ground || f.state === NX.ST.AIR) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,170,50,${0.75 * k})`; ctx.beginPath(); ctx.moveTo(J.ftF.x - 3, J.ftF.y + 2); ctx.lineTo(J.ftF.x + 3, J.ftF.y + 2); ctx.lineTo(J.ftF.x, J.ftF.y + 9 + 5 * k); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else glow(ctx, J.ftF.x + 2, J.ftF.y + 2, 5, '#ffb030', 0.35 * k);
    }
  };

  /* Grizzla · Osa Luchadora: cinturón de campeona, pelaje en hombros y vendas. */
  D.grizzla = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(r.hipW * 0.08, -4, 7, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff2a8'; ctx.beginPath(); ctx.ellipse(r.hipW * 0.06, -5.2, 4.2, 2.2, 0, 0, TAU); ctx.fill();
      star(ctx, r.hipW * 0.08, -4, 2.6, '#c8202a', 5);
      ctx.save(); clipTorso(ctx, r); furStrokes(ctx, r, 'rgba(255,255,255,.12)', 11, 10);
      ctx.fillStyle = T(a.pal.skin, 0.05);
      [[-0.42, -0.98], [0.4, -0.98]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(r.torsoW * x, r.torsoH * y, 6, 3.4, 0, 0, TAU); ctx.fill(); });
      ctx.restore();
    },
    armFront(ctx, a) { wraps(ctx, a.J.elF, a.J.haF, 0.7, 0.98, armW(a.rig) + 1.5, '#f2f2f2', 3); },
    head(ctx, a) {
      const Rh = a.rig.headR; ctx.save(); clipHead(ctx, a.rig);
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const ang = PI * 1.1 + i * 0.16; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * Rh * 0.7, Math.sin(ang) * Rh * 0.7); ctx.lineTo(Math.cos(ang) * Rh * 0.95, Math.sin(ang) * Rh * 0.95); ctx.stroke(); }
      ctx.restore();
    }
  };

  /* Zephyr · Liebre del Vendaval: chaleco con cremallera, franja de carreras y muñequera. */
  D.zephyr = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.save(); clipTorso(ctx, r);
      ctx.fillStyle = '#7affd6'; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.55, r.torsoW, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-r.torsoW * 0.5, -r.torsoH * 0.55 + 2.4, r.torsoW, 1);
      ctx.restore();
      line(ctx, [[r.torsoW * 0.12, -r.torsoH + 1], [r.hipW * 0.1, -2]], 'rgba(10,0,30,.4)', 0.9);
      ctx.fillStyle = '#d8dde4'; ctx.fillRect(r.torsoW * 0.12 - 1, -r.torsoH * 0.82, 2, 3);
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.72, 0.9, armW(a.rig) + 2.6, a.pal.accent); },
    front(ctx, a) {
      const f = a.f; if (f.state !== NX.ST.RUN && f.state !== NX.ST.DASH) return;
      ctx.strokeStyle = 'rgba(122,255,214,.45)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { const y = -20 - i * 14; ctx.beginPath(); ctx.moveTo(-18 - i * 4, y); ctx.lineTo(-34 - i * 6, y + 2); ctx.stroke(); }
    }
  };

  /* Aria Solenne · Espada Resonante: doble botonadura, nota musical y charretera. */
  D.aria = {
    torso(ctx, a) {
      const r = a.rig;
      for (let i = 0; i < 3; i++) { const y = -r.torsoH * (0.82 - i * 0.2); button(ctx, -r.torsoW * 0.06, y, 1.1, '#e8c35a'); button(ctx, r.torsoW * 0.24, y, 1.1, '#e8c35a'); }
      ctx.fillStyle = a.pal.accent; ctx.beginPath(); ctx.ellipse(-r.torsoW * 0.3, -r.torsoH * 0.48, 1.6, 1.2, -0.4, 0, TAU); ctx.fill();
      line(ctx, [[-r.torsoW * 0.3 + 1.4, -r.torsoH * 0.48], [-r.torsoW * 0.3 + 1.4, -r.torsoH * 0.72], [-r.torsoW * 0.3 + 3.4, -r.torsoH * 0.66]], a.pal.accent, 0.9);
      collar(ctx, r, a.pal.secondary, 4);
    },
    armFront(ctx, a) {
      const s = a.J.shF;
      ctx.fillStyle = '#e8c35a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(s.x, s.y - 1, a.rig.armW * 0.75, a.rig.armW * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = -1; i <= 1; i++) line(ctx, [[s.x + i * 2, s.y + 2], [s.x + i * 2.2, s.y + 5]], '#e8c35a', 0.9);
      cuff(ctx, a.J.elF, a.J.haF, 0.7, 0.85, armW(a.rig) + 2.2, a.pal.secondary);
    },
    head(ctx, a) { hairShine(ctx, a.rig, 0.45); }
  };

  /* Morgrath · Segador Espectral: runas que laten, broche de calavera y bajo desgarrado. */
  D.morgrath = {
    torso(ctx, a) {
      const r = a.rig, k = pulse(a.f, 0.06, 0.4);
      ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = a.pal.accent; ctx.lineWidth = 0.9;
      const rs = [[-0.2, -0.35], [0.12, -0.55], [-0.08, -0.15]];
      rs.forEach(([x, y]) => { const cx = r.torsoW * x, cy = r.torsoH * y; ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3); ctx.moveTo(cx - 2, cy - 1); ctx.lineTo(cx + 2, cy + 1); ctx.stroke(); });
      ctx.restore();
      glow(ctx, r.torsoW * 0.1, -r.torsoH * 0.4, 8 * k, a.pal.accent, 0.3);
      const sx = r.torsoW * 0.15, sy = -r.torsoH * 0.88;
      ctx.fillStyle = '#e8e4d8'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(sx - 1.4, sy + 1.4, 2.8, 1.8);
      ctx.fillStyle = '#151219'; ctx.fillRect(sx - 1.5, sy - 0.6, 1.1, 1.1); ctx.fillRect(sx + 0.4, sy - 0.6, 1.1, 1.1);
      ctx.fillStyle = a.pal.secondary;
      for (let i = 0; i < 5; i++) { const x = -r.hipW * 0.6 + i * r.hipW * 0.3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + r.hipW * 0.15, 0); ctx.lineTo(x + r.hipW * 0.07, 4 + (i % 2) * 3); ctx.closePath(); ctx.fill(); }
    },
    head(ctx, a) { const Rh = a.rig.headR; glow(ctx, Rh * 0.3, -Rh * 0.08, Rh * 0.9, a.pal.accent, 0.3 * pulse(a.f, 0.06)); }
  };

  /* Brakk · Gladiador de Hierro: correas cruzadas con remaches, brazal y grebas. */
  D.brakk = {
    torso(ctx, a) {
      const r = a.rig;
      line(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.95], [r.hipW * 0.45, -4]], '#5a3a20', 3);
      line(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.95], [r.hipW * 0.45, -4]], 'rgba(255,255,255,.15)', 0.8);
      [0.2, 0.45, 0.7].forEach(t => rivet(ctx, -r.torsoW * 0.5 + (r.hipW * 0.45 + r.torsoW * 0.5) * t, -r.torsoH * 0.95 + (r.torsoH * 0.95 - 4) * t, 1, '#c0c4cc'));
      crease(ctx, [[-r.torsoW * 0.1, -r.torsoH * 0.62], [r.torsoW * 0.02, -r.torsoH * 0.58]], 0.3);
      line(ctx, [[r.torsoW * 0.28, -r.torsoH * 0.82], [r.torsoW * 0.36, -r.torsoH * 0.7]], 'rgba(255,210,190,.55)', 0.9);
    },
    armFront(ctx, a) {
      const J = a.J, r = a.rig;
      cuff(ctx, J.elF, J.haF, 0.35, 0.92, armW(r) + 3, '#a8adb6');
      [0.45, 0.8].forEach(t => { const p = at(J.elF, J.haF, t); rivet(ctx, p.x, p.y, 1, '#e0e0e0'); });
    },
    legFront(ctx, a) { cuff(ctx, a.J.knF, a.J.ftF, 0.2, 0.8, legW(a.rig) + 3, '#a8adb6'); kneePad(ctx, a.J, 'F', a.rig.legW * 0.46, '#8a909a'); },
    limbsBack(ctx, a) { cuff(ctx, a.J.knB, a.J.ftB, 0.2, 0.8, legW(a.rig) + 3, T('#a8adb6', -0.3)); }
  };

  /* Luma · Farolera de Ascuas: bordado de llamas, faja y ascuas que suben. */
  D.luma = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.save(); clipTorso(ctx, r);
      ctx.strokeStyle = 'rgba(255,184,74,.45)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const x = -r.hipW * 0.35 + i * r.hipW * 0.32; ctx.beginPath(); ctx.moveTo(x, -1); ctx.quadraticCurveTo(x - 2, -5, x + 1, -9); ctx.quadraticCurveTo(x + 2, -5, x + 3, -1); ctx.stroke(); }
      ctx.restore();
      line(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.38], [r.torsoW * 0.5, -r.torsoH * 0.42]], a.pal.accent, 2);
    },
    head(ctx, a) { hairShine(ctx, a.rig, 0.35); },
    front(ctx, a) {
      const t = a.f.tick || 0, h = a.J.haF;
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.015 + i * 0.33) % 1;
        ctx.fillStyle = `rgba(255,${150 + 80 * (1 - k)},60,${0.8 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(h.x + Math.sin(t * 0.07 + i * 2) * 4, h.y - 6 - k * 22, 1.3 * (1 - k) + 0.4, 0, TAU); ctx.fill();
      }
    }
  };

  /* Kael · Mente Psiónica: circuitos psíquicos que laten, gema en la frente. */
  D.kael = {
    torso(ctx, a) {
      const r = a.rig, k = pulse(a.f, 0.08, 0.35);
      ctx.save(); ctx.globalAlpha *= k; clipTorso(ctx, r);
      line(ctx, [[-r.torsoW * 0.2, -r.torsoH], [-r.torsoW * 0.2, -r.torsoH * 0.6], [r.torsoW * 0.1, -r.torsoH * 0.45], [r.torsoW * 0.1, -6]], a.pal.secondary, 1.1);
      line(ctx, [[r.torsoW * 0.3, -r.torsoH], [r.torsoW * 0.3, -r.torsoH * 0.75], [r.torsoW * 0.05, -r.torsoH * 0.6]], a.pal.secondary, 1.1);
      ctx.fillStyle = a.pal.secondary; [[r.torsoW * 0.1, -6], [r.torsoW * 0.05, -r.torsoH * 0.6]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); });
      ctx.restore();
    },
    head(ctx, a) { const Rh = a.rig.headR; R.orb(ctx, Rh * 0.45, -Rh * 0.62, Rh * 0.13, '#e8c35a'); glow(ctx, Rh * 0.45, -Rh * 0.62, Rh * 0.5, '#2fd8c8', 0.45 * pulse(a.f, 0.08)); },
    armFront(ctx, a) { const p = at(a.J.elF, a.J.haF, 0.9); glow(ctx, p.x, p.y, 6, a.pal.secondary, 0.35 * pulse(a.f, 0.1)); }
  };

  /* Volgur · Señor de la Forja: delantal quemado con remaches, hollín y guantes. */
  D.volgur = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.fillStyle = a.pal.secondary; ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.22, -r.torsoH * 0.82); ctx.lineTo(r.torsoW * 0.38, -r.torsoH * 0.82); ctx.lineTo(r.hipW * 0.44, 6); ctx.lineTo(-r.hipW * 0.2, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.3)'; [[0.1, -0.5, 2.4], [0.25, -0.25, 1.6], [-0.05, -0.15, 1.8]].forEach(([x, y, s]) => { ctx.beginPath(); ctx.arc(r.torsoW * x, r.torsoH * y, s, 0, TAU); ctx.fill(); });
      [[-0.18, -0.78], [0.34, -0.78]].forEach(([x, y]) => rivet(ctx, r.torsoW * x, r.torsoH * y, 1.3, '#d4823a'));
      line(ctx, [[-r.torsoW * 0.18, -r.torsoH * 0.82], [-r.torsoW * 0.32, -r.torsoH]], '#3a2a1e', 2); line(ctx, [[r.torsoW * 0.34, -r.torsoH * 0.82], [r.torsoW * 0.42, -r.torsoH]], '#3a2a1e', 2);
      glow(ctx, r.torsoW * 0.1, -r.torsoH * 0.2, 10 * pulse(a.f, 0.05), '#ff8a2a', 0.18);
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.55, 0.95, armW(a.rig) + 3.6, '#5a3a26'); line(ctx, [[at(a.J.elF, a.J.haF, 0.56).x, at(a.J.elF, a.J.haF, 0.56).y], [at(a.J.elF, a.J.haF, 0.58).x, at(a.J.elF, a.J.haF, 0.58).y]], '#d4823a', armW(a.rig) + 3.6, 'butt'); },
    head(ctx, a) { const Rh = a.rig.headR; ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(Rh * 0.55, Rh * 0.35, Rh * 0.22, Rh * 0.12, 0.3, 0, TAU); ctx.fill(); }
  };

  /* Chronia · Relojera: esfera de reloj con agujas reales, cadena y monóculo. */
  D.chronia = {
    torso(ctx, a) {
      const r = a.rig, cx = r.torsoW * 0.12, cy = -r.torsoH * 0.62, rr = 4.2;
      ctx.fillStyle = '#f5edd8'; ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#24304a'; for (let i = 0; i < 12; i++) { const ang = i * TAU / 12; ctx.fillRect(cx + Math.cos(ang) * rr * 0.78 - 0.3, cy + Math.sin(ang) * rr * 0.78 - 0.3, 0.6, 0.6); }
      const d = new Date(), hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * TAU - PI / 2, mn = d.getMinutes() / 60 * TAU - PI / 2;
      line(ctx, [[cx, cy], [cx + Math.cos(hr) * rr * 0.45, cy + Math.sin(hr) * rr * 0.45]], '#24304a', 0.9);
      line(ctx, [[cx, cy], [cx + Math.cos(mn) * rr * 0.7, cy + Math.sin(mn) * rr * 0.7]], '#24304a', 0.6);
      const sc = (a.f.tick || 0) * 0.05; line(ctx, [[cx, cy], [cx + Math.cos(sc) * rr * 0.75, cy + Math.sin(sc) * rr * 0.75]], '#c8202a', 0.4);
      ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 0.8; ctx.setLineDash([1, 0.8]);
      ctx.beginPath(); ctx.moveTo(cx - rr, cy); ctx.quadraticCurveTo(-r.torsoW * 0.3, -r.torsoH * 0.35, -r.hipW * 0.35, -5); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) button(ctx, -r.torsoW * 0.18, -r.torsoH * (0.85 - i * 0.25), 1, '#c9a04a');
    },
    head(ctx, a) { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.38, -Rh * 0.08, Rh * 0.45, Rh * 0.45); hairShine(ctx, a.rig, 0.35); }
  };

  /* Hexa · Caballero Avispa: segmentos de armadura con brillo y brazales. */
  D.hexa = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      for (let i = 1; i < 5; i++) crease(ctx, [[-r.torsoW * 0.6, -r.torsoH * i / 5], [r.torsoW * 0.6, -r.torsoH * i / 5 - 1.5]], 0.35);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(r.torsoW * 0.18, -r.torsoH, 2.5, r.torsoH);
      ctx.restore();
    },
    armFront(ctx, a) { [0.3, 0.6, 0.9].forEach(t => cuff(ctx, a.J.elF, a.J.haF, t - 0.06, t + 0.06, armW(a.rig) + 1.6, t === 0.6 ? '#1b1b1b' : a.pal.primary)); },
    head(ctx, a) { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.35, -Rh * 0.12, Rh, Rh * 0.5); }
  };

  /* Kumo · Acechadora Arácnida: telaraña tenue, ojos extra y franjas. */
  D.kumo = {
    torso(ctx, a) {
      const r = a.rig, cx = -r.torsoW * 0.1, cy = -r.torsoH * 0.55;
      ctx.save(); clipTorso(ctx, r); ctx.strokeStyle = 'rgba(220,210,240,.18)'; ctx.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) { const ang = i * TAU / 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 20, cy + Math.sin(ang) * 20); ctx.stroke(); }
      [4, 8, 12].forEach(rr => { ctx.beginPath(); for (let i = 0; i <= 6; i++) { const ang = i * TAU / 6; ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); } ctx.stroke(); });
      ctx.restore();
    },
    head(ctx, a) {
      const Rh = a.rig.headR, k = pulse(a.f, 0.09);
      [[0.22, -0.52, 0.075], [0.46, -0.5, 0.065], [0.66, -0.38, 0.05]].forEach(([x, y, rr]) => {
        ctx.fillStyle = '#14101c'; ctx.beginPath(); ctx.arc(Rh * x, Rh * y, Rh * rr * 1.5, 0, TAU); ctx.fill();
        ctx.fillStyle = a.pal.accent; ctx.globalAlpha *= 0.7 + 0.3 * k; ctx.beginPath(); ctx.arc(Rh * x, Rh * y, Rh * rr, 0, TAU); ctx.fill(); ctx.globalAlpha /= 0.7 + 0.3 * k;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Rh * (x + rr * 0.4), Rh * (y - rr * 0.4), Rh * rr * 0.35, 0, TAU); ctx.fill();
      });
    },
    legFront(ctx, a) { [0.3, 0.6].forEach(t => cuff(ctx, a.J.knF, a.J.ftF, t, t + 0.08, legW(a.rig) + 1.2, '#14101c')); }
  };

  /* Ritmo · Capoeira: corda de colores con borlas, muñequeras y franja en el abadá. */
  D.ritmo = {
    torso(ctx, a) {
      const r = a.rig, t = a.f.tick || 0, sw = Math.sin(t * 0.14) * 1.4;
      ctx.save(); clipTorso(ctx, r); ctx.fillStyle = '#ffd23a'; ctx.fillRect(-r.torsoW, -r.torsoH * 0.7, r.torsoW * 2, 1.6); ctx.restore();
      const cols = ['#1aa36a', '#ffd23a', '#2d7fd6'];
      cols.forEach((c, i) => line(ctx, [[-r.hipW * 0.5, -5 + i * 1.3], [r.hipW * 0.5, -5.4 + i * 1.3]], c, 1.3));
      line(ctx, [[r.hipW * 0.25, -4], [r.hipW * 0.2 + sw, 4], [r.hipW * 0.12 + sw * 1.5, 9]], '#ffd23a', 1.3);
      line(ctx, [[r.hipW * 0.3, -4], [r.hipW * 0.38 + sw, 3], [r.hipW * 0.36 + sw * 1.5, 8]], '#1aa36a', 1.3);
      R.orb(ctx, r.hipW * 0.12 + sw * 1.5, 10, 1.6, '#ffd23a'); R.orb(ctx, r.hipW * 0.36 + sw * 1.5, 9, 1.6, '#1aa36a');
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.75, 0.9, armW(a.rig) + 2.4, '#ffd23a'); },
    legFront(ctx, a) { line(ctx, [[a.J.hipF.x + 2, a.J.hipF.y], [a.J.knF.x + 2, a.J.knF.y], [a.J.ftF.x + 1.5, a.J.ftF.y - 3]], 'rgba(26,163,106,.7)', 1.2); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.3); }
  };

  /* Volta · Inventora Galvánica: bolsillo con bolígrafos, gafete y chispas en el pelo. */
  D.volta = {
    torso(ctx, a) {
      const r = a.rig;
      line(ctx, [[r.torsoW * 0.05, -r.torsoH], [r.torsoW * 0.18, -r.torsoH * 0.55], [r.hipW * 0.15, -2]], 'rgba(10,0,30,.3)', 1);
      pocket(ctx, -r.torsoW * 0.32, -r.torsoH * 0.72, r.torsoW * 0.28, r.torsoH * 0.2, a.pal.primary);
      line(ctx, [[-r.torsoW * 0.26, -r.torsoH * 0.72], [-r.torsoW * 0.26, -r.torsoH * 0.82]], '#2d7fd6', 1.2);
      line(ctx, [[-r.torsoW * 0.16, -r.torsoH * 0.72], [-r.torsoW * 0.16, -r.torsoH * 0.8]], '#d62a2a', 1.2);
      ctx.fillStyle = '#5fd0ff'; ctx.fillRect(r.torsoW * 0.22, -r.torsoH * 0.5, 4, 5); ctx.strokeStyle = OUT; ctx.lineWidth = 0.6; ctx.strokeRect(r.torsoW * 0.22, -r.torsoH * 0.5, 4, 5);
      ctx.fillStyle = '#fff'; ctx.fillRect(r.torsoW * 0.22 + 0.8, -r.torsoH * 0.5 + 3, 2.4, 0.8);
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.75, 0.97, armW(a.rig) + 2.8, '#c87a3a'); },
    head(ctx, a) {
      const Rh = a.rig.headR, t = a.f.tick || 0;
      if ((t % 50) < 14) {
        ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 1;
        const x0 = -Rh * 0.6 + ((t / 50 | 0) % 3) * Rh * 0.5;
        ctx.beginPath(); ctx.moveTo(x0, -Rh * 1.2); ctx.lineTo(x0 + 2, -Rh * 1.45); ctx.lineTo(x0 - 1, -Rh * 1.55); ctx.lineTo(x0 + 2.5, -Rh * 1.85); ctx.stroke();
        glow(ctx, x0, -Rh * 1.5, 6, '#5fd0ff', 0.5);
      }
    }
  };

  /* Torva · Baluarte: emblema de torre en el tabardo, remaches, hombrera y rodilleras. */
  D.torva = {
    torso(ctx, a) {
      const r = a.rig, cx = -r.torsoW * 0.14, cy = -r.torsoH * 0.55;
      ctx.fillStyle = a.pal.accent; ctx.strokeStyle = OUT; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx - 3.5, cy + 4.5); ctx.lineTo(cx - 3, cy - 2.5); ctx.lineTo(cx - 3.6, cy - 2.5); ctx.lineTo(cx - 3.6, cy - 5);
      [-2.2, -0.8, 0.8, 2.2].forEach((x, i) => { ctx.lineTo(cx + x - 0.6, cy - (i % 2 ? 4 : 5)); ctx.lineTo(cx + x + 0.6, cy - (i % 2 ? 4 : 5)); });
      ctx.lineTo(cx + 3.6, cy - 5); ctx.lineTo(cx + 3.6, cy - 2.5); ctx.lineTo(cx + 3, cy - 2.5); ctx.lineTo(cx + 3.5, cy + 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = a.pal.secondary; ctx.fillRect(cx - 0.9, cy + 1.5, 1.8, 3);
      [[-0.42, -0.9], [0.42, -0.9], [-0.42, -0.25], [0.42, -0.25]].forEach(([x, y]) => rivet(ctx, tw(r, r.torsoH * y) * x, r.torsoH * y, 1, '#d8dde4'));
    },
    armFront(ctx, a) {
      const s = a.J.shF, r = a.rig;
      ctx.fillStyle = a.pal.primary; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, r.armW * 0.95, r.armW * 0.7, -0.2, PI, TAU); ctx.lineTo(s.x + r.armW * 0.95, s.y + 4); ctx.lineTo(s.x - r.armW * 0.95, s.y + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(s.x - 1, s.y - r.armW * 0.5, r.armW * 0.6, 1.2);
      rivet(ctx, s.x - r.armW * 0.4, s.y + 1, 0.9, '#d8dde4');
      cuff(ctx, a.J.elF, a.J.haF, 0.68, 0.95, armW(r) + 3, a.pal.hand);
    },
    legFront(ctx, a) { kneePad(ctx, a.J, 'F', a.rig.legW * 0.55, a.pal.primary); },
    limbsBack(ctx, a) { kneePad(ctx, a.J, 'B', a.rig.legW * 0.5, T(a.pal.primary, -0.3)); },
    head(ctx, a) { const Rh = a.rig.headR; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-Rh * 0.6, -Rh * 0.72, Rh * 0.9, 1.4); }
  };

  /* Bestias de Nia. */
  D.nia_brisa = {
    torso(ctx, a) { const r = a.rig; ctx.save(); clipTorso(ctx, r); furStrokes(ctx, r, 'rgba(120,90,50,.25)', 4, 12); ctx.restore(); line(ctx, [[-r.torsoW * 0.5, -r.torsoH * 0.95], [r.torsoW * 0.5, -r.torsoH * 0.9]], a.pal.secondary, 3); },
    head(ctx, a) { const Rh = a.rig.headR; ctx.fillStyle = 'rgba(120,90,50,.25)'; ctx.beginPath(); ctx.ellipse(-Rh * 0.2, -Rh * 0.6, Rh * 0.5, Rh * 0.18, -0.3, 0, TAU); ctx.fill(); }
  };
  D.nia_terro = {
    torso(ctx, a) { const r = a.rig; ctx.save(); clipTorso(ctx, r); speckle(ctx, r, 10, ['rgba(0,0,0,.12)'], 9, 1.2); ctx.restore(); },
    limbsBack(ctx, a) { },
    head(ctx, a) { const Rh = a.rig.headR; ctx.save(); clipHead(ctx, a.rig); for (let i = 0; i < 3; i++) crease(ctx, [[-Rh, -Rh * 0.6 + i * Rh * 0.3], [-Rh * 0.3, -Rh * 0.75 + i * Rh * 0.3]], 0.3); ctx.restore(); }
  };
  D.nia_rescoldo = {
    torso(ctx, a) {
      const r = a.rig, k = pulse(a.f, 0.07, 0.5);
      ctx.save(); clipTorso(ctx, r); ctx.globalAlpha *= k;
      line(ctx, [[-r.torsoW * 0.4, -r.torsoH * 0.2], [-r.torsoW * 0.15, -r.torsoH * 0.35], [-r.torsoW * 0.25, -r.torsoH * 0.6], [0, -r.torsoH * 0.75]], '#ff8a1a', 1.4);
      line(ctx, [[r.torsoW * 0.35, -r.torsoH * 0.15], [r.torsoW * 0.2, -r.torsoH * 0.4]], '#ffb02e', 1.1);
      ctx.restore();
      glow(ctx, -r.torsoW * 0.15, -r.torsoH * 0.45, 12 * k, '#ff6a1a', 0.3);
    },
    armFront(ctx, a) { const p = at(a.J.shF, a.J.elF, 0.5); glow(ctx, p.x, p.y, 5, '#ff6a1a', 0.45 * pulse(a.f, 0.07)); line(ctx, [[p.x - 2, p.y - 2], [p.x + 1, p.y + 2]], '#ffb02e', 1); },
    head(ctx, a) { const Rh = a.rig.headR; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(Rh * 0.6, -Rh * 0.6, Rh * 0.4, PI * 1.1, PI * 1.5); ctx.stroke(); }
  };

  /* Sol y Luna. */
  D.eclipse_sol = {
    torso(ctx, a) {
      const r = a.rig, cx = -r.torsoW * 0.14, cy = -r.torsoH * 0.64;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((a.f.tick || 0) * 0.01);
      star(ctx, 0, 0, 4.6, '#e8a83a', 8); ctx.restore();
      R.orb(ctx, cx, cy, 2.2, '#ffd23a');
      ctx.save(); clipTorso(ctx, r); ctx.fillStyle = '#e8a83a'; ctx.fillRect(-r.torsoW, -r.torsoH + 1, r.torsoW * 2, 1.4); ctx.restore();
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.7, 0.92, armW(a.rig) + 2.6, '#e8a83a'); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.3); }
  };
  D.eclipse_luna = {
    torso(ctx, a) {
      const r = a.rig;
      crescent(ctx, -r.torsoW * 0.16, -r.torsoH * 0.64, 3.6, '#c8b0ff');
      ctx.fillStyle = '#fff'; star(ctx, -r.torsoW * 0.02, -r.torsoH * 0.8, 1.3, '#ffffff', 4, 0);
      ctx.save(); clipTorso(ctx, r); ctx.fillStyle = '#7a5ac8'; ctx.fillRect(-r.torsoW, -r.torsoH + 1, r.torsoW * 2, 1.4); ctx.restore();
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.7, 0.92, armW(a.rig) + 2.6, '#c8b0ff'); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.45); }
  };

  /* Haldor · Mercenario del Alba: cuello de piel, correas, bolsas y brazales. */
  D.haldor = {
    torso(ctx, a) {
      const r = a.rig;
      line(ctx, [[r.torsoW * 0.5, -r.torsoH * 0.95], [-r.hipW * 0.45, -4]], '#5a3a22', 2.6);
      ctx.fillStyle = '#8a6a4a'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.7;
      [[-0.42, -9], [0.3, -9]].forEach(([x, y]) => { ctx.beginPath(); ctx.rect(r.hipW * x, y, 4, 4.5); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = '#d8c8a8';
      for (let i = 0; i < 7; i++) { const x = -r.torsoW * 0.5 + i * r.torsoW / 6; ctx.beginPath(); ctx.ellipse(x, -r.torsoH + 1, 3, 2.4, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(120,90,60,.5)'; ctx.lineWidth = 0.7;
      for (let i = 0; i < 7; i++) { const x = -r.torsoW * 0.5 + i * r.torsoW / 6; ctx.beginPath(); ctx.moveTo(x, -r.torsoH); ctx.lineTo(x - 0.8, -r.torsoH + 2.4); ctx.stroke(); }
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.45, 0.92, armW(a.rig) + 2.8, '#6a3e22'); wraps(ctx, a.J.elF, a.J.haF, 0.5, 0.88, armW(a.rig) + 2.8, 'rgba(0,0,0,.3)', 3); },
    legFront(ctx, a) { cuff(ctx, a.J.knF, a.J.ftF, 0.55, 0.95, legW(a.rig) + 2.6, '#5a3a22'); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.28); }
  };

  /* Ilyra · Princesa Enmascarada: bordado dorado, broche de gema y puños finos. */
  D.ilyra = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.strokeStyle = '#c9a43a'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.32, -r.torsoH); ctx.quadraticCurveTo(r.torsoW * 0.05, -r.torsoH * 0.6, r.torsoW * 0.36, -r.torsoH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r.hipW * 0.4, -2); ctx.quadraticCurveTo(0, -6, r.hipW * 0.4, -2); ctx.stroke();
      R.orb(ctx, r.torsoW * 0.03, -r.torsoH * 0.72, 1.8, a.pal.accent);
      glow(ctx, r.torsoW * 0.03, -r.torsoH * 0.72, 5, a.pal.accent, 0.4 * pulse(a.f, 0.08));
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.78, 0.9, armW(a.rig) + 2.4, '#c9a43a'); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.35); }
  };

  /* Kestra · Cazadora Orbital: luz de pecho, líneas de panel y anillos del cañón. */
  D.kestra = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      crease(ctx, [[-r.torsoW * 0.2, -r.torsoH], [-r.torsoW * 0.1, -r.torsoH * 0.4], [-r.hipW * 0.5, -2]], 0.3);
      crease(ctx, [[r.torsoW * 0.4, -r.torsoH * 0.45], [-r.torsoW * 0.1, -r.torsoH * 0.4]], 0.3);
      ctx.restore();
      glow(ctx, r.torsoW * 0.2, -r.torsoH * 0.7, 7 * pulse(a.f, 0.09), a.pal.accent, 0.55);
      R.orb(ctx, r.torsoW * 0.2, -r.torsoH * 0.7, 2.2, '#e6ffb8');
    },
    legFront(ctx, a) { kneePad(ctx, a.J, 'F', a.rig.legW * 0.5, '#8a929c'); },
    limbsBack(ctx, a) { kneePad(ctx, a.J, 'B', a.rig.legW * 0.45, '#5a626e'); },
    front(ctx, a) {
      const stored = (a.f.data && a.f.data.stored) || 0;
      if (stored > 0) glow(ctx, a.J.haF.x + 8, a.J.haF.y, 6 + stored * 0.1, a.pal.accent, 0.5);
    },
    head(ctx, a) { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.35, -Rh * 0.1, Rh * 0.9, Rh * 0.45); }
  };

  /* Tamba · Titán de la Selva: pelaje en el torso, mechones en codos y brillo en la frente. */
  D.tamba = {
    torso(ctx, a) { const r = a.rig; ctx.save(); clipTorso(ctx, r); furStrokes(ctx, r, 'rgba(255,255,255,.1)', 21, 18); furStrokes(ctx, r, 'rgba(0,0,0,.18)', 22, 12); ctx.restore(); },
    armFront(ctx, a) {
      const e = a.J.elF; ctx.fillStyle = a.pal.arms; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x - 5, e.y - 2); ctx.lineTo(e.x - 9, e.y + 3); ctx.lineTo(e.x - 4, e.y + 2); ctx.lineTo(e.x - 6, e.y + 6); ctx.lineTo(e.x, e.y + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    },
    head(ctx, a) { const Rh = a.rig.headR; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(Rh * 0.2, -Rh * 0.2, Rh * 0.75, PI * 1.35, PI * 1.7); ctx.stroke(); }
  };

  /* Corvin · Estratega Arcano: botonadura dorada, solapas y ribete. */
  D.corvin = {
    torso(ctx, a) {
      const r = a.rig;
      ctx.fillStyle = T(a.pal.primary, -0.3); ctx.strokeStyle = OUT; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-r.torsoW * 0.2, -r.torsoH); ctx.lineTo(r.torsoW * 0.05, -r.torsoH * 0.6); ctx.lineTo(-r.torsoW * 0.05, -r.torsoH); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r.torsoW * 0.3, -r.torsoH); ctx.lineTo(r.torsoW * 0.1, -r.torsoH * 0.6); ctx.lineTo(r.torsoW * 0.15, -r.torsoH); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) button(ctx, r.torsoW * 0.18, -r.torsoH * (0.55 - i * 0.14), 1, '#e8c35a');
      ctx.save(); clipTorso(ctx, r); ctx.fillStyle = '#e8c35a'; ctx.fillRect(-r.hipW, -2.4, r.hipW * 2, 1); ctx.restore();
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.75, 0.88, armW(a.rig) + 2.6, '#e8c35a'); },
    head(ctx, a) { hairShine(ctx, a.rig, 0.5); }
  };

  /* Gyron-64 · Centinela Retro: rejilla de altavoz, LEDs, óxido y líneas de barrido. */
  D.gyron = {
    torso(ctx, a) {
      const r = a.rig, t = a.f.tick || 0;
      ctx.fillStyle = '#3a4048';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(-r.torsoW * 0.3 + i * 2.6, -r.torsoH * 0.35 + j * 2.6, 0.8, 0, TAU); ctx.fill(); }
      ['#ff3b2a', '#ffd23a', '#2aff7a'].forEach((c, i) => { ctx.fillStyle = ((t >> 4) + i) % 3 === 0 ? c : T(c, -0.6); ctx.beginPath(); ctx.arc(r.torsoW * 0.15 + i * 3, -r.torsoH * 0.85, 1, 0, TAU); ctx.fill(); });
      ctx.save(); clipTorso(ctx, r); speckle(ctx, r, 6, ['rgba(160,80,30,.35)'], 5, 1.4); ctx.restore();
    },
    head(ctx, a) {
      const Rh = a.rig.headR, t = a.f.tick || 0;
      ctx.save(); clipHead(ctx, a.rig); ctx.fillStyle = 'rgba(0,0,0,.08)';
      for (let y = -Rh; y < Rh; y += 2) ctx.fillRect(-Rh * 1.4, y, Rh * 2.8, 0.8);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-Rh * 1.4, -Rh + ((t * 0.6) % (Rh * 2)), Rh * 2.8, 2);
      ctx.restore();
    }
  };

  /* Copete y Flequillo: camisa azul rey con cuello, botones y bolsillo; brillo en lentes. */
  function shirt(ctx, a) {
    const r = a.rig;
    collar(ctx, r, T(a.pal.primary, 0.12), 5);
    placket(ctx, r, '#e8eef8', 4, r.torsoW * 0.1);
    pocket(ctx, -r.torsoW * 0.32, -r.torsoH * 0.78, r.torsoW * 0.26, r.torsoH * 0.18, a.pal.primary);
    crease(ctx, [[-r.torsoW * 0.35, -r.torsoH * 0.35], [-r.torsoW * 0.15, -r.torsoH * 0.2]]);
  }
  const glassesGlint = (ctx, a) => { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.2, -Rh * 0.08, Rh * 1.1, Rh * 0.42); hairShine(ctx, a.rig, 0.28); };
  D.gemelos_copete = { torso: shirt, head: glassesGlint, armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.82, 0.95, armW(a.rig) + 2, T(a.pal.primary, -0.15)); } };
  D.gemelos_flequillo = { torso: shirt, head: glassesGlint, armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.82, 0.95, armW(a.rig) + 2, T(a.pal.primary, -0.15)); } };

  /* BigSimio · Simio del Termo: suéter de punto con trenzas, bajo y puños de canalé. */
  D.bigsimio = {
    torso(ctx, a) {
      const r = a.rig; ctx.save(); clipTorso(ctx, r);
      ctx.strokeStyle = 'rgba(120,110,95,.28)'; ctx.lineWidth = 1;
      [-0.25, 0.1].forEach(x => {
        const cx = r.torsoW * x;
        for (let y = -r.torsoH + 2; y < -6; y += 4) { ctx.beginPath(); ctx.moveTo(cx - 2, y); ctx.quadraticCurveTo(cx, y + 2, cx + 2, y + 4); ctx.moveTo(cx + 2, y); ctx.quadraticCurveTo(cx, y + 2, cx - 2, y + 4); ctx.stroke(); }
      });
      for (let x = -r.hipW * 0.6; x < r.hipW * 0.6; x += 2.2) { ctx.beginPath(); ctx.moveTo(x, -1); ctx.lineTo(x, -6); ctx.stroke(); }
      ctx.restore();
    },
    armFront(ctx, a) {
      cuff(ctx, a.J.elF, a.J.haF, 0.78, 0.97, armW(a.rig) + 2.4, T(a.pal.primary, -0.06));
      wraps(ctx, a.J.elF, a.J.haF, 0.79, 0.96, armW(a.rig) + 2.4, 'rgba(120,110,95,.35)', 4);
    },
    head(ctx, a) { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.2, -Rh * 0.08, Rh * 1.2, Rh * 0.45); hairShine(ctx, a.rig, 0.3); }
  };

  /* Jochis · Tarotista Gamer: camisa con botones y bolsillo con una carta asomando. */
  D.jochis = {
    torso(ctx, a) {
      const r = a.rig;
      collar(ctx, r, T(a.pal.primary, 0.12), 4);
      placket(ctx, r, '#e8d4b8', 3, r.torsoW * 0.1);
      pocket(ctx, -r.torsoW * 0.34, -r.torsoH * 0.74, r.torsoW * 0.28, r.torsoH * 0.2, a.pal.primary);
      ctx.fillStyle = '#2a1846'; ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 0.6;
      ctx.save(); ctx.translate(-r.torsoW * 0.22, -r.torsoH * 0.76); ctx.rotate(-0.25); ctx.fillRect(-1.5, -3.2, 3, 4); ctx.strokeRect(-1.5, -3.2, 3, 4); ctx.restore();
    },
    armFront(ctx, a) { cuff(ctx, a.J.elF, a.J.haF, 0.82, 0.95, armW(a.rig) + 2, T(a.pal.primary, -0.15)); },
    head(ctx, a) { const Rh = a.rig.headR; lensGlint(ctx, a.f, Rh * 0.2, -Rh * 0.08, Rh * 1.1, Rh * 0.42); hairShine(ctx, a.rig, 0.32); }
  };

  /* ----------------------------- REGISTRO --------------------------------- */
  const all = [];
  NX.ROSTER.forEach(d => { if (d.forms) d.forms.forEach(f => all.push(f)); else all.push(d); });
  all.forEach(d => { if (D[d.id]) d.details = D[d.id]; });
  NX.FighterDetails = D;
})(window.NX = window.NX || {});
