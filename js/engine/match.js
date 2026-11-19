/* ==========================================================================
 * NEXUS CLASH — js/engine/match.js
 * Reglamento competitivo fijo: 3 Stocks · 7:00 minutos · Sin objetos.
 * Cuenta regresiva, cronómetro, KOs por Blast Zone, reaparición en
 * plataforma angelical (2 s de invencibilidad), TIME!, Muerte Súbita
 * (1 vida, 300%, blast zones que se cierran) y GAME!.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U;

  const RULES = Object.freeze({
    stocks: 3,
    timeFrames: 7 * 60 * 60,   // 07:00.00 a 60 FPS
    items: false,              // estrictamente sin objetos
    respawnInvincible: 120,    // 2 segundos
    suddenPercent: 300,
    suddenShrinkDelay: 600,
    suddenShrinkRate: 0.45
  });

  /* v8 · Horda: 10 oleadas; el nivel del bot sube con cada una. */
  const HORDE_WAVES = 10;
  function hordeLevel(w) { return Math.min(9, 1 + Math.ceil(w * 0.8)); }
  NX.hordeLevel = hordeLevel;

  /* Colores alternativos para luchadores repetidos (mirror matches). */
  function hueShift(hex, deg, light) {
    const c = U.hexToRgb(hex);
    let r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
    }
    h = (h + deg / 360) % 1; l = U.clamp(l + (light || 0), 0.05, 0.92);
    const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    let rr, gg, bb;
    if (s === 0) rr = gg = bb = l;
    else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; rr = f(p, q, h + 1 / 3); gg = f(p, q, h); bb = f(p, q, h - 1 / 3); }
    const to = v => Math.round(v * 255).toString(16).padStart(2, '0');
    return '#' + to(rr) + to(gg) + to(bb);
  }
  NX.altPalette = function (pal, n) { return altPalette(pal, n); };
  const ALT_KEYS = ['primary', 'secondary', 'legs', 'belt', 'feet', 'accent', 'hair'];
  function altPalette(pal, n) {
    const out = Object.assign({}, pal);
    const deg = [0, 140, 220, 300][n % 4], light = n % 2 ? -0.08 : 0.06;
    const skin = pal.skin;
    ALT_KEYS.forEach(k => { if (typeof pal[k] === 'string' && /^#[0-9a-f]{6}$/i.test(pal[k]) && (k === 'primary' || pal[k] !== skin)) out[k] = hueShift(pal[k], deg, light); });
    ['arms', 'hand', 'head'].forEach(k => { if (pal[k] && pal[k] !== skin && /^#[0-9a-f]{6}$/i.test(pal[k])) out[k] = hueShift(pal[k], deg, light); });
    return out;
  }

  class Match {
    constructor(cfg) {
      this.cfg = cfg; this.mode = cfg.mode;
      const r = cfg.mode === 'horde' || cfg.mode === 'practice' ? { stocks: 1, minutes: 0 } : (cfg.rules || {});
      this.rules = {
        stocks: U.clamp(r.stocks || RULES.stocks, 1, 99),
        minutes: r.minutes == null ? 7 : r.minutes
      };
      this.infiniteTime = !this.rules.minutes;
      const sdef = NX.getStage(cfg.stageId);
      this.stageDef = sdef;
      this.stagePlatforms = sdef.platforms.map(p => Object.assign({ type: 'solid' }, p));
      this.blast0 = Object.assign({}, sdef.blast);
      this.blast = Object.assign({}, sdef.blast);
      this.dynamicSolids = []; this.projectiles = [];
      this.effects = new NX.Effects(this);
      this.combat = new NX.Combat(this);
      this.camera = new NX.Camera();
      this.ledges = NX.Physics.buildLedges(this.stagePlatforms);
      this.ledgeOwner = new Map();
      this.fighters = []; this.controllers = [];
      this.frame = 0; this.phase = 'countdown'; this.phaseTime = 0;
      this.timer = this.infiniteTime ? 0 : Math.round(this.rules.minutes * 3600); this.freeze = 0; this.slowmo = 0; this.lethalCooldown = 0;
      this.suddenDeath = false; this.suddenTime = 0; this.over = false; this.result = null; this.winner = null;
      this.koOrder = []; this.listeners = {};
      this.refreshPlatforms();

      const n = cfg.players.length;
      cfg.players.forEach((p, i) => {
        const def = NX.getFighter(p.fighterId);
        const f = new NX.Fighter(def, i, this, {
          human: p.human, level: p.level, stocks: this.rules.stocks,
          tag: p.human ? 'P' + (i + 1) : 'CPU' + (n > 2 ? i + 1 : '')
        });
        this.placeAtSpawn(f, i, n);
        f.state = NX.ST.ENTRY; f.stateTime = 0;
        const dup = this.fighters.filter(o => o.slotDef === def).length;
        if (dup > 0) { f.altIndex = dup; f.palette = altPalette(f.def.palette, dup); }
        this.fighters.push(f);
        let ctrl = null;
        if (p.human) ctrl = new NX.Input.HumanController(f);
        /* V1.2 · PRÁCTICA: el bot no tiene controlador, así que se queda quieto. */
        else if (NX.BotController && cfg.mode !== 'practice') ctrl = new NX.BotController(f, p.level, this);
        this.controllers.push(ctrl);
      });
      /* V1.2 · PRÁCTICA: vidas y tiempo infinitos y contador de combos sobre el muñeco. */
      this.practice = null;
      if (cfg.mode === 'practice') {
        this.fighters.forEach(f => { f.infiniteStocks = true; });
        this.practice = { hits: 0, dmg: 0, best: 0, bestHits: 0, last: 0, lastHits: 0, pct: 0, stunned: false };
      }
      /* v8 · HORDA: el jugador tiene vidas infinitas; cada rival, una sola. */
      this.horde = null;
      if (cfg.mode === 'horde') {
        this.horde = { wave: 1, total: cfg.hordeTotal || HORDE_WAVES, pending: 0, used: [cfg.players[1].fighterId] };
        this.fighters[0].infiniteStocks = true;
        this.applyWave(this.fighters[1], 1);
      }
      this.camera.snap(this);
    }

    /* ============================ HORDA ================================= */
    applyWave(f, wave) {
      f.wave = wave;
      if (wave >= this.horde.total) {
        f.boss = true; f.tag = 'JEFE';
        f.applyBoost({ size: 1.3, weight: 1.4, dmg: 1.3, resist: 0.65 });
      }
    }
    hordeCleared(f, x, y) {
      const H = this.horde;
      f.eliminated = true; f.eliminatedAt = this.frame; this.koOrder.push(f);
      this.emit('eliminated', f);
      if (H.wave >= H.total) { this.gameSet(this.fighters[0], x, y); return; }
      H.wave++; H.pending = 95;
    }
    spawnWave() {
      const H = this.horde, idx = 1, old = this.fighters[idx];
      const player = this.fighters[0];
      const roster = (NX.ROSTER || []).filter(d => H.used.slice(-4).indexOf(d.id) < 0);
      const def = U.pick(roster.length ? roster : NX.ROSTER);
      H.used.push(def.id);
      const level = hordeLevel(H.wave);
      const nf = new NX.Fighter(def, idx, this, { human: false, level, stocks: 1, tag: 'CPU' });
      if (def === player.slotDef) { nf.altIndex = 1; nf.palette = altPalette(nf.def.palette, 1); }
      this.applyWave(nf, H.wave);
      this.fighters[idx] = nf;
      this.controllers[idx] = NX.BotController ? new NX.BotController(nf, level, this) : null;
      for (const f of this.fighters) if (f.lastAttacker === old) f.lastAttacker = null;
      this.respawnFighter(nf);
      const boss = H.wave >= H.total;
      this.announce(boss ? '¡JEFE FINAL!' : 'OLEADA ' + H.wave, { style: 'time', say: boss ? 'Final boss!' : 'Wave ' + H.wave });
      if (boss) { NX.Audio.play('lethal'); this.camera.shake(14); }
      this.emit('wave', { wave: H.wave, total: H.total, f: nf, idx });
    }
    updateHorde() {
      const H = this.horde;
      if (H.pending > 0 && --H.pending === 0) this.spawnWave();
      for (const f of this.fighters) {
        if (!f.boss || !f.inPlay()) continue;
        if (this.frame % 2 === 0) this.effects.spawn('sparkle', f.x + U.rand(-f.w * 0.7, f.w * 0.7), f.y - U.rand(0, f.h), { color: U.pick(['#b34dff', '#d68aff', '#7a1ad8']) });
        if (this.frame % 7 === 0) this.effects.list.push({ type: 'wisp', x: f.x + U.rand(-f.w * 0.5, f.w * 0.5), y: f.y - U.rand(0, f.h * 0.6), vx: U.rand(-0.6, 0.6), vy: -U.rand(0.8, 2), life: 34, max: 34, size: U.rand(6, 12), color: '#a33cff' });
      }
    }
    drawBossAura(ctx, f) {
      const t = this.frame, cx = f.x, cy = f.y - f.h * 0.5, r = f.h * (0.75 + 0.05 * Math.sin(t * 0.15));
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, 'rgba(179,77,255,.48)'); g.addColorStop(0.6, 'rgba(150,40,240,.22)'); g.addColorStop(1, 'rgba(120,20,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(214,138,255,.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.w * 0.9, 8, 0, 0, U.TAU); ctx.stroke();
      ctx.restore();
    }

    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
    emit(ev, data) { (this.listeners[ev] || []).forEach(fn => fn(data, this)); }
    announce(text, opts) { this.emit('announce', Object.assign({ text }, opts || {})); }

    platforms() { return this._plats; }
    refreshPlatforms() { this._plats = this.stagePlatforms.concat(this.dynamicSolids.filter(b => !b.removed)); }

    /* Bloques/plataformas temporales (p. ej. constructores en la Parte 2). */
    addSolid(o) {
      const b = Object.assign({ type: 'solid', life: 600, removed: false, hp: 0, owner: null }, o);
      this.dynamicSolids.push(b); this.refreshPlatforms();
      return b;
    }
    removeSolid(b) {
      if (b.removed) return;
      b.removed = true;
      if (b.onRemove) b.onRemove(b, this);
      this.effects.spawn('debris', b.x + b.w / 2, b.y + b.h / 2, { n: 8, color: b.color || '#8a6a42' });
    }

    placeAtSpawn(f, i, n) {
      const sp = this.stageDef.spawns;
      let s;
      if (n <= 2) s = sp[i === 0 ? 0 : 1];
      else s = sp[i % sp.length];
      f.x = s.x; f.y = s.y;
      const cx = (this.stageDef.camera.left + this.stageDef.camera.right) / 2;
      f.facing = f.x < cx ? 1 : -1;
      const g = this.findGroundBelow(f.x, f.y);
      if (g) { f.y = g.y; f.ground = g; }
    }
    findGroundBelow(x, y) {
      let best = null;
      for (const p of this.stagePlatforms) {
        if (x < p.x || x > p.x + p.w || p.y < y - 2) continue;
        if (!best || p.y < best.y) best = p;
      }
      return best;
    }
    stageCenter() { const c = this.stageDef.camera; return { x: (c.left + c.right) / 2, y: this.stageDef.respawn.y + 200 }; }

    /* ============================ UPDATE ================================ */
    update() {
      this.frame++;
      if (this.stageDef.update && this.freeze <= 0) this.stageDef.update(this, this.frame);
      this.refreshPlatforms();
      for (let i = 0; i < this.fighters.length; i++) {
        const c = this.controllers[i];
        if (c) c.update(this); else this.fighters[i].input.commit({});
      }
      if (this.lethalCooldown > 0) this.lethalCooldown--;
      this.camera.update(this);
      if (this.freeze > 0) { this.freeze--; this.updateScreenFx(); return; }
      if (this.slowmo > 0) { this.slowmo--; if (this.frame % 3 !== 0) { this.updateScreenFx(); return; } }
      this.phaseTime++;
      switch (this.phase) {
        case 'countdown': this.updateCountdown(); this.simulate(false); break;
        case 'play': this.simulate(true); this.updateTimer(); if (this.horde) this.updateHorde(); if (this.practice) this.updatePractice(); break;
        case 'time': this.updateTimeUp(); break;
        case 'sdintro': this.updateSuddenIntro(); this.simulate(false); break;
        case 'sudden': this.simulate(true); this.updateSudden(); break;
        case 'game': this.simulate(true); if (this.horde) this.updateHorde(); if (this.phaseTime > 140) this.finish(); break;
        default: break;
      }
    }
    /* ========================== V1.2 · PRÁCTICA ========================= */
    practiceDummy() { return this.fighters.find(f => !f.isHuman) || this.fighters[1]; }
    updatePractice() {
      const P = this.practice, d = this.practiceDummy();
      if (!d) return;
      const stunned = d.state !== NX.ST.DEAD && (d.hitstun > 0 || d.hitlag > 0 || d.state === NX.ST.HITSTUN || d.state === NX.ST.GRABBED);
      const gained = d.percent - P.pct;
      const struck = gained > 0.001 && (d.hitlag > 0 || d.hitstun > 0 || d.state === NX.ST.GRABBED);
      if (struck) {
        /* Si el muñeco seguía aturdido por el golpe anterior, es combo. */
        if (P.stunned && P.hits > 0) { P.hits++; P.dmg += gained; }
        else { P.hits = 1; P.dmg = gained; }
        this.emit('practice', P);
      } else if (gained > 0.001 && P.hits > 0) { P.dmg += gained; this.emit('practice', P); }   // veneno/quemadura dentro del combo
      else if (!stunned && P.stunned && P.hits > 0) this.endCombo(d);
      P.pct = d.percent;
      P.stunned = stunned || struck;
    }
    endCombo(d) {
      const P = this.practice;
      P.last = P.dmg; P.lastHits = P.hits;
      if (P.dmg > P.best) { P.best = P.dmg; P.bestHits = P.hits; }
      if (P.hits >= 2) this.effects.spawn('text', d.x, d.y - d.h - 30, { text: `COMBO ×${P.hits} · ${P.dmg.toFixed(1)}%`, color: '#ffd23a', size: 22 });
      P.hits = 0; P.dmg = 0;
      this.emit('practice', P);
    }
    /* Pone a los dos en su posición inicial con 0%. */
    resetPractice() {
      if (!this.practice) return;
      const n = this.fighters.length;
      this.projectiles = []; this.ledgeOwner.clear();
      this.fighters.forEach((f, i) => {
        f.breakHolds(); f.releaseLedgeOwnership();
        f.resetLife(); f.hidden = false; f.eliminated = false; f.stocks = 1;
        this.placeAtSpawn(f, i, n);
        f.state = NX.ST.IDLE; f.stateTime = 0;
        f.input.clearBuffers();
      });
      Object.assign(this.practice, { hits: 0, dmg: 0, pct: 0, stunned: false });
      this.effects.spawn('flash', 0, 0, { color: '#fff', alpha: 0.25, life: 8 });
      NX.Audio.play('respawn');
      this.emit('practice', this.practice);
    }
    updateScreenFx() { for (const s of this.effects.screen) s.life--; this.effects.screen = this.effects.screen.filter(s => s.life > 0); }

    simulate(live) {
      for (const f of this.fighters) {
        if (f.state === NX.ST.DEAD) {
          if (!f.eliminated && --f.respawnTimer <= 0) this.respawnFighter(f);
          continue;
        }
        f.update();
      }
      for (const p of this.projectiles) p.update();
      this.projectiles = this.projectiles.filter(p => p.active);
      if (live) this.combat.update();
      for (const b of this.dynamicSolids) {
        if (b.removed) continue;
        if (b.update) b.update(b, this);
        if (b.life != null && --b.life <= 0) this.removeSolid(b);
      }
      this.dynamicSolids = this.dynamicSolids.filter(b => !b.removed);
      this.effects.update();
      if (live) for (const f of this.fighters) this.checkBlast(f);
    }

    updateCountdown() {
      const t = this.phaseTime;
      const marks = { 1: '3', 60: '2', 120: '1' };
      if (marks[t]) {
        this.announce(marks[t], { style: 'count', say: { 1: 'Three', 60: 'Two', 120: 'One' }[t] });
        NX.Audio.play('beep');
      }
      if (t === 180) {
        this.phase = 'play'; this.phaseTime = 0;
        this.announce('GO!', { style: 'go', say: 'Go!' });
        NX.Audio.play('beep', { high: true });
        for (const f of this.fighters) if (f.state === NX.ST.ENTRY) { f.state = NX.ST.IDLE; f.stateTime = 0; }
        this.emit('start');
      }
    }

    updateTimer() {
      if (this.infiniteTime) { this.timer++; return; }
      if (this.timer <= 0) return;
      this.timer--;
      if (this.timer > 0 && this.timer <= 300 && this.timer % 60 === 0) {
        this.emit('finalCount', this.timer / 60);
        NX.Audio.play('tick');
      }
      if (this.timer <= 0) this.timeUp();
    }

    timeUp() {
      this.phase = 'time'; this.phaseTime = 0;
      this.announce('TIME!', { style: 'time', say: 'Time!' });
      NX.Audio.play('beep', { high: true });
      NX.Audio.stopMusic();
    }

    updateTimeUp() {
      this.effects.update();
      if (this.phaseTime < 120) return;
      const alive = this.fighters.filter(f => !f.eliminated);
      const maxStocks = Math.max.apply(null, alive.map(f => f.stocks));
      const leaders = alive.filter(f => f.stocks === maxStocks);
      if (leaders.length === 1) { this.winner = leaders[0]; this.finish(); }
      else this.startSuddenDeath(leaders);
    }

    startSuddenDeath(leaders) {
      this.suddenDeath = true; this.phase = 'sdintro'; this.phaseTime = 0; this.suddenTime = 0;
      this.projectiles.forEach(p => p.destroy('out')); this.projectiles = [];
      this.dynamicSolids = []; this.refreshPlatforms();
      this.ledgeOwner.clear();
      this.blast = Object.assign({}, this.blast0);
      const n = leaders.length;
      let idx = 0;
      for (const f of this.fighters) {
        f.breakHolds();
        if (leaders.indexOf(f) < 0) {
          if (!f.eliminated) { f.eliminated = true; f.eliminatedAt = this.frame; this.koOrder.push(f); }
          f.state = NX.ST.DEAD; f.hidden = true;
          this.emit('eliminated', f);
          continue;
        }
        f.stocks = 1; f.eliminated = false;
        f.resetLife(); f.percent = RULES.suddenPercent;
        this.placeAtSpawn(f, idx++, n);
        f.state = NX.ST.ENTRY; f.stateTime = 0;
      }
      this.announce('SUDDEN DEATH!', { style: 'sudden', say: 'Sudden death!' });
      NX.Audio.playMusic('sudden');
      this.emit('sudden');
    }

    updateSuddenIntro() {
      if (this.phaseTime === 150) {
        this.phase = 'sudden'; this.phaseTime = 0;
        this.announce('GO!', { style: 'go', say: 'Go!' });
        for (const f of this.fighters) if (f.state === NX.ST.ENTRY) { f.state = NX.ST.IDLE; f.stateTime = 0; }
      }
    }

    updateSudden() {
      this.suddenTime++;
      if (this.suddenTime > RULES.suddenShrinkDelay) {
        const cam = this.stageDef.camera, r = RULES.suddenShrinkRate;
        const main = this.stagePlatforms[0];
        this.blast.left = Math.min(this.blast.left + r, main.x - 60);
        this.blast.right = Math.max(this.blast.right - r, main.x + main.w + 60);
        this.blast.top = Math.min(this.blast.top + r * 0.8, cam.top + 120);
        this.blast.bottom = Math.max(this.blast.bottom - r * 0.6, main.y + 260);
      }
    }

    /* ============================ KOs =================================== */
    checkBlast(f) {
      if (!f.inPlay() || f.state === NX.ST.RESPAWN || f.state === NX.ST.ENTRY) return;
      if (f.state === NX.ST.GRABBED || f.state === NX.ST.CAPTURED) return;
      const b = this.blast, cx = f.x, cy = f.y - f.h / 2;
      const hitstun = f.state === NX.ST.HITSTUN || f.state === NX.ST.TUMBLE;
      if (cx < b.left || cx > b.right || cy > b.bottom || (cy < b.top && (hitstun || cy < b.top - 250))) this.ko(f);
    }

    ko(f) {
      const b = this.blast;
      const px = U.clamp(f.x, b.left, b.right), py = U.clamp(f.y - f.h / 2, b.top, b.bottom);
      const c = this.stageCenter();
      this.effects.spawn('blast', px, py, { angle: Math.atan2(c.y - py, c.x - px), color: f.color });
      this.effects.spawn('flash', 0, 0, { color: '#fff', alpha: 0.4, life: 10 });
      this.camera.shake(34);
      NX.Audio.play('ko'); NX.Audio.play('crowd');
      const killer = f.lastAttacker && f.lastAttacker !== f ? f.lastAttacker : null;
      if (killer) killer.stats.kos++; else f.stats.sds++;
      f.stats.falls++;
      f.breakHolds(); f.endMoveCleanup(true); f.releaseLedgeOwnership();
      f.stocks = Math.max(0, f.stocks - 1);
      f.state = NX.ST.DEAD; f.stateTime = 0; f.respawnTimer = 80;
      f.vx = f.vy = f.lvx = f.lvy = 0; f.burn = null;
      this.emit('ko', { f, killer });
      if (this.horde) {
        if (f.infiniteStocks) f.stocks = 1;
        else if (this.phase !== 'game') this.hordeCleared(f, px, py);
        return;
      }
      if (this.practice) { f.stocks = 1; return; }
      if (f.stocks <= 0) {
        f.eliminated = true; f.eliminatedAt = this.frame; this.koOrder.push(f);
        this.emit('eliminated', f);
        const remaining = this.fighters.filter(x => !x.eliminated);
        if (remaining.length <= 1 && this.phase !== 'game') this.gameSet(remaining[0] || null, px, py);
      }
    }

    respawnFighter(f) {
      f.resetLife();
      f.percent = this.suddenDeath ? RULES.suddenPercent : 0;
      const rp = this.stageDef.respawn;
      const used = this.fighters.filter(o => o !== f && o.state === NX.ST.RESPAWN).length;
      f.x = rp.x + (used % 2 ? 1 : -1) * Math.ceil(used / 2) * 90;
      f.y = rp.y; f.ground = null;
      f.state = NX.ST.RESPAWN; f.stateTime = 0; f.facing = f.x <= this.stageCenter().x ? 1 : -1;
      f.respawnPlat = { x: f.x, y: f.y };
      f.input.clearBuffers();
      if (f.slotDef.onRespawn) f.slotDef.onRespawn(f);
      /* V1.2 · Práctica: el muñeco vuelve directo a su sitio, sin plataforma. */
      if (this.practice && !f.isHuman) {
        this.placeAtSpawn(f, this.fighters.indexOf(f), this.fighters.length);
        f.state = NX.ST.IDLE; f.stateTime = 0; f.respawnPlat = null; f.invincible = 40;
      }
      NX.Audio.play('respawn');
      this.emit('respawn', f);
    }

    onLethalHit(target, atk) {
      if (this.lethalCooldown > 0) return;
      this.lethalCooldown = 50;
      this.freeze = Math.max(this.freeze, 22);
      this.camera.focusOn(target, 34, 1.45);
      this.effects.spawn('lightning', target.x, target.y - target.h / 2, { life: 30 });
      this.effects.spawn('flash', 0, 0, { color: '#ff2020', alpha: 0.35, life: 14 });
      NX.Audio.play('lethal');
      this.emit('lethal', { target, atk });
    }

    gameSet(winner, x, y) {
      this.phase = 'game'; this.phaseTime = 0; this.winner = winner;
      this.freeze = 24; this.slowmo = 90;
      this.camera.focusOn({ x, y, h: 0 }, 70, 1.2);
      this.announce('GAME!', { style: 'game', say: 'Game!' });
      NX.Audio.stopMusic();
    }

    finish() {
      if (this.over) return;
      this.over = true;
      const alive = this.fighters.filter(f => !f.eliminated).sort((a, b) => (b.stocks - a.stocks) || (a.percent - b.percent));
      if (this.winner) { const i = alive.indexOf(this.winner); if (i > 0) { alive.splice(i, 1); alive.unshift(this.winner); } }
      const dead = this.koOrder.slice().reverse().filter(f => alive.indexOf(f) < 0);
      const ranking = alive.concat(dead);
      this.result = { ranking, winner: ranking[0], mode: this.mode, frames: this.frame, timeLeft: this.timer, sudden: this.suddenDeath };
      if (this.horde) {
        const p = this.fighters[0];
        this.result.horde = { time: this.timer, waves: this.horde.total, cleared: this.horde.wave >= this.horde.total, player: p, falls: p.stats.falls, dealt: p.stats.damageDealt, taken: p.stats.damageTaken, stageId: this.stageDef.id };
        this.result.winner = p;
      }
      this.emit('finish', this.result);
    }

    /* ============================ DIBUJO ================================ */
    draw(ctx, W, H, dpr) {
      const cam = this.camera, sd = this.stageDef;
      cam.resize(W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sd.drawBackground) sd.drawBackground(ctx, W, H, cam, this.frame, this);
      else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#101830'); g.addColorStop(1, '#2a1030'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

      cam.apply(ctx, dpr);
      if (sd.drawStage) sd.drawStage(ctx, this, this.frame); else this.drawDefaultStage(ctx);
      for (const b of this.dynamicSolids) {
        if (b.removed) continue;
        if (b.draw) b.draw(ctx, b, this); else this.drawDefaultBlock(ctx, b);
      }
      for (const f of this.fighters) if (f.state === NX.ST.RESPAWN && f.respawnPlat) this.drawAngelPlatform(ctx, f);
      for (const f of this.fighters) if (f.slotDef.drawBackdrop && !f.eliminated) f.slotDef.drawBackdrop(ctx, f, this);
      const order = this.fighters.slice().sort((a, b) => (a.isHuman ? 1 : 0) - (b.isHuman ? 1 : 0));
      for (const f of order) if (f.boss && f.inPlay() && !f.hidden) this.drawBossAura(ctx, f);
      for (const f of order) f.draw(ctx);
      for (const p of this.projectiles) p.draw(ctx);
      this.effects.draw(ctx);
      for (const f of order) if (f.inPlay()) f.drawTag(ctx, cam.zoom);
      if (this.suddenDeath) this.drawBlastEdges(ctx);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sd.drawForeground) sd.drawForeground(ctx, W, H, cam, this.frame, this);
      this.drawMagnifiers(ctx, W, H);
      this.effects.drawScreen(ctx, W, H, cam);
      if (this.suddenDeath) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
        g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, 'rgba(150,0,0,' + (0.25 + 0.1 * Math.sin(this.frame * 0.1)) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    }

    drawDefaultStage(ctx) {
      for (const p of this.stagePlatforms) {
        if (p.type === 'solid') {
          const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
          g.addColorStop(0, '#3a3f58'); g.addColorStop(1, '#14161f');
          ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = '#9fb3ff'; ctx.fillRect(p.x, p.y, p.w, 4);
        } else {
          ctx.fillStyle = 'rgba(180,200,255,.85)'; ctx.fillRect(p.x, p.y, p.w, 6);
          ctx.fillStyle = 'rgba(80,100,180,.6)'; ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, 6);
        }
      }
    }
    drawDefaultBlock(ctx, b) {
      ctx.fillStyle = b.color || '#8a6a42'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    }
    drawAngelPlatform(ctx, f) {
      const p = f.respawnPlat, t = this.frame;
      ctx.save();
      ctx.translate(p.x, p.y + 4);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.5, U.rgba(f.color, 0.6)); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 70, 16, 0, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 48, 9, 0, 0, U.TAU); ctx.stroke();
      for (let i = 0; i < 2; i++) {
        const s = i ? -1 : 1;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.moveTo(s * 40, 0);
        ctx.quadraticCurveTo(s * 80, -18 - Math.sin(t * 0.12) * 6, s * 96, -4);
        ctx.quadraticCurveTo(s * 70, 2, s * 40, 4); ctx.fill();
      }
      ctx.restore();
    }
    drawBlastEdges(ctx) {
      const b = this.blast;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,40,40,' + (0.5 + 0.3 * Math.sin(this.frame * 0.2)) + ')';
      ctx.lineWidth = 8; ctx.setLineDash([30, 20]);
      ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
      ctx.restore();
    }

    /* Lupa circular cuando un luchador sale de la vista sin cruzar la Blast Zone. */
    drawMagnifiers(ctx, W, H) {
      const cam = this.camera, m = 58, R = 44;
      for (const f of this.fighters) {
        if (!f.inPlay() || f.hidden) continue;
        const s = cam.worldToScreen(f.x, f.y - f.h / 2);
        if (s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H - cam.padBottom * 0.4 + 10) continue;
        const bx = U.clamp(s.x, m, W - m), by = U.clamp(s.y, m, H - cam.padBottom - m * 0.4);
        const d = Math.hypot(s.x - bx, s.y - by);
        const k = U.clamp(1.1 - d / 1400, 0.55, 1);
        const r = R * k;
        ctx.save();
        ctx.translate(bx, by);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU);
        ctx.fillStyle = 'rgba(10,10,20,.82)'; ctx.fill();
        ctx.save(); ctx.clip();
        const sc = (r * 1.3) / f.h;
        ctx.scale(sc, sc);
        NX.Render.drawFighter(ctx, f, { x: 0, y: f.h / 2, noTrail: true });
        ctx.restore();
        ctx.lineWidth = 4; ctx.strokeStyle = f.color; ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.stroke();
        const a = Math.atan2(s.y - by, s.x - bx);
        ctx.rotate(a); ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.moveTo(r + 14, 0); ctx.lineTo(r + 2, -9); ctx.lineTo(r + 2, 9); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* Resolución de luchadores y escenarios registrados (Parte 2 / Parte 3). */
  NX.getFighter = function (id) {
    const list = NX.ROSTER || [];
    return list.find(d => d.id === id) || list[0];
  };
  NX.getStage = function (id) {
    const list = NX.STAGES || [];
    return list.find(s => s.id === id) || list[0];
  };

  NX.RULES = RULES;
  NX.Match = Match;
})(window.NX = window.NX || {});
