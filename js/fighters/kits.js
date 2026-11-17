/* ==========================================================================
 * NEXUS CLASH — js/fighters/kits.js  (v4)
 * Ataques normales ÚNICOS por luchador.
 *  1) TPL: biblioteca de ~55 plantillas de ataque. Cada una define hitboxes,
 *     tiempos y una animación por fotogramas clave (anticipación → impacto
 *     → inercia → recuperación) en unidades de un luchador de 80 px.
 *  2) KITS: qué plantilla usa cada luchador en cada normal (jab, tilts,
 *     smashes, aéreos y ataque en carrera) y sus ajustes.
 *  3) build(def): escala alcance, daño y velocidad según el perfil del
 *     luchador. fighter.js mezcla el resultado sobre el moveset estándar.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U, PI = Math.PI, TAU = PI * 2;

  /* ------------------------------ AYUDAS ---------------------------------- */
  const H = (f0, f1, x, y, r, dmg, ang, bkb, kbg, o) => Object.assign({ f: [f0, f1], x, y, r, dmg, ang, bkb, kbg }, o || {});
  const K = (f, p, e) => ({ f, p: p || {}, e: e || 'inout' });
  const M = (...a) => Object.assign({}, ...a);
  const CR = { lF1: 1.25, lF2: -2.1, lB1: 0.15, lB2: -1.7, lean: 0.35 };            // agachado
  const GUARD = { aF1: 0.75, aF2: 1.85, aB1: 0.55, aB2: 1.95, lean: 0.08 };           // guardia
  const STEP = { lF1: 0.8, lF2: -0.4, lB1: -0.75, lB2: 0 };                           // zancada
  const SMASH = { at: 9, max: 60, mult: 1.4 };
  const charge = at => Object.assign({}, SMASH, { at });
  /* Ráfaga alternante para golpes múltiples (puños, patadas o arma). */
  function flurry(f0, f1, kind, step) {
    const out = [];
    for (let fr = f0, i = 0; fr <= f1; fr += step || 2, i++) {
      const a = i % 2 === 0;
      if (kind === 'kick') out.push(K(fr, { lF1: a ? 1.65 : 1.1, lF2: a ? 0 : -1.7, lB1: a ? -0.3 : 0.4, lB2: a ? -1.4 : 0, lean: -0.25, aF1: -0.3, aB1: 0.8 }, 'out'));
      else if (kind === 'slash') out.push(K(fr, { aF1: a ? 2.3 : 0.9, aF2: 0.1, wpn: a ? 0.3 : 0, lean: a ? 0.05 : 0.25, lF1: 0.6, lB1: -0.5 }, 'out'));
      else if (kind === 'up') out.push(K(fr, { aF1: a ? 3.0 : 2.3, aF2: a ? 0 : 0.6, aB1: a ? 2.3 : 3.0, aB2: a ? 0.6 : 0, lean: -0.08 }, 'out'));
      else out.push(K(fr, { aF1: a ? 1.62 : 0.7, aF2: a ? 0 : 1.7, aB1: a ? 0.7 : 1.62, aB2: a ? 1.7 : 0, lean: 0.2, lF1: 0.55, lB1: -0.5 }, 'out'));
    }
    return out;
  }

  /* ============================ PLANTILLAS ================================ */
  const TPL = {};

  /* ------------------------------- JABS ----------------------------------- */
  function jabPair(o) {
    const sw = o.sword;
    return {
      jab: sw ? { frames: 18, chain: [6, 16], next: 'jab2', limb: 'w', hitboxes: [
          H(4, 5, 34, -40, 14, 3, 70, 25, 30, { effect: 'slash' }), H(4, 5, 18, -44, 10, 3, 75, 25, 30, { effect: 'slash' })],
        anim: [K(2, { aF1: 2.4, aF2: 0.2, wpn: 0.5, lean: -0.05 }, 'out'), K(4, { aF1: 1.2, aF2: 0, wpn: 0, lean: 0.18 }, 'back'), K(9, { aF1: 1.05, aF2: 0.1, wpn: 0.1, lean: 0.15 }, 'out')] }
        : { frames: o.heavy ? 20 : 16, chain: [5, o.heavy ? 18 : 15], next: 'jab2', limb: 'hF', hitboxes: [
          H(3, 4, 24, -46, 11, o.heavy ? 3.5 : 2.5, 78, 16, 25), H(3, 4, 12, -46, 9, o.heavy ? 3.5 : 2.5, 85, 16, 25)],
        anim: [K(1, M(GUARD, { aF1: 0.6, aF2: 1.8, aB1: 0.9, aB2: 1.7, lean: -0.04 }), 'out'), K(3, { aF1: 1.62, aF2: 0, aB1: 0.7, aB2: 1.9, lean: 0.2, lF1: 0.4, lB1: -0.35 }, 'back'), K(8, { aF1: 1.5, aF2: 0.15, aB1: 0.75, aB2: 1.85, lean: 0.16, lF1: 0.4, lB1: -0.35 }, 'out')] },
      jab2: { frames: o.heavy ? 22 : 18, chain: [5, o.heavy ? 20 : 17], next: 'jab3', limb: 'hB', hitboxes: [
          H(3, 4, 26, -44, 11, o.heavy ? 3.5 : 2.2, 80, 16, 25)],
        anim: [K(1, { aB1: 0.5, aB2: 1.9, aF1: 1.1, aF2: 0.8, lean: 0.1 }, 'out'), K(3, M(STEP, { aB1: 1.62, aB2: 0, aF1: 0.3, aF2: 1.5, lean: 0.27 }), 'back'), K(8, M(STEP, { aB1: 1.45, aB2: 0.2, aF1: 0.4, aF2: 1.4, lean: 0.21 }), 'out')] }
    };
  }
  const FINISH = {
    kick: { limb: 'fF', hb: [H(5, 7, 32, -38, 15, 4.5, 45, 42, 85)],
      anim: [K(3, { lF1: 1.2, lF2: -2.2, lean: -0.12, aF1: 0.6, aF2: 1.8 }, 'out'), K(5, { lF1: 1.68, lF2: 0, lean: -0.3, aF1: -0.3, aB1: 0.8 }, 'back'), K(11, { lF1: 1.55, lF2: -0.2, lean: -0.26, aF1: -0.2, aB1: 0.7 }, 'out')] },
    punch: { limb: 'hF', hb: [H(5, 7, 30, -44, 15, 4.5, 40, 42, 85)],
      anim: [K(3, { aF1: -0.2, aF2: 1.6, lean: -0.15, lB1: -0.4 }, 'out'), K(5, { aF1: 1.6, aF2: 0, aB1: -0.4, lean: 0.34, lF1: 0.75, lF2: -0.4, lB1: -0.75, lB2: 0 }, 'back'), K(11, { aF1: 1.5, aF2: 0.1, lean: 0.29, lF1: 0.7, lB1: -0.7 }, 'out')] },
    slash: { limb: 'w', hb: [H(5, 7, 40, -44, 18, 4.5, 40, 40, 90, { effect: 'slash' })],
      anim: [K(3, { aF1: 3.0, aF2: 0.3, wpn: 0.4, lean: -0.15 }, 'out'), K(5, M(STEP, { aF1: 1.0, aF2: 0, wpn: 0, lean: 0.36 }), 'back'), K(11, M(STEP, { aF1: 0.7, aF2: 0.1, wpn: 0.1, lean: 0.3 }), 'out')] },
    palm: { limb: 'hF', burst: 5, hb: [H(5, 7, 34, -44, 17, 4.5, 45, 45, 80, { effect: 'magic' })],
      anim: [K(3, { aF1: 0.4, aF2: 1.9, aB1: 0.3, aB2: 1.9, lean: -0.1 }, 'out'), K(5, M(STEP, { aF1: 1.57, aF2: 0, aB1: 1.42, aB2: 0.15, lean: 0.26 }), 'back'), K(12, M(STEP, { aF1: 1.5, aF2: 0.05, aB1: 1.35, lean: 0.22 }), 'out')] },
    knee: { limb: 'fF', hb: [H(5, 7, 20, -40, 14, 5, 60, 40, 90)],
      anim: [K(3, { lF1: 0.6, lF2: -1.4, aF1: 1.0, aB1: 0.9 }, 'out'), K(5, { lF1: 1.95, lF2: -2.6, lean: 0.08, aF1: 1.3, aF2: 0.4, aB1: 1.1, oy: -3 }, 'back'), K(11, { lF1: 1.85, lF2: -2.5, lean: 0.05, aF1: 1.2, aB1: 1.0 }, 'out')] },
    haymaker: { limb: 'hF', shake: 5, hb: [H(6, 8, 34, -44, 18, 6, 40, 45, 92), H(6, 8, 16, -44, 13, 5.5, 45, 45, 88)],
      anim: [K(4, { aF1: -0.9, aF2: 1.2, lean: -0.3, aB1: 1.0, aB2: 1.4, lF1: 0.5, lB1: -0.4 }, 'out'), K(6, { aF1: 1.65, aF2: 0, aB1: -0.6, aB2: 0.6, lean: 0.48, lF1: 0.9, lF2: -0.5, lB1: -0.85, lB2: 0 }, 'back'), K(14, { aF1: 1.5, aF2: 0.1, lean: 0.42, lF1: 0.85, lB1: -0.8 }, 'out')] }
  };
  TPL.jabCombo = o => {
    const fin = FINISH[o.fin || 'kick'], pair = jabPair(o);
    return { __multi: Object.assign(pair, { jab3: { frames: o.heavy ? 34 : 30, limb: fin.limb, hitboxes: fin.hb, anim: fin.anim, burst: fin.burst, shake: fin.shake } }) };
  };
  TPL.jabHeavy = o => TPL.jabCombo(Object.assign({ heavy: true, fin: 'haymaker' }, o));
  TPL.jabSword2 = o => {
    const p = jabPair({ sword: true });
    p.jab2 = { frames: 28, limb: 'w', hitboxes: [H(4, 6, 38, -50, 17, 4, 40, 40, 80, { effect: 'slash' }), H(4, 6, 18, -52, 12, 4, 45, 40, 80, { effect: 'slash' })],
      anim: [K(2, { aF1: 0.6, aF2: 0.2, wpn: 0.3, lean: 0.1 }, 'out'), K(4, M(STEP, { aF1: 2.6, aF2: 0, wpn: 0, lean: -0.12 }), 'back'), K(10, M(STEP, { aF1: 2.75, aF2: 0.05, wpn: 0.05, lean: -0.15 }), 'out')] };
    return { __multi: p };
  };
  TPL.jabRapid = o => {
    const kind = o.kind || 'punch', pair = jabPair({ sword: kind === 'slash' });
    const limb = kind === 'kick' ? 'fF' : (kind === 'slash' ? 'w' : ['hF', 'hB']);
    const fin = kind === 'kick' ? { lF1: 1.75, lF2: 0, lean: -0.32, aF1: -0.4, aB1: 0.9 }
      : kind === 'slash' ? M(STEP, { aF1: 1.0, aF2: 0, wpn: 0, lean: 0.4 })
      : M(STEP, { aF1: 1.65, aF2: 0, aB1: -0.5, lean: 0.42 });
    pair.jab3 = { frames: 42, limb, loop: { from: 7, to: 21, max: 36 }, hitboxes: [
        H(4, 23, 30, -42, 16, 0.6, 361, 6, 8, { rehit: 3, group: 1, effect: kind === 'slash' ? 'slash' : undefined }),
        H(28, 30, 34, -42, 18, 2.5, 45, 55, 130, { group: 2, effect: kind === 'slash' ? 'slash' : undefined })],
      anim: [K(2, { lean: 0.1 }, 'out')].concat(flurry(4, 24, kind === 'slash' ? 'slash' : kind), [K(26, { aF1: 0.2, aF2: 1.6, lF1: 1.0, lF2: -2.0, lean: -0.1 }, 'out'), K(28, fin, 'back'), K(34, fin, 'out')]) };
    return { __multi: pair };
  };

  /* ---------------------------- FORWARD TILT ------------------------------ */
  TPL.ftiltKick = () => ({ frames: 26, limb: 'fF', hitboxes: [H(6, 8, 38, -38, 14, 8.5, 361, 20, 95), H(6, 8, 20, -38, 11, 7.5, 361, 20, 90)],
    anim: [K(4, { lF1: 1.1, lF2: -2.2, lean: -0.1, aF1: 0.7, aF2: 1.6 }, 'out'), K(6, { lF1: 1.62, lF2: 0, lean: -0.3, aF1: -0.35, aB1: 0.75 }, 'back'), K(12, { lF1: 1.5, lF2: -0.15, lean: -0.26, aF1: -0.3, aB1: 0.7 }, 'out')] });
  TPL.ftiltPunch = () => ({ frames: 30, limb: 'hF', vel: [{ f: [4, 7], vx: 3 }], hitboxes: [H(8, 10, 36, -46, 15, 10, 361, 25, 92), H(8, 10, 18, -46, 12, 9, 361, 25, 90)],
    anim: [K(5, { aF1: -0.4, aF2: 1.7, lean: -0.2, aB1: 0.9, aB2: 1.6, lF1: 0.5, lB1: -0.3 }, 'out'), K(8, { aF1: 1.6, aF2: 0, lean: 0.38, aB1: -0.5, aB2: 0.6, lF1: 0.85, lF2: -0.4, lB1: -0.8, lB2: 0 }, 'back'), K(15, { aF1: 1.5, aF2: 0.15, lean: 0.32, aB1: -0.4, lF1: 0.8, lB1: -0.75 }, 'out')] });
  TPL.ftiltSlash = () => ({ frames: 28, limb: 'w', hitboxes: [H(7, 10, 44, -40, 17, 9.5, 361, 25, 92, { effect: 'slash' }), H(7, 10, 22, -42, 12, 8.5, 361, 25, 90, { effect: 'slash' })],
    anim: [K(5, { aF1: 2.8, aF2: 0.3, wpn: 0.4, lean: -0.18 }, 'out'), K(7, M(STEP, { aF1: 1.2, aF2: 0, wpn: 0, lean: 0.32 }), 'back'), K(10, M(STEP, { aF1: 0.6, aF2: 0, wpn: 0, lean: 0.34 }), 'out'), K(15, M(STEP, { aF1: 0.5, aF2: 0.1, wpn: 0.1, lean: 0.3 }), 'out')] });
  TPL.ftiltChop = o => ({ frames: 34, limb: o.limb || 'w', shake: 11, dust: [11, 0], hitboxes: [H(11, 13, 40, -26, 18, 12, 361, 30, 95), H(11, 13, 20, -50, 14, 11, 361, 30, 92)],
    anim: [K(8, { aF1: 3.3, aF2: 0.2, aB1: 3.0, aB2: 0.3, wpn: 0.3, lean: -0.3, lF1: 0.5, lB1: -0.3 }, 'out'), K(11, { aF1: 1.0, aF2: 0, aB1: 0.9, aB2: 0, wpn: 0, lean: 0.5, lF1: 0.85, lF2: -0.5, lB1: -0.75, lB2: 0 }, 'back'), K(18, { aF1: 0.85, aF2: 0.05, aB1: 0.8, wpn: 0.05, lean: 0.48, lF1: 0.8, lB1: -0.7 }, 'out')] });
  TPL.ftiltDouble = o => ({ frames: 32, limb: o.limb || ['hF', 'hB'], hitboxes: [H(5, 6, 30, -44, 14, 4, 70, 32, 18, { group: 1 }), H(11, 13, 36, -42, 16, 6.5, 361, 30, 90, { group: 2 })],
    anim: [K(3, M(GUARD, { aF1: 0.6, aF2: 1.8 }), 'out'), K(5, { aF1: 1.62, aF2: 0, aB1: 0.6, aB2: 1.8, lean: 0.2 }, 'back'), K(9, { aF1: 0.8, aF2: 1.4, aB1: 0.6, aB2: 1.8, lean: 0.1 }, 'out'), K(11, M(STEP, { aB1: 1.65, aB2: 0, aF1: 0.3, aF2: 1.6, lean: 0.34 }), 'back'), K(17, M(STEP, { aB1: 1.5, aB2: 0.15, aF1: 0.35, aF2: 1.5, lean: 0.28 }), 'out')] });
  TPL.ftiltPalm = () => ({ frames: 30, limb: 'hF', burst: 8, hitboxes: [H(8, 11, 44, -44, 19, 9, 361, 30, 88, { effect: 'magic' }), H(8, 11, 22, -44, 12, 7, 361, 30, 85, { effect: 'magic' })],
    anim: [K(5, { aF1: 0.3, aF2: 2.0, aB1: 0.2, aB2: 2.0, lean: -0.12 }, 'out'), K(8, M(STEP, { aF1: 1.57, aF2: -0.05, aB1: 1.45, aB2: 0.1, lean: 0.24 }), 'back'), K(15, M(STEP, { aF1: 1.5, aF2: 0, aB1: 1.4, lean: 0.2 }), 'out')] });
  TPL.ftiltThrust = o => ({ frames: 28, limb: o.limb || 'w', vel: [{ f: [5, 8], vx: 2.5 }], hitboxes: [H(7, 9, 58, -42, 11, 9, 361, 25, 90, { effect: o.limb === 'hF' ? undefined : 'slash' }), H(7, 9, 34, -42, 11, 8, 361, 25, 88)],
    anim: [K(5, { aF1: 0.9, aF2: 1.6, wpn: 0.3, lean: -0.18, lF1: 0.4, lB1: -0.3 }, 'out'), K(7, { aF1: 1.57, aF2: 0, wpn: 0, lean: 0.4, lF1: 1.05, lF2: -0.6, lB1: -0.95, lB2: 0 }, 'back'), K(14, { aF1: 1.5, aF2: 0.1, wpn: 0.05, lean: 0.34, lF1: 1.0, lB1: -0.9 }, 'out')] });
  TPL.ftiltSpinKick = () => ({ frames: 30, limb: 'fF', hitboxes: [H(8, 11, 36, -54, 16, 9.5, 361, 25, 95), H(8, 11, 18, -48, 12, 8, 361, 25, 90)],
    anim: [K(5, { lF1: 0.7, lF2: -2.0, lean: 0.15, aF1: 1.1, aB1: -0.7, rot: 0.15 }, 'out'), K(8, { lF1: 2.15, lF2: 0, lean: -0.55, aF1: -0.8, aB1: 1.2, rot: -0.1, headTilt: 0.2 }, 'back'), K(15, { lF1: 2.0, lF2: -0.15, lean: -0.5, aF1: -0.7, aB1: 1.1 }, 'out')] });

  /* ------------------------------ UP TILT --------------------------------- */
  TPL.utiltArc = () => ({ frames: 28, limb: 'hF', hitboxes: [H(5, 7, 24, -70, 14, 6, 96, 40, 110), H(8, 10, 0, -90, 16, 7, 92, 40, 105, { dir: 'auto' }), H(11, 12, -20, -72, 13, 6, 110, 40, 100)],
    anim: [K(3, { aF1: 0.6, aF2: 1.4, lean: 0.1 }, 'out'), K(5, { aF1: 2.0, aF2: 0.2, lean: 0.05 }, 'back'), K(8, { aF1: 3.0, aF2: 0.1, lean: -0.1 }, 'lin'), K(12, { aF1: 3.9, aF2: 0.2, lean: -0.2, headTilt: -0.3 }, 'out'), K(16, { aF1: 3.7, aF2: 0.3, lean: -0.15 }, 'out')] });
  TPL.utiltKick = () => ({ frames: 30, limb: 'fF', hitboxes: [H(6, 9, 14, -94, 16, 8, 85, 40, 105), H(6, 9, 20, -64, 12, 7, 88, 40, 100)],
    anim: [K(4, { lF1: 0.9, lF2: -1.8, lean: 0.1, aF1: 0.8 }, 'out'), K(6, { lF1: 2.95, lF2: 0, lB1: -0.1, lean: -0.35, aF1: -0.6, aB1: 0.9 }, 'back'), K(13, { lF1: 2.8, lF2: -0.1, lean: -0.3, aF1: -0.5, aB1: 0.8 }, 'out')] });
  TPL.utiltSword = () => ({ frames: 30, limb: 'w', hitboxes: [H(6, 8, 36, -60, 16, 8, 80, 40, 100, { effect: 'slash' }), H(9, 11, 0, -98, 20, 9, 90, 40, 105, { dir: 'auto', effect: 'slash' }), H(12, 13, -30, -66, 15, 7, 110, 40, 100, { effect: 'slash' })],
    anim: [K(4, { aF1: 0.4, aF2: 0.2, wpn: 0.2, lean: 0.15 }, 'out'), K(6, { aF1: 1.9, aF2: 0, wpn: 0 }, 'back'), K(9, { aF1: 3.1, aF2: 0, wpn: 0, lean: -0.12 }, 'lin'), K(13, { aF1: 4.1, aF2: 0.1, wpn: 0, lean: -0.2 }, 'out'), K(18, { aF1: 3.9, aF2: 0.2, wpn: 0.2, lean: -0.15 }, 'out')] });
  TPL.utiltHeadbutt = () => ({ frames: 30, hitboxes: [H(7, 10, 14, -86, 18, 9, 90, 45, 100), H(7, 10, 8, -64, 13, 8, 92, 45, 95)],
    anim: [K(5, { lean: 0.35, headTilt: 0.4, lF1: 0.8, lF2: -1.5, lB1: 0.1, lB2: -1.2, aF1: -0.3 }, 'out'), K(7, { lean: -0.3, headTilt: -0.55, aF1: -0.5, aB1: -0.7, oy: -6 }, 'back'), K(14, { lean: -0.25, headTilt: -0.45, oy: -4 }, 'out')] });
  TPL.utiltBurst = () => ({ frames: 30, limb: ['hF', 'hB'], burst: 8, hitboxes: [H(8, 12, 10, -98, 22, 8, 90, 40, 105, { effect: 'magic', dir: 'auto' }), H(8, 12, 10, -68, 14, 6.5, 92, 40, 100, { effect: 'magic' })],
    anim: [K(5, { aF1: 0.4, aF2: 1.8, aB1: 0.3, aB2: 1.8, lean: 0.08, lF1: 0.6, lF2: -1.2 }, 'out'), K(8, { aF1: 3.0, aF2: 0, aB1: 2.9, aB2: 0.1, lean: -0.08, oy: -3 }, 'back'), K(14, { aF1: 2.9, aF2: 0.1, aB1: 2.8, aB2: 0.2 }, 'out')] });

  /* ----------------------------- DOWN TILT -------------------------------- */
  TPL.dtiltSweep = () => ({ frames: 22, limb: 'fF', hitboxes: [H(5, 7, 40, -6, 13, 6.5, 75, 40, 55), H(5, 7, 20, -6, 11, 5.5, 75, 40, 50)],
    anim: [K(3, { lF1: 1.0, lF2: -2.2, lB1: 0.2, lB2: -1.9, lean: 0.5, aF1: 0.6 }, 'out'), K(5, { lF1: 1.52, lF2: -0.05, lB1: 0.2, lB2: -1.9, lean: 0.55, aF1: 1.0, aB1: 0.4 }, 'back'), K(10, { lF1: 1.45, lF2: -0.1, lB1: 0.2, lB2: -1.9, lean: 0.55 }, 'out')] });
  TPL.dtiltPoke = o => ({ frames: 18, limb: o.limb || 'hF', hitboxes: [H(4, 5, 38, -14, 12, 5, 70, 35, 45, { effect: o.limb === 'w' ? 'slash' : undefined }), H(4, 5, 20, -14, 10, 4.5, 70, 35, 45)],
    anim: [K(2, M(CR, { aF1: 0.8, aF2: 1.4, wpn: 0.4 }), 'out'), K(4, M(CR, { aF1: 1.75, aF2: 0, wpn: 0, lean: 0.6 }), 'back'), K(8, M(CR, { aF1: 1.7, aF2: 0.1, wpn: 0.05, lean: 0.55 }), 'out')] });
  TPL.dtiltSlash = () => ({ frames: 24, limb: 'w', hitboxes: [H(6, 8, 50, -10, 15, 7.5, 30, 40, 60, { effect: 'slash' }), H(6, 8, 26, -12, 12, 6.5, 30, 40, 55, { effect: 'slash' })],
    anim: [K(4, M(CR, { aF1: 2.6, aF2: 0.2, wpn: 0.4, lean: 0.4 }), 'out'), K(6, M(CR, { aF1: 1.45, aF2: 0, wpn: 0, lean: 0.55 }), 'back'), K(9, M(CR, { aF1: 1.2, aF2: 0, wpn: 0, lean: 0.55 }), 'out'), K(13, M(CR, { aF1: 1.15, aF2: 0.1, wpn: 0.1 }), 'out')] });
  TPL.dtiltSlap = o => ({ frames: 30, limb: o.limb || 'hF', shake: 9, dust: [9, 0], hitboxes: [H(9, 11, 36, -6, 20, 9, 80, 45, 70), H(9, 11, 16, -10, 14, 8, 80, 45, 65)],
    anim: [K(6, M(CR, { aF1: 3.0, aF2: 0.2, wpn: 0.3, lean: 0.2 }), 'out'), K(9, M(CR, { aF1: 1.45, aF2: 0, wpn: 0, lean: 0.62, oy: 3 }), 'back'), K(16, M(CR, { aF1: 1.4, aF2: 0.1, lean: 0.6 }), 'out')] });

  /* ---------------------------- DASH ATTACK ------------------------------- */
  TPL.dashKick = () => ({ frames: 34, slide: 0.96, limb: 'fF', hitboxes: [H(6, 9, 28, -40, 17, 10, 50, 55, 72), H(10, 18, 28, -40, 14, 6, 60, 40, 60)],
    anim: [K(3, { lean: 0.4, lF1: 0.9, lF2: -1.8 }, 'out'), K(6, { lF1: 1.75, lF2: 0, lB1: -0.4, lB2: -1.5, lean: -0.2, aF1: -0.6, aB1: 1.0, planted: false, oy: -8 }, 'back'), K(18, { lF1: 1.65, lF2: -0.1, lB1: -0.4, lB2: -1.4, lean: -0.2, planted: false, oy: -6 }, 'lin'), K(24, { lean: 0.2 }, 'out')] });
  TPL.dashShoulder = () => ({ frames: 36, slide: 0.97, vel: [{ f: [5, 12], vx: 7 }], hitboxes: [H(7, 12, 24, -48, 20, 11, 45, 60, 70), H(13, 18, 24, -48, 16, 7, 50, 40, 60)],
    anim: [K(5, { lean: 0.15, aF1: -0.4, aB1: -0.6 }, 'out'), K(7, { lean: 0.62, aF1: 0.3, aF2: 1.9, aB1: -0.7, aB2: 0.8, lF1: 1.0, lF2: -0.6, lB1: -0.9, lB2: -0.2, headTilt: 0.2 }, 'back'), K(18, { lean: 0.55, aF1: 0.4, aF2: 1.8, aB1: -0.6, lF1: 0.9, lB1: -0.85 }, 'lin'), K(26, { lean: 0.3 }, 'out')] });
  TPL.dashSlide = () => ({ frames: 36, slide: 0.985, limb: 'fF', hitboxes: [H(5, 16, 28, -10, 15, 8, 75, 55, 60), H(17, 22, 28, -10, 12, 5, 70, 40, 50)],
    anim: [K(4, { lF1: 1.5, lF2: 0, lB1: 0.4, lB2: -1.8, lean: -0.6, aF1: -1.2, aB1: -1.4, oy: 4 }, 'back'), K(20, { lF1: 1.5, lF2: 0, lB1: 0.4, lB2: -1.8, lean: -0.55, aF1: -1.1, aB1: -1.3, oy: 4 }, 'lin'), K(28, M(CR, {}), 'out')] });
  TPL.dashSlash = () => ({ frames: 34, slide: 0.95, limb: 'w', vel: [{ f: [4, 8], vx: 6 }], hitboxes: [H(7, 10, 44, -38, 19, 11, 40, 55, 75, { effect: 'slash' }), H(11, 14, 40, -38, 15, 7, 45, 40, 60, { effect: 'slash' })],
    anim: [K(5, { aF1: 2.9, aF2: 0.3, wpn: 0.4, lean: 0.3 }, 'out'), K(7, { aF1: 0.9, aF2: 0, wpn: 0, lean: 0.6, lF1: 1.2, lF2: -0.5, lB1: -0.9, lB2: -0.4 }, 'back'), K(16, { aF1: 0.6, aF2: 0.05, wpn: 0.1, lean: 0.55, lF1: 1.1, lB1: -0.85 }, 'out')] });
  TPL.dashSpin = o => ({ frames: 42, slide: 0.97, limb: o.limb || ['hF', 'hB'], hitboxes: [H(6, 22, 0, -40, 26, 1.8, 80, 30, 10, { rehit: 4, dir: 'auto', group: 1 }), H(24, 26, 0, -40, 28, 4, 45, 55, 95, { dir: 'auto', group: 2 })],
    anim: [K(4, { aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, tuck: 0.3, wpn: 0 }, 'out'), K(24, { rot: TAU * 2, aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, wpn: 0, lF1: 0.6, lB1: -0.5 }, 'lin'), K(28, { rot: TAU * 2.12, aF1: 1.5, aB1: -1.5, wpn: 0 }, 'out')] });
  TPL.dashCartwheel = () => ({ frames: 40, slide: 0.97, limb: ['fF', 'fB'], hitboxes: [H(7, 10, 20, -54, 18, 6, 80, 40, 40, { group: 1 }), H(14, 17, 30, -30, 18, 7, 45, 50, 80, { group: 2 })],
    anim: [K(5, { tuck: 0.2, lean: 0.5, aF1: 2.0, aB1: 2.0 }, 'out'), K(11, { rot: PI, lF1: 1.4, lF2: 0, lB1: -1.4, lB2: 0, aF1: 3.0, aB1: 3.0, planted: false, oy: -8 }, 'lin'), K(17, { rot: TAU, lF1: 1.2, lF2: -0.1, lB1: -1.2, aF1: 2.6, aB1: 2.6, planted: false }, 'out'), K(24, { lean: 0.2 }, 'out')] });
  TPL.dashBurst = () => ({ frames: 36, slide: 0.95, limb: ['hF', 'hB'], burst: 8, hitboxes: [H(8, 12, 36, -44, 22, 10, 50, 55, 70, { effect: 'magic' }), H(8, 12, 16, -44, 14, 8, 50, 50, 65, { effect: 'magic' })],
    anim: [K(5, { aF1: 0.2, aF2: 2.0, aB1: 0.1, aB2: 2.0, lean: 0.2 }, 'out'), K(8, { aF1: 1.6, aF2: 0, aB1: 1.5, aB2: 0, lean: 0.5, lF1: 1.0, lF2: -0.4, lB1: -0.9 }, 'back'), K(18, { aF1: 1.5, aB1: 1.4, lean: 0.45, lF1: 0.9, lB1: -0.85 }, 'out')] });

  /* --------------------------- FORWARD SMASH ------------------------------ */
  TPL.fsmashPunch = () => ({ frames: 50, charge: charge(9), limb: 'hF', shake: 15, vel: [{ f: [13, 16], vx: 3 }], hitboxes: [H(15, 18, 44, -44, 19, 16, 361, 30, 100), H(15, 18, 24, -44, 14, 14, 361, 30, 95)],
    anim: [K(9, { aF1: -1.0, aF2: 1.4, aB1: 1.0, aB2: 1.4, lean: -0.35, lF1: 0.5, lB1: -0.5 }, 'out'), K(15, { aF1: 1.62, aF2: 0, aB1: -0.8, aB2: 0.5, lean: 0.54, lF1: 0.95, lF2: -0.4, lB1: -0.9, lB2: 0 }, 'back'), K(24, { aF1: 1.5, aF2: 0.1, aB1: -0.7, lean: 0.48, lF1: 0.9, lB1: -0.85 }, 'out')] });
  TPL.fsmashSword = () => ({ frames: 52, charge: charge(10), limb: 'w', shake: 16, hitboxes: [H(16, 19, 58, -36, 21, 17, 361, 32, 100, { effect: 'slash' }), H(16, 19, 28, -44, 15, 15, 361, 32, 96, { effect: 'slash' })],
    anim: [K(10, { aF1: 3.4, aF2: 0.2, aB1: 2.8, aB2: 0.3, wpn: 0.3, lean: -0.4, lF1: 0.4, lB1: -0.4 }, 'out'), K(16, { aF1: 0.9, aF2: 0, aB1: 0.8, aB2: 0, wpn: 0, lean: 0.62, lF1: 0.95, lF2: -0.5, lB1: -0.85, lB2: 0 }, 'back'), K(28, { aF1: 0.6, aF2: 0.05, aB1: 0.7, wpn: 0.05, lean: 0.55, lF1: 0.9, lB1: -0.8 }, 'out')] });
  TPL.fsmashKick = () => ({ frames: 48, charge: charge(8), limb: 'fF', hitboxes: [H(14, 17, 40, -48, 18, 15.5, 361, 30, 100), H(14, 17, 20, -44, 13, 13.5, 361, 30, 95)],
    anim: [K(8, { lF1: 0.8, lF2: -2.0, lean: 0.15, aF1: 1.2, aB1: -1.0, rot: -0.25 }, 'out'), K(14, { lF1: 1.85, lF2: 0, lean: -0.5, aF1: -0.7, aB1: 1.3, rot: 0.12 }, 'back'), K(22, { lF1: 1.75, lF2: -0.1, lean: -0.45, aF1: -0.6, aB1: 1.2 }, 'out')] });
  TPL.fsmashDouble = o => ({ frames: 52, charge: charge(8), limb: o.limb || ['hB', 'hF'], hitboxes: [H(12, 13, 36, -44, 16, 4, 50, 30, 25, { group: 1 }), H(18, 21, 44, -44, 19, 12, 361, 32, 100, { group: 2 })],
    anim: [K(8, { aF1: 0.4, aF2: 1.9, aB1: 0.2, aB2: 1.9, lean: -0.2, wpn: 0.3 }, 'out'), K(12, { aB1: 1.6, aB2: 0, aF1: 2.4, aF2: 0.4, lean: 0.25, wpn: 0.2 }, 'back'), K(15, { aB1: 0.6, aB2: 1.6, aF1: 2.6, aF2: 0.3, lean: 0 }, 'out'), K(18, M(STEP, { aF1: 1.0, aF2: 0, wpn: 0, aB1: 0.4, aB2: 1.6, lean: 0.52 }), 'back'), K(28, M(STEP, { aF1: 0.9, aF2: 0.1, lean: 0.46 }), 'out')] });
  TPL.fsmashBlast = () => ({ frames: 52, charge: charge(10), limb: ['hF', 'hB'], burst: 17, shake: 17, hitboxes: [H(17, 21, 58, -44, 24, 16, 361, 32, 98, { effect: 'magic' }), H(17, 21, 30, -44, 15, 12, 361, 32, 92, { effect: 'magic' })],
    anim: [K(10, { aF1: 0.2, aF2: 2.0, aB1: 0.1, aB2: 2.0, lean: -0.3, lF1: 0.4, lB1: -0.4 }, 'out'), K(17, M(STEP, { aF1: 1.57, aF2: 0, aB1: 1.5, aB2: 0.05, lean: 0.36 }), 'back'), K(28, M(STEP, { aF1: 1.5, aF2: 0.1, aB1: 1.45, lean: 0.3 }), 'out')] });
  TPL.fsmashHammer = o => ({ frames: 56, charge: charge(12), limb: o.limb || 'w', shake: 20, dust: [20, 0], hitboxes: [H(20, 23, 46, -14, 24, 18, 45, 32, 100), H(20, 23, 26, -56, 16, 15, 361, 30, 95)],
    anim: [K(12, { aF1: 3.5, aF2: 0.1, aB1: 3.3, aB2: 0.2, wpn: 0.2, lean: -0.45, lF1: 0.5, lB1: -0.35 }, 'out'), K(20, { aF1: 1.05, aF2: 0, aB1: 0.95, aB2: 0, wpn: 0, lean: 0.62, lF1: 1.0, lF2: -0.6, lB1: -0.8, lB2: 0, oy: 2 }, 'back'), K(32, { aF1: 0.95, aF2: 0.05, aB1: 0.9, wpn: 0.05, lean: 0.58, lF1: 0.95, lB1: -0.78 }, 'out')] });
  TPL.fsmashThrust = o => ({ frames: 50, charge: charge(9), limb: o.limb || 'w', vel: [{ f: [14, 17], vx: 5 }], hitboxes: [H(15, 18, 66, -42, 13, 17, 361, 30, 100, { effect: 'slash' }), H(15, 18, 40, -42, 13, 14, 361, 30, 95)],
    anim: [K(9, { aF1: 0.9, aF2: 1.6, wpn: 0.4, lean: -0.32, lF1: 0.3, lB1: -0.3 }, 'out'), K(15, { aF1: 1.57, aF2: 0, wpn: 0, lean: 0.58, lF1: 1.15, lF2: -0.6, lB1: -1.05, lB2: 0 }, 'back'), K(26, { aF1: 1.5, aF2: 0.1, wpn: 0.05, lean: 0.52, lF1: 1.1, lB1: -1.0 }, 'out')] });
  TPL.fsmashClap = () => ({ frames: 50, charge: charge(10), limb: ['hF', 'hB'], shake: 16, hitboxes: [H(16, 19, 36, -50, 23, 17, 361, 30, 100), H(16, 19, 16, -50, 14, 14, 361, 30, 95)],
    anim: [K(10, { aF1: 2.6, aF2: 0.2, aB1: -1.2, aB2: 0.2, lean: -0.25, lF1: 0.5, lB1: -0.4 }, 'out'), K(16, M(STEP, { aF1: 1.57, aF2: 0, aB1: 1.5, aB2: 0, lean: 0.45 }), 'back'), K(26, M(STEP, { aF1: 1.5, aF2: 0.1, aB1: 1.45, lean: 0.4 }), 'out')] });

  /* ----------------------------- UP SMASH --------------------------------- */
  TPL.usmashUppercut = () => ({ frames: 46, charge: charge(7), limb: 'hF', hitboxes: [H(12, 15, 16, -90, 19, 15, 88, 36, 98, { dir: 'auto' }), H(12, 15, 20, -62, 15, 13, 92, 34, 96)],
    anim: [K(7, { lF1: 1.0, lF2: -1.9, lB1: 0.2, lB2: -1.6, aF1: 0.2, aF2: 1.8, lean: 0.3 }, 'out'), K(12, { aF1: 3.05, aF2: 0.1, lean: -0.15, lF1: 0.15, lF2: 0, lB1: -0.15, lB2: 0, oy: -6 }, 'back'), K(20, { aF1: 2.9, aF2: 0.2, lean: -0.1, oy: -3 }, 'out')] });
  TPL.usmashFlip = () => ({ frames: 46, charge: charge(7), limb: 'fF', hitboxes: [H(11, 13, 26, -56, 16, 14, 85, 36, 98), H(14, 17, 0, -94, 20, 15, 90, 36, 100, { dir: 'auto' }), H(18, 20, -24, -60, 16, 12, 100, 36, 95)],
    anim: [K(7, { lF1: 0.9, lF2: -1.8, lB1: 0.2, lB2: -1.6, lean: 0.2, aF1: 1.0 }, 'out'), K(16, { rot: -PI, lF1: 2.9, lF2: 0, lB1: 0.6, lB2: -1.2, aF1: -1.0, aB1: 1.4, planted: false, oy: -10 }, 'lin'), K(22, { rot: -TAU, lF1: 0.5, lF2: -0.8, planted: false }, 'out')] });
  TPL.usmashArc = () => ({ frames: 48, charge: charge(8), limb: 'w', hitboxes: [H(13, 15, 40, -66, 18, 13, 80, 36, 96, { effect: 'slash' }), H(16, 19, 0, -108, 24, 16, 90, 36, 100, { dir: 'auto', effect: 'slash' }), H(20, 21, -36, -70, 18, 12, 105, 36, 94, { effect: 'slash' })],
    anim: [K(8, { aF1: 0.3, aF2: 0.2, wpn: 0.2, lean: 0.25, lF1: 0.9, lF2: -1.6, lB1: 0.2, lB2: -1.4 }, 'out'), K(13, { aF1: 1.9, aF2: 0, wpn: 0, lean: 0.05 }, 'back'), K(17, { aF1: 3.1, aF2: 0, wpn: 0, lean: -0.15, oy: -4 }, 'lin'), K(21, { aF1: 4.3, aF2: 0.1, wpn: 0, lean: -0.25 }, 'out'), K(28, { aF1: 4.1, aF2: 0.2, wpn: 0.2, lean: -0.2 }, 'out')] });
  TPL.usmashMulti = o => ({ frames: 50, charge: charge(8), limb: o.limb || ['hF', 'hB'], hitboxes: [H(12, 22, 0, -84, 24, 2, 90, 30, 10, { rehit: 3, dir: 'auto', group: 1 }), H(25, 27, 0, -94, 26, 5, 88, 40, 140, { dir: 'auto', group: 2 })],
    anim: [K(8, { aF1: 0.5, aF2: 1.7, aB1: 0.4, aB2: 1.7, lean: 0.15, lF1: 0.8, lF2: -1.5 }, 'out')].concat(flurry(12, 22, 'up', 2), [K(25, { aF1: 3.1, aF2: 0, aB1: 3.0, aB2: 0, lean: -0.1, oy: -5 }, 'back'), K(32, { aF1: 3.0, aF2: 0.1, aB1: 2.9 }, 'out')]) });
  TPL.usmashClap = () => ({ frames: 48, charge: charge(8), limb: ['hF', 'hB'], hitboxes: [H(14, 17, 8, -96, 24, 16, 88, 36, 98, { dir: 'auto' }), H(14, 17, 10, -66, 15, 13, 90, 34, 95)],
    anim: [K(8, { aF1: 1.6, aF2: 0, aB1: -1.4, aB2: 0, lean: 0.1, lF1: 0.8, lF2: -1.4, lB1: 0.1, lB2: -1.2 }, 'out'), K(14, { aF1: 3.05, aF2: 0, aB1: 3.0, aB2: 0, lean: -0.05, oy: -4 }, 'back'), K(22, { aF1: 2.95, aF2: 0.1, aB1: 2.9, aB2: 0.1 }, 'out')] });
  TPL.usmashPillar = () => ({ frames: 52, charge: charge(10), limb: ['hF', 'hB'], burst: 16, burst2: 21, hitboxes: [H(16, 24, 6, -112, 26, 15, 90, 36, 96, { effect: 'magic', dir: 'auto' }), H(16, 20, 6, -72, 18, 12, 90, 36, 92, { effect: 'magic' })],
    anim: [K(10, { aF1: 0.3, aF2: 1.9, aB1: 0.2, aB2: 1.9, lean: 0.15, lF1: 0.7, lF2: -1.3 }, 'out'), K(16, { aF1: 3.1, aF2: 0, aB1: 3.0, aB2: 0, lean: -0.12, oy: -4 }, 'back'), K(30, { aF1: 3.0, aF2: 0.15, aB1: 2.9, aB2: 0.15 }, 'out')] });

  /* ---------------------------- DOWN SMASH -------------------------------- */
  TPL.dsmashSplit = () => ({ frames: 46, charge: charge(7), limb: ['fF', 'fB'], hitboxes: [H(12, 14, 36, -10, 16, 14, 30, 30, 98), H(12, 14, -36, -10, 16, 14, 30, 30, 98, { reverse: true })],
    anim: [K(7, { lF1: 0.6, lF2: -1.5, lB1: -0.3, lB2: -1.2, tuck: 0.2, aF1: 1.2, aB1: -1.0 }, 'out'), K(12, { lF1: 1.52, lF2: 0, lB1: -1.52, lB2: 0, lean: 0, aF1: 2.4, aF2: 0.2, aB1: -2.4, aB2: 0.2 }, 'back'), K(22, { lF1: 1.45, lF2: 0, lB1: -1.45, lB2: 0, aF1: 2.2, aB1: -2.2 }, 'out')] });
  TPL.dsmashSweep = () => ({ frames: 50, charge: charge(7), limb: 'fF', hitboxes: [H(12, 13, 38, -8, 15, 13, 30, 30, 95, { group: 1 }), H(18, 19, -38, -8, 15, 14, 30, 30, 98, { reverse: true, group: 2 })],
    anim: [K(7, M(CR, { aF1: 1.2, aB1: 0.4 }), 'out'), K(12, M(CR, { lF1: 1.52, lF2: 0, lean: 0.55, aF1: 1.6, aB1: -0.6 }), 'back'), K(15, M(CR, { lF1: 0.9, lF2: -1.6, sx: 0.2 }), 'in'), K(18, M(CR, { lF1: 1.52, lF2: 0, lean: 0.55, sx: -1, aF1: 1.6, aB1: -0.6 }), 'back'), K(28, M(CR, { lF1: 1.45, lF2: -0.1, sx: -1 }), 'out')] });
  TPL.dsmashSlash = () => ({ frames: 50, charge: charge(8), limb: 'w', hitboxes: [H(13, 15, 50, -12, 18, 14, 30, 30, 95, { effect: 'slash', group: 1 }), H(19, 21, -50, -12, 18, 15, 30, 30, 98, { effect: 'slash', reverse: true, group: 2 })],
    anim: [K(8, M(CR, { aF1: 2.6, aF2: 0.2, wpn: 0.3 }), 'out'), K(13, M(CR, { aF1: 1.4, aF2: 0, wpn: 0, lean: 0.6 }), 'back'), K(16, M(CR, { aF1: 2.4, aF2: 0.2, wpn: 0.3, sx: 0.1 }), 'in'), K(19, M(CR, { aF1: 1.4, aF2: 0, wpn: 0, lean: 0.6, sx: -1 }), 'back'), K(30, M(CR, { aF1: 1.3, aF2: 0.1, wpn: 0.1, sx: -1 }), 'out')] });
  TPL.dsmashSlam = o => ({ frames: 52, charge: charge(10), limb: o.limb || ['hF', 'hB'], shake: 16, dust: [16, 0, 1], hitboxes: [H(16, 18, 42, -8, 22, 15, 40, 35, 96), H(16, 18, -42, -8, 22, 15, 40, 35, 96, { reverse: true })],
    anim: [K(10, { aF1: 3.2, aF2: 0.2, aB1: 3.1, aB2: 0.2, wpn: 0.2, lean: -0.15, lF1: 0.5, lF2: -0.8, lB1: -0.4, lB2: -0.6, oy: -4 }, 'out'), K(16, M(CR, { aF1: 0.75, aF2: 0.1, aB1: -0.75, aB2: 0.1, wpn: 0.3, lean: 0.25, oy: 3 }), 'back'), K(26, M(CR, { aF1: 0.7, aB1: -0.7, wpn: 0.3, lean: 0.25 }), 'out')] });
  TPL.dsmashBreak = () => ({ frames: 50, charge: charge(7), limb: ['fF', 'fB'], hitboxes: [H(11, 13, 36, -12, 17, 6, 80, 40, 25, { group: 1 }), H(11, 13, -36, -12, 17, 6, 80, 40, 25, { group: 1, reverse: true }), H(18, 20, 38, -12, 18, 10, 35, 35, 100, { group: 2 }), H(18, 20, -38, -12, 18, 10, 35, 35, 100, { group: 2, reverse: true })],
    anim: [K(7, M(CR, { aF1: 0.6, aB1: 0.4 }), 'out'), K(11, { lF1: 1.5, lF2: 0, lB1: -1.5, lB2: 0, aF1: 0.3, aB1: -0.3, lean: 0.3, oy: 6 }, 'back'), K(15, { lF1: 1.5, lB1: -1.5, aF1: 0.3, aB1: -0.3, lean: 0.3, oy: 6, sx: -1 }, 'inout'), K(18, { lF1: 1.55, lB1: -1.55, aF1: 0.3, aB1: -0.3, lean: 0.3, oy: 6, sx: 1 }, 'inout'), K(26, M(CR, {}), 'out')] });

  /* ------------------------------- NAIR ----------------------------------- */
  TPL.nairSex = () => ({ frames: 36, landingLag: 7, limb: 'fF', hitboxes: [H(4, 6, 20, -36, 16, 10, 361, 25, 95), H(7, 22, 20, -36, 13, 5.5, 361, 15, 80)],
    anim: [K(3, { lF1: 1.62, lF2: 0, lB1: -0.3, lB2: -1.4, lean: -0.25, aF1: 2.2, aB1: -1.4 }, 'back'), K(22, { lF1: 1.5, lF2: -0.1, lB1: -0.3, lB2: -1.4, lean: -0.2, aF1: 2.1, aB1: -1.3 }, 'lin'), K(28, {}, 'out')] });
  TPL.nairSpin = o => ({ frames: 40, landingLag: 8, limb: o.limb || ['hF', 'hB'], hitboxes: [H(5, 20, 0, -40, 26, 1.6, 80, 20, 10, { rehit: 4, dir: 'auto', group: 1 }), H(22, 24, 0, -40, 28, 4, 361, 35, 110, { dir: 'auto', group: 2 })],
    anim: [K(4, { tuck: 0.5, aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, lF1: 1.0, lF2: -1.6, lB1: 0.4, lB2: -1.5, wpn: 0 }, 'out'), K(22, { rot: TAU * 2, tuck: 0.5, aF1: 1.6, aF2: 0, aB1: -1.6, aB2: 0, lF1: 1.0, lF2: -1.6, wpn: 0 }, 'lin'), K(26, { rot: TAU * 2.1, aF1: 1.4, aB1: -1.4 }, 'out')] });
  TPL.nairSlash = () => ({ frames: 40, landingLag: 8, limb: 'w', hitboxes: [H(6, 8, 36, -50, 20, 3.5, 80, 30, 20, { effect: 'slash', group: 1 }), H(14, 17, 0, -44, 32, 8.5, 361, 30, 90, { effect: 'slash', dir: 'auto', group: 2 })],
    anim: [K(4, { aF1: 2.6, aF2: 0.2, wpn: 0.3, tuck: 0.3 }, 'out'), K(8, { aF1: 1.2, aF2: 0, wpn: 0 }, 'back'), K(17, { rot: TAU, aF1: 1.57, aF2: 0, wpn: 0, tuck: 0.4, lF1: 1.0, lF2: -1.6 }, 'out3'), K(22, { rot: TAU, aF1: 1.4, wpn: 0.1 }, 'out')] });
  TPL.nairBurst = () => ({ frames: 40, landingLag: 8, limb: ['hF', 'hB', 'fF', 'fB'], burst: 6, hitboxes: [H(6, 9, 0, -40, 30, 10, 361, 30, 90, { effect: 'magic', dir: 'auto' }), H(10, 18, 0, -40, 26, 6, 361, 20, 80, { effect: 'magic', dir: 'auto' })],
    anim: [K(4, { tuck: 1, aF1: 1.6, aF2: 1.6, aB1: 1.4, aB2: 1.7, lF1: 1.4, lF2: -2.2, lB1: 1.1, lB2: -2.1 }, 'out'), K(6, { tuck: 0, aF1: 2.4, aF2: 0, aB1: -2.4, aB2: 0, lF1: 0.8, lF2: 0, lB1: -0.8, lB2: 0 }, 'back'), K(18, { aF1: 2.3, aB1: -2.3, lF1: 0.75, lB1: -0.75 }, 'lin'), K(26, {}, 'out')] });
  TPL.nairBody = () => ({ frames: 40, landingLag: 9, limb: ['hF', 'hB'], hitboxes: [H(5, 8, 0, -40, 32, 11, 361, 30, 90, { dir: 'auto' }), H(9, 20, 0, -40, 28, 7, 361, 20, 80, { dir: 'auto' })],
    anim: [K(3, { aF1: 0.8, aB1: -0.6, lF1: 0.8, lF2: -1.4 }, 'out'), K(5, { aF1: 2.2, aF2: 0, aB1: -2.2, aB2: 0, lF1: 0.7, lF2: 0, lB1: -0.7, lB2: 0, sx: 1.12, sy: 0.92 }, 'back'), K(20, { aF1: 2.1, aB1: -2.1, lF1: 0.65, lB1: -0.65, sx: 1.06, sy: 0.96 }, 'lin'), K(26, {}, 'out')] });

  /* ------------------------------- FAIR ----------------------------------- */
  TPL.fairKick = () => ({ frames: 36, landingLag: 12, limb: 'fF', hitboxes: [H(8, 10, 34, -36, 16, 11, 361, 28, 95), H(8, 10, 18, -38, 12, 9.5, 361, 28, 90)],
    anim: [K(6, { lF1: 1.1, lF2: -2.2, lean: -0.1, aF1: 0.8 }, 'out'), K(8, { lF1: 1.75, lF2: 0, lB1: -0.2, lB2: -1.3, lean: -0.3, aF1: -0.4, aB1: 1.1 }, 'back'), K(16, { lF1: 1.6, lF2: -0.15, lean: -0.26 }, 'out')] });
  TPL.fairArc = () => ({ frames: 34, landingLag: 9, limb: 'w', hitboxes: [H(6, 9, 42, -54, 20, 10, 361, 30, 90, { effect: 'slash' }), H(6, 9, 22, -76, 14, 9, 361, 30, 88, { effect: 'slash' })],
    anim: [K(4, { aF1: 3.3, aF2: 0.1, wpn: 0.2, lean: -0.2 }, 'out'), K(6, { aF1: 2.3, aF2: 0, wpn: 0 }, 'back'), K(9, { aF1: 0.6, aF2: 0, wpn: 0, lean: 0.3 }, 'out'), K(14, { aF1: 0.35, aF2: 0.1, wpn: 0.1, lean: 0.25 }, 'out')] });
  TPL.fairKnee = () => ({ frames: 36, landingLag: 13, limb: 'fF', hitboxes: [H(10, 11, 24, -44, 11, 18, 361, 30, 100, { effect: 'elec', group: 1 }), H(12, 24, 20, -40, 14, 5, 361, 20, 60, { group: 2 })],
    anim: [K(8, { lF1: 0.4, lF2: -1.2, lean: -0.2, aF1: 1.2 }, 'out'), K(10, { lF1: 1.95, lF2: -2.6, lean: 0.1, aF1: 2.6, aB1: -1.0 }, 'back'), K(24, { lF1: 1.85, lF2: -2.5, lean: 0.08, aF1: 2.5, aB1: -0.9 }, 'lin'), K(30, {}, 'out')] });
  TPL.fairDrill = o => ({ frames: 42, landingLag: 12, limb: o.limb || 'fF', hitboxes: [H(8, 20, 32, -40, 18, 1.8, 40, 25, 10, { rehit: 3, group: 1 }), H(22, 24, 34, -40, 20, 4, 361, 40, 110, { group: 2 })],
    anim: [K(6, { lF1: 1.0, lF2: -1.8, aF1: 0.6, aF2: 1.6 }, 'out')].concat(flurry(8, 20, o.kind || 'kick', 2), [K(22, o.kind === 'slash' ? { aF1: 1.0, wpn: 0, lean: 0.35 } : o.kind === 'punch' ? { aF1: 1.65, aF2: 0, lean: 0.35 } : { lF1: 1.75, lF2: 0, lean: -0.3 }, 'back'), K(30, {}, 'out')]) });
  TPL.fairSpike = o => ({ frames: 44, landingLag: 16, limb: o.limb || ['hF', 'hB'], hitboxes: [H(14, 17, 34, -24, 18, 15, 290, 30, 85, { meteor: true }), H(14, 17, 22, -60, 14, 11, 361, 30, 90)],
    anim: [K(10, { aF1: 3.2, aF2: 0.2, aB1: 3.1, aB2: 0.2, wpn: 0.2, lean: -0.3, lF1: 0.9, lF2: -1.6 }, 'out'), K(14, { aF1: 1.0, aF2: 0, aB1: 0.9, aB2: 0, wpn: 0, lean: 0.55 }, 'back'), K(22, { aF1: 0.8, aB1: 0.75, wpn: 0.05, lean: 0.48 }, 'out')] });
  TPL.fairPunch = () => ({ frames: 34, landingLag: 10, limb: 'hF', hitboxes: [H(7, 9, 32, -44, 16, 11, 361, 28, 95), H(7, 9, 16, -44, 12, 9.5, 361, 28, 90)],
    anim: [K(5, { aF1: -0.5, aF2: 1.6, lean: -0.2, lF1: 0.9, lF2: -1.6 }, 'out'), K(7, { aF1: 1.65, aF2: 0, aB1: -0.6, lean: 0.35, lF1: 0.5, lF2: -0.8, lB1: -0.6 }, 'back'), K(15, { aF1: 1.55, aF2: 0.1, lean: 0.3 }, 'out')] });
  TPL.airBurst = o => {
    const d = o.dir || 'f';
    const hb = d === 'f' ? H(8, 11, 40, -44, 22, 10, 361, 30, 92, { effect: 'magic' })
      : d === 'b' ? H(8, 11, -40, -44, 22, 11, 361, 30, 96, { effect: 'magic', reverse: true })
      : d === 'u' ? H(8, 11, 0, -96, 22, 9, 85, 30, 100, { effect: 'magic', dir: 'auto' })
      : H(10, 13, 0, 8, 22, 12, 280, 25, 85, { effect: 'magic', meteor: true });
    const p = d === 'f' ? { aF1: 1.57, aF2: 0, aB1: 1.45, aB2: 0.1, lean: 0.25 } : d === 'b' ? { aF1: -1.6, aF2: 0, aB1: -1.5, aB2: 0, lean: 0.35, headTilt: -0.3 }
      : d === 'u' ? { aF1: 3.1, aF2: 0, aB1: 3.0, aB2: 0, lean: -0.15 } : { aF1: 0.05, aF2: 0, aB1: -0.05, aB2: 0, lF1: 1.2, lF2: -1.9, lB1: 0.9, lB2: -1.8 };
    return { frames: 36, landingLag: 10, limb: ['hF', 'hB'], burst: hb.f[0], hitboxes: [hb],
      anim: [K(hb.f[0] - 3, { tuck: 0.6, aF1: 0.6, aF2: 1.8, aB1: 0.5, aB2: 1.8, lF1: 1.1, lF2: -1.8 }, 'out'), K(hb.f[0], p, 'back'), K(hb.f[0] + 8, p, 'lin'), K(28, {}, 'out')] };
  };

  /* ------------------------------- BAIR ----------------------------------- */
  TPL.bairKick = () => ({ frames: 34, landingLag: 10, limb: 'fB', hitboxes: [H(7, 9, -38, -40, 16, 12.5, 361, 26, 100, { reverse: true }), H(7, 9, -20, -40, 12, 10.5, 361, 26, 95, { reverse: true })],
    anim: [K(5, { lB1: -0.3, lB2: -2.0, lF1: 0.8, lF2: -1.6, lean: 0.3 }, 'out'), K(7, { lB1: -1.8, lB2: 0, lean: 0.55, aF1: 0.9, aB1: 0.8, headTilt: -0.4 }, 'back'), K(14, { lB1: -1.7, lB2: -0.1, lean: 0.5, aF1: 0.85 }, 'out')] });
  TPL.bairSlash = () => ({ frames: 34, landingLag: 9, limb: 'w', hitboxes: [H(7, 10, -46, -44, 20, 12, 361, 28, 98, { effect: 'slash', reverse: true }), H(7, 10, -24, -50, 14, 10, 361, 28, 94, { effect: 'slash', reverse: true })],
    anim: [K(5, { aF1: 1.6, aF2: 0.2, wpn: 0.2, lean: -0.15 }, 'out'), K(7, { aF1: -0.6, aF2: 0, wpn: 0, lean: 0.2 }, 'back'), K(10, { aF1: -1.75, aF2: 0, wpn: 0, lean: 0.3, headTilt: -0.3 }, 'out'), K(16, { aF1: -1.8, aF2: 0.1, wpn: 0.1, lean: 0.28 }, 'out')] });
  TPL.bairDrop = () => ({ frames: 38, landingLag: 12, limb: ['fF', 'fB'], hitboxes: [H(8, 11, -38, -34, 18, 13, 361, 28, 100, { reverse: true }), H(8, 11, -18, -36, 13, 11, 361, 28, 95, { reverse: true })],
    anim: [K(6, { lF1: 1.2, lF2: -2.2, lB1: 1.0, lB2: -2.1, lean: -0.2, tuck: 0.4 }, 'out'), K(8, { lF1: -1.5, lF2: 0, lB1: -1.7, lB2: 0, lean: 0.7, aF1: 1.9, aB1: 1.7, headTilt: -0.3 }, 'back'), K(16, { lF1: -1.4, lB1: -1.6, lean: 0.65, aF1: 1.8, aB1: 1.6 }, 'out')] });
  TPL.bairSpin = o => ({ frames: 34, landingLag: 9, limb: o.limb || 'hF', hitboxes: [H(8, 10, -38, -46, 17, 12, 361, 26, 98, { reverse: true }), H(8, 10, -18, -46, 12, 10, 361, 26, 94, { reverse: true })],
    anim: [K(5, { sx: 0.4, aF1: 0.6, aF2: 1.4, lean: 0.1 }, 'out'), K(8, { sx: -1, aF1: 1.62, aF2: 0, wpn: 0, lean: 0.25 }, 'back'), K(15, { sx: -1, aF1: 1.5, aF2: 0.1, lean: 0.2 }, 'out'), K(24, { sx: 1 }, 'inout')] });

  /* ------------------------------- UAIR ----------------------------------- */
  TPL.uairFlip = () => ({ frames: 32, landingLag: 7, limb: 'fF', hitboxes: [H(5, 10, 4, -92, 20, 9, 80, 28, 105, { dir: 'auto' })],
    anim: [K(3, { lF1: 0.6, lF2: -1.6, aF1: 1.0 }, 'out'), K(10, { rot: -TAU * 0.85, lF1: 2.9, lF2: 0, lB1: 0.4, lB2: -1.2, aF1: -1.0, aB1: 1.6 }, 'lin'), K(15, { rot: -TAU, lF1: 1.0, lF2: -0.6 }, 'out')] });
  TPL.uairArc = () => ({ frames: 32, landingLag: 7, limb: 'w', hitboxes: [H(5, 7, 32, -72, 18, 8, 85, 30, 100, { effect: 'slash' }), H(8, 10, 0, -102, 22, 9, 90, 30, 105, { dir: 'auto', effect: 'slash' }), H(11, 12, -32, -72, 18, 7, 100, 30, 95, { effect: 'slash' })],
    anim: [K(3, { aF1: 1.2, aF2: 0.1, wpn: 0.2 }, 'out'), K(5, { aF1: 2.0, aF2: 0, wpn: 0 }, 'back'), K(9, { aF1: 3.15, aF2: 0, wpn: 0, lean: -0.1 }, 'lin'), K(12, { aF1: 4.4, aF2: 0, wpn: 0, lean: -0.2 }, 'out'), K(18, { aF1: 4.3, aF2: 0.15, wpn: 0.15 }, 'out')] });
  TPL.uairMulti = o => ({ frames: 40, landingLag: 8, limb: o.limb || ['hF', 'hB'], hitboxes: [H(6, 18, 0, -88, 22, 1.5, 85, 25, 8, { rehit: 3, dir: 'auto', group: 1 }), H(20, 22, 0, -92, 24, 4, 85, 40, 120, { dir: 'auto', group: 2 })],
    anim: [K(4, { aF1: 0.8, aF2: 1.6, aB1: 0.7, aB2: 1.6 }, 'out')].concat(flurry(6, 18, 'up', 2), [K(20, { aF1: 3.1, aF2: 0, aB1: 3.0, aB2: 0, lean: -0.12 }, 'back'), K(28, {}, 'out')]) });
  TPL.uairHead = () => ({ frames: 34, landingLag: 8, hitboxes: [H(7, 12, 8, -90, 20, 11, 85, 30, 100, { dir: 'auto' }), H(7, 12, 6, -68, 14, 9, 88, 30, 95)],
    anim: [K(5, { lean: 0.35, headTilt: 0.5, tuck: 0.4, aF1: 0.6 }, 'out'), K(7, { lean: -0.45, headTilt: -0.7, aF1: -0.6, aB1: -0.8, lF1: 0.3, lF2: -0.4, lB1: -0.2, lB2: -0.3 }, 'back'), K(16, { lean: -0.4, headTilt: -0.6, aF1: -0.5, aB1: -0.7 }, 'out')] });
  TPL.uairClap = () => ({ frames: 36, landingLag: 9, limb: ['hF', 'hB'], hitboxes: [H(8, 11, 4, -96, 22, 12, 88, 30, 100, { dir: 'auto' }), H(8, 11, 6, -70, 14, 10, 90, 30, 95)],
    anim: [K(5, { aF1: 1.7, aF2: 0, aB1: -1.5, aB2: 0, lF1: 0.8, lF2: -1.4 }, 'out'), K(8, { aF1: 3.05, aF2: 0, aB1: 3.0, aB2: 0, lean: -0.1 }, 'back'), K(16, { aF1: 2.95, aF2: 0.1, aB1: 2.9, aB2: 0.1 }, 'out')] });

  /* ------------------------------- DAIR ----------------------------------- */
  TPL.dairStomp = () => ({ frames: 42, landingLag: 16, limb: ['fF', 'fB'], hitboxes: [H(12, 15, 4, 6, 18, 14, 270, 25, 88, { meteor: true }), H(12, 15, 4, -8, 15, 10, 361, 25, 80)],
    anim: [K(8, { lF1: 1.2, lF2: -2.0, lB1: 1.0, lB2: -1.9, aF1: 2.6, aB1: 2.5, lean: -0.05 }, 'out'), K(12, { lF1: 0.05, lF2: 0, lB1: -0.05, lB2: 0, aF1: 0.7, aB1: -0.7, oy: 8 }, 'back'), K(20, { lF1: 0.1, lB1: -0.1, aF1: 0.8, aB1: -0.8, oy: 6 }, 'out')] });
  TPL.dairDrill = o => ({ frames: 44, landingLag: 16, limb: o.limb || ['fF', 'fB'], hitboxes: [H(8, 22, 6, 0, 18, 1.8, 290, 20, 10, { rehit: 3, group: 1 }), H(24, 26, 6, 0, 20, 4, 50, 40, 100, { group: 2 })],
    anim: [K(6, { tuck: 0.6, lF1: 1.0, lF2: -1.8, lB1: 0.8, lB2: -1.7, lean: 0.3 }, 'out'), K(22, { rot: TAU * 2.5, lF1: 0.1, lF2: 0, lB1: -0.1, lB2: 0, aF1: 2.9, aF2: 0, aB1: 2.8, aB2: 0, oy: 6 }, 'lin'), K(26, { rot: TAU * 2.6, lF1: 0.4, lB1: -0.4 }, 'out')] });
  TPL.dairStab = () => ({ frames: 44, landingLag: 15, limb: 'w', hitboxes: [H(13, 16, 2, 18, 14, 14, 270, 25, 85, { meteor: true, effect: 'slash' }), H(13, 16, 2, -6, 14, 10, 361, 25, 80, { effect: 'slash' })],
    anim: [K(9, { aF1: 2.9, aF2: 0.4, aB1: 2.7, aB2: 0.4, wpn: 1.6, lF1: 1.0, lF2: -1.7, lB1: 0.8, lB2: -1.6 }, 'out'), K(13, { aF1: 0.08, aF2: 0, aB1: -0.05, aB2: 0, wpn: 0, lF1: 0.4, lF2: -0.6, lB1: -0.3, lB2: -0.5, oy: -4 }, 'back'), K(22, { aF1: 0.1, aF2: 0.05, wpn: 0.05, oy: -2 }, 'out')] });
  TPL.dairArc = () => ({ frames: 44, landingLag: 15, limb: 'w', hitboxes: [H(10, 11, 32, -6, 18, 11, 361, 30, 85, { effect: 'slash' }), H(12, 14, 0, 14, 20, 13, 270, 25, 90, { meteor: true, effect: 'slash' }), H(15, 16, -32, -6, 18, 11, 361, 30, 85, { effect: 'slash', reverse: true })],
    anim: [K(7, { aF1: 2.5, aF2: 0.1, wpn: 0.2, lF1: 0.9, lF2: -1.6, lB1: 0.6, lB2: -1.5 }, 'out'), K(10, { aF1: 1.2, aF2: 0, wpn: 0 }, 'back'), K(13, { aF1: 0, aF2: 0, wpn: 0 }, 'lin'), K(16, { aF1: -1.3, aF2: 0, wpn: 0 }, 'out'), K(24, { aF1: -1.2, aF2: 0.1, wpn: 0.1 }, 'out')] });
  TPL.dairSlam = o => ({ frames: 46, landingLag: 18, limb: o.limb || ['hF', 'hB'], hitboxes: [H(14, 17, 8, 6, 22, 15, 270, 25, 90, { meteor: true }), H(14, 17, 8, -16, 16, 11, 361, 25, 85)],
    anim: [K(10, { aF1: 3.2, aF2: 0.1, aB1: 3.1, aB2: 0.1, wpn: 0.2, lean: -0.25, lF1: 0.9, lF2: -1.6 }, 'out'), K(14, { aF1: 0.25, aF2: 0, aB1: 0.15, aB2: 0, wpn: 0, lean: 0.35, oy: 4 }, 'back'), K(24, { aF1: 0.3, aB1: 0.2, wpn: 0.05, lean: 0.3 }, 'out')] });

  /* ============================== KITS ==================================== *
   * Clave → 'plantilla' o ['plantilla', { ajustes }].
   * Ajustes: dmg (multiplicador de daño), kb (de crecimiento), reach (de
   * alcance), size (de radio), fx (efecto de golpe), col (color de ráfagas),
   * kind/fin/dir/limb (variantes de la plantilla).                          */
  const KITS = {
    gorrak: { fx: 'heavy', jab: 'jabHeavy', ftilt: ['ftiltChop', { limb: ['hF', 'hB'] }], utilt: 'utiltArc', dtilt: 'dtiltSlap', dashattack: 'dashShoulder',
      fsmash: ['fsmashHammer', { limb: ['hF', 'hB'] }], usmash: 'usmashClap', dsmash: 'dsmashSlam', nair: 'nairBody', fair: 'fairSpike', bair: 'bairSpin', uair: 'uairHead', dair: 'dairSlam' },
    vespera: { col: '#c9b6ff', jab: ['jabCombo', { fin: 'palm' }], ftilt: 'ftiltPalm', utilt: 'utiltBurst', dtilt: 'dtiltSweep', dashattack: 'dashCartwheel',
      fsmash: 'fsmashBlast', usmash: 'usmashPillar', dsmash: 'dsmashSweep', nair: 'nairBurst', fair: ['airBurst', { dir: 'f' }], bair: ['airBurst', { dir: 'b' }], uair: ['airBurst', { dir: 'u' }], dair: ['airBurst', { dir: 'd' }] },
    ironclad: { jab: ['jabCombo', { fin: 'punch', heavy: true }], ftilt: 'ftiltPunch', utilt: 'utiltHeadbutt', dtilt: 'dtiltSlap', dashattack: 'dashShoulder',
      fsmash: ['fsmashPunch', { dmg: 1.08 }], usmash: 'usmashUppercut', dsmash: 'dsmashSlam', nair: 'nairSpin', fair: 'fairPunch', bair: 'bairDrop', uair: 'uairClap', dair: 'dairStomp' },
    rook: { jab: ['jabRapid', { kind: 'slash' }], ftilt: 'ftiltChop', utilt: 'utiltSword', dtilt: ['dtiltPoke', { limb: 'w' }], dashattack: 'dashSlide',
      fsmash: 'fsmashHammer', usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: ['nairSpin', { limb: 'w' }], fair: ['fairSpike', { limb: 'w' }], bair: 'bairSlash', uair: 'uairArc', dair: 'dairStab' },
    kaito: { fx: 'hit', col: '#7dffb0', jab: ['jabRapid', { kind: 'punch' }], ftilt: 'ftiltDouble', utilt: 'utiltArc', dtilt: 'dtiltPoke', dashattack: 'dashKick',
      fsmash: 'fsmashDouble', usmash: 'usmashUppercut', dsmash: 'dsmashSplit', nair: 'nairSex', fair: 'fairKick', bair: 'bairKick', uair: 'uairFlip', dair: 'dairDrill' },
    sylra: { col: '#8de06a', jab: ['jabCombo', { fin: 'kick' }], ftilt: 'ftiltSpinKick', utilt: 'utiltKick', dtilt: 'dtiltSweep', dashattack: 'dashCartwheel',
      fsmash: ['fsmashBlast', { fx: 'slash' }], usmash: 'usmashFlip', dsmash: 'dsmashSweep', nair: 'nairSex', fair: 'fairKick', bair: 'bairDrop', uair: 'uairFlip', dair: 'dairStomp' },
    nyx: { fx: 'slash', jab: ['jabRapid', { kind: 'punch' }], ftilt: 'ftiltDouble', utilt: 'utiltArc', dtilt: 'dtiltPoke', dashattack: 'dashSlide',
      fsmash: 'fsmashDouble', usmash: 'usmashMulti', dsmash: 'dsmashBreak', nair: 'nairSpin', fair: ['fairDrill', { kind: 'punch', limb: ['hF', 'hB'] }], bair: 'bairKick', uair: 'uairFlip', dair: 'dairDrill' },
    medu: { fx: 'water', col: '#7fe3ff', jab: ['jabCombo', { fin: 'palm' }], ftilt: ['ftiltThrust', { limb: 'hF' }], utilt: 'utiltArc', dtilt: 'dtiltSweep', dashattack: 'dashSpin',
      fsmash: 'fsmashBlast', usmash: 'usmashMulti', dsmash: 'dsmashBreak', nair: 'nairSpin', fair: ['fairDrill', { kind: 'punch', limb: ['hF', 'hB'] }], bair: 'bairSpin', uair: 'uairMulti', dair: 'dairDrill' },
    valkyr: { col: '#9fe8ff', jab: ['jabCombo', { fin: 'punch' }], ftilt: 'ftiltPunch', utilt: 'utiltArc', dtilt: 'dtiltPoke', dashattack: 'dashShoulder',
      fsmash: ['fsmashBlast', { fx: 'elec' }], usmash: 'usmashUppercut', dsmash: 'dsmashSplit', nair: 'nairSex', fair: 'fairPunch', bair: 'bairDrop', uair: 'uairHead', dair: 'dairStomp' },
    jett: { fx: 'fire', jab: ['jabRapid', { kind: 'kick' }], ftilt: 'ftiltKick', utilt: 'utiltKick', dtilt: 'dtiltSweep', dashattack: 'dashKick',
      fsmash: 'fsmashKick', usmash: 'usmashFlip', dsmash: 'dsmashSplit', nair: 'nairSex', fair: 'fairDrill', bair: 'bairKick', uair: 'uairFlip', dair: 'dairDrill' },
    grizzla: { fx: 'slash', jab: 'jabHeavy', ftilt: ['ftiltChop', { limb: 'hF' }], utilt: 'utiltArc', dtilt: 'dtiltSlap', dashattack: 'dashShoulder',
      fsmash: ['fsmashHammer', { limb: ['hF', 'hB'], fx: 'heavy' }], usmash: 'usmashClap', dsmash: ['dsmashSlam', { fx: 'heavy' }], nair: 'nairBody', fair: 'fairSpike', bair: 'bairSpin', uair: 'uairHead', dair: ['dairSlam', { fx: 'heavy' }] },
    zephyr: { fx: 'wind', jab: ['jabRapid', { kind: 'kick' }], ftilt: 'ftiltSpinKick', utilt: 'utiltKick', dtilt: 'dtiltSweep', dashattack: 'dashCartwheel',
      fsmash: 'fsmashKick', usmash: 'usmashFlip', dsmash: 'dsmashBreak', nair: ['nairSpin', { limb: ['fF', 'fB'] }], fair: 'fairKick', bair: 'bairDrop', uair: 'uairFlip', dair: 'dairStomp' },
    aria: { jab: 'jabSword2', ftilt: 'ftiltSlash', utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: 'dashSlash',
      fsmash: 'fsmashSword', usmash: ['fsmashThrust', { reach: 0.001 }], dsmash: 'dsmashSlash', nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairArc' },
    morgrath: { fx: 'dark', jab: 'jabSword2', ftilt: 'ftiltChop', utilt: 'utiltSword', dtilt: ['dtiltSlash', { reach: 1.15 }], dashattack: ['dashSpin', { limb: 'w' }],
      fsmash: ['fsmashSword', { dmg: 1.05 }], usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairStab' },
    brakk: { jab: ['jabCombo', { fin: 'haymaker' }], ftilt: 'ftiltPunch', utilt: 'utiltArc', dtilt: 'dtiltPoke', dashattack: 'dashShoulder',
      fsmash: 'fsmashPunch', usmash: 'usmashUppercut', dsmash: 'dsmashSlam', nair: 'nairSex', fair: 'fairKnee', bair: 'bairSpin', uair: 'uairHead', dair: 'dairStomp' },
    luma: { fx: 'fire', col: '#ffb347', jab: 'jabSword2', ftilt: 'ftiltThrust', utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: ['dashSpin', { limb: 'w' }],
      fsmash: 'fsmashBlast', usmash: 'usmashPillar', dsmash: 'dsmashSlash', nair: ['nairSpin', { limb: 'w' }], fair: 'fairArc', bair: ['airBurst', { dir: 'b' }], uair: 'uairArc', dair: 'dairStab' },
    kael: { col: '#d79bff', jab: ['jabCombo', { fin: 'palm' }], ftilt: 'ftiltPalm', utilt: 'utiltArc', dtilt: 'dtiltSweep', dashattack: 'dashBurst',
      fsmash: 'fsmashBlast', usmash: 'usmashPillar', dsmash: ['dsmashSlam', { fx: 'magic' }], nair: 'nairBurst', fair: ['fairSpike', { fx: 'magic' }], bair: 'bairKick', uair: 'uairFlip', dair: 'dairStomp' },
    volgur: { fx: 'heavy', jab: ['jabCombo', { fin: 'haymaker', heavy: true }], ftilt: 'ftiltChop', utilt: 'utiltSword', dtilt: ['dtiltSlap', { limb: 'w' }], dashattack: ['dashSpin', { limb: 'w' }],
      fsmash: ['fsmashHammer', { dmg: 1.1 }], usmash: 'usmashArc', dsmash: ['dsmashSlam', { limb: 'w' }], nair: ['nairSpin', { limb: 'w' }], fair: ['fairSpike', { limb: 'w' }], bair: 'bairSlash', uair: 'uairArc', dair: ['dairSlam', { limb: 'w' }] },
    chronia: { col: '#ffe08a', jab: ['jabCombo', { fin: 'palm' }], ftilt: 'ftiltThrust', utilt: 'utiltBurst', dtilt: ['dtiltPoke', { limb: 'w' }], dashattack: 'dashBurst',
      fsmash: 'fsmashBlast', usmash: 'usmashPillar', dsmash: 'dsmashSweep', nair: 'nairBurst', fair: ['airBurst', { dir: 'f' }], bair: ['airBurst', { dir: 'b' }], uair: ['airBurst', { dir: 'u' }], dair: ['airBurst', { dir: 'd' }] },
    hexa: { jab: ['jabRapid', { kind: 'slash' }], ftilt: 'ftiltThrust', utilt: 'utiltSword', dtilt: ['dtiltPoke', { limb: 'w' }], dashattack: 'dashSlash',
      fsmash: 'fsmashThrust', usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: ['nairSpin', { limb: 'w' }], fair: ['fairDrill', { kind: 'slash', limb: 'w' }], bair: 'bairSlash', uair: 'uairArc', dair: 'dairStab' },
    kumo: { fx: 'slash', jab: ['jabRapid', { kind: 'punch' }], ftilt: 'ftiltDouble', utilt: 'utiltArc', dtilt: 'dtiltPoke', dashattack: 'dashSlide',
      fsmash: 'fsmashDouble', usmash: 'usmashMulti', dsmash: 'dsmashBreak', nair: 'nairSpin', fair: ['fairDrill', { kind: 'punch', limb: ['hF', 'hB'] }], bair: 'bairKick', uair: 'uairMulti', dair: 'dairDrill' },
    ritmo: { jab: ['jabCombo', { fin: 'kick' }], ftilt: 'ftiltSpinKick', utilt: 'utiltKick', dtilt: 'dtiltSweep', dashattack: 'dashCartwheel',
      fsmash: 'fsmashKick', usmash: 'usmashFlip', dsmash: 'dsmashBreak', nair: ['nairSpin', { limb: ['fF', 'fB'] }], fair: 'fairKick', bair: 'bairKick', uair: 'uairFlip', dair: 'dairStomp' },
    volta: { fx: 'elec', col: '#9ff3ff', jab: ['jabCombo', { fin: 'palm' }], ftilt: 'ftiltPalm', utilt: 'utiltBurst', dtilt: 'dtiltPoke', dashattack: 'dashBurst',
      fsmash: 'fsmashBlast', usmash: 'usmashPillar', dsmash: 'dsmashSlam', nair: 'nairBurst', fair: ['airBurst', { dir: 'f' }], bair: 'bairKick', uair: ['airBurst', { dir: 'u' }], dair: 'dairStomp' },
    torva: { jab: 'jabSword2', ftilt: 'ftiltThrust', utilt: 'utiltSword', dtilt: ['dtiltPoke', { limb: 'w' }], dashattack: 'dashShoulder',
      fsmash: 'fsmashThrust', usmash: 'usmashArc', dsmash: ['dsmashSlam', { fx: 'heavy' }], nair: 'nairSlash', fair: 'fairArc', bair: ['bairSpin', { limb: 'hB', fx: 'heavy' }], uair: 'uairArc', dair: 'dairStab' },
    nia_brisa: { fx: 'wind', jab: ['jabRapid', { kind: 'punch' }], ftilt: 'ftiltDouble', utilt: 'utiltKick', dtilt: 'dtiltPoke', dashattack: 'dashSlide',
      fsmash: 'fsmashKick', usmash: 'usmashFlip', dsmash: 'dsmashBreak', nair: 'nairSpin', fair: 'fairDrill', bair: 'bairKick', uair: 'uairFlip', dair: 'dairDrill' },
    nia_terro: { jab: ['jabCombo', { fin: 'punch' }], ftilt: 'ftiltPunch', utilt: 'utiltHeadbutt', dtilt: 'dtiltSweep', dashattack: ['dashSpin', { limb: [] }],
      fsmash: 'fsmashPunch', usmash: 'usmashFlip', dsmash: 'dsmashBreak', nair: ['nairSpin', { limb: [] }], fair: 'fairSpike', bair: 'bairDrop', uair: 'uairHead', dair: 'dairStomp' },
    nia_rescoldo: { fx: 'fire', jab: 'jabHeavy', ftilt: ['ftiltChop', { limb: 'hF' }], utilt: 'utiltHeadbutt', dtilt: 'dtiltSlap', dashattack: 'dashShoulder',
      fsmash: ['fsmashThrust', { limb: [], dmg: 1.1 }], usmash: 'usmashUppercut', dsmash: 'dsmashSlam', nair: 'nairBody', fair: 'fairSpike', bair: 'bairDrop', uair: 'uairHead', dair: 'dairStomp' },
    eclipse_sol: { fx: 'fire', jab: 'jabSword2', ftilt: 'ftiltChop', utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: ['dashSpin', { limb: 'w' }],
      fsmash: 'fsmashSword', usmash: 'usmashArc', dsmash: ['dsmashSlam', { limb: 'w' }], nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairStab' },
    eclipse_luna: { jab: ['jabRapid', { kind: 'slash' }], ftilt: ['ftiltDouble', { limb: 'w', fx: 'slash' }], utilt: 'utiltSword', dtilt: ['dtiltPoke', { limb: 'w' }], dashattack: 'dashSlash',
      fsmash: ['fsmashDouble', { limb: 'w', fx: 'slash' }], usmash: ['usmashMulti', { limb: 'w', fx: 'slash' }], dsmash: 'dsmashSlash', nair: ['nairSpin', { limb: 'w', fx: 'slash' }], fair: ['fairDrill', { kind: 'slash', limb: 'w', fx: 'slash' }], bair: 'bairSlash', uair: ['uairMulti', { limb: 'w', fx: 'slash' }], dair: 'dairArc' },
    haldor: { jab: ['jabCombo', { fin: 'slash' }], ftilt: 'ftiltChop', utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: 'dashSlash',
      fsmash: ['fsmashHammer', { fx: 'slash' }], usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairArc' },
    ilyra: { jab: 'jabSword2', ftilt: 'ftiltSlash', utilt: 'utiltSword', dtilt: ['dtiltPoke', { limb: 'w' }], dashattack: 'dashSlash',
      fsmash: 'fsmashSword', usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairArc' },
    kestra: { col: '#b6ff3a', jab: ['jabCombo', { fin: 'palm' }], ftilt: 'ftiltKick', utilt: 'utiltKick', dtilt: ['dtiltPoke', { fx: 'fire' }], dashattack: 'dashShoulder',
      fsmash: ['fsmashBlast', { fx: 'fire' }], usmash: ['usmashMulti', { fx: 'fire' }], dsmash: 'dsmashSweep', nair: 'nairSex', fair: ['fairDrill', { kind: 'punch', limb: 'hF', fx: 'fire' }], bair: 'bairKick', uair: ['uairMulti', { limb: ['fF', 'fB'] }], dair: ['dairSlam', { fx: 'fire' }] },
    tamba: { fx: 'heavy', jab: 'jabHeavy', ftilt: ['ftiltChop', { limb: 'hF' }], utilt: 'utiltArc', dtilt: 'dtiltSlap', dashattack: 'dashKick',
      fsmash: 'fsmashClap', usmash: 'usmashClap', dsmash: 'dsmashSlam', nair: 'nairSpin', fair: 'fairSpike', bair: 'bairKick', uair: 'uairHead', dair: 'dairStomp' },
    /* v6: Corvin (espada rúnica eléctrica en smashes y aéreos) y Gyron-64 (brazos, láser y propulsores). */
    corvin: { col: '#ffe14a', jab: 'jabSword2', ftilt: 'ftiltSlash', utilt: ['utiltBurst', { fx: 'fire' }], dtilt: 'dtiltSlash', dashattack: 'dashSlash',
      fsmash: ['fsmashSword', { fx: 'elec' }], usmash: ['usmashArc', { fx: 'elec' }], dsmash: ['dsmashSlash', { fx: 'elec' }], nair: ['nairSlash', { fx: 'elec' }], fair: ['fairArc', { fx: 'elec' }], bair: ['bairSlash', { fx: 'elec' }], uair: ['uairArc', { fx: 'elec' }], dair: ['dairStab', { fx: 'elec' }] },
    gyron: { col: '#ff7a2a', jab: ['jabRapid', { kind: 'punch' }], ftilt: 'ftiltPunch', utilt: 'utiltArc', dtilt: 'dtiltPoke', dashattack: 'dashShoulder',
      fsmash: ['fsmashBlast', { fx: 'fire' }], usmash: ['usmashPillar', { fx: 'fire' }], dsmash: 'dsmashSweep', nair: 'nairSpin', fair: 'fairPunch', bair: ['airBurst', { dir: 'b', fx: 'fire' }], uair: 'uairMulti', dair: ['airBurst', { dir: 'd', fx: 'fire' }] },
    /* v7: Monocromo (objetos LCD) y LosGemelos (Copete grita, Flequillo golpea con la laptop). */
    monocromo: { jab: ['jabRapid', { kind: 'punch' }], ftilt: ['ftiltChop', { limb: 'hF' }], utilt: 'utiltArc', dtilt: 'dtiltSweep', dashattack: 'dashKick',
      fsmash: ['fsmashBlast', { fx: 'fire' }], usmash: 'usmashUppercut', dsmash: 'dsmashSlam', nair: 'nairSpin', fair: 'fairSpike', bair: 'bairKick', uair: 'uairMulti', dair: 'dairDrill' },
    gemelos_copete: { fx: 'wind', col: '#bfe3ff', jab: ['jabCombo', { fin: 'palm' }], ftilt: 'ftiltPalm', utilt: 'utiltBurst', dtilt: 'dtiltPoke', dashattack: 'dashBurst',
      fsmash: 'fsmashBlast', usmash: 'usmashPillar', dsmash: 'dsmashSlam', nair: 'nairBurst', fair: ['airBurst', { dir: 'f' }], bair: ['airBurst', { dir: 'b' }], uair: ['airBurst', { dir: 'u' }], dair: ['airBurst', { dir: 'd' }] },
    gemelos_flequillo: { jab: 'jabSword2', ftilt: 'ftiltChop', utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: 'dashSlash',
      fsmash: ['fsmashHammer', { fx: 'heavy' }], usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairStab' },
    /* v1.1: BigSimio (termazos pesados con su termo negro) y Jochis (golpes con su mando rosa). */
    bigsimio: { fx: 'heavy', col: '#ffd23a', jab: 'jabSword2', ftilt: ['ftiltChop', { size: 1.1 }], utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: 'dashSlash',
      fsmash: ['fsmashHammer', { dmg: 1.06 }], usmash: 'usmashArc', dsmash: ['dsmashSlam', { limb: 'w' }], nair: 'nairSlash', fair: ['fairArc', { size: 1.1 }], bair: 'bairSlash', uair: 'uairArc', dair: ['dairSlam', { limb: 'w' }] },
    jochis: { fx: 'hit', col: '#ff8fd0', jab: 'jabSword2', ftilt: 'ftiltSlash', utilt: 'utiltSword', dtilt: 'dtiltSlash', dashattack: ['dashSpin', { limb: 'w' }],
      fsmash: 'fsmashSword', usmash: 'usmashArc', dsmash: 'dsmashSlash', nair: 'nairSlash', fair: 'fairArc', bair: 'bairSlash', uair: 'uairArc', dair: 'dairStab' }
  };
  /* Aria: su smash hacia arriba es una estocada vertical (no un arco). */
  KITS.aria.usmash = 'usmashThrustUp';
  TPL.usmashThrustUp = () => ({ frames: 48, charge: charge(8), limb: 'w', hitboxes: [H(13, 17, 4, -118, 16, 17, 90, 36, 100, { effect: 'slash', dir: 'auto' }), H(13, 17, 6, -82, 14, 14, 90, 34, 96, { effect: 'slash' })],
    anim: [K(8, { aF1: 0.9, aF2: 1.4, wpn: 1.0, lean: 0.2, lF1: 0.9, lF2: -1.6, lB1: 0.2, lB2: -1.4 }, 'out'), K(13, { aF1: 3.1, aF2: 0, wpn: 0, lean: -0.08, oy: -6 }, 'back'), K(26, { aF1: 3.0, aF2: 0.1, wpn: 0.1, oy: -3 }, 'out')] });

  const MOVE_KEYS = new Set(['jab', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair']);

  /* ============================ CONSTRUCCIÓN =============================== */
  function scaleMove(m, def, o) {
    const pr = Object.assign({ reach: 1, power: 1, speed: 1 }, def.profile || {});
    const sz = ((def.stats && def.stats.height) || 80) / 80;
    const S = pr.speed, reach = pr.reach * (o.reach || 1), dm = pr.power * (o.dmg || 1), km = o.kb || 1;
    const F = n => Math.max(1, Math.round(n / S));
    const out = Object.assign({}, m);
    out.frames = F(m.frames);
    if (m.hitboxes) out.hitboxes = m.hitboxes.map(h => Object.assign({}, h, {
      effect: o.fx || h.effect || pr.effect || 'hit',
      x: h.x * reach * sz, y: h.y * sz, r: h.r * sz * (o.size || 1), dmg: +(h.dmg * dm).toFixed(2), kbg: h.kbg * km,
      f: [F(h.f[0]), F(h.f[1])], rehit: h.rehit ? Math.max(2, F(h.rehit)) : undefined
    }));
    /* Los brazos de las plantillas se escriben en ángulo absoluto; el rig
     * los suma a la inclinación del torso, así que se compensa aquí. */
    if (m.anim) out.anim = m.anim.map(k => {
      const p = Object.assign({}, k.p), L = p.lean != null ? p.lean : 0.04;
      if (p.aF1 != null) p.aF1 -= L;
      if (p.aB1 != null) p.aB1 -= L;
      return { f: F(k.f), p, e: k.e };
    });
    if (m.chain) out.chain = [F(m.chain[0]), F(m.chain[1])];
    if (m.charge) out.charge = Object.assign({}, m.charge, { at: F(m.charge.at) });
    if (m.vel) out.vel = m.vel.map(v => Object.assign({}, v, { f: [F(v.f[0]), F(v.f[1])] }));
    if (m.loop) out.loop = { from: F(m.loop.from), to: F(m.loop.to), max: m.loop.max };
    if (o.limb !== undefined && m.limb !== undefined) out.limb = o.limb;
    const fxs = [];
    if (m.burst != null) fxs.push({ f: F(m.burst), type: 'burst' });
    if (m.burst2 != null) fxs.push({ f: F(m.burst2), type: 'burst' });
    if (m.shake != null) fxs.push({ f: F(m.shake), type: 'shake' });
    if (m.dust) fxs.push({ f: F(m.dust[0]), type: 'dust', both: !!m.dust[2] });
    const col = o.col;
    if (fxs.length || out.loop) {
      const prev = m.onFrame;
      out.onFrame = function (f, fr, mv) {
        for (const e of fxs) if (fr === e.f) runFx(f, mv, e, col);
        if (out.loop) {
          /* Golpes rápidos: se mantienen mientras se mantenga o se machaque el ataque. */
          if (fr >= out.loop.from && f.input.pressed('attack')) { f.input.consume('attack'); mv.data.more = true; }
          if (fr === out.loop.to && (mv.data.more || f.input.isHeld('attack')) && (mv.data.loops || 0) < out.loop.max) {
            mv.data.more = false; mv.data.loops = (mv.data.loops || 0) + 1; mv.frame = out.loop.from;
          }
        }
        if (prev) prev(f, fr, mv);
      };
    }
    delete out.burst; delete out.burst2; delete out.shake; delete out.dust;
    return out;
  }
  function runFx(f, mv, e, col) {
    const hb = mv.def.hitboxes && mv.def.hitboxes[0];
    if (e.type === 'shake') { f.match.camera.shake(Math.min(9, 2 + (hb ? hb.dmg / 4 : 2))); return; }
    if (!hb) return;
    const s = f.hbScale ? f.hbScale() : 1;
    const c = f.localToWorld(hb.x * s, hb.y * s);
    if (e.type === 'burst') {
      const color = col || (f.palette && f.palette.accent) || '#fff';
      f.fx('ring', c.x, c.y, { r: hb.r * s * 1.6, color, w: 4 });
      for (let i = 0; i < 4; i++) f.fx('sparkle', c.x + U.rand(-hb.r, hb.r) * s, c.y + U.rand(-hb.r, hb.r) * s, { color });
    } else if (e.type === 'dust') {
      f.fx('dust', c.x, f.y, { n: 5 });
      if (e.both) { const c2 = f.localToWorld(-hb.x * s, hb.y * s); f.fx('dust', c2.x, f.y, { n: 5 }); }
    }
  }

  function build(def) {
    const kit = KITS[def.id];
    if (!kit) return null;
    const base = { fx: kit.fx, col: kit.col };
    const out = {};
    for (const key in kit) {
      if (!MOVE_KEYS.has(key)) continue;
      const spec = kit[key];
      const name = Array.isArray(spec) ? spec[0] : spec;
      const o = Object.assign({}, base, Array.isArray(spec) ? spec[1] : {});
      const T = TPL[name];
      if (!T) throw new Error('Kit ' + def.id + ': plantilla desconocida ' + name);
      const res = T(o);
      const moves = res.__multi || { [key]: res };
      for (const k in moves) out[k] = scaleMove(moves[k], def, o);
    }
    return out;
  }

  NX.Kits = { TPL, KITS, build, MOVE_KEYS };
})(window.NX = window.NX || {});
