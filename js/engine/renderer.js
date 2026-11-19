/* ==========================================================================
 * NEXUS CLASH — js/engine/renderer.js
 * Renderizador procedural de sprites vectoriales: esqueleto articulado
 * (cinemática directa), biblioteca de poses por estado/ataque, armas,
 * estelas de corte, retratos e íconos de stock. Sin imágenes externas.
 * Convención de ángulos: 0 = miembro apuntando hacia abajo,
 * positivo = rota hacia delante (hacia donde mira el luchador).
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U;
  const OUT = '#16121c';
  const PI = Math.PI;

  /* ------------------------------ RIG BASE -------------------------------- */
  const RIG_DEFAULT = {
    body: 'humanoid',            // 'humanoid' | 'blob'  (legs: false = sin piernas, p. ej. base con ruedas)
    headR: 12, headW: 1, headH: 1, neck: 3,
    torsoH: 27, torsoW: 22, hipW: 18, torsoRound: 7, shoulderY: 4,
    upperArm: 13, foreArm: 12, armW: 7, handR: 5,
    thigh: 15, shin: 15, legW: 9, footL: 11, footH: 6,
    blobR: 26, eyes: 'normal', mouth: true, belly: null,
    weapon: null, parts: {}
  };

  function getRig(def) {
    if (def._rig) return def._rig;
    const r = Object.assign({}, RIG_DEFAULT, def.rig || {});
    r.parts = Object.assign({}, (def.rig && def.rig.parts) || {});
    r.natural = r.body === 'blob'
      ? (r.blobR * 2 + r.thigh * 0.6 + r.footH)
      : (r.thigh + r.shin + r.footH * 0.5 + r.torsoH + r.neck + r.headR * 2 * r.headH);
    def._rig = r;
    return r;
  }

  /* ------------------------------ POSES ----------------------------------- */
  const BASE = {
    lean: 0.04, bob: 0, headTilt: 0, rot: 0, ox: 0, oy: 0, sx: 1, sy: 1,
    aF1: 0.35, aF2: 1.0, aB1: -0.1, aB2: 1.1,
    lF1: 0.22, lF2: -0.3, lB1: -0.22, lB2: -0.15,
    wpn: 1.2, planted: true, alpha: 1, tuck: 0
  };
  const AIRBASE = Object.assign({}, BASE, { planted: false, lF1: 0.7, lF2: -1.2, lB1: 0.0, lB2: -0.8, aF1: 0.9, aF2: 0.7, aB1: -0.5, aB2: 0.8 });

  /* Poses de ataque genéricas: wind (anticipación) → strike (impacto). */
  const POSES = {
    jab: { wind: { aF1: 0.5, aF2: 1.6, lean: -0.05 }, strike: { aF1: 1.55, aF2: 0.05, lean: 0.18, aB1: -0.5, wpn: 0 } },
    jab2: { wind: { aB1: 0.4, aB2: 1.6, aF1: 0.6 }, strike: { aB1: 1.55, aB2: 0.05, aF1: -0.3, lean: 0.2, wpn: 0 } },
    jab3: { wind: { lF1: 0.9, lF2: -1.6, lean: -0.1 }, strike: { lF1: 1.65, lF2: -0.05, lean: -0.25, aF1: -0.3, aB1: 0.6, wpn: 0 } },
    ftilt: { wind: { lF1: 0.9, lF2: -1.7, lean: -0.1 }, strike: { lF1: 1.62, lF2: 0, lean: -0.28, aF1: -0.4, aB1: 0.7, wpn: 0.4 } },
    utilt: { wind: { aF1: 0.2, aF2: 1.9, lean: 0.1 }, strike: { aF1: 2.95, aF2: 0.1, lean: -0.15, headTilt: -0.3, wpn: 0 } },
    dtilt: { wind: { lF1: 1.2, lF2: -2.1, lB1: 0.3, lB2: -1.8, lean: 0.5 }, strike: { lF1: 1.5, lF2: -0.15, lB1: 0.4, lB2: -2.0, lean: 0.55, aF1: 1.2, aF2: 0.3, wpn: 0 } },
    dashattack: { wind: { lean: 0.5, aF1: -0.3 }, strike: { lean: 0.65, aF1: 1.5, aF2: 0, lF1: 1.2, lF2: -0.4, lB1: -0.9, lB2: -0.6, wpn: 0 } },
    fsmash: { wind: { lean: -0.35, aF1: -0.9, aF2: 0.6, aB1: -0.4, lF1: 0.55, lB1: -0.5 }, strike: { lean: 0.5, aF1: 1.6, aF2: 0, aB1: -1.0, lF1: 0.75, lF2: -0.3, lB1: -0.75, lB2: 0, wpn: 0 } },
    usmash: { wind: { lF1: 1.0, lF2: -1.8, lB1: 0.2, lB2: -1.5, aF1: 0.3, aB1: 0.3, aF2: 1.7, aB2: 1.7 }, strike: { aF1: 3.0, aF2: 0, aB1: 2.9, aB2: 0, lean: -0.08, lF1: 0.1, lF2: 0, lB1: -0.1, lB2: 0, wpn: 0 } },
    dsmash: { wind: { aF1: 2.2, aB1: -2.2, lean: 0.05, lF1: 0.6, lF2: -1.3, lB1: -0.3, lB2: -1.1 }, strike: { aF1: 1.75, aF2: 0, aB1: -1.75, aB2: 0, lF1: 1.15, lF2: -0.9, lB1: -1.15, lB2: 0.9, wpn: 0 } },
    nair: { wind: { tuck: 1, aF1: 1.2, aB1: -1.2, lF1: 1.1, lF2: -1.6, lB1: 0.6, lB2: -1.5 }, strike: { rot: U.TAU, aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, lF1: 1.4, lF2: -0.2, lB1: -1.2, lB2: 0, wpn: 0 } },
    fair: { wind: { aF1: 2.9, aF2: 0.3, lean: -0.25, lF1: 0.4 }, strike: { aF1: 0.9, aF2: 0.1, lean: 0.35, lF1: 1.2, lF2: -1.4, wpn: 0 } },
    bair: { wind: { lB1: -0.4, lB2: -1.5, lean: 0.3, aF1: 0.5 }, strike: { lB1: -1.75, lB2: 0, lean: 0.55, aF1: 0.9, aB1: 0.8, headTilt: -0.4, wpn: 0 } },
    uair: { wind: { lF1: 0.6, lF2: -1.6, aF1: 1.0 }, strike: { rot: -U.TAU * 0.85, lF1: 2.9, lF2: 0, lB1: 0.4, lB2: -1.2, aF1: -1.0, aB1: 1.6, wpn: 0 } },
    dair: { wind: { lF1: 1.1, lF2: -1.9, lB1: 0.9, lB2: -1.8, aF1: 2.7, aB1: 2.6 }, strike: { lF1: 0.05, lF2: 0, lB1: -0.1, lB2: 0, aF1: 0.6, aB1: -0.6, oy: 6, wpn: 0 } },
    grab: { wind: { aF1: 0.9, aB1: 0.8, lean: 0.05 }, strike: { aF1: 1.55, aF2: 0.05, aB1: 1.45, aB2: 0.05, lean: 0.28 } },
    dashgrab: { wind: { aF1: 1.0, aB1: 1.0, lean: 0.4 }, strike: { aF1: 1.6, aF2: 0, aB1: 1.5, aB2: 0, lean: 0.5, lF1: 1.0, lB1: -0.8 } },
    pummel: { wind: { aF1: 1.3, aB1: 0.3, aB2: 1.7 }, strike: { aB1: 1.6, aB2: 0, aF1: 1.3, lean: 0.25 } },
    throw_fwd: { wind: { lean: -0.35, aF1: -0.6, aB1: -0.7 }, strike: { lean: 0.5, aF1: 1.7, aF2: 0, aB1: 1.6, aB2: 0 } },
    throw_back: { wind: { lean: 0.25, aF1: 1.4 }, strike: { lean: -0.55, aF1: -1.6, aF2: 0, aB1: -1.7, aB2: 0, headTilt: -0.5 } },
    throw_up: { wind: { lF1: 0.9, lF2: -1.6, lB1: 0.1, lB2: -1.3, aF1: 1.2, aB1: 1.2 }, strike: { aF1: 3.0, aF2: 0, aB1: 2.95, aB2: 0, lF1: 0.1, lF2: 0, lB1: -0.1, lB2: 0 } },
    throw_down: { wind: { aF1: 2.6, aB1: 2.5 }, strike: { lF1: 1.1, lF2: -2.0, lB1: 0.3, lB2: -1.6, aF1: 0.9, aB1: 0.8, lean: 0.55 } },
    ledgeattack: { wind: { lean: 0.2 }, strike: { lean: 0.3, lF1: 1.6, lF2: 0, aF1: -0.5, wpn: 0 } },
    getupattack: { wind: { lean: -0.2 }, strike: { lF1: 1.6, lF2: 0, lB1: -1.6, lB2: 0, aF1: 1.6, aB1: -1.6, rot: U.TAU, wpn: 0 } },
    /* Poses para especiales (Parte 2 las referencia por nombre). */
    cast: { wind: { aF1: 0.2, aF2: 1.9, aB1: 0.1, aB2: 1.8, lean: -0.15 }, strike: { aF1: 1.6, aF2: -0.05, aB1: 1.3, aB2: 0.3, lean: 0.18, wpn: 0 } },
    shoot: { wind: { aF1: 1.2, aF2: 0.4 }, strike: { aF1: 1.57, aF2: 0, aB1: 0.4, lean: 0.05, wpn: 0 } },
    charge: { wind: { aF1: 0.9, aF2: 1.6, aB1: 0.8, aB2: 1.7, lean: -0.1, lF1: 0.5, lF2: -0.9, lB1: -0.5, lB2: -0.4 }, strike: { aF1: 1.6, aF2: 0, aB1: 1.4, aB2: 0, lean: 0.2, wpn: 0 } },
    rise: { wind: { lF1: 1.0, lF2: -1.8, lB1: 0.2, lB2: -1.5, aF1: 0.3, aF2: 1.8 }, strike: { aF1: 3.05, aF2: 0, aB1: 0.4, aB2: 0.8, lF1: 0.6, lF2: -1.4, lB1: -0.2, lB2: -0.4, planted: false, wpn: 0 } },
    uppercut: { wind: { lF1: 1.0, lF2: -1.8, aF1: 0.2, aF2: 1.6, lean: 0.3 }, strike: { aF1: 2.9, aF2: 0.3, lean: -0.1, lF1: 0.4, lF2: -1.5, lB1: -0.3, planted: false, wpn: 0 } },
    spin: { wind: { aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, tuck: 0.5 }, strike: { rot: U.TAU * 2, aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, lF1: 0.6, lB1: -0.6, wpn: 0 } },
    ball: { wind: { tuck: 1, lF1: 1.6, lF2: -2.4, lB1: 1.3, lB2: -2.3, aF1: 1.8, aF2: 1.6, aB1: 1.6, aB2: 1.7, lean: 0.9 }, strike: { tuck: 1, rot: U.TAU * 3, lF1: 1.6, lF2: -2.4, lB1: 1.3, lB2: -2.3, aF1: 1.8, aF2: 1.6, aB1: 1.6, aB2: 1.7, lean: 0.9 } },
    slam: { wind: { lF1: 1.2, lF2: -2.0, lB1: 1.0, lB2: -1.9, aF1: 2.6, aB1: 2.5, oy: -6, planted: false }, strike: { lF1: 0.2, lF2: -0.1, lB1: -0.2, lB2: 0, aF1: 1.9, aB1: -1.9, oy: 4, sy: 0.9 } },
    dive: { wind: { lean: -0.2, aF1: 2.6 }, strike: { lean: 1.45, aF1: 1.6, aF2: 0, aB1: 1.4, aB2: 0, lF1: -0.3, lB1: -0.6, planted: false, wpn: 0 } },
    counter: { wind: { aF1: 2.2, aF2: 1.2, aB1: 1.6, aB2: 1.4, lean: -0.1 }, strike: { aF1: 1.0, aF2: 0.2, lean: 0.35, lF1: 0.8, lB1: -0.6, wpn: 0 } },
    guard: { wind: { aF1: 1.3, aF2: 1.7, aB1: 1.1, aB2: 1.8, lean: 0.1 }, strike: { aF1: 1.4, aF2: 1.8, aB1: 1.2, aB2: 1.9, lean: 0.12 } },
    roar: { wind: { lean: 0.3, aF1: 0.6, aB1: 0.4 }, strike: { lean: -0.35, aF1: 2.1, aF2: 0.3, aB1: -2.0, aB2: 0.3, headTilt: -0.5 } },
    overhead: { wind: { aF1: 3.1, aF2: 0.2, aB1: 2.9, aB2: 0.2, lean: -0.3 }, strike: { aF1: 1.1, aF2: 0, aB1: 0.9, aB2: 0, lean: 0.5, wpn: 0 } },
    stomp: { wind: { lF1: 1.6, lF2: -1.0, lean: -0.2 }, strike: { lF1: 0.4, lF2: 0, lean: 0.1, aF1: 1.2, aB1: -1.2, sy: 0.95 } },
    kick: { wind: { lF1: 0.8, lF2: -1.8, lean: -0.15 }, strike: { lF1: 1.7, lF2: 0, lean: -0.35, aF1: -0.4, aB1: 0.8 } },
    flip: { wind: { tuck: 1 }, strike: { rot: -U.TAU, lF1: 2.6, lF2: 0, aF1: -1.2, aB1: 1.6 } },
    kneel: { wind: { lF1: 1.3, lF2: -2.2, lB1: -0.2, lB2: -1.5, lean: 0.3 }, strike: { lF1: 1.3, lF2: -2.2, lB1: -0.2, lB2: -1.5, lean: 0.45, aF1: 0.4, aF2: 0.4 } },
    taunt: { wind: { aF1: 2.6, aB1: -0.2 }, strike: { aF1: 3.0, aF2: 0.2, aB1: 2.8, aB2: 0.2, headTilt: -0.3 } }
  };

  /* Variantes para estilo espada. */
  const SWORD = {
    jab: { wind: { aF1: 2.0, aF2: 0.3, wpn: 0.6 }, strike: { aF1: 1.2, aF2: 0.1, lean: 0.15, wpn: 0 } },
    jab2: { wind: { aF1: 0.6, aF2: 0.3, wpn: 0.5 }, strike: { aF1: 2.0, aF2: 0.1, lean: 0.1, wpn: 0 } },
    jab3: { wind: { aF1: 0.4, aF2: 1.4, lean: -0.1 }, strike: { aF1: 1.57, aF2: 0, lean: 0.3, wpn: 0, lF1: 0.9, lB1: -0.7 } },
    ftilt: { wind: { aF1: 2.7, aF2: 0.3, lean: -0.15, wpn: 0.3 }, strike: { aF1: 1.1, aF2: 0.1, lean: 0.3, wpn: 0, lF1: 0.8, lB1: -0.6 } },
    utilt: { wind: { aF1: 0.3, aF2: 0.4, lean: 0.1 }, strike: { aF1: 3.2, aF2: 0, lean: -0.15, wpn: 0 } },
    dtilt: { wind: { lF1: 1.2, lF2: -2.1, lB1: 0.3, lB2: -1.8, lean: 0.45, aF1: 0.2 }, strike: { lF1: 1.2, lF2: -2.1, lB1: 0.3, lB2: -1.8, lean: 0.5, aF1: 1.5, aF2: 0, wpn: 0 } },
    fsmash: { wind: { aF1: 3.3, aF2: 0.2, aB1: 2.6, lean: -0.35, wpn: 0.2 }, strike: { aF1: 1.0, aF2: 0, aB1: 0.8, lean: 0.55, wpn: 0, lF1: 0.9, lF2: -0.4, lB1: -0.8 } },
    usmash: { wind: { aF1: 0.0, aF2: 0.5, lF1: 1.0, lF2: -1.8, lB1: 0.2, lB2: -1.5 }, strike: { aF1: 3.1, aF2: 0, lean: -0.1, wpn: 0 } },
    dsmash: { wind: { aF1: 1.6, aF2: 0, lean: 0.3, wpn: 0 }, strike: { aF1: -1.4, aF2: 0, lean: 0.4, lF1: 1.2, lF2: -2.0, lB1: 0.3, lB2: -1.7, wpn: 0 } },
    nair: { wind: { aF1: 1.6, aF2: 0, wpn: 0 }, strike: { rot: U.TAU, aF1: 1.6, aF2: 0, wpn: 0, lF1: 0.9, lF2: -1.4 } },
    fair: { wind: { aF1: 3.1, aF2: 0.2, lean: -0.2, wpn: 0 }, strike: { aF1: 0.6, aF2: 0, lean: 0.3, wpn: 0 } },
    bair: { wind: { aF1: 1.4, lean: 0.2 }, strike: { aF1: -1.6, aF2: 0, lean: 0.35, wpn: 0, headTilt: -0.3 } },
    uair: { wind: { aF1: 1.0, aF2: 0, wpn: 0 }, strike: { aF1: 3.3, aF2: 0, wpn: 0, lean: -0.2, lF1: 0.8, lF2: -1.4 } },
    dair: { wind: { aF1: 2.8, aF2: 0, wpn: 0, lF1: 1.0, lF2: -1.6 }, strike: { aF1: 0.1, aF2: 0, wpn: 0, oy: 4, lF1: 0.3, lF2: -0.4 } },
    dashattack: { wind: { lean: 0.4, aF1: 2.4, wpn: 0.2 }, strike: { lean: 0.6, aF1: 1.2, aF2: 0, wpn: 0, lF1: 1.1, lB1: -0.9 } },
    ledgeattack: { wind: { aF1: 2.4 }, strike: { aF1: 1.0, aF2: 0, lean: 0.3, wpn: 0 } }
  };

  function blendPose(a, b, t) {
    const o = {};
    for (const k in BASE) {
      const va = a[k] != null ? a[k] : BASE[k], vb = b[k] != null ? b[k] : BASE[k];
      if (typeof va === 'boolean') o[k] = t < 0.5 ? va : vb;
      else o[k] = va + (vb - va) * t;
    }
    return o;
  }
  function withBase(base, p) { return Object.assign({}, base, p || {}); }

  function normRot(r) { let x = r % U.TAU; if (x > PI) x -= U.TAU; if (x < -PI) x += U.TAU; return x; }

  /* Progreso de un movimiento: 0..1 anticipación, 1..2 activo, 2..3 recuperación. */
  function moveProgress(mv) {
    const d = mv.def, f = mv.frame, a = d.act || [Math.max(1, Math.floor(d.frames * 0.3)), Math.max(2, Math.floor(d.frames * 0.5))];
    if (f < a[0]) return f / a[0];
    if (f <= a[1]) return 1 + (f - a[0]) / Math.max(1, a[1] - a[0] + 1);
    return 2 + (f - a[1]) / Math.max(1, d.frames - a[1]);
  }

  /* ---- v4: animación por fotogramas clave ------------------------------
   * def.anim = [{ f, p, e }]: pose p (parcial, sobre la base de suelo/aire)
   * alcanzada en el fotograma f con la curva e. Tras la última clave se
   * vuelve suavemente a la pose base. */
  const EASE = {
    lin: t => t,
    in: t => t * t,
    out: t => 1 - (1 - t) * (1 - t),
    out3: t => 1 - Math.pow(1 - t, 3),
    inout: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    snap: t => Math.sqrt(t),
    back: t => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  function keyedPose(f, mv, base) {
    const d = mv.def, keys = d.anim;
    const fr = mv.frame + (mv.charging ? 0 : 0);
    if (fr <= keys[0].f) return withBase(base, keys[0].f === 0 ? keys[0].p : {});
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (fr < b.f) {
        const t = (fr - a.f) / Math.max(1, b.f - a.f);
        return blendPose(withBase(base, a.p), withBase(base, b.p), (EASE[b.e] || EASE.inout)(U.clamp(t, 0, 1)));
      }
    }
    const last = keys[keys.length - 1], end = Math.max(last.f + 1, d.frames);
    const lp = withBase(base, last.p); lp.rot = normRot(lp.rot || 0);
    return blendPose(lp, base, EASE.inout(U.clamp((fr - last.f) / (end - last.f), 0, 1)));
  }

  function movePose(f) {
    const mv = f.move, d = mv.def;
    const base = f.ground ? BASE : AIRBASE;
    const k = moveProgress(mv);
    if (d.poseFn) return withBase(base, d.poseFn(f, mv, k, POSES));
    let p;
    if (d.anim && d.anim.length) p = keyedPose(f, mv, base);
    else {
      const name = d.pose || d.key;
      const style = f.def.poseStyle || (f.def.profile && f.def.profile.style) || 'fist';
      const lib = (style === 'sword' && SWORD[name]) || POSES[name] || POSES.cast;
      const wind = withBase(base, lib.wind), strike = withBase(base, lib.strike);
      /* v4: anticipación con ligero rebote, impacto con sobreimpulso
       * (inercia), pose sostenida un instante y vuelta suave a la base. */
      if (k < 1) p = blendPose(base, wind, EASE.back(U.clamp(k, 0, 1)));
      else if (k < 2) p = blendPose(wind, strike, EASE.back(U.clamp((k - 1) * 1.6, 0, 1)));
      else {
        const s2 = Object.assign({}, strike, { rot: normRot(strike.rot || 0) }), r = k - 2;
        p = r < 0.3 ? s2 : blendPose(s2, base, EASE.inout((r - 0.3) / 0.7));
      }
    }
    if (d.loopPose && k >= 1 && k < 2) p.rot = (p.rot || 0) + mv.frame * d.loopPose;
    if (mv.charging) { p.lean += Math.sin(f.tick * 1.7) * 0.04; p.ox = Math.sin(f.tick * 2.3) * 1.2; }
    if (d.planted != null) p.planted = d.planted && !!f.ground;
    if (!f.ground) p.planted = false;
    return p;
  }

  function statePose(f) {
    const t = f.stateTime, T = f.tick;
    const S = NX.ST;
    switch (f.state) {
      case S.IDLE: case S.ENTRY: case S.RESPAWN: case S.SHIELDDROP: {
        const b = Math.sin(T * 0.07);
        return withBase(BASE, { bob: b * 1.2, aF1: 0.35 + b * 0.05, aB1: -0.1 - b * 0.05, headTilt: b * 0.03 });
      }
      case S.WALK: case S.DASH: case S.RUN: {
        const run = f.state !== S.WALK;
        const ph = T * (run ? 0.34 : 0.2), s = Math.sin(ph), c = Math.cos(ph);
        const A = run ? 0.95 : 0.55;
        return withBase(BASE, {
          lean: run ? 0.32 : 0.08, bob: Math.abs(s) * (run ? 3 : 1.5),
          lF1: A * s, lF2: -0.25 - (run ? 1.3 : 0.7) * Math.max(0, -c),
          lB1: -A * s, lB2: -0.25 - (run ? 1.3 : 0.7) * Math.max(0, c),
          aF1: -0.8 * s + 0.2, aF2: run ? 1.6 : 1.1, aB1: 0.8 * s - 0.1, aB2: run ? 1.5 : 1.0
        });
      }
      case S.CROUCH: case S.JUMPSQUAT: case S.LAND:
        return withBase(BASE, { lF1: 1.25, lF2: -2.1, lB1: 0.15, lB2: -1.7, lean: 0.35, aF1: 0.6, aF2: 1.3, aB1: 0.3, aB2: 1.3 });
      case S.AIR: case S.TUMBLE: {
        if (f.state === S.TUMBLE) return withBase(AIRBASE, { rot: T * 0.18, aF1: 2.6, aB1: -2.4, lF1: 0.9, lB1: -0.6 });
        const vy = f.vy + f.lvy;
        if (f.airJumpAnim > 0) {
          const k = f.airJumpAnim / 18;
          return withBase(AIRBASE, { rot: f.def.flipJump === false ? 0 : -U.TAU * (1 - k), lF1: 1.3, lF2: -2.0, lB1: 1.0, lB2: -1.9, aF1: 1.4, aB1: 1.2 });
        }
        if (vy < -1) return withBase(AIRBASE, { lF1: 1.0, lF2: -1.5, lB1: 0.0, lB2: -0.5, aF1: 2.3, aF2: 0.4, aB1: -1.2, aB2: 0.5, lean: -0.05 });
        if (f.fastFalling) return withBase(AIRBASE, { lF1: 0.1, lF2: -0.1, lB1: -0.1, lB2: -0.1, aF1: 2.9, aF2: 0.1, aB1: 2.8, aB2: 0.1 });
        const w = Math.sin(T * 0.25) * 0.25;
        return withBase(AIRBASE, { lF1: 0.4, lF2: -0.7, lB1: -0.2, lB2: -0.4, aF1: 2.2 + w, aF2: 0.4, aB1: 1.9 - w, aB2: 0.5 });
      }
      case S.HELPLESS: {
        const w = Math.sin(T * 0.3) * 0.15;
        return withBase(AIRBASE, { lean: 0.2, aF1: 0.4 + w, aF2: 0.2, aB1: -0.4 - w, aB2: 0.2, lF1: 0.2, lF2: -0.2, lB1: -0.1, lB2: -0.1, headTilt: 0.3 });
      }
      case S.HITSTUN: case S.REBOUND: {
        if (f.tumbling && !f.ground) return withBase(AIRBASE, { rot: -T * 0.3, aF1: -1.2, aB1: -2.0, lF1: 1.2, lB1: -0.9, lean: -0.5 });
        return withBase(f.ground ? BASE : AIRBASE, { lean: -0.45, aF1: -1.0, aF2: 0.6, aB1: -1.8, aB2: 0.5, headTilt: -0.4, lF1: 0.5, lB1: -0.5 });
      }
      case S.SHIELD: case S.SHIELDSTUN:
        return withBase(BASE, { lF1: 0.8, lF2: -1.4, lB1: -0.1, lB2: -0.9, lean: 0.15, aF1: 1.2, aF2: 1.7, aB1: 1.0, aB2: 1.8 });
      case S.SHIELDBREAK: return withBase(AIRBASE, { rot: T * 0.1, aF1: 2.8, aB1: 2.6, lean: -0.3 });
      case S.DIZZY: case S.STUN: {
        const sw = Math.sin(T * 0.09);
        return withBase(BASE, { lean: sw * 0.25, headTilt: sw * 0.5, aF1: 0.1 + sw * 0.2, aF2: 0.2, aB1: -0.1 + sw * 0.2, aB2: 0.2, lF1: 0.2, lB1: -0.2 });
      }
      case S.DODGE: {
        const d = f.dodge || {}; const k = t / (d.frames || 24);
        if (d.kind === 'roll') return withBase(BASE, { tuck: 1, rot: (d.dir === f.facing ? 1 : -1) * U.TAU * U.easeInOut(k), lF1: 1.4, lF2: -2.2, lB1: 1.1, lB2: -2.1, aF1: 1.7, aF2: 1.7, aB1: 1.5, aB2: 1.7, lean: 0.8, alpha: 0.75, planted: false, oy: -10 * Math.sin(k * PI) });
        return withBase(BASE, { lean: -0.25, ox: -6 * Math.sin(k * PI), aF1: 1.2, aF2: 1.6, aB1: 1.1, aB2: 1.6, alpha: 0.65 });
      }
      case S.AIRDODGE: return withBase(AIRBASE, { lF1: 1.3, lF2: -2.1, lB1: 1.0, lB2: -2.0, aF1: 1.5, aF2: 1.8, aB1: 1.4, aB2: 1.8, lean: 0.6, alpha: 0.55 });
      case S.LEDGE: {
        const sw = Math.sin(T * 0.06) * 0.08;
        return withBase(AIRBASE, { aF1: 3.05, aF2: 0.05, aB1: 2.95, aB2: 0.05, lean: -0.08 + sw, lF1: 0.2 + sw, lF2: -0.3, lB1: -0.1, lB2: -0.2, wpn: 0.3 });
      }
      case S.LEDGEACT: return withBase(BASE, { lF1: 1.3, lF2: -2.0, lB1: 0.3, lB2: -1.5, lean: 0.6, aF1: 1.8, aB1: 1.6, planted: !!f.ground });
      case S.GRABHOLD:
        if (f.pummelCD > 0) return blendPose(withBase(BASE, POSES.pummel.wind), withBase(BASE, POSES.pummel.strike), U.snap((14 - f.pummelCD) / 6));
        return withBase(BASE, { aF1: 1.45, aF2: 0.2, aB1: 1.35, aB2: 0.2, lean: 0.12 });
      case S.GRABBED: case S.CAPTURED: {
        const w = Math.sin(T * 0.5) * 0.3;
        return withBase(f.ground ? BASE : AIRBASE, { lean: -0.3, aF1: 1.8 + w, aB1: 2.2 - w, aF2: 0.5, aB2: 0.5, headTilt: -0.3, planted: !!f.ground });
      }
      case S.RELEASE: return withBase(BASE, { lean: -0.3, aF1: -0.4, aB1: -0.7 });
      case S.KNOCKDOWN: return withBase(BASE, { rot: -1.5, oy: 10, aF1: 2.5, aB1: 2.2, lF1: 0.1, lB1: -0.1, planted: false, ox: -8 });
      case S.GETUP: case S.TECH: {
        const k = Math.min(1, t / 16);
        return withBase(BASE, { rot: -1.5 * (1 - k), oy: 10 * (1 - k), lF1: 1.2 * (1 - k) + 0.2, lF2: -1.8 * (1 - k) - 0.3, alpha: 0.8 });
      }
      case S.BURIED: { const w = Math.sin(T * 0.4) * 0.3; return withBase(BASE, { aF1: 2.6 + w, aB1: 2.3 - w, oy: f.h * 0.55, lean: w * 0.2 }); }
      case S.DEAD: return withBase(BASE, { alpha: 0 });
      case S.VICTORY: {
        const k = Math.min(1, t / 20);
        return withBase(BASE, { aF1: 0.35 + 2.7 * k, aF2: 1.0 - 0.9 * k, aB1: -0.1 + 0.6 * k, aB2: 1.1, lean: -0.05 * k, headTilt: -0.15 * k, bob: Math.sin(T * 0.1) });
      }
      default: return withBase(f.ground ? BASE : AIRBASE, {});
    }
  }

  function getPose(f) {
    let p = (f.move && f.state === NX.ST.ATTACK) ? movePose(f) : statePose(f);
    if (f.def.poseMod) p = Object.assign(p, f.def.poseMod(f, p) || {});
    return p;
  }

  /* ------------------------- CINEMÁTICA DIRECTA --------------------------- */
  const pt = (x, y) => ({ x, y });
  const along = (o, a, L) => pt(o.x + Math.sin(a) * L, o.y + Math.cos(a) * L);

  function solve(rig, p) {
    if (rig.body === 'blob') return solveBlob(rig, p);
    const ext = (l1, l2) => rig.thigh * Math.cos(l1) + rig.shin * Math.cos(l1 + l2);
    const legReach = Math.max(ext(p.lF1, p.lF2), ext(p.lB1, p.lB2));
    const hipY = p.planted ? -legReach - rig.footH * 0.5 : -(rig.thigh + rig.shin) * 0.92 - rig.footH * 0.5;
    const hip = pt(0, hipY - p.bob);
    const L = p.lean;
    const top = pt(hip.x + Math.sin(L) * rig.torsoH, hip.y - Math.cos(L) * rig.torsoH);
    const shY = rig.torsoH - rig.shoulderY;
    const sh = pt(hip.x + Math.sin(L) * shY, hip.y - Math.cos(L) * shY);
    const nL = rig.neck + rig.headR * rig.headH;
    const head = pt(top.x + Math.sin(L + p.headTilt) * nL, top.y - Math.cos(L + p.headTilt) * nL);
    const shF = pt(sh.x + Math.cos(L) * 3, sh.y + Math.sin(L) * 3), shB = pt(sh.x - Math.cos(L) * 3, sh.y - Math.sin(L) * 3);
    const aF = p.aF1 + L, aB = p.aB1 + L;
    const elF = along(shF, aF, rig.upperArm), haF = along(elF, aF + p.aF2, rig.foreArm);
    const elB = along(shB, aB, rig.upperArm), haB = along(elB, aB + p.aB2, rig.foreArm);
    const hipF = pt(hip.x + 3, hip.y), hipB = pt(hip.x - 3, hip.y);
    const knF = along(hipF, p.lF1, rig.thigh), ftF = along(knF, p.lF1 + p.lF2, rig.shin);
    const knB = along(hipB, p.lB1, rig.thigh), ftB = along(knB, p.lB1 + p.lB2, rig.shin);
    return {
      hip, top, sh, head, shF, shB, elF, haF, elB, haB, hipF, hipB, knF, ftF, knB, ftB,
      foreF: aF + p.aF2, foreB: aB + p.aB2, shinF: p.lF1 + p.lF2, shinB: p.lB1 + p.lB2, lean: L, headAng: L + p.headTilt
    };
  }

  function solveBlob(rig, p) {
    const R = rig.blobR;
    const lift = p.planted ? 0 : 4;
    const ext = (l1) => rig.thigh * 0.6 * Math.cos(l1);
    const legReach = Math.max(ext(p.lF1), ext(p.lB1));
    const c = pt(0, -legReach - rig.footH * 0.6 - R - p.bob - lift);
    const L = p.lean;
    const shF = pt(c.x + Math.cos(L) * R * 0.82, c.y + R * 0.22), shB = pt(c.x - Math.cos(L) * R * 0.82, c.y + R * 0.22);
    const aF = p.aF1 + L, aB = p.aB1 + L;
    const haF = along(shF, aF, rig.upperArm + rig.foreArm * 0.4), haB = along(shB, aB, rig.upperArm + rig.foreArm * 0.4);
    const hipF = pt(c.x + R * 0.35, c.y + R * 0.75), hipB = pt(c.x - R * 0.35, c.y + R * 0.75);
    const ftF = along(hipF, p.lF1, rig.thigh * 0.6), ftB = along(hipB, p.lB1, rig.thigh * 0.6);
    return { hip: c, top: pt(c.x, c.y - R), sh: c, head: c, shF, shB, elF: haF, haF, elB: haB, haB, hipF, hipB, knF: ftF, ftF, knB: ftB, ftB, foreF: aF, foreB: aB, shinF: p.lF1, shinB: p.lB1, lean: L, headAng: L + p.headTilt };
  }

  /* ------------------------ V1.3 · SOMBREADO ------------------------------
   * Luz desde arriba y hacia delante (en coordenadas locales del luchador,
   * +x = hacia donde mira). tone() aclara/oscurece cualquier color hex o
   * rgb() (las paletas teñidas usan rgb) y se cachea. */
  const LIGHT = { x: 0.45, y: -0.89 };
  /* FLAT: sin sombreado (siluetas planas como Monocromo o rig.flat). */
  let FLAT = false;
  const _tone = new Map();
  function parseCol(c) {
    if (c[0] === '#') return U.hexToRgb(c);
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return { r: p[0], g: p[1], b: p[2] };
  }
  function tone(c, k) {
    if (typeof c !== 'string') return c;
    const key = c + '|' + k;
    let v = _tone.get(key);
    if (v) return v;
    const o = parseCol(c);
    if (!o) return c;
    const f = x => Math.round(U.clamp(k < 0 ? x * (1 + k) : x + (255 - x) * k, 0, 255));
    v = `rgb(${f(o.r)},${f(o.g)},${f(o.b)})`;
    if (_tone.size > 6000) _tone.clear();
    _tone.set(key, v);
    return v;
  }
  /* Volumen cilíndrico: franja de sombra del lado opuesto a la luz y brillo del lado iluminado. */
  function shadeStroke(ctx, a, b, w, color) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (L < 0.5) return;
    let nx = -dy / L, ny = dx / L;
    if (nx * LIGHT.x + ny * LIGHT.y < 0) { nx = -nx; ny = -ny; }
    ctx.strokeStyle = 'rgba(10,0,30,.13)'; ctx.lineWidth = w * 0.56;
    ctx.beginPath(); ctx.moveTo(a.x - nx * w * 0.2, a.y - ny * w * 0.2); ctx.lineTo(b.x - nx * w * 0.2, b.y - ny * w * 0.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,0,30,.12)'; ctx.lineWidth = w * 0.26;
    ctx.beginPath(); ctx.moveTo(a.x - nx * w * 0.3, a.y - ny * w * 0.3); ctx.lineTo(b.x - nx * w * 0.3, b.y - ny * w * 0.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.lineWidth = w * 0.18;
    ctx.beginPath(); ctx.moveTo(a.x + nx * w * 0.2, a.y + ny * w * 0.2); ctx.lineTo(b.x + nx * w * 0.2, b.y + ny * w * 0.2); ctx.stroke();
  }

  /* --------------------------- PRIMITIVAS --------------------------------- */
  /* ws (opcional): grosor de cada segmento, para extremidades que se afinan. */
  function limb(ctx, pts, w, color, ws) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const n = pts.length - 1;
    if (!ws) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = OUT; ctx.lineWidth = w + 3.2; ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    } else {
      ctx.strokeStyle = OUT;
      for (let i = 0; i < n; i++) { ctx.lineWidth = ws[i] + 3.2; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke(); }
      ctx.strokeStyle = color;
      for (let i = 0; i < n; i++) { ctx.lineWidth = ws[i]; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke(); }
    }
    if (!FLAT && w >= 4 && typeof color === 'string') for (let i = 0; i < n; i++) shadeStroke(ctx, pts[i], pts[i + 1], ws ? ws[i] : w, color);
  }
  function disc(ctx, x, y, r, color, outline) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU);
    ctx.fillStyle = color; ctx.fill();
    if (outline !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke(); }
  }
  /* Mano / esfera con brillo. */
  function orb(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU);
    ctx.fillStyle = color; ctx.fill();
    if (!FLAT && r >= 3 && typeof color === 'string') {
      ctx.fillStyle = tone(color, -0.22);
      ctx.beginPath(); ctx.arc(x - r * 0.18, y + r * 0.2, r * 0.78, 0.35 * PI, 1.15 * PI); ctx.arc(x, y, r, 1.15 * PI, 0.35 * PI, true); ctx.fill();
      ctx.fillStyle = tone(color, 0.38);
      ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.32, r * 0.32, 0, U.TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
  }
  /* Calzado: suela oscura, puntera brillante. */
  function shoe(ctx, x, y, rx, ry, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    rx = Math.max(0.1, rx); ry = Math.max(0.1, ry);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, U.TAU);
    ctx.fillStyle = color; ctx.fill();
    if (!FLAT && typeof color === 'string' && rx > 3) {
      ctx.save(); ctx.clip();
      ctx.fillStyle = tone(color, -0.4); ctx.fillRect(-rx - 1, ry * 0.32, rx * 2 + 2, ry);
      ctx.fillStyle = tone(color, 0.32);
      ctx.beginPath(); ctx.ellipse(rx * 0.38, -ry * 0.38, rx * 0.34, ry * 0.26, -0.15, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
  }
  /* Capa de volumen dentro del trazo actual: brillo arriba-delante y sombra atrás-abajo. */
  function volumeLinear(ctx, x0, y0, x1, y1, hi, lo) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(255,255,255,${hi})`); g.addColorStop(0.42, 'rgba(255,255,255,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${lo})`);
    return g;
  }
  function volumeRadial(ctx, cx, cy, r, hi, lo) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${hi})`); g.addColorStop(0.38, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${lo})`);
    return g;
  }
  function ellipse(ctx, x, y, rx, ry, rot, color, outline) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, U.TAU);
    ctx.fillStyle = color; ctx.fill();
    if (outline !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke(); }
  }
  function roundTrap(ctx, wTop, wBot, h, r) {
    const t = wTop / 2, b = wBot / 2;
    ctx.beginPath();
    ctx.moveTo(-b + r, 0); ctx.lineTo(b - r, 0); ctx.quadraticCurveTo(b, 0, b, -r);
    ctx.lineTo(t, -h + r); ctx.quadraticCurveTo(t, -h, t - r, -h);
    ctx.lineTo(-t + r, -h); ctx.quadraticCurveTo(-t, -h, -t, -h + r);
    ctx.lineTo(-b, -r); ctx.quadraticCurveTo(-b, 0, -b + r, 0);
    ctx.closePath();
  }
  function poly(ctx, pts, fill, outline) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (outline !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke(); }
  }

  /* ---------------------------- CARA / OJOS ------------------------------- */
  function drawFace(ctx, f, rig, pal, R, ex) {
    const mood = f.expression ? f.expression() : 'normal';
    const eyeC = pal.eye || '#1b1b1b';
    const ew = R * 0.2, eh = R * 0.3, x1 = R * 0.38, x2 = R * 0.0, y = -R * 0.08;
    switch (rig.eyes) {
      case 'none': break;
      case 'visor': {
        ctx.fillStyle = pal.visor || '#6ff2ff';
        ctx.beginPath(); ctx.ellipse(R * 0.35, -R * 0.12, R * 0.5, R * 0.28, 0.05, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(R * 0.15, -R * 0.28, R * 0.3, R * 0.08);
        break;
      }
      case 'glow': {
        ctx.save();
        ctx.fillStyle = U.rgba(/^#/.test(pal.eye || '') ? pal.eye : '#ff3333', 0.35);
        ctx.beginPath(); ctx.ellipse(x1, y, ew * 2, eh * 0.9, -0.2, 0, U.TAU); ctx.fill();
        ctx.fillStyle = pal.eye || '#ff3333';
        ctx.beginPath(); ctx.ellipse(x1, y, ew * 1.2, eh * 0.45, -0.2, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x2, y, ew, eh * 0.4, -0.2, 0, U.TAU); ctx.fill();
        ctx.restore(); break;
      }
      default: {
        if (mood === 'hurt') {
          ctx.strokeStyle = eyeC; ctx.lineWidth = 2;
          [x1, x2].forEach(ex2 => { ctx.beginPath(); ctx.moveTo(ex2 - ew, y - eh * 0.6); ctx.lineTo(ex2 + ew, y); ctx.lineTo(ex2 - ew, y + eh * 0.6); ctx.stroke(); });
        } else {
          /* V1.3 · Ojos con iris, pupila, dos brillos y párpado; parpadean cada pocos segundos. */
          if (f._blinkSeed == null) f._blinkSeed = Math.floor(Math.random() * 200);
          const bt = ((f.tick || 0) + f._blinkSeed) % 230;
          const blink = f.tick > 0 && bt < 7 && mood !== 'angry';
          const iris = tone(eyeC, 0.32), pupil = tone(eyeC, -0.55);
          [x1, x2].forEach((ex2, i) => {
            const s = i === 0 ? 1 : 0.85;
            if (blink) {
              ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(ex2 - ew * s, y); ctx.quadraticCurveTo(ex2, y + eh * 0.4 * s, ex2 + ew * s * 1.05, y); ctx.stroke();
              return;
            }
            ellipse(ctx, ex2, y, ew * s * 1.05, eh * s, 0, pal.sclera || '#fff', false);
            ctx.fillStyle = 'rgba(40,30,60,.16)';
            ctx.beginPath(); ctx.ellipse(ex2, y - eh * s * 0.25, ew * s * 1.05, eh * s * 0.75, 0, PI, U.TAU); ctx.fill();
            ellipse(ctx, ex2 + ew * 0.35, y + eh * 0.1, ew * s * 0.6, eh * s * 0.66, 0, iris, false);
            ellipse(ctx, ex2 + ew * 0.42, y + eh * 0.14, ew * s * 0.34, eh * s * 0.4, 0, pupil, false);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex2 + ew * 0.55, y - eh * 0.22, ew * 0.24 * s, 0, U.TAU); ctx.fill();
            ctx.globalAlpha *= 0.85; ctx.beginPath(); ctx.arc(ex2 + ew * 0.15, y + eh * 0.34, ew * 0.11 * s, 0, U.TAU); ctx.fill(); ctx.globalAlpha /= 0.85;
            ctx.strokeStyle = OUT; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.ellipse(ex2, y, ew * s * 1.08, eh * s * 1.02, 0, PI * 1.05, PI * 1.95); ctx.stroke();
          });
          if (mood === 'angry' || rig.brows) {
            ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x1 - ew * 1.2, y - eh * 1.3); ctx.lineTo(x1 + ew * 1.2, y - eh * 0.9); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x2 - ew, y - eh * 1.1); ctx.lineTo(x2 + ew, y - eh * 1.4); ctx.stroke();
          }
        }
      }
    }
    if (rig.mouth) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      if (mood === 'hurt' || f.state === NX.ST.HITSTUN) { ctx.ellipse(R * 0.35, R * 0.45, R * 0.12, R * 0.16, 0, 0, U.TAU); ctx.fillStyle = '#400'; ctx.fill(); }
      else if (f.move) { ctx.moveTo(R * 0.15, R * 0.42); ctx.lineTo(R * 0.55, R * 0.4); }
      else { ctx.moveTo(R * 0.2, R * 0.42); ctx.quadraticCurveTo(R * 0.38, R * 0.5, R * 0.55, R * 0.38); }
      ctx.stroke();
    }
  }

  /* ------------------------------ ARMAS ----------------------------------- */
  function weaponTip(rig, J, p) {
    const w = rig.weapon; if (!w) return null;
    const a = J.foreF + (p.wpn != null ? p.wpn : 1.2);
    return { a, x: J.haF.x + Math.sin(a) * w.len, y: J.haF.y + Math.cos(a) * w.len };
  }

  function drawWeapon(ctx, f, rig, J, p, pal) {
    const w = rig.weapon; if (!w) return;
    const a = J.foreF + (p.wpn != null ? p.wpn : 1.2);
    ctx.save();
    ctx.translate(J.haF.x, J.haF.y);
    ctx.rotate(-a);
    if (rig.parts.weapon) { rig.parts.weapon(ctx, f, w, pal, p); ctx.restore(); return; }
    const L = w.len, W = w.w || 6, col = w.color || '#d9e2ec';
    if (w.glow) {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = w.glow; ctx.lineWidth = (w.w || 6) * 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, w.len); ctx.stroke(); ctx.restore();
    }
    switch (w.type) {
      case 'hammer': {
        limb(ctx, [pt(0, -6), pt(0, L * 0.8)], 5, w.handle || '#7a4a22');
        /* V1.3 · Cabeza metálica con bandas y brillo. */
        const hy = L * 0.7, hh = W * 1.6;
        const g = ctx.createLinearGradient(-W, 0, W, 0);
        g.addColorStop(0, tone(col, -0.35)); g.addColorStop(0.35, tone(col, 0.35)); g.addColorStop(0.6, col); g.addColorStop(1, tone(col, -0.45));
        ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(-W, hy, W * 2, hh); ctx.fill(); ctx.stroke();
        ctx.fillStyle = tone(col, -0.5); ctx.fillRect(-W, hy + hh * 0.14, W * 2, hh * 0.12); ctx.fillRect(-W, hy + hh * 0.74, W * 2, hh * 0.12);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-W * 0.55, hy + hh * 0.32, W * 0.3, hh * 0.36);
        break;
      }
      case 'staff': {
        limb(ctx, [pt(0, -L * 0.3), pt(0, L)], 4, w.handle || '#5a3b1f');
        /* Anillas y gema con resplandor. */
        ctx.fillStyle = w.guard || '#c9a43a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
        [L * 0.82, L * 0.88].forEach(yy => { ctx.beginPath(); ctx.rect(-3.2, yy, 6.4, 2.4); ctx.fill(); ctx.stroke(); });
        ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, L, W * 1.7, 0, U.TAU); ctx.fill(); ctx.restore();
        orb(ctx, 0, L, W, col);
        break;
      }
      case 'gun': {
        const g = ctx.createLinearGradient(-4, 0, 4, 0);
        g.addColorStop(0, tone(col, -0.35)); g.addColorStop(0.4, tone(col, 0.3)); g.addColorStop(1, tone(col, -0.2));
        ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(-3, -2, 6, L); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.rect(-4, -4, 8, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = tone(col, -0.55); ctx.fillRect(-3, L - 3, 6, 3);
        break;
      }
      default: {
        /* Espada: empuñadura con vendas, pomo, guarda y hoja con canal y filo brillante. */
        const hilt = w.hilt || '#3a2a1a', guard = w.guard || '#c9a43a';
        ctx.fillStyle = hilt; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.rect(-2.5, -8, 5, 10); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = tone(hilt, 0.3); ctx.lineWidth = 0.9;
        for (let yy = -6.5; yy < 1; yy += 2.4) { ctx.beginPath(); ctx.moveTo(-2.5, yy); ctx.lineTo(2.5, yy + 1.2); ctx.stroke(); }
        orb(ctx, 0, -9.5, 2.6, guard);
        ctx.fillStyle = guard; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-W * 1.2, 2.4); ctx.quadraticCurveTo(-W * 1.25, 0.6, -W * 0.9, 1); ctx.lineTo(W * 0.9, 1);
        ctx.quadraticCurveTo(W * 1.25, 0.6, W * 1.2, 2.4); ctx.lineTo(W * 1.05, 5); ctx.lineTo(-W * 1.05, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = tone(guard, 0.45); ctx.fillRect(-W * 0.8, 1.6, W * 1.6, 1);
        const base = typeof col === 'string' && /^#|^rgb/.test(col) ? col : '#cccccc';
        const g = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
        g.addColorStop(0, tone(base, -0.3)); g.addColorStop(0.48, '#ffffff'); g.addColorStop(0.52, tone(base, 0.15)); g.addColorStop(1, tone(base, -0.1));
        ctx.fillStyle = g;
        const tp = w.taper || 0.7;
        ctx.beginPath();
        ctx.moveTo(-W / 2, 5); ctx.lineTo(W / 2, 5);
        ctx.lineTo(W / 2 * tp, L - W); ctx.lineTo(0, L); ctx.lineTo(-W / 2 * tp, L - W);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        /* Canal central. */
        ctx.strokeStyle = tone(base, -0.35); ctx.lineWidth = Math.max(0.8, W * 0.14); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, L - W * 1.6); ctx.stroke();
        /* Destello que recorre la hoja. */
        const sweep = (((f.tick || 0) * 0.025) % 1.6) - 0.3;
        if (sweep > 0 && sweep < 0.78) {
          const sy = 6 + (L - 10) * sweep;
          ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.beginPath(); ctx.moveTo(-W * 0.45, sy); ctx.lineTo(W * 0.45, sy - 3); ctx.lineTo(W * 0.45, sy - 1); ctx.lineTo(-W * 0.45, sy + 2); ctx.closePath(); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /* --------------------------- DIBUJO DEL RIG ----------------------------- */
  function drawRig(ctx, f, rig, J, p, pal) {
    const P = rig.parts;
    const prim = pal.primary, sec = pal.secondary || prim, skin = pal.skin || '#f2c9a0';
    const limbCol = pal.limb || prim, legCol = pal.legs || sec, armCol = pal.arms || limbCol;
    const backShade = c => U.shade(c, -0.28);
    const hand = pal.hand || skin, foot = pal.feet || '#3b2a20';
    const ctxArgs = { f, rig, J, p, pal };
    /* V1.3 · Capas de detalle por luchador (js/fighters/details.js). */
    const D = (f.def && f.def.details) || {};

    /* V1.3 · Extremidades que se afinan: brazo 100% → antebrazo 86%; muslo 108% → espinilla 88%. */
    const armWs = [rig.armW, rig.armW * 0.86], legWs = [rig.legW * 1.08, rig.legW * 0.88];
    if (P.back) P.back(ctx, ctxArgs);
    /* Brazo y pierna traseros (sombreados). */
    if (rig.body === 'blob') {
      limb(ctx, [J.shB, J.haB], rig.armW, backShade(armCol));
      shoe(ctx, J.ftB.x + 3, J.ftB.y - 2, rig.footL * 0.6, rig.footH * 0.7, J.shinB * -0.3, backShade(foot));
    } else {
      limb(ctx, [J.shB, J.elB, J.haB], rig.armW, backShade(armCol), armWs);
      orb(ctx, J.haB.x, J.haB.y, rig.handR, backShade(hand));
      if (rig.legs !== false) {
        limb(ctx, [J.hipB, J.knB, J.ftB], rig.legW, backShade(legCol), legWs);
        shoe(ctx, J.ftB.x + rig.footL * 0.3, J.ftB.y, rig.footL * 0.62, rig.footH * 0.62, -J.shinB * 0.25, backShade(foot));
      }
    }
    if (D.limbsBack && rig.body !== 'blob') D.limbsBack(ctx, ctxArgs);
    if (P.tail) P.tail(ctx, ctxArgs);

    /* V1.3 · Cuello (antes la cabeza flotaba sobre el torso). */
    if (rig.body !== 'blob' && rig.neck > 0 && rig.drawNeck !== false) {
      const neckCol = pal.neck || (pal.head && pal.head !== skin ? tone(pal.head, -0.3) : tone(skin, -0.1));
      const nw = Math.min(rig.headR * rig.headW * 0.62, rig.torsoW * 0.42);
      const base = pt(J.top.x - Math.sin(J.lean) * 2, J.top.y + Math.cos(J.lean) * 2);
      const tip = pt((J.top.x + J.head.x) / 2 + (J.head.x - J.top.x) * 0.2, (J.top.y + J.head.y) / 2 + (J.head.y - J.top.y) * 0.2);
      limb(ctx, [base, tip], nw, neckCol);
    }

    /* Torso. */
    if (rig.body === 'blob') {
      ctx.save(); ctx.translate(J.hip.x, J.hip.y); ctx.rotate(J.lean * 0.3);
      const bx = rig.blobR * (p.sx2 || 1.04), by = rig.blobR * (p.sy2 || 0.98);
      ellipse(ctx, 0, 0, bx, by, 0, prim);
      if (rig.belly) ellipse(ctx, rig.blobR * 0.15, rig.blobR * 0.25, rig.blobR * 0.6, rig.blobR * 0.55, 0, rig.belly, false);
      if (!FLAT) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, bx, by, 0, 0, U.TAU); ctx.clip();
      ctx.fillStyle = volumeRadial(ctx, bx * 0.35, -by * 0.4, rig.blobR * 1.7, 0.3, 0.32); ctx.fillRect(-bx - 2, -by - 2, bx * 2 + 4, by * 2 + 4);
      ctx.restore(); }
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, bx, by, 0, 0, U.TAU); ctx.stroke();
      if (P.torso) P.torso(ctx, ctxArgs);
      if (D.torso) D.torso(ctx, ctxArgs);
      if (P.head) P.head(ctx, ctxArgs);
      drawFace(ctx, f, rig, pal, rig.blobR * 0.75, 0);
      if (D.head) D.head(ctx, ctxArgs);
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(J.hip.x, J.hip.y); ctx.rotate(J.lean);
      const tw = rig.torsoW, th = rig.torsoH;
      roundTrap(ctx, tw, rig.hipW, th, rig.torsoRound);
      ctx.fillStyle = prim; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      if (rig.belly) { ctx.fillStyle = rig.belly; ctx.beginPath(); ctx.ellipse(tw * 0.12, -th * 0.42, tw * 0.32, th * 0.34, 0, 0, U.TAU); ctx.fill(); }
      if (pal.belt) {
        ctx.fillStyle = pal.belt; ctx.fillRect(-rig.hipW / 2, -6, rig.hipW, 5);
        /* Hebilla. */
        ctx.fillStyle = pal.buckle || tone(pal.accent || '#d4a93a', 0.1); ctx.fillRect(rig.hipW * 0.12, -6.5, 4, 6);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(rig.hipW * 0.12 + 1.2, -5, 1.6, 3);
      }
      if (P.torso) P.torso(ctx, ctxArgs);
      if (D.torso) D.torso(ctx, ctxArgs);
      /* Volumen del torso (por encima de los detalles, dentro de su silueta). */
      if (!FLAT) {
      roundTrap(ctx, tw, rig.hipW, th, rig.torsoRound);
      ctx.save(); ctx.clip();
      ctx.fillStyle = volumeLinear(ctx, tw * 0.55, -th, -tw * 0.5, -th * 0.05, 0.2, 0.3);
      ctx.fillRect(-tw, -th - 2, tw * 2, th + 4);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(tw * 0.5 - 3.2, -th, 2.2, th);
      ctx.restore();
      }
      ctx.restore();
    }

    /* Pierna delantera. */
    if (rig.body === 'blob') {
      shoe(ctx, J.ftF.x + 3, J.ftF.y - 2, rig.footL * 0.65, rig.footH * 0.75, J.shinF * -0.3, foot);
    } else if (rig.legs !== false) {
      limb(ctx, [J.hipF, J.knF, J.ftF], rig.legW, legCol, legWs);
      shoe(ctx, J.ftF.x + rig.footL * 0.3, J.ftF.y, rig.footL * 0.65, rig.footH * 0.65, -J.shinF * 0.25, foot);
      if (D.legFront) D.legFront(ctx, ctxArgs);
    }

    /* Cabeza. */
    if (rig.body !== 'blob') {
      ctx.save(); ctx.translate(J.head.x, J.head.y); ctx.rotate(J.headAng);
      const R = rig.headR, hx = R * rig.headW, hy = R * rig.headH, headCol = pal.head || skin;
      if (P.headBack) P.headBack(ctx, ctxArgs);
      ctx.beginPath(); ctx.ellipse(0, 0, hx, hy, 0, 0, U.TAU);
      ctx.fillStyle = headCol; ctx.fill();
      ctx.save(); ctx.clip();
      if (!FLAT) ctx.fillStyle = volumeRadial(ctx, hx * 0.3, -hy * 0.42, R * 1.75, 0.26, 0.3); if (!FLAT) ctx.fillRect(-hx - 2, -hy - 2, hx * 2 + 4, hy * 2 + 4);
      /* Rubor en caras de piel con ojos normales. */
      if (!FLAT && headCol === skin && (rig.eyes === 'normal' || !rig.eyes) && rig.blush !== false) {
        ctx.fillStyle = 'rgba(255,90,110,.2)';
        ctx.beginPath(); ctx.ellipse(R * 0.5, R * 0.3, R * 0.2, R * 0.12, 0, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, hx, hy, 0, 0, U.TAU); ctx.stroke();
      drawFace(ctx, f, rig, pal, R, 0);
      if (P.head) P.head(ctx, ctxArgs);
      if (D.head) D.head(ctx, ctxArgs);
      ctx.restore();
    }

    /* Brazo delantero + arma. */
    if (rig.weapon && !rig.weaponFront) drawWeapon(ctx, f, rig, J, p, pal);
    if (rig.body === 'blob') {
      limb(ctx, [J.shF, J.haF], rig.armW, armCol);
      orb(ctx, J.haF.x, J.haF.y, rig.handR, hand);
    } else {
      limb(ctx, [J.shF, J.elF, J.haF], rig.armW, armCol, armWs);
      if (D.armFront) D.armFront(ctx, ctxArgs);
      orb(ctx, J.haF.x, J.haF.y, rig.handR, hand);
    }
    if (P.hand) P.hand(ctx, ctxArgs);
    if (rig.weapon && rig.weaponFront) drawWeapon(ctx, f, rig, J, p, pal);
    if (P.front) P.front(ctx, ctxArgs);
    if (D.front) D.front(ctx, ctxArgs);
  }

  /* ------------------------- TINTES DE PALETA -----------------------------
   * Sustituye a ctx.filter (muy costoso en rasterizado por software):
   * flash blanco al recibir golpes/cargar, dorado con armadura, oscuro en
   * caída indefensa y anaranjado con quemadura. Se cachea por luchador. */
  const TINTS = {
    flash: c => U.shade(c, 0.72),
    dark: c => U.shade(c, -0.42),
    gold: c => { const k = U.hexToRgb(c); const m = U.mixRgb(k, { r: 255, g: 214, b: 60 }, 0.6); return `rgb(${m.r},${m.g},${m.b})`; },
    fire: c => { const k = U.hexToRgb(c); const m = U.mixRgb(k, { r: 255, g: 110, b: 20 }, 0.5); return `rgb(${m.r},${m.g},${m.b})`; },
    poison: c => { const k = U.hexToRgb(c); const m = U.mixRgb(k, { r: 120, g: 255, b: 80 }, 0.45); return `rgb(${m.r},${m.g},${m.b})`; },
    ghost: c => { const k = U.hexToRgb(c); const m = U.mixRgb(k, { r: 150, g: 210, b: 255 }, 0.55); return `rgb(${m.r},${m.g},${m.b})`; },
    shadow: c => { const k = U.hexToRgb(c); const m = U.mixRgb(k, { r: 40, g: 0, b: 60 }, 0.6); return `rgb(${m.r},${m.g},${m.b})`; }
  };
  function tintPalette(def, pal, mode) {
    const fn = TINTS[mode]; if (!fn) return pal;
    def._tints = def._tints || {};
    const key = mode + (pal === def.palette ? '' : ':' + JSON.stringify(pal));
    if (def._tints[key]) return def._tints[key];
    const out = {};
    for (const k in pal) {
      const v = pal[k];
      out[k] = (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) ? fn(v) : v;
    }
    def._tints[key] = out;
    return out;
  }

  /* ---------------------------- LUCHADOR ---------------------------------- */
  /* v7 · Estilo pantalla LCD: la pose solo cambia cada `n` ticks (o al
   * cambiar de estado), como los viejos juegos de cristal líquido. */
  function lcdPose(f, n) {
    const t = f.tick || 0, c = f._lcd;
    if (!c || t - c.t >= n || t < c.t || c.st !== f.state || c.mv !== f.move) f._lcd = { t, st: f.state, mv: f.move, p: getPose(f) };
    return f._lcd.p;
  }
  function fighterScale(f, rig) { return (f.h / rig.natural) * (f.drawScale || 1); }

  function drawFighter(ctx, f, opts) {
    opts = opts || {};
    if (f.hidden || f.state === NX.ST.DEAD) return;
    const def = f.def, rig = getRig(def), pal = f.palette || def.palette;
    const p = def.lcd ? lcdPose(f, def.lcd) : getPose(f);
    const s = fighterScale(f, rig) * (opts.scale || 1);
    let x = opts.x != null ? opts.x : f.x, y = opts.y != null ? opts.y : f.y;
    if (f.hitlag > 0 && f.shaking) { x += U.rand(-1, 1) * Math.min(6, f.hitlag * 0.5); y += U.rand(-1, 1) * 2; }
    const J = solve(rig, p);

    /* Estela de arma / extremidad en espacio mundo (v4: respeta giros y
     * sigue al puño, pie o arma que golpea según def.limb). */
    if (!opts.noTrail && !def.lcd) {
      const H0 = rig.natural, cr = Math.cos(p.rot || 0), sr = Math.sin(p.rot || 0);
      const W = q => {
        let lx = q.x + p.ox, ly = q.y + p.oy;
        if (p.rot) { const dy = ly + H0 * 0.45; const rx = lx * cr - dy * sr, ry = lx * sr + dy * cr; lx = rx; ly = ry - H0 * 0.45; }
        return { x: x + lx * f.facing * s * p.sx, y: y + ly * s * p.sy };
      };
      const mv = f.move, inAtk = mv && f.state === NX.ST.ATTACK;
      let active = false;
      if (inAtk) {
        const a = mv.def.act;
        active = a ? (mv.frame >= a[0] - 2 && mv.frame <= a[1] + 2) : (function () { const k = moveProgress(mv); return k >= 0.85 && k < 2.1; })();
      }
      if (!f.trail) f.trail = [];
      if (active && !mv.charging) {
        const limbs = mv.def.limb ? [].concat(mv.def.limb) : (rig.weapon ? ['w'] : []);
        for (const L of limbs) {
          let tip, root, wide = 1;
          if (L === 'w') { const t = weaponTip(rig, J, p); if (!t) continue; tip = t; root = J.haF; }
          else if (L === 'hF') { tip = J.haF; root = J.elF; wide = 0.55; }
          else if (L === 'hB') { tip = J.haB; root = J.elB; wide = 0.55; }
          else if (L === 'fF') { tip = J.ftF; root = J.knF; wide = 0.6; }
          else if (L === 'fB') { tip = J.ftB; root = J.knB; wide = 0.6; }
          else continue;
          const a = W(tip), b = W(root);
          f.trail.push({ L, x: a.x, y: a.y, bx: a.x + (b.x - a.x) * wide, by: a.y + (b.y - a.y) * wide, life: 9, max: 9 });
        }
      }
      for (const tpt of f.trail) tpt.life--;
      f.trail = f.trail.filter(tpt => tpt.life > 0);
      if (f.trail.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const wcol = (rig.weapon && rig.weapon.trail) || '#bfe8ff', lcol = (mv && mv.def.trailColor) || pal.accent || '#ffe9b0';
        for (let i = 1; i < f.trail.length; i++) {
          const a = f.trail[i - 1], b = f.trail[i];
          if (a.L !== b.L || Math.hypot(b.x - a.x, b.y - a.y) > 120) continue;
          const isW = b.L === 'w';
          ctx.globalAlpha = (b.life / b.max) * (isW ? 0.7 : 0.42);
          ctx.fillStyle = isW ? wcol : lcol;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.bx, b.by); ctx.lineTo(a.bx, a.by); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f.facing * s * p.sx, s * p.sy);
    let alpha = p.alpha;
    if (f.isInvincibleFlicker && f.isInvincibleFlicker()) alpha *= (Math.floor(f.tick / 3) % 2 ? 0.45 : 0.9);
    ctx.globalAlpha = U.clamp(alpha * (opts.alpha == null ? 1 : opts.alpha), 0, 1);
    const tint = (f.flashTimer > 0 && Math.floor(f.flashTimer / 2) % 2 === 0) || (f.move && f.move.charging && Math.floor(f.tick / 4) % 2 === 0) ? 'flash'
      : f.flashArmor > 0 ? 'gold'
      : f.state === NX.ST.HELPLESS ? 'dark'
      : (f.burn && f.burn.frames > 0 && f.tick % 8 < 4) ? (f.burn.kind === 'poison' ? 'poison' : 'fire')
      : (f.tint || null);
    const palUse = tint ? tintPalette(def, pal, tint) : pal;
    const H = rig.natural;
    if (p.rot) { ctx.translate(0, -H * 0.45); ctx.rotate(p.rot); ctx.translate(0, H * 0.45); }
    ctx.translate(p.ox, p.oy);
    FLAT = !!(def.lcd || rig.flat);
    if (def.render) def.render(ctx, f, J, p, palUse, rig);
    else drawRig(ctx, f, rig, J, p, palUse);
    FLAT = false;
    ctx.restore();

    if (def.drawOverlay) def.drawOverlay(ctx, f, x, y, s);
  }

  /* Dummy para retratos, selección de personajes y victoria. */
  function resolveDef(def) { return def && def.forms ? def.forms[def.portraitForm || 0] : def; }
  function makeDummy(def, state) {
    def = resolveDef(def);
    const ST = NX.ST;
    return {
      def, palette: def.palette, h: (def.stats && def.stats.height) || 80, w: (def.stats && def.stats.width) || 40,
      x: 0, y: 0, facing: 1, state: state || ST.IDLE, stateTime: 60, tick: 0, move: null, ground: true,
      vy: 0, lvy: 0, hitlag: 0, data: {}, meter: 0, percent: 0, expression: () => 'normal', trail: [],
      airJumpAnim: 0, fastFalling: false, tumbling: false, flashTimer: 0, drawScale: 1
    };
  }

  /* Centra la cabeza del luchador en el lienzo (retratos de HUD / selección). */
  function headFrame(d) {
    const rig = getRig(d.def), p = getPose(d), J = solve(rig, p), s = fighterScale(d, rig);
    const r = (rig.body === 'blob' ? rig.blobR : rig.headR * Math.max(rig.headW, rig.headH)) * s;
    const ox = rig.body === 'blob' ? J.hip.x : J.head.x, oy = rig.body === 'blob' ? J.hip.y : J.head.y;
    return { x: ox * s, y: oy * s, r };
  }

  function drawPortrait(canvas, def, opts) {
    opts = opts || {};
    def = resolveDef(def);
    const ctx = canvas.getContext('2d');
    const W = canvas.width, Hc = canvas.height;
    ctx.clearRect(0, 0, W, Hc);
    const d = makeDummy(def, opts.state);
    d.tick = opts.tick || 0; d.stateTime = opts.stateTime == null ? 60 : opts.stateTime;
    d.facing = opts.facing || 1;
    ctx.save();
    if (opts.full) {
      const fit = (Hc * 0.86) / d.h;
      ctx.translate(W / 2, Hc * 0.95); ctx.scale(fit, fit);
    } else {
      const hf = headFrame(d);
      const fit = (Math.min(W, Hc) * (def.portraitZoom || 0.34)) / hf.r;
      ctx.translate(W * 0.5 - hf.x * fit, Hc * 0.56 - hf.y * fit); ctx.scale(fit, fit);
    }
    drawFighter(ctx, d, { noTrail: true });
    ctx.restore();
  }

  function drawStockIcon(canvas, def, color) {
    def = resolveDef(def);
    const ctx = canvas.getContext('2d');
    const W = canvas.width, Hc = canvas.height;
    ctx.clearRect(0, 0, W, Hc);
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, Hc / 2, W / 2 - 1, 0, U.TAU); ctx.closePath();
    ctx.fillStyle = color || '#fff'; ctx.fill(); ctx.clip();
    const d = makeDummy(def);
    const hf = headFrame(d);
    const fit = (W * 0.4) / hf.r;
    ctx.translate(W * 0.5 - hf.x * fit, Hc * 0.56 - hf.y * fit); ctx.scale(fit, fit);
    drawFighter(ctx, d, { noTrail: true });
    ctx.restore();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, Hc / 2, W / 2 - 1, 0, U.TAU); ctx.stroke();
  }

  NX.Render = { EASE,
    OUT, POSES, SWORD, BASE, AIRBASE, getRig, getPose, solve, drawRig, drawFighter, drawWeapon, drawFace,
    makeDummy, resolveDef, drawPortrait, drawStockIcon, moveProgress, fighterScale, tintPalette, TINTS,
    limb, disc, ellipse, poly, roundTrap, pt, along,
    tone, orb, shoe, shadeStroke, volumeLinear, volumeRadial, LIGHT
  };
})(window.NX = window.NX || {});
