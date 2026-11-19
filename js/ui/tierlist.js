/* ==========================================================================
 * NEXUS CLASH — js/ui/tierlist.js  (V1.2)
 * Tier List oficial de los 36 luchadores.
 *  - TIERS: clasificación de S+ a E. Se decidió combinando las estadísticas
 *    reales del juego (las mismas que usa el motor) con el valor del kit:
 *      · DPS (daño por golpe ÷ fotogramas de arranque)   22%
 *      · Daño medio de los normales                       14%
 *      · Velocidad de reacción (arranque de los golpes)   10%
 *      · Peso (aguante antes de salir volando)            16%
 *      · Movilidad (carrera + velocidad aérea)            12%
 *      · Alcance                                           8%
 *      · Kit: proyectiles, reflectores, contraataques,
 *        recuperación y pasiva                            18%
 *  - stats(): barras 0-10 calculadas en vivo a partir de los movesets, así
 *    que si un luchador cambia, sus barras se actualizan solas.
 * ========================================================================== */
(function (NX) {
  'use strict';

  const TIERS = [
    { tier: 'S', sub: '+', color: '#ff2d3c', ids: ['tamba', 'bigsimio', 'brakk'] },
    { tier: 'S', sub: '−', color: '#ff2d3c', ids: ['ilyra', 'haldor', 'eclipse', 'torva'] },
    { tier: 'A', sub: '+', color: '#ff8a1f', ids: ['gorrak', 'valkyr', 'ironclad', 'aria'] },
    { tier: 'A', sub: '·', color: '#ff8a1f', ids: ['zephyr', 'jochis', 'morgrath', 'hexa', 'volgur', 'gemelos'] },
    { tier: 'A', sub: '−', color: '#ff8a1f', ids: ['ritmo', 'corvin', 'kaito', 'kael'] },
    { tier: 'B', sub: '+', color: '#ffc21a', ids: ['grizzla', 'sylra', 'chronia', 'rook', 'nia'] },
    { tier: 'B', sub: '−', color: '#ffc21a', ids: ['gyron', 'kestra', 'luma', 'jett'] },
    { tier: 'C', sub: '+', color: '#35c84a', ids: ['vespera', 'volta'] },
    { tier: 'C', sub: '−', color: '#35c84a', ids: ['monocromo'] },
    { tier: 'D', sub: '·', color: '#2b9cf0', ids: ['kumo', 'nyx'] },
    { tier: 'E', sub: '·', color: '#a35ce0', ids: ['medu'] }
  ];

  /* Por qué está cada luchador en su puesto (pros y contras). */
  const WHY = {
    tamba: 'Pesado pero rápido para su tamaño, con gran alcance. Su Carga del titán convierte cualquier agarre en un KO.',
    bigsimio: 'De los que más pegan y de los más pesados del plantel. Desde 100% se enfurece (+15% velocidad y daño) y remata aún antes.',
    brakk: 'El mejor DPS entre los pesados: golpes rápidos y fuertes. Su Impulso de Combo premia la presión constante.',
    ilyra: 'Espada veloz con el mismo daño en toda la hoja y contraataque: castiga cualquier error del rival.',
    haldor: 'Mandoble con alcance y potencia enormes; mata muy pronto. A cambio, sus golpes salen lentos.',
    eclipse: 'Dos luchadoras en una: Sol para rematar, Luna para presionar, y Previsión para esquivar en el momento justo.',
    torva: 'Pesada, con el mayor alcance de las espadas, y su Escudo Torre frena proyectiles de frente. Muy difícil de sacar del escenario.',
    gorrak: 'El más pesado y el de más daño por golpe; además recibe 10% menos. Su punto débil: ataques muy lentos al arrancar.',
    valkyr: 'Sólida en todo: peso medio-alto, buen daño y dos reflectores que anulan a los que atacan a distancia.',
    ironclad: 'Un tanque con 3 saltos aéreos: aguanta muchísimo y casi siempre vuelve al escenario.',
    aria: 'Espada equilibrada con proyectil y contraataque. Con la Resonancia llena, el siguiente especial pega más.',
    zephyr: 'La carrera más rápida del juego y ataques que salen pronto. Es ligera, así que sale volando antes.',
    jochis: 'El mejor DPS de todo el plantel (golpes rápidos y fuertes). Muy ligero, hasta que al minuto el Arcano Mayor le da +30% de peso.',
    morgrath: 'El mayor alcance del plantel: controla el espacio con la guadaña. Es ligero y vuela pronto.',
    hexa: 'Espada larga, 3 saltos y veneno: presiona y se recupera de maravilla. Su daño directo es medio.',
    volgur: 'Pesado, con 4 saltos aéreos y golpes muy fuertes, aunque sus ataques arrancan lentos.',
    gemelos: 'Copete pega fuerte y Flequillo es rápido: cambiar de gemelo lo adapta a cualquier rival.',
    ritmo: 'Muy rápido y móvil; tras esquivar pega un 20% más. Recompensa a quien sabe leer al rival.',
    corvin: 'El kit más completo (maná, Trueno cargable, robo de vida), pero es el que más lento se mueve.',
    kaito: 'Ataques de los más rápidos del juego y un contraataque fiable; le falta fuerza para rematar.',
    kael: 'Orbe almacenable y buen daño a distancia. Es muy ligero: cuidado con los pesados.',
    grizzla: 'Agarres y lanzamientos brutales y mucho peso. Sin proyectil, la mantienen lejos con facilidad.',
    sylra: 'Zarzales que castigan el suelo y buena velocidad; daño y peso promedio.',
    chronia: 'Rebobinar la hace casi imposible de rematar fuera del escenario, pero su daño directo es bajo.',
    rook: 'Muros y torretas controlan el escenario, pero depende de juntar CHATARRA.',
    nia: 'Tres bestias en un solo luchador, pero cambia sola al perder una vida: es difícil planear la partida.',
    gyron: 'Láser que se recarga y vuelo con combustible, pero es de los más lentos en el suelo.',
    kestra: 'Disparo almacenable y agarre de largo alcance; sus golpes normales hacen poco daño.',
    luma: 'Rápida y con un espíritu de fuego potente, pero necesita llenar su medidor para brillar.',
    jett: 'Ataca muy rápido, pero cae rapidísimo y es ligera: es fácil combearla.',
    vespera: 'Flota y refleja, pero es ligera y sus golpes salen lentos para el daño que hacen.',
    volta: 'Su rayo encadenado brilla en Batalla Campal; en 1 VS 1 le falta daño.',
    monocromo: 'Kit divertido (Juez, Cubo), pero es de los más ligeros y depende mucho del azar.',
    kumo: 'Telarañas útiles y mucha velocidad, pero es de las que menos daño hacen.',
    nyx: 'La más rápida al atacar y casi invisible tras la Bomba de Humo, pero pega muy poco y sale volando pronto.',
    medu: 'Caída lenta y 3 saltos la hacen difícil de rematar, pero es la que menos daño hace de todo el juego.'
  };

  const ORDER = [];
  TIERS.forEach(t => t.ids.forEach(id => ORDER.push(id)));

  function tierOf(id) {
    const t = TIERS.find(r => r.ids.indexOf(id) >= 0);
    return t ? { tier: t.tier, sub: t.sub, color: t.color, label: t.tier + (t.sub === '·' ? '' : t.sub) } : null;
  }

  /* ----------------------- BARRAS DE ESTADÍSTICAS ------------------------ */
  const NORMALS = ['jab', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair'];
  let cache = null;

  function metrics(d) {
    const s = Object.assign({}, NX.DEFAULT_STATS, d.stats || {});
    const mv = NX.buildMoveset(d);
    let dmg = 0, start = 0, n = 0;
    NORMALS.forEach(k => {
      const m = mv[k];
      if (!m || !m.hitboxes || !m.hitboxes.length) return;
      dmg += Math.max.apply(null, m.hitboxes.map(h => h.dmg));
      start += Math.min.apply(null, m.hitboxes.map(h => h.f[0]));
      n++;
    });
    return { dmg: n ? dmg / n : 0, start: n ? start / n : 10, weight: s.weight, run: s.run, air: s.airSpeed, reach: (d.profile && d.profile.reach) || 1 };
  }

  function compute() {
    if (cache) return cache;
    cache = {};
    if (!NX.buildMoveset || !NX.ROSTER) return cache;
    const rows = NX.ROSTER.map(slot => {
      const ms = (slot.forms || [slot]).map(metrics);
      const avg = {};
      Object.keys(ms[0]).forEach(k => { avg[k] = ms.reduce((a, m) => a + m[k], 0) / ms.length; });
      avg.id = slot.id;
      return avg;
    });
    const span = k => { const v = rows.map(r => r[k]); return [Math.min.apply(null, v), Math.max.apply(null, v)]; };
    const norm = (k, v, inv) => { const [a, b] = span(k); const x = b > a ? (v - a) / (b - a) : 0.5; return 1 + 9 * (inv ? 1 - x : x); };
    rows.forEach(r => {
      cache[r.id] = {
        power: norm('dmg', r.dmg),
        speed: norm('start', r.start, true),
        weight: norm('weight', r.weight),
        mobility: (norm('run', r.run) + norm('air', r.air)) / 2,
        reach: norm('reach', r.reach),
        raw: r
      };
    });
    return cache;
  }

  const BARS = [
    { k: 'power', label: 'DAÑO' },
    { k: 'speed', label: 'REACCIÓN' },
    { k: 'weight', label: 'PESO' },
    { k: 'mobility', label: 'MOVILIDAD' },
    { k: 'reach', label: 'ALCANCE' }
  ];

  NX.TierList = {
    version: '1.2.1', tiers: TIERS, why: WHY, order: ORDER, bars: BARS,
    tierOf,
    stats(id) { return compute()[id] || null; },
    reset() { cache = null; }
  };
})(window.NX = window.NX || {});
