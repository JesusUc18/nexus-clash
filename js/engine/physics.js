/* ==========================================================================
 * NEXUS CLASH — js/engine/physics.js
 * Gravedad, fricción, colisiones AABB, plataformas pass-through,
 * bordes agarrables (ledges), cálculo de Knockback y predicción de KO.
 * ========================================================================== */
(function (NX) {
  'use strict';

  /* Constantes globales del motor (1 "unidad" competitiva ≈ 5.4 px). */
  const PHYS = Object.freeze({
    UNIT: 5.4,
    LAUNCH_SPEED: 0.03 * 5.4,     // px/frame por punto de knockback
    LAUNCH_DECAY: 0.051 * 5.4,    // desaceleración del vector de lanzamiento
    HITSTUN_MULT: 0.4,            // frames de hitstun por punto de KB
    TUMBLE_KB: 80,                // umbral de "tumble" (voltereta)
    MAX_PERCENT: 999.9,
    MAX_LAUNCH: 58,
    DROP_THROUGH: 14,
    LEDGE_REACH_X: 30,
    LEDGE_REACH_Y: 46,
    LEDGE_REGRAB: 30,
    CROUCH_CANCEL: 0.85,
    SHIELD_MAX: 50,
    SHIELD_DECAY: 0.15,
    SHIELD_REGEN: 0.07
  });

  /* Utilidades matemáticas compartidas por todos los módulos. */
  const U = {
    TAU: Math.PI * 2,
    clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); },
    sign(v) { return v < 0 ? -1 : 1; },
    rand(a, b) { return a + Math.random() * (b - a); },
    randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    inRange(f, r) { return !!r && f >= r[0] && f <= r[1]; },
    dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },
    easeOut(t) { t = U.clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); },
    easeInOut(t) { t = U.clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    snap(t) { return Math.sqrt(U.clamp(t, 0, 1)); },
    hexToRgb(hex) {
      let h = String(hex).replace('#', '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    rgba(hex, a) { const c = U.hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; },
    shade(hex, k) {
      const c = U.hexToRgb(hex);
      const f = v => Math.round(U.clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255));
      return `rgb(${f(c.r)},${f(c.g)},${f(c.b)})`;
    },
    mixRgb(a, b, t) {
      return { r: Math.round(U.lerp(a.r, b.r, t)), g: Math.round(U.lerp(a.g, b.g, t)), b: Math.round(U.lerp(a.b, b.b, t)) };
    }
  };

  /* --------------------------- KNOCKBACK ---------------------------------
   * Knockback = (((((p/10) + (p*d/20)) * (200/(w+100)) * 1.4) + 18) * s) + b
   * p = porcentaje del objetivo DESPUÉS del golpe, d = daño, w = peso,
   * s = escalado (KBG/100), b = knockback base. */
  function calcKnockback(percent, damage, weight, kbg, bkb) {
    const p = percent, d = damage, s = (kbg == null ? 100 : kbg) / 100, b = bkb || 0;
    return (((((p / 10) + (p * d / 20)) * (200 / (weight + 100)) * 1.4) + 18) * s) + b;
  }

  /* Rage: hasta +10% de knockback entre 35% y 150% de daño propio. */
  function rageMultiplier(percent) { return 1 + U.clamp((percent - 35) / 115, 0, 1) * 0.1; }

  /* Ángulo 361 ("Sakurai"): rasante en suelo con KB bajo, 40° con KB alto. */
  function sakuraiAngle(kb, grounded) {
    if (!grounded) return 45;
    if (kb < 60) return 0;
    if (kb >= 88) return 40;
    return (kb - 60) / 28 * 40;
  }

  function launchVelocity(kb, angleDeg, dir) {
    const speed = Math.min(kb * PHYS.LAUNCH_SPEED, PHYS.MAX_LAUNCH);
    const r = angleDeg * Math.PI / 180;
    return { vx: Math.cos(r) * speed * dir, vy: -Math.sin(r) * speed };
  }

  function hitstunFrames(kb) { return Math.floor(kb * PHYS.HITSTUN_MULT); }

  /* Hitlag / freeze frames al impactar. */
  function hitlagFrames(damage, mult) {
    return Math.max(2, Math.min(30, Math.floor((damage * 0.65 + 6) * (mult == null ? 1 : mult))));
  }

  /* Directional Influence: rota el ángulo de lanzamiento hasta 15°
   * según la componente perpendicular del stick del golpeado. */
  function applyDI(vx, vy, sx, sy) {
    const speed = Math.hypot(vx, vy);
    const mag = Math.min(1, Math.hypot(sx, sy));
    if (speed < 0.01 || mag < 0.2) return { vx, vy };
    const a = Math.atan2(vy, vx);
    const s = Math.atan2(sy, sx);
    const delta = Math.sin(s - a) * mag * (15 * Math.PI / 180);
    return { vx: Math.cos(a + delta) * speed, vy: Math.sin(a + delta) * speed };
  }

  /* --------------------------- GEOMETRÍA --------------------------------- */
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = U.clamp(cx, rx, rx + rw), ny = U.clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }
  function circleCircle(ax, ay, ar, bx, by, br) {
    const dx = ax - bx, dy = ay - by, rr = ar + br;
    return dx * dx + dy * dy <= rr * rr;
  }

  /* Reducción del vector de lanzamiento en magnitud (no por eje). */
  function decayLaunch(f) {
    const m = Math.hypot(f.lvx, f.lvy);
    if (m <= PHYS.LAUNCH_DECAY) { f.lvx = 0; f.lvy = 0; return; }
    const k = (m - PHYS.LAUNCH_DECAY) / m;
    f.lvx *= k; f.lvy *= k;
  }

  /* ------------------------ INTEGRACIÓN DE CUERPOS ------------------------
   * Convención: (x, y) = centro de los pies. y crece hacia abajo.
   * El cuerpo debe exponer: x, y, w, h, vx, vy, lvx, lvy, ground,
   * canLandOnPass(p), onLand(p), leaveGround(), onWall(side, p), onCeiling(p). */
  function stepBody(f, world) {
    const plats = world.platforms();
    const hw = f.w / 2;
    /* Arrastre de plataformas móviles. */
    if (f.ground && (f.ground.dx || f.ground.dy)) { f.x += f.ground.dx || 0; f.y += f.ground.dy || 0; }
    const vx = f.vx + f.lvx, vy = f.vy + f.lvy;
    const prevX = f.x, prevY = f.y;

    /* Eje X: colisión lateral contra sólidos. */
    f.x += vx;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (p.type !== 'solid' || f.ground === p) continue;
      if (!rectsOverlap(f.x - hw, f.y - f.h, f.w, f.h - 2, p.x, p.y, p.w, p.h)) continue;
      if (prevY <= p.y + 2) continue;
      const fromLeft = prevX < p.x + p.w / 2;
      f.x = fromLeft ? p.x - hw - 0.1 : p.x + p.w + hw + 0.1;
      f.onWall(fromLeft ? 1 : -1, p);
    }

    /* Eje Y: aterrizaje, techo y adherencia al suelo. */
    f.y += vy;
    if (f.ground) {
      const g = f.ground;
      if (g.removed || f.x < g.x - 1 || f.x > g.x + g.w + 1 || vy < -0.01) {
        f.leaveGround();
      } else {
        f.y = g.y;
      }
    } else {
      let best = null;
      for (let i = 0; i < plats.length; i++) {
        const p = plats[i];
        if (p.removed || f.x < p.x - 1 || f.x > p.x + p.w + 1) continue;
        if (vy >= 0 && prevY <= p.y + 0.01 && f.y >= p.y) {
          if (p.type === 'pass' && !f.canLandOnPass(p)) continue;
          if (!best || p.y < best.y) best = p;
        } else if (p.type === 'solid' && vy < 0) {
          const bottom = p.y + p.h;
          if (prevY - f.h >= bottom - 0.01 && f.y - f.h < bottom) {
            f.y = bottom + f.h;
            f.onCeiling(p);
          }
        }
      }
      /* Seguridad anti-túnel: si los pies terminan dentro de un sólido
       * habiendo empezado por encima de él, se recoloca arriba. */
      if (!best) {
        for (let i = 0; i < plats.length; i++) {
          const p = plats[i];
          if (p.type !== 'solid' || p.removed) continue;
          if (f.x > p.x && f.x < p.x + p.w && f.y > p.y && f.y < p.y + p.h && prevY <= p.y + 4) { best = p; break; }
        }
      }
      if (best) { f.y = best.y; f.onLand(best); }
    }
    decayLaunch(f);
  }

  /* Lista de bordes agarrables a partir de plataformas sólidas. */
  function buildLedges(platforms) {
    const out = [];
    platforms.forEach((p, i) => {
      if (p.type !== 'solid' || p.ledges === false) return;
      out.push({ id: 'L' + i, x: p.x, y: p.y, side: 'L', face: 1, plat: p });
      out.push({ id: 'R' + i, x: p.x + p.w, y: p.y, side: 'R', face: -1, plat: p });
    });
    return out;
  }

  /* Predice si un lanzamiento atravesará una Blast Zone (para el
   * zoom + relámpago rojo de golpe letal). */
  function predictLethal(f, lvx, lvy, world) {
    const b = world.blast;
    const plats = world.platforms();
    let x = f.x, y = f.y - f.h / 2, vy = 0, lx = lvx, ly = lvy;
    const g = f.stat('gravity'), maxFall = f.stat('fall');
    for (let i = 0; i < 320; i++) {
      const m = Math.hypot(lx, ly);
      if (m <= PHYS.LAUNCH_DECAY) return false;
      const k = (m - PHYS.LAUNCH_DECAY) / m;
      x += lx; y += ly + vy;
      lx *= k; ly *= k;
      vy = Math.min(vy + g, maxFall);
      if (x < b.left || x > b.right || y > b.bottom || y < b.top) return true;
      for (let j = 0; j < plats.length; j++) {
        const p = plats[j];
        if (p.type === 'solid' && x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return false;
      }
    }
    return false;
  }

  NX.PHYS = PHYS;
  NX.U = U;
  NX.Physics = {
    calcKnockback, rageMultiplier, sakuraiAngle, launchVelocity, hitstunFrames,
    hitlagFrames, applyDI, rectsOverlap, circleRect, circleCircle, decayLaunch,
    stepBody, buildLedges, predictLethal
  };
})(window.NX = window.NX || {});
