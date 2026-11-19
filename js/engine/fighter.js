/* ==========================================================================
 * NEXUS CLASH — js/engine/fighter.js
 * Clase base Fighter: máquina de estados (movimiento, saltos, fast-fall,
 * dash, esquivas, escudo, bordes, agarres, lanzamientos, hitstun, tech,
 * aturdimientos) + constructor del moveset estándar parametrizable.
 * Los 16 luchadores (Parte 2) definen estadísticas, rig visual, overrides
 * de normales y sus 4 especiales usando esta API.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U, P = NX.Physics, PHYS = NX.PHYS;

  const ST = Object.freeze({
    ENTRY: 'entry', IDLE: 'idle', WALK: 'walk', DASH: 'dash', RUN: 'run', CROUCH: 'crouch',
    JUMPSQUAT: 'jumpsquat', AIR: 'air', LAND: 'land', ATTACK: 'attack', HITSTUN: 'hitstun',
    TUMBLE: 'tumble', SHIELD: 'shield', SHIELDSTUN: 'shieldstun', SHIELDDROP: 'shielddrop',
    SHIELDBREAK: 'shieldbreak', DIZZY: 'dizzy', DODGE: 'dodge', AIRDODGE: 'airdodge',
    LEDGE: 'ledge', LEDGEACT: 'ledgeact', GRABHOLD: 'grabhold', GRABBED: 'grabbed',
    CAPTURED: 'captured', HELPLESS: 'helpless', KNOCKDOWN: 'knockdown', GETUP: 'getup',
    TECH: 'tech', STUN: 'stun', BURIED: 'buried', REBOUND: 'rebound', RELEASE: 'release',
    DEAD: 'dead', RESPAWN: 'respawn', VICTORY: 'victory'
  });

  const SLOT_COLORS = ['#ff2b3a', '#2f8cff', '#ffc21a', '#2fdc5a'];
  const NO_PHYSICS = new Set([ST.GRABBED, ST.CAPTURED, ST.LEDGE, ST.LEDGEACT, ST.DEAD, ST.RESPAWN]);
  const GROUNDED_IDLE = new Set([ST.IDLE, ST.WALK, ST.DASH, ST.RUN, ST.CROUCH, ST.LAND, ST.SHIELD, ST.SHIELDSTUN,
    ST.SHIELDDROP, ST.KNOCKDOWN, ST.GETUP, ST.TECH, ST.DODGE, ST.RELEASE, ST.DIZZY, ST.STUN, ST.BURIED, ST.ENTRY, ST.REBOUND, ST.VICTORY]);
  const AERIALS = new Set(['nair', 'fair', 'bair', 'uair', 'dair']);
  const STALE_W = [0.08, 0.07594, 0.06782, 0.06028, 0.05274, 0.0452, 0.03766, 0.03012, 0.02258];

  const DEFAULT_STATS = {
    weight: 98, walk: 3.2, run: 7.0, dash: 7.6, dashFrames: 10, traction: 0.5,
    airSpeed: 4.2, airAccel: 0.32, airFriction: 0.07, gravity: 0.58, fall: 10, fastFall: 15,
    jump: 13.4, shortHop: 8.8, airJump: 12.6, airJumps: 1, airJumpDecay: 0,
    jumpSquat: 3, width: 34, height: 80, rollSpeed: 1, helplessDrift: 0.75
  };

  /* ---------------------- NORMALIZACIÓN DE MOVIMIENTOS -------------------- */
  function normalizeHB(h) {
    return Object.assign({ f: [1, 2], x: 0, y: -40, r: 12, dmg: 5, ang: 361, bkb: 20, kbg: 100, effect: 'hit', group: 0 }, h);
  }

  function normalizeMove(key, src) {
    const m = Object.assign({}, src);
    m.key = key;
    if (!m.kind) m.kind = AERIALS.has(key) ? 'air' : (key.indexOf('special') === 0 ? 'any' : 'ground');
    if (!m.frames) m.frames = 30;
    if (m.hitboxes) m.hitboxes = m.hitboxes.map(normalizeHB);
    if (!m.act) {
      const wins = [];
      (m.hitboxes || []).forEach(h => wins.push(h.f));
      (m.grabs || []).forEach(g => wins.push(g.f));
      if (m.release) wins.push([m.release, m.release + 1]);
      if (m.counter) wins.push(m.counter.f);
      if (m.reflect) wins.push(m.reflect.f);
      if (wins.length) m.act = [Math.min.apply(null, wins.map(w => w[0])), Math.max.apply(null, wins.map(w => w[1]))];
    }
    if (m.kind === 'air' && m.landingLag == null) m.landingLag = 10;
    if (key === 'special_up' || key === 'special_up_air') {
      if (m.helpless == null) m.helpless = true;
      if (m.ledgeGrab == null) m.ledgeGrab = true;
    }
    return m;
  }

  /* ------------------------ MOVESET ESTÁNDAR -------------------------------
   * profile: { style: 'fist'|'sword'|'heavy'|'magic'|'kick', reach, power, speed }
   * Las coordenadas están en px para un luchador de 80 px y se escalan. */
  function standardMoves(def) {
    const pr = Object.assign({ style: 'fist', reach: 1, power: 1, speed: 1 }, def.profile || {});
    const h = (def.stats && def.stats.height) || DEFAULT_STATS.height, sz = h / 80;
    const sword = pr.style === 'sword', magic = pr.style === 'magic', heavy = pr.style === 'heavy';
    const R = pr.reach * (sword ? 1.35 : 1), D = pr.power * (heavy ? 1.12 : 1), S = pr.speed * (heavy ? 0.92 : 1);
    const fx = pr.effect || (sword ? 'slash' : (magic ? 'magic' : 'hit'));
    const F = n => Math.max(1, Math.round(n / S));
    const hb = o => Object.assign({ effect: fx }, o, {
      x: (o.x || 0) * R * sz, y: (o.y || 0) * sz, r: o.r * sz * (sword ? 1.1 : 1) * (heavy ? 1.08 : 1),
      dmg: o.dmg * D, f: [F(o.f[0]), F(o.f[1])]
    });
    const mv = o => {
      const out = Object.assign({}, o, { frames: F(o.frames) });
      if (o.hitboxes) out.hitboxes = o.hitboxes.map(hb);
      if (o.grabs) out.grabs = o.grabs.map(g => Object.assign({}, g, { x: g.x * sz * pr.reach, y: g.y * sz, r: g.r * sz, f: [F(g.f[0]), F(g.f[1])] }));
      if (o.chain) out.chain = [F(o.chain[0]), F(o.chain[1])];
      if (o.charge) out.charge = Object.assign({}, o.charge, { at: F(o.charge.at) });
      if (o.release) out.release = F(o.release);
      return out;
    };
    return {
      jab: mv({ frames: 16, chain: [5, 15], next: 'jab2', hitboxes: [
        { f: [3, 4], x: 24, y: -46, r: 11, dmg: 2.5, ang: 78, bkb: 16, kbg: 25 },
        { f: [3, 4], x: 12, y: -46, r: 9, dmg: 2.5, ang: 85, bkb: 16, kbg: 25 }] }),
      jab2: mv({ frames: 18, chain: [5, 17], next: 'jab3', hitboxes: [
        { f: [3, 4], x: 26, y: -44, r: 11, dmg: 2.2, ang: 80, bkb: 16, kbg: 25 }] }),
      jab3: mv({ frames: 30, hitboxes: [
        { f: [5, 7], x: 30, y: -38, r: 15, dmg: 4.5, ang: 45, bkb: 42, kbg: 85 }] }),
      ftilt: mv({ frames: 28, hitboxes: [
        { f: [6, 9], x: 36, y: -36, r: 14, dmg: 9, ang: 361, bkb: 20, kbg: 95 },
        { f: [6, 9], x: 18, y: -38, r: 11, dmg: 8, ang: 361, bkb: 20, kbg: 90 }] }),
      utilt: mv({ frames: 28, hitboxes: [
        { f: [5, 11], x: 8, y: -84, r: 17, dmg: 7, ang: 92, bkb: 40, kbg: 108, dir: 'auto' },
        { f: [5, 8], x: 18, y: -60, r: 13, dmg: 6.5, ang: 96, bkb: 40, kbg: 100 }] }),
      dtilt: mv({ frames: 20, hitboxes: [
        { f: [5, 7], x: 34, y: -8, r: 12, dmg: 6, ang: 80, bkb: 40, kbg: 55 },
        { f: [5, 7], x: 16, y: -8, r: 10, dmg: 5, ang: 80, bkb: 40, kbg: 50 }] }),
      dashattack: mv({ frames: 36, slide: 0.95, hitboxes: [
        { f: [6, 10], x: 24, y: -36, r: 18, dmg: 10, ang: 55, bkb: 55, kbg: 72 },
        { f: [11, 18], x: 24, y: -36, r: 15, dmg: 6, ang: 60, bkb: 40, kbg: 60 }] }),
      fsmash: mv({ frames: 50, charge: { at: 9, max: 60, mult: 1.4 }, hitboxes: [
        { f: [15, 18], x: 46, y: -40, r: 18, dmg: 16, ang: 361, bkb: 30, kbg: 100 },
        { f: [15, 18], x: 24, y: -42, r: 13, dmg: 14, ang: 361, bkb: 30, kbg: 95 }] }),
      usmash: mv({ frames: 46, charge: { at: 7, max: 60, mult: 1.4 }, hitboxes: [
        { f: [12, 16], x: 4, y: -92, r: 22, dmg: 15, ang: 88, bkb: 36, kbg: 98, dir: 'auto' },
        { f: [12, 16], x: 16, y: -62, r: 15, dmg: 13, ang: 92, bkb: 34, kbg: 96 }] }),
      dsmash: mv({ frames: 48, charge: { at: 6, max: 60, mult: 1.4 }, hitboxes: [
        { f: [12, 14], x: 36, y: -12, r: 16, dmg: 14, ang: 30, bkb: 30, kbg: 98 },
        { f: [12, 14], x: -36, y: -12, r: 16, dmg: 14, ang: 30, bkb: 30, kbg: 98, reverse: true }] }),
      nair: mv({ frames: 38, landingLag: 7, hitboxes: [
        { f: [5, 9], x: 0, y: -42, r: 28, dmg: 9, ang: 361, bkb: 22, kbg: 90, dir: 'auto' },
        { f: [10, 22], x: 0, y: -42, r: 24, dmg: 5.5, ang: 361, bkb: 15, kbg: 80, dir: 'auto' }] }),
      fair: mv({ frames: 40, landingLag: 14, hitboxes: [
        { f: [10, 13], x: 34, y: -40, r: 17, dmg: 12, ang: 361, bkb: 28, kbg: 96 }] }),
      bair: mv({ frames: 34, landingLag: 10, hitboxes: [
        { f: [7, 10], x: -36, y: -40, r: 16, dmg: 12.5, ang: 361, bkb: 26, kbg: 100, reverse: true }] }),
      uair: mv({ frames: 32, landingLag: 7, hitboxes: [
        { f: [5, 10], x: 4, y: -90, r: 20, dmg: 9, ang: 80, bkb: 28, kbg: 105, dir: 'auto' }] }),
      dair: mv({ frames: 44, landingLag: 18, hitboxes: [
        { f: [14, 17], x: 4, y: 2, r: 18, dmg: 14, ang: 270, bkb: 25, kbg: 88, meteor: true },
        { f: [18, 26], x: 4, y: -4, r: 15, dmg: 9, ang: 361, bkb: 20, kbg: 80 }] }),
      grab: mv({ frames: 30, grabs: [{ f: [6, 8], x: 30, y: -42, r: 14 }] }),
      dashgrab: mv({ frames: 38, slide: 0.9, grabs: [{ f: [8, 10], x: 38, y: -42, r: 15 }] }),
      pummel: { frames: 14, dmg: 1.3 * D },
      throw_fwd: mv({ frames: 30, release: 11, path: 'fwd', hit: { dmg: 8 * D, ang: 42, bkb: 62, kbg: 62 } }),
      throw_back: mv({ frames: 34, release: 14, path: 'back', hit: { dmg: 10 * D, ang: 45, bkb: 58, kbg: 72, reverse: true } }),
      throw_up: mv({ frames: 34, release: 13, path: 'up', hit: { dmg: 7 * D, ang: 90, bkb: 70, kbg: 68 } }),
      throw_down: mv({ frames: 36, release: 16, path: 'down', hit: { dmg: 6 * D, ang: 70, bkb: 60, kbg: 48 } }),
      ledgeattack: mv({ frames: 40, intangible: [1, 10], hitboxes: [
        { f: [18, 21], x: 30, y: -26, r: 18, dmg: 8, ang: 361, bkb: 50, kbg: 20, dir: 'auto' }] }),
      getupattack: mv({ frames: 36, intangible: [1, 14], hitboxes: [
        { f: [16, 19], x: 30, y: -16, r: 18, dmg: 7, ang: 361, bkb: 60, kbg: 20 },
        { f: [16, 19], x: -30, y: -16, r: 18, dmg: 7, ang: 361, bkb: 60, kbg: 20, reverse: true }] })
    };
  }

  function buildMoveset(def) {
    const std = standardMoves(def);
    const out = {};
    const merged = Object.assign({}, std);
    /* v4: normales únicos del kit del luchador (js/fighters/kits.js). */
    const kit = NX.Kits ? NX.Kits.build(def) : null;
    if (kit) Object.assign(merged, kit);
    if (def.moves) for (const k in def.moves) {
      const o = def.moves[k];
      merged[k] = typeof o === 'function' ? o(merged[k], merged) : o;
    }
    if (def.specials) for (const k in def.specials) merged['special_' + k] = def.specials[k];
    for (const k in merged) if (merged[k]) out[k] = k === 'pummel' ? Object.assign({ key: k }, merged[k]) : normalizeMove(k, merged[k]);
    return out;
  }

  /* ================================ FIGHTER ================================ */
  let UID = 0, MOVE_ID = 0;

  class Fighter {
    constructor(slotDef, slot, match, opts) {
      opts = opts || {};
      /* Un "slot" puede tener varias formas intercambiables (def.forms). */
      this.slotDef = slotDef; this.formIndex = 0;
      const def = slotDef.forms ? slotDef.forms[0] : slotDef;
      this.def = def; this.slot = slot; this.match = match; this.uid = ++UID;
      this.name = slotDef.name; this.color = opts.color || SLOT_COLORS[slot % 4];
      this.isHuman = !!opts.human; this.level = opts.level || 0;
      this.tag = opts.tag || (this.isHuman ? 'P' + (slot + 1) : 'CPU');
      this.palette = def.palette;
      this.input = new NX.InputState();
      this.base = Object.assign({}, DEFAULT_STATS, def.stats || {});
      this.w = this.base.width; this.h = this.base.height;
      this.moves = def._moves || (def._moves = buildMoveset(def));
      this.stocks = opts.stocks == null ? 3 : opts.stocks;
      this.altIndex = 0;
      this.meterMax = def.meter ? def.meter.max : 0;
      this.stats = { kos: 0, falls: 0, sds: 0, damageDealt: 0, damageTaken: 0 };
      this.staleQueue = [];
      this.data = {};
      this.eliminated = false; this.eliminatedAt = 0;
      this.resetLife();
      this.meter = def.meter ? (def.meter.start || 0) : 0;
      this.x = 0; this.y = 0; this.facing = 1;
      this.state = ST.ENTRY;
      if (def.init) def.init(this);
      if (slotDef.init && slotDef !== def) slotDef.init(this);
    }

    /* Cambia a otra forma del mismo slot conservando daño, vidas y estado. */
    setForm(i) {
      const forms = this.slotDef.forms;
      if (!forms) return;
      this.formIndex = ((i % forms.length) + forms.length) % forms.length;
      const d = forms[this.formIndex];
      this.def = d;
      this.palette = this.altIndex && NX.altPalette ? NX.altPalette(d.palette, this.altIndex) : d.palette;
      this.base = Object.assign({}, DEFAULT_STATS, d.stats || {});
      this.w = this.base.width * (this.sizeMult || 1); this.h = this.base.height * (this.sizeMult || 1);
      this.moves = d._moves || (d._moves = buildMoveset(d));
      this.meterMax = d.meter ? d.meter.max : 0;
      if (!d.meter) this.meter = 0;
      this.jumpsLeft = Math.min(this.jumpsLeft, this.base.airJumps);
      this.trail = [];
      if (d.init && !this.data['init_' + d.id]) { this.data['init_' + d.id] = true; d.init(this); }
      if (d.onFormEnter) d.onFormEnter(this);
    }

    /* Restablece todo lo que se pierde al perder una vida. */
    resetLife() {
      this.percent = 0; this.vx = 0; this.vy = 0; this.lvx = 0; this.lvy = 0;
      this.ground = null; this.state = ST.AIR; this.stateTime = 0; this.tick = this.tick || 0;
      this.move = null; this.hitlag = 0; this.hitstun = 0; this.pendingLaunch = null; this.tumbling = false;
      this.jumpsLeft = this.base.airJumps; this.fastFalling = false; this.airDodgeUsed = false; this.airUsed = {};
      this.shieldHP = PHYS.SHIELD_MAX; this.intangible = 0; this.invincible = 0; this.moveIntang = false;
      this.armorKB = 0; this.reflector = null; this.absorber = null; this.counterWin = null;
      this.dropThrough = 0; this.ledgeCooldown = 0; this.ledge = null; this.ledgeGrabCount = 0; this.ledgeIntang = 0;
      this.grabTarget = null; this.grabbedBy = null; this.captor = null; this.captive = null;
      this.techBuffer = 0; this.landLag = 0; this.helplessLag = 18; this.actionLock = 0;
      this.burn = null; this.pendingStun = 0; this.pendingBury = 0; this.stunTimer = 0; this.buryTimer = 0;
      this.flashTimer = 0; this.flashArmor = 0; this.airJumpAnim = 0; this.pendingTapJump = 0;
      this.lastAttacker = null; this.lastAttackerTimer = 0; this.shaking = false; this.trail = [];
      this.hidden = false; this.drawScale = 1; this.reachMult = 1; this.pummelCD = 0; this.hudShake = 0;
      if (this.def && this.def.onLifeReset) this.def.onLifeReset(this);
    }

    /* ----------------------------- CONSULTAS ------------------------------ */
    stat(k) {
      let v = this.base[k];
      if (k === 'weight' && this.weightMult) v *= this.weightMult;
      if (this.def.statMod) v = this.def.statMod(this, k, v);
      return v;
    }
    weight() { return this.stat('weight'); }
    inPlay() { return !this.eliminated && this.state !== ST.DEAD; }
    isGrounded() { return !!this.ground; }
    opponents() { return this.match.fighters.filter(f => f !== this && f.inPlay()); }
    nearestOpponent() {
      let best = null, bd = Infinity;
      for (const f of this.opponents()) { const d = U.dist(this.x, this.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
      return best;
    }
    localToWorld(x, y) { return { x: this.x + x * this.facing, y: this.y + y }; }
    center() { return { x: this.x, y: this.y - this.h / 2 }; }
    expression() {
      const s = this.state;
      if (s === ST.HITSTUN || s === ST.TUMBLE || s === ST.STUN || s === ST.DIZZY || s === ST.GRABBED || s === ST.SHIELDBREAK) return 'hurt';
      if (s === ST.ATTACK) return 'angry';
      return 'normal';
    }
    hurtRect() {
      const s = this.state;
      if (s === ST.CROUCH || s === ST.LAND && this.landLag > 6) return { x: this.x - this.w / 2, y: this.y - this.h * 0.65, w: this.w, h: this.h * 0.65 };
      if (s === ST.KNOCKDOWN) return { x: this.x - this.h * 0.45, y: this.y - this.h * 0.3, w: this.h * 0.9, h: this.h * 0.3 };
      if (s === ST.BURIED) return { x: this.x - this.w / 2, y: this.y - this.h * 0.5, w: this.w, h: this.h * 0.5 };
      if (s === ST.LEDGE) return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
      const hb = this.def.hurtScale || 1;
      return { x: this.x - this.w * hb / 2, y: this.y - this.h * hb, w: this.w * hb, h: this.h * hb };
    }
    isIntangible() {
      if (this.intangible > 0 || this.moveIntang) return true;
      const t = this.stateTime;
      switch (this.state) {
        case ST.DODGE: { const d = this.dodge; if (!d) return false; return d.kind === 'roll' ? t >= 4 && t <= 18 : d.kind === 'tech' ? t <= 20 : t >= 3 && t <= 16; }
        case ST.AIRDODGE: { const d = this.dodge; return d && d.kind === 'dir' ? t >= 2 && t <= 20 : t >= 2 && t <= 28; }
        case ST.LEDGE: return t < this.ledgeIntang;
        case ST.LEDGEACT: return this.ledgeAct && (this.ledgeAct.kind === 'roll' ? t < 30 : t < 16);
        case ST.GETUP: case ST.TECH: return t < 20;
        case ST.RESPAWN: case ST.DEAD: case ST.ENTRY: return true;
        default: return false;
      }
    }
    isInvincibleFlicker() { return this.invincible > 0 || this.state === ST.RESPAWN; }
    canBeHit(box) {
      if (!this.inPlay() || this.isIntangible() || this.invincible > 0) return false;
      if (this.state === ST.CAPTURED && this.hidden) return false;
      if (box && box.def.groundOnly && !this.ground) return false;
      if (box && box.def.airOnly && this.ground) return false;
      if (this.def.canBeHit && !this.def.canBeHit(this, box)) return false;
      return true;
    }
    canBeGrabbed(g) {
      if (!this.inPlay() || this.isIntangible() || this.invincible > 0) return false;
      const s = this.state;
      if (s === ST.GRABBED || s === ST.CAPTURED || s === ST.LEDGE || s === ST.LEDGEACT || s === ST.RESPAWN || s === ST.ENTRY) return false;
      if (this.armorKB >= 999 && !g.def.command) return false;
      if (!this.ground && !g.def.air && this.y < g.owner.y - 40) return false;
      if (this.def.canBeGrabbed && !this.def.canBeGrabbed(this, g)) return false;
      return true;
    }
    isShielding() { return this.state === ST.SHIELD || this.state === ST.SHIELDSTUN; }
    shieldRadius() { return this.h * 0.52 * (0.32 + 0.68 * Math.max(0, this.shieldHP) / PHYS.SHIELD_MAX); }
    shieldCenter() { return { x: this.x, y: this.y - this.h * 0.5 }; }
    hbScale() { return (this.drawScale || 1) * (this.sizeMult || 1) * (this.reachMult || 1); }
    /* v8 · Multiplicadores (jefe de la Horda): tamaño, peso, daño y resistencia. */
    applyBoost(o) {
      this.sizeMult = o.size || 1; this.weightMult = o.weight || 1; this.dmgMult = o.dmg || 1; this.resistMult = o.resist || 1;
      this.w = this.base.width * this.sizeMult; this.h = this.base.height * this.sizeMult;
    }

    /* ---------------------- DAÑO / KNOCKBACK / ARMOR ---------------------- */
    damageMultiplier(d, o) {
      let k = 1;
      if (!o || !o.projectile) {
        const key = this.move ? this.move.def.key : null;
        if (key && key.indexOf('throw') !== 0) {
          let pen = 0, found = false;
          this.staleQueue.forEach((q, i) => { if (q === key) { pen += STALE_W[this.staleQueue.length - 1 - i] || 0.02; found = true; } });
          k *= found ? (1 - pen) : 1.05;
        }
      }
      if (this.def.damageMod) k *= this.def.damageMod(this, d, o) || 1;
      if (this.buffDamage) k *= this.buffDamage;
      if (this.dmgMult) k *= this.dmgMult;
      return k;
    }
    registerStale(key) {
      if (!this.move || this.move.staled) return;
      this.move.staled = true;
      this.staleQueue.push(key);
      if (this.staleQueue.length > 9) this.staleQueue.shift();
    }
    knockbackMultiplier(d, target) {
      let k = P.rageMultiplier(this.percent);
      if (this.def.kbMod) k *= this.def.kbMod(this, d, target) || 1;
      if (this.buffKB) k *= this.buffKB;
      return k;
    }
    incomingKBMultiplier(d) {
      let k = 1;
      if (this.state === ST.CROUCH) k *= PHYS.CROUCH_CANCEL;
      if (this.def.incomingKB) k *= this.def.incomingKB(this, d) || 1;
      return k;
    }
    armorThreshold(d) {
      let a = this.armorKB || 0;
      if (this.def.passiveArmor) a = Math.max(a, this.def.passiveArmor(this, d) || 0);
      return a;
    }
    modifyIncomingDamage(dmg, atk, d) {
      if (this.def.onIncoming) { const r = this.def.onIncoming(this, dmg, atk, d); if (r != null) dmg = r; }
      if (this.damageTakenMult) dmg *= this.damageTakenMult;
      if (this.resistMult) dmg *= this.resistMult;
      return dmg;
    }
    addDamage(d, atk) {
      if (d <= 0) return;
      this.percent = Math.min(PHYS.MAX_PERCENT, this.percent + d);
      this.stats.damageTaken += d;
      this.hudShake = Math.min(20, 6 + d);
      if (this.def.onDamaged) this.def.onDamaged(this, d, atk);
    }
    addMeter(n) {
      if (!this.meterMax) return;
      const was = this.meter;
      this.meter = U.clamp(this.meter + n, 0, this.meterMax);
      if (was < this.meterMax && this.meter >= this.meterMax && this.def.onMeterFull) this.def.onMeterFull(this);
    }
    onHitConfirm(target, d, o) {
      if (this.def.meter && this.def.meter.gainOnHit) this.addMeter((d.dmg || 0) * this.def.meter.gainOnHit);
      if (this.def.onHitConfirm) this.def.onHitConfirm(this, target, d, o);
    }

    /* -------------------------- HERRAMIENTAS API -------------------------- */
    fx(type, x, y, o) { this.match.effects.spawn(type, x, y, o); }
    sfx(name, o) { NX.Audio.play(name, o); }
    spawnProjectile(o) { const p = new NX.Projectile(this.match, this, o); this.match.projectiles.push(p); return p; }
    hitTarget(target, hitDef, o) { return this.match.combat.applyHit(this, target, NX.normalizeHB ? Object.assign({ ang: 361, bkb: 20, kbg: 100, effect: 'hit' }, hitDef) : hitDef, o || {}); }
    setState(s) {
      if (this.move && s !== ST.ATTACK) this.endMoveCleanup(true);
      if (this.state === ST.LEDGE && s !== ST.LEDGE && s !== ST.LEDGEACT) this.releaseLedgeOwnership();
      this.state = s; this.stateTime = 0;
    }

    /* ============================ UPDATE ================================== */
    update() {
      if (this.state === ST.DEAD) return;
      if (this.hitlag > 0) {
        this.hitlag--;
        if (this.hitlag === 0 && this.pendingLaunch) this.applyPendingLaunch();
        return;
      }
      this.tick++; this.stateTime++;
      this.timers();
      if (this.def.onUpdate) this.def.onUpdate(this);
      if (this.state === ST.DEAD) return;
      this.handleState();
      if (!NO_PHYSICS.has(this.state)) {
        P.stepBody(this, this.match);
        if (!this.ground) this.tryLedgeGrab();
      }
      if (this.grabTarget && this.state === ST.GRABHOLD) this.positionGrabbed(this.grabTarget);
    }

    timers() {
      if (this.intangible > 0) this.intangible--;
      if (this.invincible > 0) this.invincible--;
      if (this.dropThrough > 0) this.dropThrough--;
      if (this.ledgeCooldown > 0) this.ledgeCooldown--;
      if (this.flashTimer > 0) this.flashTimer--;
      if (this.flashArmor > 0) this.flashArmor--;
      if (this.airJumpAnim > 0) this.airJumpAnim--;
      if (this.actionLock > 0) this.actionLock--;
      if (this.hudShake > 0) this.hudShake--;
      if (this.lastAttackerTimer > 0 && --this.lastAttackerTimer === 0) this.lastAttacker = null;
      if (!this.isShielding()) this.shieldHP = Math.min(PHYS.SHIELD_MAX, this.shieldHP + PHYS.SHIELD_REGEN);
      if (this.burn && this.burn.frames > 0) {
        this.burn.frames--;
        if (this.burn.frames % 20 === 0) { this.addDamage(this.burn.dmg, this.burn.owner); if (this.burn.owner) this.burn.owner.stats.damageDealt += this.burn.dmg; }
        if (this.tick % 4 === 0) {
          if (this.burn.kind === 'poison') this.match.effects.list.push({ type: 'wisp', x: this.x + U.rand(-this.w / 2, this.w / 2), y: this.y - U.rand(0, this.h), vx: 0, vy: -0.6, life: 26, max: 26, size: U.rand(4, 8), color: '#7aff4a' });
          else this.fx('flame', this.x + U.rand(-this.w / 2, this.w / 2), this.y - U.rand(0, this.h));
        }
        if (this.burn.frames <= 0) this.burn = null;
      }
    }

    handleState() {
      const I = this.input;
      switch (this.state) {
        case ST.ENTRY: case ST.VICTORY: this.applyGroundFriction(); if (!this.ground) this.applyGravity(); break;
        case ST.IDLE: case ST.WALK: case ST.DASH: case ST.RUN: case ST.CROUCH:
          if (this.actionLock <= 0 && this.groundActions()) break;
          this.groundMovement(); break;
        case ST.JUMPSQUAT: this.jumpSquatUpdate(); break;
        case ST.LAND: this.applyGroundFriction(); if (this.stateTime >= this.landLag) this.setState(ST.IDLE); break;
        case ST.AIR: case ST.TUMBLE:
          if (this.actionLock <= 0 && this.airActions()) break;
          this.applyAirControl(1); this.applyGravity(); break;
        case ST.HELPLESS: this.applyAirControl(this.stat('helplessDrift')); this.applyGravity(); break;
        case ST.ATTACK: this.runMove(); break;
        case ST.HITSTUN: this.hitstunUpdate(); break;
        case ST.SHIELD: this.shieldUpdate(); break;
        case ST.SHIELDSTUN: this.applyGroundFriction(0.6); if (--this.shieldStun <= 0) this.setState(I.isHeld('shield') ? ST.SHIELD : ST.SHIELDDROP); break;
        case ST.SHIELDDROP: this.applyGroundFriction(); if (this.stateTime >= 7) this.setState(ST.IDLE); break;
        case ST.SHIELDBREAK: this.applyGravity(0.6); if (this.ground && this.stateTime > 10) this.enterDizzy(); break;
        case ST.DIZZY: case ST.STUN: this.stunUpdate(); break;
        case ST.DODGE: this.dodgeUpdate(); break;
        case ST.AIRDODGE: this.airDodgeUpdate(); break;
        case ST.LEDGE: this.ledgeUpdate(); break;
        case ST.LEDGEACT: this.ledgeActUpdate(); break;
        case ST.GRABHOLD: this.grabHoldUpdate(); break;
        case ST.GRABBED: if (!this.grabbedBy || (this.grabbedBy.grabTarget !== this && !(this.grabbedBy.move && this.grabbedBy.move.data.victim === this))) { this.grabbedBy = null; this.setState(ST.AIR); } break;
        case ST.CAPTURED: if (!this.captor || this.captor.captive !== this || --this.captureTimer <= 0) this.freeFromCapture(); break;
        case ST.KNOCKDOWN: this.knockdownUpdate(); break;
        case ST.GETUP: this.applyGroundFriction(); if (this.stateTime >= 26) this.setState(ST.IDLE); break;
        case ST.TECH: this.applyGroundFriction(); if (this.stateTime >= 24) this.setState(ST.IDLE); break;
        case ST.BURIED: this.buriedUpdate(); break;
        case ST.REBOUND: this.applyGroundFriction(); if (!this.ground) this.applyGravity(); if (this.stateTime >= 18) this.setState(this.ground ? ST.IDLE : ST.AIR); break;
        case ST.RELEASE: this.applyGroundFriction(); if (this.stateTime >= 16) this.setState(this.ground ? ST.IDLE : ST.AIR); break;
        case ST.RESPAWN: this.respawnUpdate(); break;
        default: break;
      }
    }

    /* --------------------------- MOVIMIENTO ------------------------------- */
    applyGroundFriction(k) { this.vx = U.approach(this.vx, 0, this.stat('traction') * (k == null ? 1 : k)); }
    applyAirControl(mult) {
      const I = this.input, max = this.stat('airSpeed'), acc = this.stat('airAccel') * mult;
      if (Math.abs(I.x) > 0.15 && mult > 0) this.vx = U.approach(this.vx, I.x * max, acc);
      else this.vx = U.approach(this.vx, 0, this.stat('airFriction'));
    }
    canFastFall() {
      const s = this.state;
      if (s === ST.AIR || s === ST.TUMBLE) return true;
      if (s === ST.ATTACK && this.move) return this.move.def.fastFall != null ? this.move.def.fastFall : this.move.def.kind === 'air';
      return false;
    }
    applyGravity(mult) {
      const g = this.stat('gravity') * (mult == null ? 1 : mult);
      if (this.input.tapDown > 0 && this.vy + this.lvy >= -1 && !this.fastFalling && this.canFastFall()) {
        this.fastFalling = true; this.input.tapDown = 0;
        this.fx('sparkle', this.x, this.y - this.h, { color: '#fff' });
      }
      if (this.fastFalling) this.vy = Math.max(this.vy, this.stat('fastFall'));
      else if (this.vy < this.stat('fall')) this.vy = Math.min(this.vy + g, this.stat('fall'));
      else this.vy = U.approach(this.vy, this.stat('fall'), 0.5);
    }

    groundMovement() {
      const I = this.input, ax = I.x;
      if (I.tapDown > 0 && this.ground && this.ground.type === 'pass' && Math.abs(ax) < 0.5) { this.dropThroughPlatform(); return; }
      if (I.y > 0.5 && Math.abs(ax) < 0.5) {
        if (this.state !== ST.CROUCH) this.setState(ST.CROUCH);
        this.applyGroundFriction(); return;
      }
      if (this.state === ST.CROUCH) this.setState(ST.IDLE);
      if (Math.abs(ax) < 0.2) {
        if (this.state !== ST.IDLE) { if (this.state === ST.RUN && Math.abs(this.vx) > 4) this.fx('dust', this.x, this.y, { n: 2 }); this.setState(ST.IDLE); }
        this.applyGroundFriction(); return;
      }
      const dir = Math.sign(ax);
      if (Math.abs(ax) < 0.65) {
        this.facing = dir;
        if (this.state !== ST.WALK) this.setState(ST.WALK);
        this.vx = U.approach(this.vx, dir * this.stat('walk') * (Math.abs(ax) / 0.65), 0.7);
        return;
      }
      if (this.state === ST.DASH) {
        if (dir !== this.facing) { this.facing = dir; this.setState(ST.DASH); this.fx('dust', this.x, this.y, { n: 3, vx: -dir * 2 }); }
        this.vx = this.facing * this.stat('dash');
        if (this.stateTime >= this.stat('dashFrames')) this.setState(ST.RUN);
      } else if (this.state === ST.RUN) {
        if (dir !== this.facing) { this.facing = dir; this.vx *= 0.25; this.setState(ST.DASH); this.fx('dust', this.x, this.y, { n: 4, vx: -dir * 2 }); }
        else this.vx = U.approach(this.vx, dir * this.stat('run'), 0.9);
        if (this.tick % 12 === 0) this.fx('dust', this.x - dir * 8, this.y, { n: 1, vx: -dir });
      } else {
        this.facing = dir; this.setState(ST.DASH); this.vx = dir * this.stat('dash');
        this.fx('dust', this.x - dir * 10, this.y, { n: 3, vx: -dir * 2 }); NX.Audio.play('dash');
      }
    }

    dropThroughPlatform() {
      this.dropThrough = PHYS.DROP_THROUGH; this.ground = null; this.vy = 2;
      this.setState(ST.AIR); this.input.tapDown = 0;
    }

    groundActions() {
      const I = this.input;
      if (I.pressed('special')) { I.consume('special'); if (this.doSpecial(I.dir(), true)) return true; }
      if (I.smashPressed()) {
        const useC = I.cTap > 0; const d = I.dir(useC), sx = useC ? I.cx : I.x;
        I.consume('smash'); return this.doSmash(d, sx, useC);
      }
      if (I.pressed('attack')) { I.consume('attack'); return this.doGroundAttack(); }
      if (I.pressed('grab')) { I.consume('grab'); return this.startMove((this.state === ST.RUN || this.state === ST.DASH) && this.moves.dashgrab ? 'dashgrab' : 'grab'); }
      if (I.isHeld('shield') && this.shieldHP > 0) {
        I.consume('shield');
        if (I.tapSide > 0) { this.startRoll(I.tapSideDir); return true; }
        if (I.tapDown > 0) { this.startSpotDodge(); return true; }
        this.setState(ST.SHIELD); NX.Audio.play('shield'); return true;
      }
      if (I.pressed('jump') || I.pressed('tapjump')) {
        this.jumpFromTap = !I.pressed('jump');
        I.consume('jump'); I.consume('tapjump');
        this.setState(ST.JUMPSQUAT); return true;
      }
      return false;
    }

    doGroundAttack() {
      const I = this.input, d = I.dir();
      if ((this.state === ST.RUN || (this.state === ST.DASH && this.stateTime > 3)) && d !== 'up' && d !== 'down') return this.startMove('dashattack');
      if (d === 'up') return this.startMove('utilt');
      if (d === 'down') return this.startMove('dtilt');
      if (d === 'side') { this.facing = Math.sign(I.x); return this.startMove('ftilt'); }
      return this.startMove('jab');
    }

    doSmash(d, sx, fromC) {
      let key = 'fsmash';
      if (d === 'up') key = 'usmash';
      else if (d === 'down') key = 'dsmash';
      else if (d === 'side') this.facing = Math.sign(sx);
      const ok = this.startMove(key);
      if (ok && fromC && this.move) this.move.fromC = true;
      return ok;
    }

    doAerial(d, sx) {
      let key = 'nair';
      if (d === 'up') key = 'uair';
      else if (d === 'down') key = 'dair';
      else if (d === 'side') key = Math.sign(sx) === this.facing ? 'fair' : 'bair';
      return this.startMove(key);
    }

    doSpecial(dir, grounded) {
      const key = 'special_' + dir;
      const m = (!grounded && this.moves[key + '_air']) || (grounded && this.moves[key + '_ground']) || this.moves[key];
      if (!m) return false;
      if (m.canUse && !m.canUse(this)) return false;
      if (m.oncePerAir && !grounded) { if (this.airUsed[key]) return false; this.airUsed[key] = true; }
      if ((dir === 'side' || dir === 'up') && Math.abs(this.input.x) > 0.3 && m.turn !== false) this.facing = Math.sign(this.input.x);
      return this.startMove(m);
    }

    jumpSquatUpdate() {
      const I = this.input;
      this.applyGroundFriction(0.3);
      if (I.y < -0.4) {
        if (I.pressed('special')) { I.consume('special'); this.doSpecial('up', true); return; }
        if (I.smashPressed() || I.pressed('attack')) { I.consume('smash'); I.consume('attack'); this.startMove('usmash'); return; }
      }
      if (I.pressed('grab')) { I.consume('grab'); this.startMove('grab'); return; }
      if (this.stateTime >= this.stat('jumpSquat')) this.launchJump();
    }

    launchJump() {
      const I = this.input;
      const full = this.jumpFromTap ? I.isHeld('tapjump') : I.isHeld('jump');
      this.vy = -(full ? this.stat('jump') : this.stat('shortHop'));
      const max = this.stat('airSpeed') * 1.15;
      this.vx = U.clamp(this.vx * 0.85 + I.x * 0.6, -max, max);
      this.ground = null; this.fastFalling = false;
      this.setState(ST.AIR);
      this.fx('dust', this.x, this.y, { n: 4 });
      NX.Audio.play('jump');
    }

    doAirJump() {
      if (this.jumpsLeft <= 0) return false;
      const used = this.stat('airJumps') - this.jumpsLeft;
      const force = this.stat('airJump') * Math.max(0.55, 1 - this.stat('airJumpDecay') * used);
      this.vy = -force;
      this.vx = this.input.x * this.stat('airSpeed');
      this.jumpsLeft--; this.fastFalling = false; this.airJumpAnim = 18;
      if (this.state !== ST.AIR) this.setState(ST.AIR);
      this.fx('ring', this.x, this.y, { r: 22, color: '#ffffff', life: 12 });
      NX.Audio.play('airjump', { pitch: 1 + used * 0.08 });
      if (this.def.onAirJump) this.def.onAirJump(this, used);
      return true;
    }

    airActions() {
      const I = this.input;
      if (this.pendingTapJump > 0) {
        if (I.pressed('attack') || I.pressed('special') || I.smashPressed()) this.pendingTapJump = 0;
        else if (--this.pendingTapJump === 0 && this.doAirJump()) return true;
      }
      if (I.pressed('special')) { I.consume('special'); if (this.doSpecial(I.dir(), false)) return true; }
      if (I.smashPressed()) {
        const useC = I.cTap > 0; const d = I.dir(useC), sx = useC ? I.cx : I.x;
        I.consume('smash'); return this.doAerial(d, sx);
      }
      if (I.pressed('attack') || I.pressed('grab')) { I.consume('attack'); I.consume('grab'); return this.doAerial(I.dir(), I.x); }
      if (I.pressed('shield') && !this.airDodgeUsed) { I.consume('shield'); return this.doAirDodge(); }
      if (I.pressed('jump')) { I.consume('jump'); if (this.doAirJump()) return true; }
      if (I.pressed('tapjump')) { I.consume('tapjump'); if (this.jumpsLeft > 0) this.pendingTapJump = 3; }
      return false;
    }

    /* ---------------------------- ESQUIVAS -------------------------------- */
    startRoll(dir) {
      this.setState(ST.DODGE); this.dodge = { kind: 'roll', dir, frames: 30 };
      NX.Audio.play('dodge'); this.fx('dust', this.x, this.y, { n: 3, vx: dir * 2 });
    }
    startSpotDodge() { this.setState(ST.DODGE); this.dodge = { kind: 'spot', frames: 24 }; NX.Audio.play('dodge'); }
    dodgeUpdate() {
      const d = this.dodge, t = this.stateTime;
      if (d.kind === 'roll' || d.kind === 'techroll') {
        const k = t / d.frames;
        this.vx = k < 0.7 ? d.dir * 8.6 * this.stat('rollSpeed') * Math.sin(Math.PI * k / 0.7) : U.approach(this.vx, 0, 1);
      } else this.applyGroundFriction();
      if (t >= d.frames) {
        if (d.kind === 'roll' || d.kind === 'techroll') this.facing = -d.dir;
        this.setState(this.input.isHeld('shield') && this.shieldHP > 0 ? ST.SHIELD : ST.IDLE);
      }
    }
    doAirDodge() {
      const I = this.input, mag = Math.hypot(I.x, I.y);
      this.airDodgeUsed = true; this.fastFalling = false;
      this.setState(ST.AIRDODGE);
      if (mag > 0.4) {
        const a = Math.atan2(I.y, I.x);
        this.dodge = { kind: 'dir', frames: 40 };
        this.vx = Math.cos(a) * 9.5; this.vy = Math.sin(a) * 9.5;
      } else {
        this.dodge = { kind: 'neutral', frames: 36 };
        this.vx *= 0.4; this.vy *= 0.3;
      }
      NX.Audio.play('dodge');
      return true;
    }
    airDodgeUpdate() {
      const d = this.dodge, t = this.stateTime;
      if (d.kind === 'dir') {
        if (t < 14) { this.vx *= 0.9; this.vy *= 0.9; }
        else { this.applyGravity(); this.applyAirControl(0.4); }
      } else { this.applyGravity(0.6); this.applyAirControl(0.8); }
      if (t >= d.frames) this.setState(ST.AIR);
    }

    /* ------------------------------ ESCUDO -------------------------------- */
    shieldUpdate() {
      const I = this.input;
      this.shieldHP -= PHYS.SHIELD_DECAY;
      if (this.shieldHP <= 0) { this.breakShield(); return; }
      this.applyGroundFriction();
      if (!I.isHeld('shield')) { this.setState(ST.SHIELDDROP); return; }
      if (I.pressed('jump') || I.pressed('tapjump')) { this.jumpFromTap = !I.pressed('jump'); I.consume('jump'); I.consume('tapjump'); this.setState(ST.JUMPSQUAT); return; }
      if (I.pressed('grab') || I.pressed('attack')) { I.consume('grab'); I.consume('attack'); this.startMove('grab'); return; }
      if (I.pressed('special') && I.dir() === 'up') { I.consume('special'); this.doSpecial('up', true); return; }
      if (I.smashPressed() && I.dir(I.cTap > 0) === 'up') { I.consume('smash'); this.startMove('usmash'); return; }
      if (I.tapSide > 0) { I.tapSide = 0; this.startRoll(I.tapSideDir); return; }
      if (I.tapDown > 0) { I.tapDown = 0; this.startSpotDodge(); }
    }
    enterShieldStun(n) { this.setState(ST.SHIELDSTUN); this.shieldStun = n; }
    breakShield() {
      this.shieldHP = 0; this.breakHolds();
      this.setState(ST.SHIELDBREAK);
      this.ground = null; this.vy = -11; this.vx = 0; this.lvx = 0; this.lvy = 0;
      this.fx('ring', this.x, this.y - this.h / 2, { r: 90, color: this.color, w: 8 });
      this.fx('spark', this.x, this.y - this.h / 2, { n: 18, power: 2 });
      this.fx('text', this.x, this.y - this.h - 20, { text: 'SHIELD BREAK!', color: '#ffe14d', size: 26 });
      this.match.camera.shake(14);
      NX.Audio.play('shieldBreak');
    }
    enterDizzy() {
      this.setState(ST.DIZZY);
      this.stunTimer = Math.max(150, 360 - this.percent);
      this.shieldHP = 30;
      this.fx('star', this.x, this.y, { follow: this, life: this.stunTimer });
    }
    stun(frames) {
      this.breakHolds(); this.endMoveCleanup(true);
      this.setState(ST.STUN); this.stunTimer = frames;
      this.fx('star', this.x, this.y, { follow: this, life: frames });
    }
    stunUpdate() {
      this.applyGroundFriction();
      if (!this.ground) this.applyGravity();
      if (this.input.mashed) this.stunTimer -= 2;
      if (--this.stunTimer <= 0) this.setState(this.ground ? ST.IDLE : ST.AIR);
    }
    bury(frames) {
      this.breakHolds(); this.endMoveCleanup(true);
      this.setState(ST.BURIED); this.buryTimer = frames; this.vx = 0; this.lvx = 0; this.lvy = 0;
      this.fx('debris', this.x, this.y, { n: 10, color: '#6b4b2b' });
      NX.Audio.play('stomp');
    }
    buriedUpdate() {
      this.vx = 0;
      if (this.input.mashed) this.buryTimer -= 3;
      if (--this.buryTimer <= 0) {
        this.ground = null; this.vy = -8; this.setState(ST.AIR);
        this.fx('debris', this.x, this.y, { n: 8, color: '#6b4b2b' });
      }
    }
    applyBurn(frames, dmg, owner, kind) { this.burn = { frames, dmg, owner, kind: kind || 'fire' }; }

    /* --------------------------- MOVIMIENTOS ------------------------------ */
    startMove(keyOrDef) {
      const m = typeof keyOrDef === 'string' ? this.moves[keyOrDef] : keyOrDef;
      if (!m) return false;
      if (this.move) this.endMoveCleanup(true);
      if (this.state === ST.LEDGE) this.releaseLedgeOwnership();
      this.state = ST.ATTACK; this.stateTime = 0;
      this.move = { def: m, frame: 0, charge: 0, chargeMult: 1, charging: false, chargeDone: false, hitSets: {}, id: ++MOVE_ID, data: {}, grabbed: null, noGrav: false, noDrift: false, noFriction: false, staled: false };
      if (m.onStart) m.onStart(this, this.move);
      if (this.def.onMoveStart && this.move) this.def.onMoveStart(this, this.move);
      return true;
    }

    endMoveCleanup(interrupted) {
      const mv = this.move;
      if (!mv) return;
      this.move = null;
      this.armorKB = 0; this.moveIntang = false; this.reflector = null; this.absorber = null; this.counterWin = null;
      if (mv.data.victim && mv.data.victim.grabbedBy === this) {
        const v = mv.data.victim; v.grabbedBy = null; if (v.state === ST.GRABBED) { v.state = ST.AIR; v.stateTime = 0; v.ground = null; }
      }
      if (this.captive && mv.def.keepCaptive !== true) this.releaseCaptive(null);
      if (mv.def.onEnd) mv.def.onEnd(this, mv, interrupted);
    }

    finishMove() {
      const m = this.move.def;
      const air = !this.ground;
      this.endMoveCleanup(false);
      if (this.move) return;
      if (m.endState) { this.state = m.endState; this.stateTime = 0; return; }
      if (air) {
        if (m.helpless) { this.helplessLag = m.helplessLag || 18; this.state = ST.HELPLESS; }
        else this.state = ST.AIR;
      } else this.state = ST.IDLE;
      this.stateTime = 0;
    }

    runMove() {
      const mv = this.move, m = mv.def, I = this.input;
      if (m.charge && !mv.chargeDone && mv.frame === m.charge.at) {
        const key = m.charge.key || 'smash';
        const held = !mv.fromC && (I.isHeld(key) || (key === 'smash' && I.isHeld('attack') && mv.chargeAlt));
        if (held && mv.charge < m.charge.max) {
          mv.charging = true; mv.charge++;
          mv.chargeMult = 1 + (m.charge.mult - 1) * (mv.charge / m.charge.max);
          if (mv.charge % 8 === 1) NX.Audio.play('charge', { pitch: 1 + mv.charge / 60 });
          if (mv.charge === m.charge.max) NX.Audio.play('chargeFull');
          if (mv.charge % 3 === 0) this.fx('sparkle', this.x, this.y - this.h * 0.6, { color: '#fff7b0' });
          if (m.onCharge) m.onCharge(this, mv);
          if (this.move === mv) this.moveMovement(mv);
          return;
        }
        mv.charging = false; mv.chargeDone = true;
        if (m.onRelease) { m.onRelease(this, mv); if (this.move !== mv) return; }
      }
      mv.frame++;
      const f = mv.frame;
      mv.velX = false; mv.velY = false;
      if (m.vel) for (const v of m.vel) {
        if (f < v.f[0] || f > v.f[1]) continue;
        if (v.vx != null) { this.vx = v.vx * this.facing; mv.velX = true; }
        if (v.vy != null) { this.vy = v.vy; mv.velY = true; this.fastFalling = false; }
        if (v.dvx) this.vx += v.dvx * this.facing;
        if (v.dvy) this.vy += v.dvy;
      }
      this.armorKB = m.armor && U.inRange(f, m.armor.f) ? m.armor.kb : 0;
      this.moveIntang = !!(m.intangible && U.inRange(f, m.intangible));
      this.reflector = m.reflect && U.inRange(f, m.reflect.f) ? m.reflect : null;
      this.absorber = m.absorb && U.inRange(f, m.absorb.f) ? m.absorb : null;
      this.counterWin = m.counter && U.inRange(f, m.counter.f) ? m.counter : null;
      if (m.hitboxes && !mv.swung) {
        for (const hb of m.hitboxes) if (hb.f[0] === f) {
          mv.swung = true;
          if (m.sfx !== false) NX.Audio.play(m.sfx || (hb.effect === 'slash' ? 'slash' : 'swing'), { size: hb.dmg / 15 });
          break;
        }
      }
      if (m.release && mv.data.victim) this.throwUpdate(mv, f);
      if (m.onFrame) { m.onFrame(this, f, mv); if (this.move !== mv) return; }
      if (m.next && m.chain && f >= m.chain[0] && f <= m.chain[1] && I.pressed('attack')) { I.consume('attack'); this.startMove(m.next); return; }
      if (m.iasa && f >= m.iasa) { if (this.ground ? this.groundActions() : this.airActions()) return; }
      /* Freno de impulso: al terminar una ventana de velocidad vertical
       * forzada, el ascenso residual se limita (recuperaciones controladas). */
      if (mv.lastVelY && !mv.velY && this.vy < -3.5) this.vy = -3.5;
      mv.lastVelY = mv.velY;
      this.moveMovement(mv);
      if (this.move === mv && f >= m.frames) this.finishMove();
    }

    moveMovement(mv) {
      const m = mv.def;
      if (this.ground) {
        if (mv.noFriction || mv.velX) return;
        if (m.slide != null) this.vx *= m.slide; else this.applyGroundFriction();
      } else {
        if (!mv.noGrav && !mv.velY) this.applyGravity(m.gravity == null ? 1 : m.gravity);
        if (!mv.noDrift && !mv.velX) this.applyAirControl(m.drift == null ? (m.kind === 'air' ? 1 : 0.6) : m.drift);
      }
    }

    collectHitboxes(out) {
      const mv = this.move;
      if (this.state !== ST.ATTACK || !mv) return;
      const f = mv.frame, m = mv.def;
      const add = (hb) => {
        const key = hb.group || 0;
        let set = mv.hitSets[key]; if (!set) set = mv.hitSets[key] = new Set();
        if (hb.rehit && f > hb.f[0] && (f - hb.f[0]) % hb.rehit === 0 && mv.lastClear !== f + ':' + key) { set.clear(); mv.lastClear = f + ':' + key; }
        const c = this.localToWorld(hb.x * this.hbScale(), hb.y * this.hbScale());
        out.push({ owner: this, def: hb, x: c.x, y: c.y, r: hb.r * this.hbScale(), set, mult: mv.chargeMult * (hb.mult || 1), kind: 'melee' });
      };
      if (m.hitboxes) for (const hb of m.hitboxes) if (f >= hb.f[0] && f <= hb.f[1]) add(hb);
      if (mv.extraBoxes) for (const hb of mv.extraBoxes) add(Object.assign({ f: [f, f], group: 0, ang: 361, bkb: 20, kbg: 100, effect: 'hit' }, hb));
    }

    activeGrabBoxes() {
      const mv = this.move;
      if (this.state !== ST.ATTACK || !mv || !mv.def.grabs) return [];
      const out = [];
      for (const g of mv.def.grabs) {
        if (mv.frame < g.f[0] || mv.frame > g.f[1]) continue;
        const c = this.localToWorld(g.x, g.y);
        out.push({ x: c.x, y: c.y, r: g.r, def: g, owner: this });
      }
      return out;
    }

    rebound() {
      this.endMoveCleanup(true);
      this.setState(ST.REBOUND); this.hitlag = Math.max(this.hitlag, 6);
      this.lvx = -this.facing * 2.5;
    }

    triggerCounter(atk, box) {
      const mv = this.move, cw = this.counterWin;
      this.counterWin = null;
      this.flashTimer = 20;
      this.fx('flash', 0, 0, { color: '#fff', alpha: 0.35, life: 8 });
      this.fx('text', this.x, this.y - this.h - 16, { text: 'COUNTER!', color: '#9ff', size: 24 });
      NX.Audio.play('reflect');
      if (mv && mv.def.onCounter) { mv.def.onCounter(this, atk, box, mv); return; }
      if (atk && atk !== this) {
        this.facing = U.sign(atk.x - this.x);
        if (Math.abs(atk.x - this.x) < (cw.range || 140) && Math.abs(atk.y - this.y) < 120) {
          const base = box && box.def ? box.def.dmg || 6 : 6;
          this.hitTarget(atk, Object.assign({ dmg: Math.max(8, base * (cw.mult || 1.2)), ang: 361, bkb: 60, kbg: 75, effect: 'slash' }, cw.hit || {}), { dir: U.sign(atk.x - this.x) });
        }
        atk.hitlag = Math.max(atk.hitlag, 8);
      }
      this.intangible = Math.max(this.intangible, 24);
      if (mv) mv.frame = Math.max(mv.frame, mv.def.frames - 20);
    }

    /* -------------------------- SUELO / AIRE ------------------------------ */
    canLandOnPass(p) {
      if (this.dropThrough > 0) return false;
      const s = this.state;
      if ((s === ST.AIR || s === ST.HELPLESS || (s === ST.ATTACK && this.move && this.move.def.kind === 'air')) && this.input.y > 0.7) return false;
      if (this.def.canLandOnPass && !this.def.canLandOnPass(this, p)) return false;
      return true;
    }

    onLand(p) {
      const landVy = this.vy + this.lvy;
      this.ground = p; this.vy = 0; this.lvy = 0; this.fastFalling = false;
      this.jumpsLeft = this.stat('airJumps'); this.airDodgeUsed = false; this.airUsed = {}; this.ledgeGrabCount = 0;
      this.pendingTapJump = 0;
      switch (this.state) {
        case ST.AIR:
          this.startLand(landVy > 9 ? 4 : 3);
          this.fx('dust', this.x, this.y, { n: 3 }); NX.Audio.play('land'); break;
        case ST.TUMBLE:
          if (this.techBuffer > 0) this.doTech(); else this.enterKnockdown(); break;
        case ST.HELPLESS: this.startLand(this.helplessLag || 18); this.fx('dust', this.x, this.y, { n: 4 }); NX.Audio.play('land'); break;
        case ST.AIRDODGE: this.startLand(this.dodge && this.dodge.kind === 'dir' ? 10 : 3); break;
        case ST.ATTACK: {
          const mv = this.move, m = mv.def;
          if (m.onLand) { const r = m.onLand(this, mv); if (r === 'continue' || this.move !== mv) break; }
          if (m.kind === 'air' || m.landCancel) {
            const lag = m.landingLag == null ? 10 : m.landingLag;
            this.endMoveCleanup(true);
            if (this.state === ST.ATTACK && !this.move) this.startLand(lag);
            this.fx('dust', this.x, this.y, { n: 3 }); NX.Audio.play('land');
          } else if (m.helpless && m.kind === 'any' && mv.frame > (m.act ? m.act[1] : 0)) {
            const lag = m.helplessLag || 18;
            this.endMoveCleanup(true);
            if (!this.move) this.startLand(lag);
          }
          break;
        }
        case ST.HITSTUN:
          if (this.techBuffer > 0 && this.tumbling) { this.doTech(); break; }
          if (this.tumbling) {
            if (landVy > 7) { this.lvy = -landVy * 0.45; this.ground = null; this.fx('dust', this.x, this.y, { n: 6 }); NX.Audio.play('land'); }
            else this.enterKnockdown();
          }
          break;
        case ST.SHIELDBREAK: case ST.GRABBED: case ST.CAPTURED: break;
        default: break;
      }
      if (this.def.onLand) this.def.onLand(this, p);
    }
    startLand(lag) { this.state = ST.LAND; this.stateTime = 0; this.landLag = lag; }
    leaveGround() {
      this.ground = null;
      if (GROUNDED_IDLE.has(this.state)) {
        if (this.state === ST.BURIED || this.state === ST.STUN || this.state === ST.DIZZY) return;
        this.setState(ST.AIR);
      } else if (this.state === ST.GRABHOLD) { this.releaseGrab(false); this.setState(ST.AIR); }
    }
    onWall(side) {
      if (this.state === ST.HITSTUN && Math.abs(this.lvx) > 6) {
        this.lvx = -this.lvx * 0.5; this.fx('ring', this.x + side * this.w / 2, this.y - this.h / 2, { r: 30 });
        NX.Audio.play('land');
      } else this.lvx = 0;
      this.vx = 0;
    }
    onCeiling() { this.vy = 0; this.lvy = this.state === ST.HITSTUN ? Math.abs(this.lvy) * 0.3 : 0; }

    doTech() {
      const I = this.input;
      this.lvx = 0; this.lvy = 0; this.vx = 0; this.techBuffer = 0; this.tumbling = false;
      if (Math.abs(I.x) > 0.5) { this.setState(ST.DODGE); this.dodge = { kind: 'techroll', dir: Math.sign(I.x), frames: 30 }; this.intangible = 20; }
      else this.setState(ST.TECH);
      this.fx('ring', this.x, this.y - this.h / 2, { r: 36, color: '#fff' });
      NX.Audio.play('dodge');
    }
    enterKnockdown() {
      this.lvx *= 0.3; this.vx = 0; this.tumbling = false;
      this.setState(ST.KNOCKDOWN);
      this.fx('dust', this.x, this.y, { n: 6 }); NX.Audio.play('land');
    }
    knockdownUpdate() {
      const I = this.input, t = this.stateTime;
      this.applyGroundFriction();
      if (t < 14) return;
      if (I.pressed('attack') || I.smashPressed()) { I.consume('attack'); I.consume('smash'); this.startMove('getupattack'); return; }
      if (I.pressed('jump') || I.pressed('tapjump') || I.y < -0.5) { I.consume('jump'); I.consume('tapjump'); this.setState(ST.GETUP); return; }
      if (I.tapSide > 0 || Math.abs(I.x) > 0.6) { this.setState(ST.DODGE); this.dodge = { kind: 'techroll', dir: Math.sign(I.x || I.tapSideDir || 1), frames: 32 }; return; }
      if (t > 90) this.setState(ST.GETUP);
    }

    /* ------------------------------ HITSTUN ------------------------------- */
    receiveHit(h) {
      this.breakHolds();
      this.endMoveCleanup(true);
      if (this.state === ST.LEDGE) this.releaseLedgeOwnership();
      this.hitlag = h.hitlag; this.pendingLaunch = h; this.shaking = true;
      this.state = ST.HITSTUN; this.stateTime = 0;
      this.hitstun = h.hitstun; this.tumbling = h.kb >= PHYS.TUMBLE_KB;
      this.vx = 0; this.vy = 0; this.lvx = 0; this.lvy = 0; this.fastFalling = false;
      this.airUsed = {}; this.airDodgeUsed = false; this.pendingTapJump = 0;
      this.flashTimer = Math.min(12, h.hitlag);
      if (this.def.onHurt) this.def.onHurt(this, h);
    }

    applyPendingLaunch() {
      const h = this.pendingLaunch; this.pendingLaunch = null; this.shaking = false;
      if (this.pendingBury && this.ground) { const b = this.pendingBury; this.pendingBury = 0; this.bury(b); return; }
      this.pendingBury = 0;
      let vx = h.vx, vy = h.vy;
      if (h.kb > 40 && !h.noDI) { const r = P.applyDI(vx, vy, this.input.x, this.input.y); vx = r.vx; vy = r.vy; }
      if (this.pendingStun) {
        const s = this.pendingStun; this.pendingStun = 0;
        this.lvx = vx * 0.35; this.lvy = this.ground ? 0 : vy * 0.35;
        this.stun(s); return;
      }
      if (this.ground && vy > -2.5 && h.kb < 70) { this.lvx = vx; this.lvy = 0; }
      else { this.lvx = vx; this.lvy = vy; if (vy < 0) this.ground = null; }
      if (h.kb > 120) this.fx('speedlines', 0, 0, { life: 16 });
    }

    hitstunUpdate() {
      const I = this.input;
      if (I.pressed('shield')) { I.consume('shield'); this.techBuffer = 20; } else if (this.techBuffer > 0) this.techBuffer--;
      if (this.ground) this.applyGroundFriction(0.5); else this.applyGravity();
      if (this.tumbling && !this.ground && this.tick % 2 === 0 && Math.hypot(this.lvx, this.lvy) > 8) this.fx('dust', this.x, this.y - this.h / 2, { n: 1, scale: 0.8 });
      if (--this.hitstun <= 0) {
        if (this.ground) this.setState(ST.IDLE);
        else { const tum = this.tumbling; this.setState(tum ? ST.TUMBLE : ST.AIR); this.tumbling = tum; }
      }
    }

    /* ------------------------------ BORDES -------------------------------- */
    tryLedgeGrab() {
      if (this.ledgeCooldown > 0 || this.ground) return;
      const st = this.state;
      let ok = st === ST.AIR || st === ST.HELPLESS || st === ST.TUMBLE || st === ST.AIRDODGE;
      if (st === ST.ATTACK && this.move && this.move.def.ledgeGrab) ok = true;
      if (!ok) return;
      if (this.input.y > 0.6 && st !== ST.HELPLESS && st !== ST.ATTACK) return;
      const tvy = this.vy + this.lvy;
      if (tvy < -1.5 && !(st === ST.ATTACK && this.move.def.ledgeGrabRising)) return;
      for (const L of this.match.ledges) {
        if (L.plat.removed) continue;
        if (L.face === 1 ? this.x > L.x + 6 : this.x < L.x - 6) continue;
        const dx = Math.abs(L.x - (this.x + L.face * this.w / 2));
        if (dx > PHYS.LEDGE_REACH_X) continue;
        const top = this.y - this.h;
        if (L.y < top - 50 || L.y > top + PHYS.LEDGE_REACH_Y) continue;
        const occ = this.match.ledgeOwner.get(L.id);
        if (occ && occ !== this) {
          if (occ.state === ST.LEDGE) occ.ledgeTrumped(); else continue;
        }
        this.enterLedge(L); return;
      }
    }
    enterLedge(L) {
      this.endMoveCleanup(true);
      this.state = ST.LEDGE; this.stateTime = 0; this.ledge = L;
      this.match.ledgeOwner.set(L.id, this);
      this.facing = L.face; this.x = L.x - L.face * (this.w / 2 - 2); this.y = L.y + this.h * 0.92;
      this.vx = this.vy = this.lvx = this.lvy = 0; this.fastFalling = false;
      this.jumpsLeft = this.stat('airJumps'); this.airDodgeUsed = false; this.airUsed = {};
      this.ledgeIntang = Math.max(6, 60 - this.ledgeGrabCount * 18 - Math.floor(this.percent / 10));
      this.ledgeGrabCount++;
      NX.Audio.play('ledge');
      this.fx('sparkle', L.x, L.y, { color: '#fff' });
    }
    releaseLedgeOwnership() {
      if (this.ledge && this.match.ledgeOwner.get(this.ledge.id) === this) this.match.ledgeOwner.delete(this.ledge.id);
      if (this.state !== ST.LEDGEACT) this.ledge = null;
    }
    ledgeTrumped() {
      this.releaseLedgeOwnership(); this.ledge = null;
      this.state = ST.AIR; this.stateTime = 0;
      this.vy = -2.5; this.vx = -this.facing * 2.5; this.ledgeCooldown = 40; this.actionLock = 18; this.intangible = 10;
    }
    ledgeUpdate() {
      const I = this.input, t = this.stateTime, L = this.ledge;
      if (!L || L.plat.removed || t > 300) { this.releaseLedgeOwnership(); this.setState(ST.AIR); this.ledgeCooldown = PHYS.LEDGE_REGRAB; return; }
      if (t < 6) return;
      const toward = I.x * this.facing;
      if (I.pressed('jump') || I.pressed('tapjump')) {
        I.consume('jump'); I.consume('tapjump');
        this.releaseLedgeOwnership(); this.ledge = null;
        this.state = ST.AIR; this.stateTime = 0;
        this.vy = -this.stat('jump') * 1.02; this.vx = this.facing * 1.8; this.intangible = 4; this.ledgeCooldown = 12;
        NX.Audio.play('jump'); return;
      }
      if (I.pressed('attack') || I.pressed('special') || I.smashPressed()) { I.consume('attack'); I.consume('special'); I.consume('smash'); this.ledgeAction('attack'); return; }
      if (I.pressed('shield')) { I.consume('shield'); this.ledgeAction('roll'); return; }
      if (toward > 0.5) { this.ledgeAction('climb'); return; }
      if (toward < -0.5 || I.y > 0.5) {
        this.releaseLedgeOwnership(); this.ledge = null;
        this.state = ST.AIR; this.stateTime = 0; this.ledgeCooldown = PHYS.LEDGE_REGRAB;
        this.x -= this.facing * 4; this.vy = 0.5;
      }
    }
    ledgeAction(kind) {
      const L = this.ledge;
      this.ledgeAct = { kind, frames: kind === 'climb' ? 30 : (kind === 'roll' ? 42 : 14), x0: this.x, y0: this.y, L };
      this.state = ST.LEDGEACT; this.stateTime = 0;
    }
    ledgeActUpdate() {
      const a = this.ledgeAct, t = this.stateTime, L = a.L;
      const climbT = 14;
      if (t <= climbT) {
        const k = t / climbT;
        this.x = U.lerp(a.x0, L.x + L.face * (this.w / 2 + 6), k);
        this.y = U.lerp(a.y0, L.y, U.easeOut(k));
      }
      if (t === climbT) {
        this.ground = L.plat; this.y = L.y;
        if (this.match.ledgeOwner.get(L.id) === this) this.match.ledgeOwner.delete(L.id);
        this.ledge = null; this.ledgeCooldown = 20;
        if (a.kind === 'attack') { this.startMove('ledgeattack'); return; }
      }
      if (a.kind === 'roll' && t > climbT) {
        const k = (t - climbT) / (a.frames - climbT);
        this.x += this.facing * 7.5 * Math.sin(Math.PI * k);
        const p = L.plat; this.x = U.clamp(this.x, p.x + this.w / 2, p.x + p.w - this.w / 2);
      }
      if (t >= a.frames) { this.ledgeAct = null; this.state = ST.IDLE; this.stateTime = 0; }
    }

    /* ------------------------------ AGARRES ------------------------------- */
    beginGrabHold(t) {
      this.endMoveCleanup(false);
      this.state = ST.GRABHOLD; this.stateTime = 0; this.vx = 0;
      this.grabTarget = t; this.grabTimer = Math.floor(70 + t.percent * 0.9);
      this.grabStartDir = { x: Math.sign(Math.round(this.input.x)), y: Math.sign(Math.round(this.input.y)) };
      t.becomeGrabbed(this);
      this.positionGrabbed(t);
    }
    becomeGrabbed(holder) {
      this.breakHolds(); this.endMoveCleanup(true);
      if (this.state === ST.LEDGE) this.releaseLedgeOwnership();
      this.state = ST.GRABBED; this.stateTime = 0; this.grabbedBy = holder;
      this.vx = this.vy = this.lvx = this.lvy = 0; this.fastFalling = false; this.ground = null;
    }
    positionGrabbed(t) {
      t.x = this.x + this.facing * (this.w / 2 + t.w / 2 - 6); t.y = this.y; t.facing = -this.facing;
    }
    grabHoldUpdate() {
      const t = this.grabTarget;
      if (!t || t.state !== ST.GRABBED || t.grabbedBy !== this) { this.grabTarget = null; this.setState(ST.IDLE); return; }
      this.applyGroundFriction();
      if (t.input.mashed) this.grabTimer -= 3;
      if (--this.grabTimer <= 0) { this.releaseGrab(true); return; }
      if (this.pummelCD > 0) {
        if (--this.pummelCD === 9) {
          const d = this.moves.pummel ? this.moves.pummel.dmg : 1.3;
          t.addDamage(d, this); this.stats.damageDealt += d; t.hitlag = 5; t.shaking = true; t.flashTimer = 5; this.hitlag = 3;
          this.fx('spark', t.x, t.y - t.h / 2, { n: 4, power: 0.6 }); NX.Audio.play('weak');
          if (this.def.meter && this.def.meter.gainOnHit) this.addMeter(d * this.def.meter.gainOnHit);
        }
        return;
      }
      const I = this.input;
      if (this.stateTime < 4) return;
      const useC = I.cTap > 0;
      const sx = useC ? I.cx : I.x, sy = useC ? I.cy : I.y;
      let dir = null;
      if (Math.abs(sy) > 0.5 && Math.abs(sy) >= Math.abs(sx)) dir = sy < 0 ? 'up' : 'down';
      else if (Math.abs(sx) > 0.5) dir = Math.sign(sx) === this.facing ? 'fwd' : 'back';
      else if (I.smashPressed()) dir = 'fwd';
      if (dir) {
        const same = (dir === 'fwd' || dir === 'back') ? Math.sign(sx) === this.grabStartDir.x && this.grabStartDir.x !== 0 : Math.sign(sy) === this.grabStartDir.y && this.grabStartDir.y !== 0;
        if (!same || this.stateTime > 20 || useC || I.smashPressed()) { I.consume('smash'); this.doThrow(dir); return; }
      } else this.grabStartDir = { x: 0, y: 0 };
      if (I.pressed('attack')) { I.consume('attack'); this.pummelCD = 14; }
    }
    doThrow(dir) {
      const key = 'throw_' + dir, m = this.moves[key];
      const t = this.grabTarget;
      if (!m || !t) return;
      this.grabTarget = null;
      this.startMove(m);
      this.move.data.victim = t;
      NX.Audio.play('throw');
    }
    throwUpdate(mv, f) {
      const m = mv.def, t = mv.data.victim;
      if (!t || t.grabbedBy !== this) return;
      const k = Math.min(1, f / m.release);
      const reach = this.w / 2 + t.w / 2 - 4;
      if (m.victimPath) m.victimPath(this, t, k, mv);
      else switch (m.path) {
        case 'back': { const a = Math.PI * U.easeInOut(k); t.x = this.x + this.facing * Math.cos(a) * reach; t.y = this.y - Math.sin(a) * this.h * 0.8; break; }
        case 'up': t.x = this.x + this.facing * (1 - k) * reach; t.y = this.y - k * this.h * 0.95; break;
        case 'down': t.x = this.x + this.facing * reach * 0.7; t.y = this.y; break;
        default: t.x = this.x + this.facing * reach * (1 + 0.25 * k); t.y = this.y - 8 * k;
      }
      if (f === m.release) {
        t.grabbedBy = null; mv.data.victim = null;
        t.state = ST.AIR; t.stateTime = 0; t.ground = null;
        if (m.onThrow) m.onThrow(this, t, mv);
        const hit = Object.assign({ ang: 45, bkb: 60, kbg: 60, effect: 'hit' }, m.hit);
        this.match.combat.applyHit(this, t, hit, { dir: this.facing * (hit.reverse ? -1 : 1), noAttackerLag: true });
        if (m.path === 'down') this.fx('dust', t.x, this.y, { n: 6 });
      }
    }
    releaseGrab(timeout) {
      const t = this.grabTarget;
      this.grabTarget = null;
      if (t && t.grabbedBy === this) {
        t.grabbedBy = null; t.state = ST.AIR; t.stateTime = 0; t.ground = null;
        t.vy = -4; t.lvx = this.facing * 4; t.actionLock = 10;
      }
      if (this.state === ST.GRABHOLD) { this.setState(ST.RELEASE); this.lvx = -this.facing * 2.5; }
    }
    breakHolds() {
      if (this.grabTarget) this.releaseGrab(false);
      if (this.move && this.move.data.victim) {
        const v = this.move.data.victim; this.move.data.victim = null;
        if (v.grabbedBy === this) { v.grabbedBy = null; v.state = ST.AIR; v.stateTime = 0; v.ground = null; v.vy = -3; }
      }
      if (this.captive) this.releaseCaptive(null);
      if (this.grabbedBy) {
        const h = this.grabbedBy; this.grabbedBy = null;
        if (h.grabTarget === this) { h.grabTarget = null; if (h.state === ST.GRABHOLD) h.setState(ST.IDLE); }
      }
      if (this.captor) { const c = this.captor; this.captor = null; if (c.captive === this) c.captive = null; }
    }

    /* Captura genérica para agarres de comando, inhalar, vagonetas, etc. */
    capture(target, opts) {
      opts = opts || {};
      target.breakHolds(); target.endMoveCleanup(true);
      if (target.state === ST.LEDGE) target.releaseLedgeOwnership();
      target.state = ST.CAPTURED; target.stateTime = 0; target.captor = this;
      target.captureTimer = opts.max || 240; target.hidden = !!opts.hide;
      target.vx = target.vy = target.lvx = target.lvy = 0; target.ground = null; target.fastFalling = false;
      this.captive = target;
      return target;
    }
    releaseCaptive(hit, o) {
      const t = this.captive;
      if (!t) return;
      this.captive = null;
      t.captor = null; t.hidden = false;
      t.state = ST.AIR; t.stateTime = 0;
      if (hit) this.match.combat.applyHit(this, t, Object.assign({ ang: 45, bkb: 50, kbg: 70, effect: 'hit' }, hit), Object.assign({ dir: this.facing * (hit.reverse ? -1 : 1), noAttackerLag: true }, o || {}));
      else { t.vy = -5; t.lvx = this.facing * 3; t.actionLock = 8; }
    }
    freeFromCapture() {
      const c = this.captor;
      this.captor = null; this.hidden = false;
      if (c && c.captive === this) c.captive = null;
      this.state = ST.AIR; this.stateTime = 0; this.vy = -4; this.actionLock = 6;
    }

    /* --------------------------- REAPARICIÓN ------------------------------ */
    respawnUpdate() {
      const I = this.input, t = this.stateTime;
      this.vx = 0; this.vy = 0;
      const act = t > 30 && (Math.abs(I.x) > 0.3 || Math.abs(I.y) > 0.3 || I.pressed('jump') || I.pressed('attack') || I.pressed('special') || I.pressed('shield') || I.pressed('smash') || I.pressed('tapjump') || I.pressed('grab'));
      if (act || t > 300) {
        this.state = ST.AIR; this.stateTime = 0; this.invincible = 120; this.ground = null;
        this.respawnPlat = null; this.jumpsLeft = this.stat('airJumps');
      }
    }

    /* ------------------------------ DIBUJO -------------------------------- */
    draw(ctx) {
      if (this.state === ST.DEAD) return;
      this.drawGroundShadow(ctx);
      NX.Render.drawFighter(ctx, this);
      if (this.isShielding()) {
        const c = this.shieldCenter(), r = this.shieldRadius();
        const g = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r);
        g.addColorStop(0, U.rgba(this.color, 0.15)); g.addColorStop(0.8, U.rgba(this.color, 0.45)); g.addColorStop(1, U.rgba('#ffffff', 0.7));
        ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = U.rgba('#ffffff', 0.6); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      if (this.counterWin) {
        ctx.save(); ctx.strokeStyle = 'rgba(160,240,255,.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.x, this.y - this.h / 2, this.h * 0.6, 0, U.TAU); ctx.stroke(); ctx.restore();
      }
      if (this.reflector && this.reflector.draw !== false) {
        const rf = this.reflector, c = this.localToWorld(rf.x || 0, rf.y == null ? -this.h / 2 : rf.y), r = rf.r || 40;
        const col = rf.color || '#77ffff';
        ctx.save();
        const g = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r);
        g.addColorStop(0, U.rgba(col, 0.05)); g.addColorStop(0.85, U.rgba(col, 0.28)); g.addColorStop(1, U.rgba('#ffffff', 0.75));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = U.rgba(col, 0.9); ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) { const rr = r * (0.45 + ((this.tick * 0.03 + i * 0.5) % 1) * 0.55); ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, U.TAU); ctx.stroke(); }
        ctx.restore();
      }
    }

    /* V1.3 · Sombra de contacto en el suelo: se encoge y se aclara al subir. */
    drawGroundShadow(ctx) {
      if (this.hidden || !this.match || this.state === ST.RESPAWN) return;
      const g = this.ground || this.match.findGroundBelow(this.x, this.y - 2);
      if (!g || g.removed) return;
      const hgt = Math.max(0, g.y - this.y);
      const k = 1 - Math.min(1, hgt / 420);
      if (k <= 0.02) return;
      const s = (this.drawScale || 1) * (0.55 + 0.45 * k);
      ctx.save();
      ctx.globalAlpha = 0.3 * k;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(this.x, g.y + 1, this.w * 0.85 * s, 5.5 * s, 0, 0, U.TAU); ctx.fill();
      ctx.globalAlpha = 0.18 * k;
      ctx.beginPath(); ctx.ellipse(this.x, g.y + 1, this.w * 1.25 * s, 8 * s, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
    }

    drawTag(ctx, zoom) {
      if (this.state === ST.DEAD || this.hidden) return;
      const s = 1 / Math.max(0.5, zoom);
      const x = this.x, y = this.y - this.h * (this.drawScale || 1) - 14 * s;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = this.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = '900 15px "Barlow Condensed", Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeText(this.tag, 0, -10); ctx.fillText(this.tag, 0, -10);
      ctx.restore();
    }
  }

  NX.ST = ST;
  NX.SLOT_COLORS = SLOT_COLORS;
  NX.DEFAULT_STATS = DEFAULT_STATS;
  NX.Fighter = Fighter;
  NX.buildMoveset = buildMoveset;
  NX.standardMoves = standardMoves;
  NX.normalizeMove = normalizeMove;
  NX.normalizeHB = normalizeHB;
})(window.NX = window.NX || {});
