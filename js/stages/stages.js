/* ==========================================================================
 * NEXUS CLASH — js/stages/stages.js
 * Tres escenarios competitivos originales, sin hazards ni objetos:
 *   1. Ciudadela Trina  — plataforma principal + 3 flotantes en triángulo.
 *   2. Abismo Estelar   — plataforma plana con fondo espacial animado.
 *   3. Santuario Gemelo — plataforma principal + 2 flotantes laterales.
 *   4. Muelle Celeste   — principal + 1 plataforma móvil (v3).
 *   5. Pico Escarchado  — principal + 2 bajas laterales + 1 alta (v3).
 * Cada escenario define plataformas (colisión), Blast Zones, límites de
 * cámara, puntos de aparición/reaparición y su dibujo procedural.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U, TAU = Math.PI * 2, PI = Math.PI;
  const OUT = '#14121a';

  /* Plataforma principal con base escalonada (solo la losa superior tiene bordes). */
  function mainSolids(x, y, w, steps) {
    const out = [{ x, y, w, h: 44, type: 'solid', main: true }];
    let yy = y + 44, inset = 0;
    (steps || [50, 80]).forEach((s, i) => {
      inset += s;
      const h = i === 0 ? 50 : 70;
      out.push({ x: x + inset, y: yy, w: w - inset * 2, h, type: 'solid', ledges: false, base: true });
      yy += h;
    });
    return out;
  }

  /* Generador pseudoaleatorio determinista (fondos estables entre frames). */
  function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const par = (cam, k) => ({ x: -cam.x * k * cam.zoom, y: -cam.y * k * cam.zoom });

  /* Silueta de cadena montañosa / islas (screen space). */
  function ridge(ctx, W, H, baseY, amp, seed, color, offX, freq) {
    const r = seeded(seed);
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(r());
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-50, H + 10);
    const span = W + 400, step = span / 24;
    for (let i = 0; i <= 24; i++) {
      const x = -200 + i * step + ((offX % step) + step) % step - step;
      ctx.lineTo(x, baseY - pts[i] * amp - Math.sin(i * (freq || 0.9)) * amp * 0.3);
    }
    ctx.lineTo(W + 50, H + 10); ctx.closePath(); ctx.fill();
  }

  /* Dibujo genérico de una losa de piedra con remate. */
  function slab(ctx, p, top, side, trim, under) {
    ctx.save();
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, side[0]); g.addColorStop(1, side[1]);
    ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = top; ctx.fillRect(p.x, p.y, p.w, 8);
    if (trim) { ctx.fillStyle = trim; ctx.fillRect(p.x, p.y + 8, p.w, 3); }
    if (under) under(ctx, p);
    ctx.restore();
  }

  /* Plataforma atravesable flotante. */
  function floatPlat(ctx, p, col, glow, t) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.05 + p.x);
    const g = ctx.createRadialGradient(p.x + p.w / 2, p.y + 14, 4, p.x + p.w / 2, p.y + 14, p.w * 0.6);
    g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(p.x - 40, p.y - 20, p.w + 80, 80);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col[0]; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y); ctx.lineTo(p.x + p.w - 14, p.y + 16); ctx.lineTo(p.x + 14, p.y + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col[1]; ctx.fillRect(p.x + 2, p.y, p.w - 4, 4);
    ctx.restore();
  }

  /* ==================== 1 · CIUDADELA TRINA ============================== */
  const ciuRand = seeded(77);
  const ciuClouds = Array.from({ length: 9 }, () => ({ x: ciuRand() * 2400, y: ciuRand() * 0.5, s: 0.6 + ciuRand() * 0.9, v: 0.1 + ciuRand() * 0.25 }));
  const ciudadela = {
    id: 'ciudadela', name: 'Ciudadela Trina', desc: 'Principal + 3 plataformas en triángulo',
    platforms: mainSolids(-440, 0, 880).concat([
      { x: -330, y: -140, w: 190, h: 10, type: 'pass' },
      { x: 140, y: -140, w: 190, h: 10, type: 'pass' },
      { x: -95, y: -280, w: 190, h: 10, type: 'pass' }
    ]),
    blast: { left: -1250, right: 1250, top: -1050, bottom: 650 },
    camera: { left: -900, right: 900, top: -760, bottom: 420 },
    spawns: [{ x: -260, y: -10 }, { x: 260, y: -10 }, { x: -110, y: -10 }, { x: 110, y: -10 }],
    respawn: { x: 0, y: -430 },
    drawBackground(ctx, W, H, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2b1b4a'); g.addColorStop(0.45, '#8a3a5a'); g.addColorStop(0.75, '#f28a4a'); g.addColorStop(1, '#ffd08a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sp = par(cam, 0.04);
      const sx = W * 0.62 + sp.x, sy = H * 0.62 + sp.y;
      ctx.save(); ctx.globalAlpha = 0.25;
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + t * 0.002;
        ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a - 0.06) * W, sy + Math.sin(a - 0.06) * W); ctx.lineTo(sx + Math.cos(a + 0.06) * W, sy + Math.sin(a + 0.06) * W); ctx.fill();
      }
      ctx.restore();
      const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 120);
      sg.addColorStop(0, '#fff6d8'); sg.addColorStop(0.5, '#ffd27a'); sg.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 120, 0, TAU); ctx.fill();
      ridge(ctx, W, H, H * 0.78 + par(cam, 0.06).y, H * 0.22, 3, '#5a2a52', par(cam, 0.06).x, 1.3);
      for (const c of ciuClouds) {
        const x = ((c.x + t * c.v + par(cam, 0.12).x) % (W + 600)) - 300, y = H * (0.15 + c.y) + par(cam, 0.12).y;
        ctx.fillStyle = 'rgba(255,220,220,.35)';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + i * 34 * c.s, y + (i % 2) * 8, 46 * c.s, 18 * c.s, 0, 0, TAU); ctx.fill(); }
      }
      const isl = par(cam, 0.2);
      [[0.18, 0.5, 1], [0.82, 0.42, 0.8], [0.5, 0.3, 0.6]].forEach(([fx, fy, s], i) => {
        const x = W * fx + isl.x, y = H * fy + isl.y + Math.sin(t * 0.01 + i) * 6;
        ctx.fillStyle = '#3d1f3f';
        ctx.beginPath(); ctx.moveTo(x - 90 * s, y); ctx.lineTo(x + 90 * s, y); ctx.lineTo(x + 30 * s, y + 70 * s); ctx.lineTo(x - 10 * s, y + 110 * s); ctx.lineTo(x - 40 * s, y + 60 * s); ctx.closePath(); ctx.fill();
        for (let k = -2; k <= 2; k++) { ctx.fillRect(x + k * 30 * s - 6 * s, y - (50 + (k % 2) * 25) * s, 12 * s, (50 + (k % 2) * 25) * s); }
      });
      ridge(ctx, W, H, H * 0.98 + par(cam, 0.3).y, H * 0.16, 11, '#2a1230', par(cam, 0.3).x, 0.7);
    },
    drawStage(ctx, m, t) {
      for (const p of m.stagePlatforms) {
        if (p.type === 'pass') { floatPlat(ctx, p, ['#7a6a8a', '#ffd27a'], '#ffcf8a', t); continue; }
        slab(ctx, p, p.main ? '#cbbfa8' : '#8a7f72', p.main ? ['#a99a86', '#6b5f55'] : ['#6b5f55', '#3d342f'], p.main ? '#d4a93a' : null, (c, q) => {
          c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
          for (let x = q.x + 40; x < q.x + q.w; x += 80) { c.beginPath(); c.moveTo(x, q.y + 12); c.lineTo(x, q.y + q.h); c.stroke(); }
          if (q.main) {
            c.fillStyle = 'rgba(255,220,120,.6)';
            for (let x = q.x + 80; x < q.x + q.w - 40; x += 160) { c.beginPath(); c.arc(x, q.y + 27, 5, 0, TAU); c.fill(); }
          }
          if (q.base && q.y > 80) {
            c.fillStyle = '#4f8a3a';
            for (let x = q.x + 10; x < q.x + q.w; x += 37) { c.beginPath(); c.ellipse(x, q.y + q.h, 4, 12 + Math.abs(x % 20), 0, 0, TAU); c.fill(); }
          }
        });
      }
    }
  };

  /* ==================== 2 · ABISMO ESTELAR =============================== */
  const abRand = seeded(1234);
  const abStars = Array.from({ length: 220 }, () => ({ x: abRand(), y: abRand(), s: abRand() * 1.8 + 0.3, tw: abRand() * TAU, d: abRand() }));
  const abismo = {
    id: 'abismo', name: 'Abismo Estelar', desc: 'Plataforma plana competitiva · espacio profundo',
    platforms: mainSolids(-540, 0, 1080, [70, 110]),
    blast: { left: -1350, right: 1350, top: -1050, bottom: 650 },
    camera: { left: -1000, right: 1000, top: -760, bottom: 420 },
    spawns: [{ x: -300, y: -10 }, { x: 300, y: -10 }, { x: -110, y: -10 }, { x: 110, y: -10 }],
    respawn: { x: 0, y: -430 },
    drawBackground(ctx, W, H, cam, t) {
      ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, W, H);
      const neb = par(cam, 0.03);
      [[0.25, 0.3, '#5a1a8a', 380], [0.75, 0.6, '#0a4a7a', 420], [0.55, 0.15, '#8a1a4a', 260]].forEach(([fx, fy, c, r], i) => {
        const x = W * fx + neb.x + Math.sin(t * 0.002 + i) * 20, y = H * fy + neb.y;
        const g = ctx.createRadialGradient(x, y, 10, x, y, r);
        g.addColorStop(0, U.rgba(c, 0.55)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      for (const s of abStars) {
        const k = 0.02 + s.d * 0.08, o = par(cam, k);
        const x = ((s.x * (W + 200) + o.x) % (W + 200) + W + 200) % (W + 200) - 100, y = ((s.y * (H + 200) + o.y) % (H + 200) + H + 200) % (H + 200) - 100;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.05 + s.tw);
        ctx.fillStyle = s.d > 0.85 ? '#bfe0ff' : '#ffffff'; ctx.fillRect(x, y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
      const gp = par(cam, 0.05), gx = W * 0.18 + gp.x, gy = H * 0.22 + gp.y;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.001); ctx.scale(1, 0.45);
      for (let i = 0; i < 2; i++) for (let k = 0; k < 40; k++) {
        const a = k * 0.25 + i * Math.PI, r = 6 + k * 2.4;
        ctx.fillStyle = `rgba(200,180,255,${0.5 - k * 0.011})`; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3 - k * 0.05, 0, TAU); ctx.fill();
      }
      ctx.restore();
      const pp = par(cam, 0.1), px = W * 0.8 + pp.x, py = H * 0.32 + pp.y, pr = Math.min(W, H) * 0.12;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35);
      ctx.strokeStyle = 'rgba(255,210,160,.55)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.9, pr * 0.42, 0, Math.PI, TAU); ctx.stroke();
      const pg = ctx.createRadialGradient(-pr * 0.3, -pr * 0.3, pr * 0.1, 0, 0, pr);
      pg.addColorStop(0, '#ffcf9a'); pg.addColorStop(0.6, '#c0603a'); pg.addColorStop(1, '#3a1410');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(80,20,10,.35)'; ctx.lineWidth = 5;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, i * pr * 0.3, pr * Math.sqrt(1 - Math.pow(i * 0.3, 2)), 3, 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,210,160,.75)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.9, pr * 0.42, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
      const cyc = t % 900;
      if (cyc < 140) {
        const k = cyc / 140, cx = W * (1.1 - k * 1.4), cy = H * (0.05 + k * 0.4);
        const cg = ctx.createLinearGradient(cx, cy, cx + 160, cy - 50);
        cg.addColorStop(0, 'rgba(255,255,255,.9)'); cg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.strokeStyle = cg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 160, cy - 50); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
      }
    },
    drawStage(ctx, m, t) {
      const plats = m.stagePlatforms;
      const main = plats.find(p => p.main) || plats[0];
      const bases = plats.filter(p => p.base);
      const low = bases.length ? bases[bases.length - 1] : main;
      ctx.save();
      ctx.fillStyle = '#120f22'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(low.x, low.y + low.h); ctx.lineTo(low.x + low.w / 2, low.y + low.h + 140); ctx.lineTo(low.x + low.w, low.y + low.h); ctx.closePath(); ctx.fill(); ctx.stroke();
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.06);
      ctx.strokeStyle = U.rgba('#38e0ff', 0.3 + 0.4 * pulse); ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(low.x + low.w * i / 5, low.y + low.h); ctx.lineTo(low.x + low.w / 2, low.y + low.h + 140); ctx.stroke(); }
      ctx.restore();
      for (const p of plats) {
        if (p.type !== 'solid') continue;
        slab(ctx, p, p.main ? '#2a2a48' : '#1a1830', p.main ? ['#232042', '#120f22'] : ['#16132a', '#0d0b1a'], null, (c, q) => {
          c.strokeStyle = U.rgba('#38e0ff', p.main ? 0.9 : 0.4 + 0.3 * pulse); c.lineWidth = p.main ? 3 : 2;
          c.beginPath(); c.moveTo(q.x, q.y + (p.main ? 1.5 : q.h - 2)); c.lineTo(q.x + q.w, q.y + (p.main ? 1.5 : q.h - 2)); c.stroke();
          if (p.main) {
            c.fillStyle = U.rgba('#38e0ff', 0.25 + 0.25 * pulse);
            for (let x = q.x + 60; x < q.x + q.w - 30; x += 120) c.fillRect(x, q.y + 20, 40, 3);
          }
        });
      }
    }
  };

  /* ==================== 3 · SANTUARIO GEMELO ============================= */
  const saRand = seeded(999);
  const saLanterns = Array.from({ length: 14 }, () => ({ x: saRand(), y: saRand(), v: 0.15 + saRand() * 0.3, s: 0.6 + saRand() * 0.7, ph: saRand() * TAU }));
  const saFlies = Array.from({ length: 30 }, () => ({ x: saRand(), y: saRand(), ph: saRand() * TAU }));
  const santuario = {
    id: 'santuario', name: 'Santuario Gemelo', desc: 'Principal + 2 plataformas laterales',
    platforms: mainSolids(-420, 0, 840).concat([
      { x: -300, y: -150, w: 200, h: 10, type: 'pass' },
      { x: 100, y: -150, w: 200, h: 10, type: 'pass' }
    ]),
    blast: { left: -1220, right: 1220, top: -1000, bottom: 640 },
    camera: { left: -880, right: 880, top: -740, bottom: 420 },
    spawns: [{ x: -240, y: -10 }, { x: 240, y: -10 }, { x: -90, y: -10 }, { x: 90, y: -10 }],
    respawn: { x: 0, y: -410 },
    drawBackground(ctx, W, H, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1a3a'); g.addColorStop(0.55, '#1f4a6a'); g.addColorStop(1, '#3f8a8a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const mp = par(cam, 0.03), mx = W * 0.3 + mp.x, my = H * 0.25 + mp.y, mr = Math.min(W, H) * 0.11;
      const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 2.4);
      mg.addColorStop(0, 'rgba(230,245,255,.35)'); mg.addColorStop(1, 'rgba(230,245,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#eef6ff'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,190,220,.35)'; [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.14], [0.1, -0.4, 0.1]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(mx + a * mr, my + b * mr, r * mr, 0, TAU); ctx.fill(); });
      ridge(ctx, W, H, H * 0.72 + par(cam, 0.06).y, H * 0.28, 21, '#1a3352', par(cam, 0.06).x, 1.1);
      for (const l of saLanterns) {
        const lp = par(cam, 0.1 + l.s * 0.05);
        const x = ((l.x * (W + 200) + lp.x) % (W + 200) + W + 200) % (W + 200) - 100;
        const y = (((l.y * (H + 200) - t * l.v + lp.y) % (H + 200)) + H + 200) % (H + 200) - 100;
        const sw = Math.sin(t * 0.03 + l.ph) * 6;
        ctx.save(); ctx.translate(x + sw, y); ctx.scale(l.s, l.s);
        const lg = ctx.createRadialGradient(0, 0, 2, 0, 0, 30); lg.addColorStop(0, 'rgba(255,190,90,.6)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffb35a'; ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ridge(ctx, W, H, H * 0.88 + par(cam, 0.16).y, H * 0.2, 33, '#12263a', par(cam, 0.16).x, 0.8);
      const tp = par(cam, 0.28);
      for (let i = 0; i < 9; i++) {
        const x = ((i * 230 + tp.x) % (W + 400) + W + 400) % (W + 400) - 200, y = H * 0.95 + tp.y;
        ctx.fillStyle = '#0a1826';
        ctx.beginPath(); ctx.moveTo(x, y - 260 - (i % 3) * 40); ctx.lineTo(x + 70, y); ctx.lineTo(x - 70, y); ctx.closePath(); ctx.fill();
      }
    },
    drawStage(ctx, m, t) {
      for (const p of m.stagePlatforms) {
        if (p.type === 'pass') {
          ctx.save();
          ctx.fillStyle = '#8a5a32'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
          ctx.fillRect(p.x, p.y, p.w, 12); ctx.strokeRect(p.x, p.y, p.w, 12);
          ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5;
          for (let x = p.x + 20; x < p.x + p.w; x += 20) { ctx.beginPath(); ctx.moveTo(x, p.y + 1); ctx.lineTo(x, p.y + 11); ctx.stroke(); }
          for (const x of [p.x + 8, p.x + p.w - 8]) {
            ctx.fillStyle = '#5a3a1f'; ctx.fillRect(x - 3, p.y - 30, 6, 30); ctx.strokeStyle = OUT; ctx.strokeRect(x - 3, p.y - 30, 6, 30);
            const fl = 0.7 + 0.3 * Math.sin(t * 0.2 + x);
            const lg = ctx.createRadialGradient(x, p.y - 36, 1, x, p.y - 36, 22); lg.addColorStop(0, `rgba(255,200,110,${0.7 * fl})`); lg.addColorStop(1, 'rgba(255,160,60,0)');
            ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, p.y - 36, 22, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffcf7a'; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.rect(x - 5, p.y - 43, 10, 12); ctx.fill(); ctx.stroke();
          }
          ctx.restore();
          continue;
        }
        slab(ctx, p, p.main ? '#6aa35a' : '#4a6a52', p.main ? ['#7a6a5a', '#4a3f38'] : ['#4a3f38', '#2a2420'], p.main ? '#8a5a32' : null, (c, q) => {
          if (p.main) {
            c.fillStyle = '#8a5a32';
            for (let x = q.x + 6; x < q.x + q.w - 6; x += 28) { c.fillRect(x, q.y + 12, 22, 10); }
            c.fillStyle = '#4f8a3a';
            for (let x = q.x; x < q.x + q.w; x += 26) { c.beginPath(); c.ellipse(x, q.y + 2, 10, 5, 0, 0, TAU); c.fill(); }
          } else {
            c.fillStyle = 'rgba(80,140,70,.6)';
            for (let x = q.x + 14; x < q.x + q.w; x += 44) { c.beginPath(); c.ellipse(x, q.y + q.h, 5, 14 + Math.abs(x % 12), 0, 0, TAU); c.fill(); }
          }
        });
      }
    },
    drawForeground(ctx, W, H, cam, t) {
      for (const fl of saFlies) {
        const x = (fl.x * W + Math.sin(t * 0.01 + fl.ph) * 40), y = (fl.y * H * 0.8 + Math.cos(t * 0.013 + fl.ph) * 30);
        ctx.globalAlpha = 0.3 + 0.4 * Math.max(0, Math.sin(t * 0.07 + fl.ph * 3));
        ctx.fillStyle = '#e8ff9a'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };


  /* ==================== 4 · MUELLE CELESTE (v3) ========================== */
  /* Puerto aéreo: plataforma principal + 1 plataforma móvil que cruza el
   * escenario de lado a lado (sin daño, ritmo constante y predecible). */
  const muRand = seeded(4242);
  const muShips = Array.from({ length: 5 }, () => ({ x: muRand(), y: 0.15 + muRand() * 0.35, s: 0.5 + muRand() * 0.7, v: 0.15 + muRand() * 0.3 }));
  const muClouds = Array.from({ length: 12 }, () => ({ x: muRand(), y: muRand(), s: 0.5 + muRand(), v: 0.2 + muRand() * 0.4 }));
  const muelle = {
    id: 'muelle', name: 'Muelle Celeste', desc: 'Principal + 1 plataforma móvil',
    platforms: mainSolids(-470, 0, 940).concat([
      { x: -85, x0: -85, y: -150, w: 170, h: 10, type: 'pass', mover: true, amp: 300, period: 720 }
    ]),
    blast: { left: -1280, right: 1280, top: -1050, bottom: 650 },
    camera: { left: -920, right: 920, top: -760, bottom: 420 },
    spawns: [{ x: -270, y: -10 }, { x: 270, y: -10 }, { x: -110, y: -10 }, { x: 110, y: -10 }],
    respawn: { x: 0, y: -440 },
    update(m, t) {
      for (const p of m.stagePlatforms) {
        if (!p.mover) continue;
        const nx = p.x0 + Math.sin(t * TAU / p.period) * p.amp;
        p.dx = nx - p.x; p.x = nx;
      }
    },
    drawBackground(ctx, W, H, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3a8ad6'); g.addColorStop(0.6, '#8ec8f2'); g.addColorStop(1, '#e8f4ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sp = par(cam, 0.03);
      const sg = ctx.createRadialGradient(W * 0.8 + sp.x, H * 0.18 + sp.y, 10, W * 0.8 + sp.x, H * 0.18 + sp.y, 160);
      sg.addColorStop(0, 'rgba(255,255,240,.95)'); sg.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      for (const c of muClouds) {
        const o = par(cam, 0.06 + c.s * 0.04);
        const x = ((c.x * (W + 500) + t * c.v + o.x) % (W + 500) + W + 500) % (W + 500) - 250, y = H * (0.2 + c.y * 0.7) + o.y;
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + i * 36 * c.s, y - (i % 2) * 12 * c.s, 50 * c.s, 22 * c.s, 0, 0, TAU); ctx.fill(); }
      }
      for (const s of muShips) {
        const o = par(cam, 0.12 * s.s);
        const x = ((s.x * (W + 600) + t * s.v * 0.8 + o.x) % (W + 600) + W + 600) % (W + 600) - 300, y = H * s.y + o.y + Math.sin(t * 0.02 + s.x * 9) * 6;
        ctx.save(); ctx.translate(x, y); ctx.scale(s.s, s.s);
        ctx.fillStyle = '#c8574a'; ctx.beginPath(); ctx.ellipse(0, -34, 70, 24, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(-70, -36, 140, 4);
        ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -12); ctx.lineTo(-24, 4); ctx.moveTo(30, -12); ctx.lineTo(24, 4); ctx.stroke();
        ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(-40, 4); ctx.lineTo(40, 4); ctx.lineTo(28, 18); ctx.lineTo(-28, 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd27a'; for (let i = -1; i <= 1; i++) ctx.fillRect(i * 16 - 3, 8, 6, 5);
        ctx.restore();
      }
      const isl = par(cam, 0.18);
      ctx.fillStyle = '#5a8a6a';
      ridge(ctx, W, H, H * 0.92 + isl.y, H * 0.12, 61, '#6aa07a', isl.x, 0.9);
    },
    drawStage(ctx, m, t) {
      for (const p of m.stagePlatforms) {
        if (p.type === 'pass') {
          ctx.save();
          ctx.fillStyle = '#9a6a3a'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
          ctx.fillRect(p.x, p.y, p.w, 12); ctx.strokeRect(p.x, p.y, p.w, 12);
          ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5;
          for (let x = p.x + 17; x < p.x + p.w; x += 17) { ctx.beginPath(); ctx.moveTo(x, p.y + 1); ctx.lineTo(x, p.y + 11); ctx.stroke(); }
          ctx.fillStyle = '#e8e2d0'; ctx.strokeStyle = OUT;
          ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y - 60, 46, 26, 0, PI, TAU); ctx.lineTo(p.x + p.w / 2 + 46, p.y - 58); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 1.5;
          [[-40, -58], [40, -58], [-20, -48], [20, -48]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(p.x + p.w / 2 + dx, p.y + dy); ctx.lineTo(p.x + p.w / 2 + dx * 0.6, p.y); ctx.stroke(); });
          const fl = 0.6 + 0.4 * Math.sin(t * 0.3);
          ctx.fillStyle = `rgba(255,170,80,${fl})`; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y - 30, 6, 9, 0, 0, TAU); ctx.fill();
          ctx.restore();
          continue;
        }
        slab(ctx, p, p.main ? '#c8b088' : '#8a6a48', p.main ? ['#9a7a52', '#6a5034'] : ['#6a5034', '#3a2a1c'], p.main ? '#e8e2d0' : null, (c, q) => {
          c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
          for (let x = q.x + 30; x < q.x + q.w; x += 30) { c.beginPath(); c.moveTo(x, q.y + (q.main ? 12 : 2)); c.lineTo(x, q.y + q.h); c.stroke(); }
          if (q.main) {
            c.fillStyle = '#5a3a2a';
            for (const x of [q.x + 20, q.x + q.w - 30]) { c.fillRect(x, q.y - 22, 10, 22); c.fillStyle = '#e8e2d0'; c.fillRect(x - 2, q.y - 24, 14, 4); c.fillStyle = '#5a3a2a'; }
          }
          if (q.base) { c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = q.x + 20; x < q.x + q.w; x += 60) { c.beginPath(); c.ellipse(x, q.y + q.h, 18, 8, 0, 0, TAU); c.fill(); } }
        });
      }
    }
  };

  /* ==================== 5 · PICO ESCARCHADO (v3) ========================= */
  /* Cumbre nevada con aurora: plataforma principal + 2 bajas en los bordes
   * y 1 alta en el centro. */
  const piRand = seeded(777);
  const piSnow = Array.from({ length: 90 }, () => ({ x: piRand(), y: piRand(), s: 1 + piRand() * 2.5, v: 0.4 + piRand() * 0.8, ph: piRand() * TAU }));
  const pico = {
    id: 'pico', name: 'Pico Escarchado', desc: 'Principal + 2 bajas laterales + 1 alta central',
    platforms: mainSolids(-430, 0, 860, [60, 90]).concat([
      { x: -400, y: -105, w: 160, h: 10, type: 'pass' },
      { x: 240, y: -105, w: 160, h: 10, type: 'pass' },
      { x: -70, y: -235, w: 140, h: 10, type: 'pass' }
    ]),
    blast: { left: -1240, right: 1240, top: -1040, bottom: 650 },
    camera: { left: -890, right: 890, top: -760, bottom: 420 },
    spawns: [{ x: -250, y: -10 }, { x: 250, y: -10 }, { x: -100, y: -10 }, { x: 100, y: -10 }],
    respawn: { x: 0, y: -420 },
    drawBackground(ctx, W, H, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#061428'); g.addColorStop(0.6, '#173a5a'); g.addColorStop(1, '#5a86a8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const ap = par(cam, 0.02);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const x = i / 40 * W, y = H * (0.18 + b * 0.07) + Math.sin(i * 0.35 + t * 0.012 + b) * 30 + ap.y;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
        const ag = ctx.createLinearGradient(0, 0, 0, H * 0.45);
        ag.addColorStop(0, 'rgba(0,0,0,0)'); ag.addColorStop(1, b % 2 ? 'rgba(120,80,255,.22)' : 'rgba(60,255,170,.22)');
        ctx.fillStyle = ag; ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t * 0.04 + i); ctx.fillRect((i * 173.3) % W, (i * 71.9) % (H * 0.5), 2, 2); }
      ctx.globalAlpha = 1;
      const m1 = par(cam, 0.06), m2 = par(cam, 0.14);
      ridge(ctx, W, H, H * 0.7 + m1.y, H * 0.35, 5, '#2a4a6a', m1.x, 1.4);
      ctx.save(); ctx.globalAlpha = 0.85;
      ridge(ctx, W, H, H * 0.86 + m2.y, H * 0.25, 9, '#dfeaf4', m2.x, 1.1);
      ctx.restore();
      ridge(ctx, W, H, H * 0.97 + par(cam, 0.24).y, H * 0.14, 13, '#9ab6cc', par(cam, 0.24).x, 0.8);
    },
    drawStage(ctx, m, t) {
      for (const p of m.stagePlatforms) {
        if (p.type === 'pass') {
          ctx.save();
          ctx.fillStyle = '#b8d8f0'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y); ctx.lineTo(p.x + p.w - 10, p.y + 14); ctx.lineTo(p.x + 10, p.y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x + 2, p.y - 3, p.w - 4, 5);
          ctx.fillStyle = 'rgba(200,240,255,.8)';
          for (let x = p.x + 14; x < p.x + p.w - 10; x += 22) { ctx.beginPath(); ctx.moveTo(x - 4, p.y + 14); ctx.lineTo(x + 4, p.y + 14); ctx.lineTo(x, p.y + 26 + (x % 7)); ctx.closePath(); ctx.fill(); }
          ctx.restore();
          continue;
        }
        slab(ctx, p, p.main ? '#ffffff' : '#7a8ea0', p.main ? ['#8aa0b4', '#56687a'] : ['#56687a', '#2e3a48'], p.main ? '#cfe8ff' : null, (c, q) => {
          c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
          for (let x = q.x + 50; x < q.x + q.w; x += 100) { c.beginPath(); c.moveTo(x, q.y + 14); c.lineTo(x + 20, q.y + q.h); c.stroke(); }
          c.fillStyle = 'rgba(200,240,255,.85)';
          for (let x = q.x + 12; x < q.x + q.w - 8; x += 28) { c.beginPath(); c.moveTo(x - 5, q.y + q.h); c.lineTo(x + 5, q.y + q.h); c.lineTo(x, q.y + q.h + 12 + Math.abs(x % 11)); c.closePath(); c.fill(); }
        });
      }
    },
    drawForeground(ctx, W, H, cam, t) {
      ctx.fillStyle = '#ffffff';
      for (const s of piSnow) {
        const x = ((s.x * W + Math.sin(t * 0.02 + s.ph) * 30 - cam.x * 0.3 * cam.zoom) % W + W) % W;
        const y = ((s.y * H + t * s.v) % H + H) % H;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(s.ph + t * 0.05);
        ctx.beginPath(); ctx.arc(x, y, s.s, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };

  NX.STAGES = [ciudadela, abismo, santuario, muelle, pico];
})(window.NX = window.NX || {});
