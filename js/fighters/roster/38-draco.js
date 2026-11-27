/* NEXUS CLASH — js/fighters/roster/38-draco.js · luchador 38 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { fighter, glasses } = NX.RosterLib;

  /* ======================================================================
   * V1.4 · DRACO — Telequinético
   * No camina: flota. A su alrededor orbitan un cubo mágico, un mando y un
   * libro, y con telequinesis los usa en TODOS sus ataques normales.
   *  - B: cambia de tamaño (normal → grande → pequeño → normal).
   *  - Lado: lanza el cubo como mina; quien la pisa queda atrapado 1,5 s.
   *  - Arriba: se convierte en una bola de energía inmune que sale disparada.
   *  - Abajo: 1 s con lentes negros; si le pegan cuerpo a cuerpo, aparece
   *    Mina y le da una cachetada al rival.
   * ==================================================================== */
  const SIZES = [
    { name: 'NORMAL', size: 1, weight: 1, dmg: 1, speed: 1, color: '#ffffff' },
    { name: '¡GRANDE!', size: 1.35, weight: 1.3, dmg: 1.2, speed: 0.88, color: '#ffb36a' },
    { name: '¡PEQUEÑO!', size: 0.7, weight: 0.75, dmg: 0.85, speed: 1.15, color: '#7fe9ff' }
  ];
  const TRAP_FRAMES = 90, COUNTER_WIN = [4, 64];
  const CUBE_COLORS = ['#ff3b30', '#ffffff', '#2f8cff', '#ffcc00', '#34c759', '#ff8a00'];
  const AURA = '#b48cff';

  /* ----------------------------- TAMAÑO --------------------------------- */
  function applySize(f, i) {
    const d = f.data;
    if (!d.base) d.base = { size: f.sizeMult || 1, weight: f.weightMult || 1, dmg: f.dmgMult || 1 };
    const S = SIZES[i];
    d.size = i;
    f.sizeMult = d.base.size * S.size; f.weightMult = d.base.weight * S.weight; f.dmgMult = d.base.dmg * S.dmg;
    f.w = f.base.width * f.sizeMult; f.h = f.base.height * f.sizeMult;
  }

  /* ---------------------------- OBJETOS --------------------------------- */
  function drawCube(ctx, x, y, s, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha == null ? 1 : alpha;
    const c = s / 1.5;
    /* Cara superior (perspectiva). */
    ctx.save(); ctx.transform(1, 0, 0.55, 0.45, -s * 0.28, -s * 1.45);
    ctx.fillStyle = '#16121c'; ctx.fillRect(-s, -s * 0.2, s * 2, s * 2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = CUBE_COLORS[(i + j * 2 + 3) % 6]; ctx.fillRect(-s + 1 + i * c * 1.0 + 0.4, -s * 0.2 + 1 + j * c + 0.4, c - 1.6, c - 1.6); }
    ctx.restore();
    /* Cara frontal. */
    ctx.fillStyle = '#16121c'; ctx.fillRect(-s, -s, s * 2, s * 2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      ctx.fillStyle = CUBE_COLORS[(i * 2 + j) % 6];
      ctx.fillRect(-s + 1 + i * c * 1.0 + 0.3, -s + 1 + j * c + 0.3, c - 1.4, c - 1.4);
    }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-s + 1, -s + 1, s * 2 - 2, s * 0.35);
    ctx.restore();
  }
  function drawPad(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const body = '#3a3f47';
    ctx.fillStyle = body; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, -s * 0.45);
    ctx.quadraticCurveTo(0, -s * 0.62, s * 0.9, -s * 0.45);
    ctx.quadraticCurveTo(s * 1.35, -s * 0.3, s * 1.25, s * 0.55);
    ctx.quadraticCurveTo(s * 1.05, s * 0.85, s * 0.7, s * 0.4);
    ctx.quadraticCurveTo(0, s * 0.22, -s * 0.7, s * 0.4);
    ctx.quadraticCurveTo(-s * 1.05, s * 0.85, -s * 1.25, s * 0.55);
    ctx.quadraticCurveTo(-s * 1.35, -s * 0.3, -s * 0.9, -s * 0.45);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.32, s * 0.7, s * 0.12, 0, 0, TAU); ctx.fill();
    /* Cruceta, sticks y cuatro botones de colores. */
    ctx.fillStyle = '#d9dde3'; ctx.fillRect(-s * 0.72, -s * 0.08, s * 0.36, s * 0.12); ctx.fillRect(-s * 0.6, -s * 0.2, s * 0.12, s * 0.36);
    R.disc(ctx, -s * 0.25, s * 0.18, s * 0.16, '#5c626b'); R.disc(ctx, s * 0.25, -s * 0.12, s * 0.16, '#5c626b');
    [['#34c759', 0, 0.16], ['#ff3b30', 0.16, 0], ['#2f8cff', -0.16, 0], ['#ffcc00', 0, -0.16]].forEach(([c, dx, dy]) => R.disc(ctx, s * (0.68 + dx), s * (-0.05 + dy), s * 0.08, c, false));
    R.disc(ctx, 0, -s * 0.3, s * 0.07, '#9aa3ad', false);
    ctx.restore();
  }
  function drawBook(ctx, x, y, s, rot, flap) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const o = 0.25 + flap * 0.35, cover = '#6b2fbf';
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.scale(sg, 1); ctx.rotate(-o);
      R.poly(ctx, [[0, -s * 0.1], [s * 1.15, -s * 0.55], [s * 1.15, s * 0.55], [0, s * 0.62]], cover);
      R.poly(ctx, [[1.5, -s * 0.02], [s * 1.02, -s * 0.42], [s * 1.02, s * 0.44], [1.5, s * 0.5]], '#fbf3dc');
      ctx.strokeStyle = 'rgba(80,60,40,.45)'; ctx.lineWidth = 0.8;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.12 + i * s * 0.18); ctx.lineTo(s * 0.85, -s * 0.36 + i * s * 0.18); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(-1, -s * 0.15, 2, s * 0.8);
    ctx.restore();
  }
  function aura(ctx, x, y, r, k) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(AURA, 0.45 * k)); g.addColorStop(1, U.rgba(AURA, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* Objeto que usa cada normal: el mando en los ligeros, el libro en los
   * smashes y los golpes fuertes, el cubo en los aéreos. */
  const OBJ_FOR = { jab: 'pad', jab2: 'pad', jab3: 'book', ftilt: 'pad', utilt: 'cube', dtilt: 'pad', dashattack: 'book',
    fsmash: 'book', usmash: 'book', dsmash: 'cube', nair: 'all', fair: 'cube', bair: 'pad', uair: 'cube', dair: 'book' };

  function tkInfo(f, rig, p) {
    const mv = f.move;
    if (f.state !== ST.ATTACK || !mv || !mv.def.hitboxes || !mv.def.hitboxes.length || mv.def.key.indexOf('special') === 0) return null;
    let obj = OBJ_FOR[mv.def.key] || (mv.def.key.indexOf('throw') === 0 ? 'book' : 'pad');
    if (obj === 'cube' && f.data.cube && f.data.cube.active) obj = 'pad';
    const hbs = mv.def.hitboxes, fr = mv.frame;
    let hb = hbs.find(h => fr >= h.f[0] && fr <= h.f[1]), phase = 'hit';
    if (!hb) {
      const next = hbs.filter(h => h.f[0] > fr).sort((a, b) => a.f[0] - b.f[0])[0];
      if (next) { hb = next; phase = 'wind'; } else { hb = hbs.reduce((a, b) => (b.f[1] > a.f[1] ? b : a)); phase = 'rec'; }
    }
    const k = (f.hbScale ? f.hbScale() : 1) / R.fighterScale(f, rig);
    const wk = Math.min(1, fr / Math.max(1, hb.f[0]));
    const w = phase === 'hit' ? 1 : phase === 'wind' ? (mv.charging ? 0.25 : 0.25 * wk) : Math.max(0, 1 - (fr - hb.f[1]) / 12);
    let x = hb.x * k;
    if ((p.sx || 1) < 0) x = -x;
    return { obj, x, y: hb.y * k, r: hb.r * k, w, phase, big: /smash|jab3|dashattack|dair/.test(mv.def.key) ? 1.45 : 1 };
  }

  /* Posiciones de los tres objetos (coordenadas del esqueleto). */
  function objects(f, J, rig, p) {
    const t = f.tick || 0, d = f.data || {};
    const c = { x: J.sh.x - 2, y: J.sh.y + 2 };
    const ti = tkInfo(f, rig, p);
    const spin = ti && ti.obj === 'all' && ti.phase !== 'rec';
    const sp = spin ? 0.32 : 0.035, rad = spin ? Math.max(30, ti.r) : 30;
    const list = [['cube', 9], ['pad', 9.5], ['book', 9]].map(([kind, s], i) => {
      const a = t * sp + i * TAU / 3;
      return { kind, s, x: c.x + Math.cos(a) * rad, y: c.y + Math.sin(a) * rad * (spin ? 0.8 : 0.32) - 4 + Math.sin(t * 0.09 + i * 2) * 2.5,
        depth: Math.sin(a), rot: Math.sin(t * 0.05 + i) * 0.35 + (kind === 'cube' ? t * 0.03 : 0), active: spin, flap: Math.abs(Math.sin(t * 0.12 + i)) };
    });
    if (d.cube && d.cube.active) list[0].hidden = true;
    if (ti && !spin) {
      const o = list.find(q => q.kind === ti.obj);
      if (o) {
        const tx = ti.phase === 'wind' ? c.x + (ti.x - c.x) * 0.15 : ti.x, ty = ti.phase === 'wind' ? c.y - 18 : ti.y;
        const w = ti.phase === 'wind' ? Math.min(1, ti.w * 4) : ti.w;
        o.x += (tx - o.x) * w; o.y += (ty - o.y) * w; o.depth = 1; o.active = true;
        o.s *= 1 + (ti.big - 1) * w;
        o.rot = ti.phase === 'hit' ? (f.tick * 0.5) % TAU * (o.kind === 'book' ? 0.2 : 1) : o.rot;
        if (o.kind === 'book') o.flap = ti.phase === 'hit' ? 0 : 1;
      }
    }
    return list;
  }
  function drawObj(ctx, o, f) {
    if (o.hidden) return;
    aura(ctx, o.x, o.y, o.s * (o.active ? 3 : 2), o.active ? 1 : 0.55);
    if (o.kind === 'cube') drawCube(ctx, o.x, o.y, o.s * 0.75, o.rot);
    else if (o.kind === 'pad') drawPad(ctx, o.x, o.y, o.s, o.rot * 0.6);
    else drawBook(ctx, o.x, o.y, o.s, o.rot * 0.5, o.flap);
  }

  /* ------------------------------ PELO ---------------------------------- */
  function curls(ctx, list, col, hi) {
    for (const c of list) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2] + 1.6, 0, TAU); ctx.fillStyle = OUT; ctx.fill(); }
    for (const c of list) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, TAU); ctx.fillStyle = col; ctx.fill(); }
    ctx.strokeStyle = hi; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    for (const c of list) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2] * 0.55, c[3], c[3] + 3.6); ctx.stroke(); }
  }

  /* ------------------------------ MINA ----------------------------------
   * Ayudante del contraataque (personaje original): aparece junto al rival y
   * le da una cachetada. Es un proyectil sin daño que solo dibuja y, en su
   * fotograma 12, aplica el golpe. */
  function minaDraw(ctx, p) {
    const t = p.t, dir = p.data.dir, k = Math.min(1, t / 6, p.life / 8);
    const swing = t < 9 ? -1.9 : t < 13 ? -1.9 + (t - 9) * 0.95 : 1.9;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir * (0.6 + 0.4 * k), 0.6 + 0.4 * k); ctx.globalAlpha = k;
    /* Pelo largo (detrás). */
    R.poly(ctx, [[-13, -70], [11, -72], [14, -44], [6, -30], [-17, -30], [-19, -46]], '#c98a5a');
    /* Piernas, falda y torso. */
    R.limb(ctx, [{ x: -4, y: -24 }, { x: -5, y: -2 }], 5, '#f1c7a6'); R.limb(ctx, [{ x: 4, y: -24 }, { x: 5, y: -2 }], 5, '#f1c7a6');
    R.ellipse(ctx, -5, -1, 5, 2.5, 0, '#3a2a40'); R.ellipse(ctx, 6, -1, 5, 2.5, 0, '#3a2a40');
    R.poly(ctx, [[-12, -34], [12, -34], [15, -20], [-15, -20]], '#2f3f6b');
    R.poly(ctx, [[-10, -56], [10, -56], [12, -32], [-12, -32]], '#f0e2c4');
    R.poly(ctx, [[-2, -54], [4, -54], [3, -44], [1, -42], [-1, -44]], '#d6303c');
    /* Brazo trasero. */
    R.limb(ctx, [{ x: -8, y: -52 }, { x: -12, y: -38 }], 4, '#f0e2c4'); R.disc(ctx, -12, -37, 2.8, '#f1c7a6');
    /* Cabeza. */
    R.ellipse(ctx, 0, -66, 10, 10.5, 0, '#f1c7a6');
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(3, -68, 2, 3.5); ctx.fillRect(-3, -68, 2, 3.5);
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(1, -71.5); ctx.lineTo(6, -73); ctx.moveTo(-4, -73); ctx.lineTo(0, -71.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -60.5); ctx.lineTo(3, -61.5); ctx.stroke();
    /* Flequillo y diadema roja. */
    ctx.fillStyle = '#c98a5a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -66, 11, PI * 1.02, PI * 2.02); ctx.lineTo(9, -66); ctx.quadraticCurveTo(4, -72, 0, -70); ctx.quadraticCurveTo(-5, -73, -10, -64); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d6303c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -66, 10.5, PI * 1.15, PI * 1.85); ctx.stroke();
    /* Brazo de la cachetada. */
    ctx.save(); ctx.translate(7, -52); ctx.rotate(swing);
    R.limb(ctx, [{ x: 0, y: 0 }, { x: 0, y: 16 }], 4.2, '#f0e2c4'); R.disc(ctx, 0, 18, 3.6, '#f1c7a6');
    ctx.restore();
    if (t >= 12 && t <= 18) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(26, -52 + i * 7); ctx.lineTo(36 + Math.abs(i) * -3, -55 + i * 10); ctx.stroke(); }
    }
    ctx.restore();
  }
  function summonMina(f, atk, base) {
    const dir = U.sign(atk.x - f.x) || f.facing;
    f.facing = dir;
    f.intangible = Math.max(f.intangible, 30);
    atk.hitlag = Math.max(atk.hitlag, 16);
    const dmg = Math.max(10, base * 1.4);
    f.fx('flash', 0, 0, { color: '#fff', alpha: 0.3, life: 6 });
    f.fx('text', f.x, f.y - f.h - 18, { text: '¡MINA!', color: '#ff7aa8', size: 22 });
    NX.Audio.play('reflect');
    const gy = atk.ground ? atk.ground.y : atk.y;
    f.spawnProjectile({
      x: atk.x - dir * 34, y: gy, vx: 0, vy: 0, r: 1, life: 40, dmg: 0, harmless: true, stageCollide: false, reflectable: false, absorbable: false,
      destructible: false, glow: false, data: { dir, atk, dmg }, draw: minaDraw,
      update(p) {
        const a = p.data.atk;
        if (p.t < 12 && a.inPlay()) { p.x = a.x - p.data.dir * 34; p.y = a.ground ? a.ground.y : a.y; }
        if (p.t === 12 && a.inPlay() && p.owner.inPlay()) {
          p.owner.hitTarget(a, { dmg: p.data.dmg, ang: 361, bkb: 60, kbg: 88, effect: 'hit' }, { dir: p.data.dir, x: a.x, y: a.y - a.h * 0.7 });
          p.match.effects.spawn('text', a.x, a.y - a.h - 14, { text: '¡PLAF!', color: '#ffffff', size: 26 });
          p.match.camera.shake(10);
        }
        if (p.t === 1) for (let i = 0; i < 6; i++) p.match.effects.spawn('sparkle', p.x, p.y - 40, { color: '#ff9ac0' });
      },
      onDestroy(p) { for (let i = 0; i < 4; i++) p.match.effects.spawn('sparkle', p.x, p.y - 40, { color: '#ff9ac0' }); }
    });
  }

  /* ---------------------------- CUBO MINA -------------------------------- */
  function cageFollow(owner, t) {
    owner.spawnProjectile({
      x: t.x, y: t.y - t.h / 2, vx: 0, vy: 0, r: 1, life: TRAP_FRAMES + 30, dmg: 0, harmless: true, stageCollide: false, reflectable: false,
      absorbable: false, destructible: false, glow: false, data: { t },
      update(p) {
        const v = p.data.t;
        if (!v.inPlay() || (p.t > 6 && v.state !== ST.STUN && v.hitlag <= 0)) { p.destroy('free'); return false; }
        p.x = v.x; p.y = v.y - v.h / 2;
      },
      draw(ctx, p) {
        const v = p.data.t, s = v.h * 0.42, c = (s * 2) / 3;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.t * 0.2) * 0.05);
        ctx.globalAlpha = 0.42;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = CUBE_COLORS[(i * 2 + j) % 6]; ctx.fillRect(-s + i * c + 1, -s + j * c + 1, c - 2, c - 2); }
        ctx.globalAlpha = 0.95; ctx.strokeStyle = '#16121c'; ctx.lineWidth = 3;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.lineWidth = 1.6;
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s + i * c, -s); ctx.lineTo(-s + i * c, s); ctx.moveTo(-s, -s + i * c); ctx.lineTo(s, -s + i * c); ctx.stroke(); }
        ctx.restore();
      },
      onDestroy() {}
    });
  }

  fighter({
    id: 'draco', name: 'Draco', title: 'Telequinético',
    passive: 'Levita: no camina, flota. Un cubo mágico, un mando y un libro orbitan a su alrededor y los usa con telequinesis en sus normales. B cambia su tamaño.',
    palette: { primary: '#f4f4f2', secondary: '#dcdcd6', skin: '#d9a37c', head: '#d9a37c', hand: '#d9a37c', arms: '#f4f4f2', legs: '#c9a57c',
      feet: '#f7f7f7', belt: '#7a5a3c', accent: AURA, hair: '#17131a', eye: '#2a1a12' },
    stats: { weight: 90, height: 84, width: 36, walk: 3.0, run: 6.2, dash: 6.8, traction: 0.32, airSpeed: 3.9, airAccel: 0.3, gravity: 0.5, fall: 8.8,
      fastFall: 13.5, jump: 13.0, shortHop: 8.4, airJump: 12.2 },
    profile: { style: 'fist', reach: 1.15, power: 1.02, speed: 0.98 },
    ai: { recovery: 'up', counter: true, range: 96 },
    flipJump: false,
    init(f) { f.data.size = 0; },
    onLifeReset(f) { if (f.data.base) applySize(f, 0); f.data.ball = false; f.data.shades = false; },
    statMod(f, k, v) {
      const S = SIZES[f.data.size || 0];
      if (S.speed !== 1 && (k === 'walk' || k === 'run' || k === 'dash' || k === 'airSpeed')) return v * S.speed;
      return v;
    },
    /* Flota: las piernas cuelgan y el cuerpo sube y baja suavemente. */
    poseMod(f, p) {
      const t = f.tick || 0, out = { planted: false, oy: (p.oy || 0) - (13 + Math.sin(t * 0.07) * 3) };
      /* Las piernas siempre cuelgan (también al atacar: todo lo hace con telequinesis). */
      const sw = Math.sin(t * 0.07) * 0.05, mv = U.clamp((f.vx || 0) * 0.04, -0.25, 0.25) * (f.facing || 1);
      Object.assign(out, { lF1: 0.3 + sw - mv * 0.5, lF2: -0.55, lB1: 0.05 + sw - mv * 0.5, lB2: -0.7 });
      if (f.state !== ST.ATTACK) out.lean = (p.lean || 0) * 0.4 + mv * 0.6;
      if (f.data && f.data.ball) out.alpha = 0;
      return out;
    },
    /* Contraataque de Mina: solo contra golpes cuerpo a cuerpo durante el
     * segundo de lentes negros (los proyectiles le pegan normalmente). */
    canBeHit(f, box) {
      const mv = f.move;
      if (!box || box.kind !== 'melee' || f.state !== ST.ATTACK || !mv || mv.def.key !== 'special_down' || mv.data.countered) return true;
      if (mv.frame < COUNTER_WIN[0] || mv.frame > COUNTER_WIN[1] || box.owner === f || box.set.has(f.uid)) return true;
      if (box.def.unblockable || box.def.windbox) return true;
      const hr = f.hurtRect();
      if (!NX.Physics.circleRect(box.x, box.y, box.r, hr.x, hr.y, hr.w, hr.h)) return true;
      box.set.add(f.uid);
      mv.data.countered = true;
      mv.frame = Math.max(mv.frame, 52);
      summonMina(f, box.owner, (box.def.dmg || 6) * (box.mult || 1));
      return false;
    },
    drawOverlay(ctx, f, x, y, s) {
      if (!f.data.ball) return;
      const r = 22 * (f.sizeMult || 1), cy = y - f.h * 0.5, t = f.tick;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, r * 1.9);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, U.rgba('#9ff3ff', 0.85)); g.addColorStop(0.7, U.rgba(AURA, 0.55)); g.addColorStop(1, U.rgba(AURA, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, r * 1.9, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba('#ffffff', 0.8); ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, cy, r * 1.1, r * 0.45, t * 0.25 + i * 1.05, 0, TAU); ctx.stroke(); }
      ctx.restore();
    },
    rig: {
      headR: 12.5, torsoH: 25, torsoW: 21, hipW: 17, torsoRound: 7, neck: 3, thigh: 15, shin: 15, legW: 8.5, footL: 12, footH: 6,
      armW: 6.5, upperArm: 13, foreArm: 12, handR: 4.6, blush: false,
      parts: {
        back(ctx, a) {
          for (const o of objects(a.f, a.J, a.rig, a.p)) if (o.depth < 0 && !o.active) drawObj(ctx, o, a.f);
        },
        torso(ctx, a) {
          const r = a.rig;
          /* Cuello de la camisa, botones y bolsillo. */
          R.poly(ctx, [[-r.torsoW * 0.28, -r.torsoH], [r.torsoW * 0.05, -r.torsoH * 0.78], [-r.torsoW * 0.02, -r.torsoH * 1.04]], '#ffffff');
          R.poly(ctx, [[r.torsoW * 0.34, -r.torsoH], [r.torsoW * 0.08, -r.torsoH * 0.78], [r.torsoW * 0.12, -r.torsoH * 1.04]], '#ffffff');
          ctx.strokeStyle = '#cfcfc8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r.torsoW * 0.07, -r.torsoH * 0.78); ctx.lineTo(r.torsoW * 0.09, -6); ctx.stroke();
          for (let i = 0; i < 3; i++) R.disc(ctx, r.torsoW * 0.12, -r.torsoH * (0.66 - i * 0.18), 0.9, '#b9b9b0', false);
          ctx.strokeStyle = '#d4d4cc'; ctx.strokeRect(r.torsoW * 0.18, -r.torsoH * 0.72, 5, 5);
        },
        head(ctx, a) {
          const hr = a.rig.headR, f = a.f, top = [];
          /* Pelo corto y rizado: solo en la parte de arriba de la cabeza (no cae por la nuca). */
          for (let i = 0; i < 7; i++) {
            const ang = -PI * 0.9 + i * (PI * 0.68 / 6);
            top.push([Math.cos(ang) * hr * 0.88, Math.sin(ang) * hr * 0.88 - 1, hr * (0.3 + (i % 2) * 0.05), i * 1.4]);
          }
          top.push([hr * 0.15, -hr * 0.98, hr * 0.28, 2], [-hr * 0.3, -hr * 1.06, hr * 0.3, 4], [-hr * 0.7, -hr * 0.82, hr * 0.28, 1]);
          curls(ctx, top, a.pal.hair, R.tone(a.pal.hair, 0.22));
          glasses(ctx, hr);
          /* Lentes negros durante el contraataque. */
          if (f.data && f.data.shades) {
            ctx.fillStyle = '#0d0d10'; ctx.strokeStyle = '#0d0d10'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.ellipse(hr * 0.42, -hr * 0.08, hr * 0.3, hr * 0.22, 0, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-hr * 0.06, -hr * 0.08, hr * 0.24, hr * 0.21, 0, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.moveTo(hr * 0.15, -hr * 0.12); ctx.lineTo(hr * 0.2, -hr * 0.12); ctx.moveTo(-hr * 0.3, -hr * 0.14); ctx.lineTo(-hr * 0.85, -hr * 0.06); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(hr * 0.3, -hr * 0.22, hr * 0.14, hr * 0.05);
          }
        },
        front(ctx, a) {
          const objs = objects(a.f, a.J, a.rig, a.p);
          const act = objs.find(o => o.active && !o.hidden);
          if (act && a.f.state === ST.ATTACK) {
            /* Hilo de telequinesis de la mano al objeto. */
            const h = a.J.haF;
            ctx.save(); ctx.strokeStyle = U.rgba(AURA, 0.7); ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -a.f.tick;
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(act.x, act.y); ctx.stroke(); ctx.restore();
            aura(ctx, h.x, h.y, 9, 1);
          }
          for (const o of objs) if (o.depth >= 0 || o.active) drawObj(ctx, o, a.f);
        }
      }
    },
    specials: {
      /* Cambio de tamaño: normal → grande → pequeño → normal. */
      neutral: {
        frames: 30, pose: 'cast', drift: 0.6, gravity: 0.6,
        onFrame(f, fr) {
          if (fr === 4) NX.Audio.play('charge', { pitch: 1.2 });
          if (fr !== 12) return;
          const next = ((f.data.size || 0) + 1) % 3, S = SIZES[next];
          applySize(f, next);
          f.fx('ring', f.x, f.y - f.h / 2, { r: f.h * 0.7, color: AURA, w: 6 });
          for (let i = 0; i < 6; i++) f.fx('sparkle', f.x, f.y - f.h / 2, { color: S.color });
          f.fx('text', f.x, f.y - f.h - 18, { text: S.name, color: S.color, size: 20 });
          NX.Audio.play('magic', { pitch: next === 1 ? 0.7 : next === 2 ? 1.5 : 1 });
        }
      },
      /* Cubo mina: rueda hasta el suelo y atrapa 1,5 s a quien lo pise. */
      side: {
        frames: 36, pose: 'shoot', drift: 0.6, gravity: 0.7,
        onFrame(f, fr) {
          if (fr !== 12) return;
          if (f.data.cube && f.data.cube.active) f.data.cube.destroy('replace');
          NX.Audio.play('throw', { pitch: 1.2 });
          const p0 = f.localToWorld(26, -f.h * 0.6);
          f.data.cube = f.spawnProjectile({
            x: p0.x, y: p0.y, vx: f.facing * (f.ground ? 4.6 : 3.6), vy: -4, gravity: 0.42, maxFall: 12, r: 8, dmg: 0, harmless: true,
            life: 600, passCollide: true, reflectable: false, absorbable: false, destructible: false, glow: false, data: { rot: 0 },
            onGround(p, pl) {
              p.y = pl.y - 8; p.vy = 0; p.vx = 0;
              if (!p.data.armed) { p.data.armed = true; p.data.at = p.t; p.match.effects.spawn('dust', p.x, pl.y, { n: 3 }); NX.Audio.play('block'); }
            },
            onWall(p) { p.vx = 0; },
            update(p, m) {
              if (!p.data.armed) { p.data.rot += p.vx * 0.06; return; }
              if (p.t - p.data.at < 12) return;
              for (const t of m.fighters) {
                if (t === p.owner || !t.inPlay() || !t.canBeHit()) continue;
                if (Math.abs(t.x - p.x) < 26 + t.w * 0.3 && Math.abs(t.y - (p.y + 8)) < 26) {
                  m.effects.spawn('explosion', p.x, p.y, { r: 34 });
                  NX.Audio.play('explosion', { pitch: 1.3 });
                  p.owner.hitTarget(t, { dmg: 8, fkb: 0, bkb: 0, kbg: 0, ang: 90, stun: TRAP_FRAMES, effect: 'magic' }, { x: p.x, y: p.y });
                  m.effects.spawn('text', t.x, t.y - t.h - 12, { text: '¡ENREDADO!', color: '#ffcc00', size: 18 });
                  cageFollow(p.owner, t);
                  p.destroy('trigger'); return false;
                }
              }
            },
            draw(ctx, p) {
              const blink = p.data.armed && Math.floor(p.t / 10) % 2 === 0;
              drawCube(ctx, p.x, p.y, 7, p.data.armed ? 0 : p.data.rot);
              if (blink) { R.disc(ctx, p.x, p.y - 12, 2.2, '#ff3b30', false); }
            },
            onDestroy(p, reason) { if (reason !== 'trigger') p.match.effects.spawn('pop', p.x, p.y, { color: AURA, r: 10 }); }
          });
        }
      },
      /* Bola de energía: inmune, sube disparado y golpea varias veces. */
      up: {
        frames: 46, pose: 'rise', helpless: true, helplessLag: 20, drift: 0.7, intangible: [1, 32],
        hitboxes: (function () {
          const a = [];
          for (let i = 0; i < 5; i++) a.push({ f: [8 + i * 4, 9 + i * 4], x: 0, y: -42, r: 27, dmg: 2.4, ang: 85, bkb: 30, kbg: 15, effect: 'magic', dir: 'auto', group: i + 1 });
          a.push({ f: [29, 31], x: 0, y: -42, r: 32, dmg: 6, ang: 80, bkb: 55, kbg: 75, effect: 'magic', dir: 'auto', group: 9 });
          return a;
        })(),
        onStart(f) { f.data.ball = true; NX.Audio.play('chargeFull'); },
        onFrame(f, fr, mv) {
          const I = f.input;
          if (fr < 7) { f.vy *= 0.5; f.vx *= 0.85; mv.velY = true; mv.velX = true; return; }
          if (fr === 7) { NX.Audio.play('beam', { pitch: 1.4 }); f.fx('ring', f.x, f.y - f.h / 2, { r: 40, color: '#9ff3ff', w: 5 }); }
          if (fr <= 30) {
            f.vy = U.approach(f.vy, -14, 3.5); mv.velY = true;
            f.vx = U.approach(f.vx, I.x * 4.6, 0.5); mv.velX = true;
            if (Math.abs(I.x) > 0.3) f.facing = Math.sign(I.x);
            if (fr % 2 === 0) f.fx('sparkle', f.x + U.rand(-10, 10), f.y - f.h * 0.3, { color: fr % 4 ? '#9ff3ff' : AURA });
          }
          if (fr === 31) { f.data.ball = false; f.fx('pop', f.x, f.y - f.h / 2, { color: '#9ff3ff', r: 18 }); }
        },
        onEnd(f) { f.data.ball = false; }
      },
      /* Lentes negros (1 s): si le pegan cuerpo a cuerpo, Mina contraataca. */
      down: {
        frames: 70, pose: 'counter', drift: 0.4, gravity: 0.5,
        onStart(f) { f.data.shades = true; NX.Audio.play('magic', { pitch: 1.6 }); },
        onFrame(f, fr, mv) {
          if (fr === COUNTER_WIN[0]) f.fx('sparkle', f.x + f.facing * 6, f.y - f.h * 0.86, { color: '#ffffff' });
          if (fr > COUNTER_WIN[1] + 2 && !mv.data.countered) f.data.shades = false;
        },
        onEnd(f) { f.data.shades = false; }
      }
    }
  });

})(window.NX = window.NX || {});
