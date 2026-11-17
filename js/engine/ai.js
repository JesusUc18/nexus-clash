/* ==========================================================================
 * NEXUS CLASH — js/engine/ai.js
 * Bots con máquina de estados finitos (nivel 1 a 9):
 *   RECUPERAR (prioritario) · BORDE · PERSEGUIR · ESPACIAR · ATACAR ·
 *   ESCUDAR · EVADIR proyectiles · GUARDIA DE BORDE · AGARRE · DI/TECH.
 * En Batalla Campal cada bot elige objetivo dinámicamente (el más cercano
 * o con más daño), sin fijarse solo en el humano.
 * Los bots escriben en el mismo InputState que un jugador humano.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U, ST = NX.ST;
  const KEYS = ['attack', 'special', 'smash', 'shield', 'grab', 'jump', 'tapjump'];
  const MASH_STATES = new Set([ST.GRABBED, ST.CAPTURED, ST.STUN, ST.DIZZY, ST.BURIED]);

  class BotController {
    constructor(f, level, match) {
      this.f = f; this.match = match;
      this.level = U.clamp(level || 5, 1, 9);
      const L = this.level;
      this.skill = L / 9;
      this.reaction = Math.max(2, Math.round(28 - L * 2.9));   // frames entre decisiones
      this.aggro = 0.25 + L * 0.075;
      this.t = 0; this.thinkT = U.randi(5, 20);
      this.queue = []; this.hold = { x: 0, y: 0 }; this.prevHeld = {}; this.cool = {};
      this.target = null; this.targetT = 0; this.waitT = 0; this.mode = 'idle';
      const solids = match.stagePlatforms.filter(p => p.type === 'solid' && p.ledges !== false);
      this.main = solids.sort((a, b) => b.w - a.w)[0] || match.stagePlatforms[0];
    }

    get hint() { return this.f.def.ai || {}; }

    /* ----------------------------- SALIDA -------------------------------- */
    emit(raw) {
      const out = { x: U.clamp(raw.x || 0, -1, 1), y: U.clamp(raw.y || 0, -1, 1), cx: 0, cy: 0 };
      const hold = raw.hold || [];
      for (const k of KEYS) {
        const want = !!raw[k] || hold.indexOf(k) >= 0;
        const held = hold.indexOf(k) >= 0;
        out[k] = want && (held || !this.prevHeld[k]);
        this.prevHeld[k] = out[k];
      }
      this.f.input.commit(out);
    }
    q(steps) { this.queue = steps.map(s => Object.assign({ n: 1, i: 0 }, s)); return true; }
    ready(k, cd) { if ((this.cool[k] || 0) > 0) return false; this.cool[k] = cd; return true; }
    chance(p) { return Math.random() < p; }

    runQueue(raw) {
      const s = this.queue[0];
      raw.x = s.x != null ? s.x : this.hold.x;
      raw.y = s.y != null ? s.y : 0;
      if (s.i === 0 && s.tap) s.tap.forEach(k => { raw[k] = true; });
      if (s.hold) raw.hold = s.hold;
      if (++s.i >= s.n) this.queue.shift();
    }

    /* ----------------------------- BUCLE --------------------------------- */
    update(match) {
      this.t++;
      const f = this.f, raw = { x: 0, y: 0 };
      for (const k in this.cool) if (this.cool[k] > 0) this.cool[k]--;
      const ph = match.phase;
      if (ph === 'countdown' || ph === 'sdintro' || ph === 'time' || f.state === ST.DEAD || f.eliminated) {
        this.queue = []; this.emit(raw); return;
      }
      const S = f.state;
      if (S === ST.RESPAWN) this.respawn(raw);
      else if (MASH_STATES.has(S)) this.mash(raw);
      else if (S === ST.HITSTUN || f.pendingLaunch) this.hitstun(raw);
      else if (S === ST.LEDGE) { this.queue = []; this.ledge(raw); }
      else if (S === ST.GRABHOLD) this.grabHold(raw);
      else if (this.offstage(f)) { this.queue = []; this.mode = 'recover'; this.recover(raw); }
      else if (this.queue.length) this.runQueue(raw);
      else {
        if (--this.thinkT <= 0) { this.thinkT = this.reaction + U.randi(0, 4); this.decide(raw); }
        if (this.queue.length) this.runQueue(raw); else this.continueHold(raw);
      }
      this.emit(raw);
    }

    /* --------------------------- UTILIDADES ------------------------------ */
    offstage(f) {
      const m = this.main;
      if (f.ground) return false;
      return f.x < m.x - 4 || f.x > m.x + m.w + 4 || f.y > m.y + 4;
    }
    isOffstage(t) { return !t.ground && this.offstage(t); }
    centerX() { return this.main.x + this.main.w / 2; }

    pickTarget() {
      const f = this.f;
      if (this.target && this.target.inPlay() && !this.target.hidden && --this.targetT > 0) return this.target;
      let best = null, bs = Infinity;
      for (const o of this.match.fighters) {
        if (o === f || !o.inPlay() || o.hidden) continue;
        let s = U.dist(f.x, f.y, o.x, o.y) - o.percent * 1.6 + Math.random() * 90;
        if (o.state === ST.RESPAWN) s += 600;
        if (o === this.target) s -= 70;
        if (s < bs) { bs = s; best = o; }
      }
      this.target = best; this.targetT = 40 + U.randi(0, 40);
      return best;
    }

    reach() {
      const pr = this.f.def.profile || {};
      const sword = pr.style === 'sword' ? 1.35 : 1;
      return (this.f.w * 0.5 + 34 * (pr.reach || 1) * sword) * (this.f.h / 80) * 0.95 + 14;
    }

    threat(t) {
      if (t.state !== ST.ATTACK || !t.move) return false;
      const d = t.move.def, a = d.act || [5, 12];
      if (t.move.frame > a[1]) return false;
      const dx = this.f.x - t.x;
      return Math.abs(dx) < 150 && Math.abs(this.f.y - t.y) < 110 && (Math.sign(dx) === t.facing || Math.abs(dx) < 50);
    }

    incomingProjectile() {
      const f = this.f;
      for (const p of this.match.projectiles) {
        if (!p.active || p.harmless || p.owner === f || p.windbox) continue;
        const d = U.dist(p.x, p.y, f.x, f.y - f.h / 2);
        if (d > 170) continue;
        const toward = Math.abs(p.vx) < 0.5 || Math.sign(p.vx) === Math.sign(f.x - p.x);
        if (toward) return p;
      }
      return null;
    }

    platformBelow(f, range) {
      for (const p of this.match.platforms()) {
        if (f.x < p.x || f.x > p.x + p.w) continue;
        const d = p.y - f.y;
        if (d >= -2 && d < range) return p;
      }
      return null;
    }

    /* Evita caminar fuera del escenario sin querer. */
    continueHold(raw) {
      const f = this.f, m = this.main;
      raw.x = this.hold.x || 0; raw.y = this.hold.y || 0;
      if (raw.x && f.ground === m) {
        const nx = f.x + raw.x * (30 + Math.abs(f.vx) * 6);
        if (nx < m.x + 16 || nx > m.x + m.w - 16) raw.x = 0;
      }
    }

    /* --------------------------- ESTADOS ESPECIALES ---------------------- */
    respawn(raw) {
      const f = this.f;
      if (f.stateTime === 1) this.waitT = U.randi(20, 110 - this.level * 8);
      if (f.stateTime > this.waitT) raw.x = Math.sign(this.centerX() - f.x) || 1;
    }

    mash(raw) {
      const every = Math.max(2, 10 - this.level);
      if (this.t % every === 0) raw[this.t % (every * 2) === 0 ? 'attack' : 'jump'] = true;
      raw.x = this.t % 4 < 2 ? 1 : -1;
    }

    hitstun(raw) {
      const f = this.f;
      this.queue = [];
      if (this.level >= 3 && this.chance(0.35 + this.skill * 0.6)) {
        raw.x = Math.sign(this.centerX() - f.x) * 0.7; raw.y = -0.7;
      }
      if (f.tumbling && this.level >= 4 && !f.ground) {
        const vy = f.vy + f.lvy;
        const below = this.platformBelow(f, 18 + Math.max(0, vy) * 3);
        if (below && vy > 0 && this.chance(0.15 + this.skill * 0.6)) raw.shield = true;
      }
    }

    ledge(raw) {
      const f = this.f;
      if (f.stateTime === 1 || this.waitT <= 0 && f.stateTime < 3) this.waitT = U.randi(8, Math.max(10, 50 - this.level * 4));
      if (f.stateTime < this.waitT) return;
      const foe = this.pickTarget();
      const near = foe && U.dist(foe.x, foe.y, f.x, f.y) < 130;
      const r = Math.random();
      if (near) { if (r < 0.45) raw.jump = true; else if (r < 0.8) raw.shield = true; else raw.attack = true; }
      else if (r < 0.5) raw.x = f.facing;
      else if (r < 0.75) raw.jump = true;
      else if (r < 0.9) raw.shield = true;
      else raw.attack = true;
      this.waitT = 0;
    }

    grabHold(raw) {
      const f = this.f, t = f.grabTarget;
      if (!t) return;
      if (f.stateTime === 1) { this.pummels = U.randi(0, 1 + Math.floor(this.level / 3)); this.waitT = U.randi(4, 14); }
      if (f.stateTime < this.waitT) return;
      if (this.pummels > 0) { if (f.pummelCD === 0 && f.stateTime % 2 === 0) { raw.attack = true; this.pummels--; } return; }
      const m = this.main;
      const toLeft = f.x - m.x, toRight = m.x + m.w - f.x;
      const edgeDir = toLeft < toRight ? -1 : 1;
      if (t.percent > 105 && this.chance(0.7)) raw.x = edgeDir;
      else if (t.percent < 60 && this.chance(0.5)) raw.y = -1;
      else if (this.chance(0.5)) raw.y = 1;
      else raw.x = edgeDir;
    }

    /* ---------------------- RECUPERACIÓN PRIORITARIA --------------------- */
    recover(raw) {
      const f = this.f, m = this.main, H = this.hint;
      const left = f.x < m.x + m.w / 2;
      const ledgeX = left ? m.x : m.x + m.w, ledgeY = m.y;
      const dir = left ? 1 : -1;
      const under = f.x > m.x - f.w * 0.5 && f.x < m.x + m.w + f.w * 0.5 && f.y > m.y;
      const outDx = (ledgeX - f.x) * dir;
      const below = f.y - ledgeY;
      const vy = f.vy + f.lvy;
      const falling = vy > -1.5;
      raw.x = under ? -dir : dir;
      if (f.state === ST.HELPLESS || (f.state === ST.ATTACK && f.move && f.move.def.key.indexOf('special') === 0)) {
        raw.x = under ? -dir : dir;
        if (f.move && f.move.def.key === 'special_side' && f.move.def.key && this.chance(0.3)) raw.special = true;
        return;
      }
      if (f.state === ST.AIRDODGE || f.state === ST.ATTACK) return;
      if (under && below < 240) return;
      const lowEnough = below > -30;
      const tooFar = outDx > 240;
      if (falling && f.jumpsLeft > 0 && (lowEnough || tooFar) && this.ready('rjump', 10)) { raw.jump = true; return; }
      const upUsed = f.airUsed['special_up'];
      if (!falling || f.jumpsLeft > 0) return;
      if (H.sideRecovery && !f.airUsed['special_side'] && outDx > 150 && below > -70 && below < 110) {
        raw.special = true; raw.x = dir; raw.y = 0; return;
      }
      if (!upUsed && (below > -10 || outDx > 180)) {
        raw.special = true;
        raw.y = -1;
        raw.x = outDx > 110 ? dir * 0.8 : dir * 0.25;
        if (outDx > 110) raw.y = -0.75;
      }
    }

    /* ------------------------------ DECISIÓN ----------------------------- */
    decide(raw) {
      const f = this.f, H = this.hint, sk = this.skill;
      const t = this.pickTarget();
      this.hold = { x: 0, y: 0 };
      if (!t) return;
      const dx = t.x - f.x, adx = Math.abs(dx), dy = t.y - f.y, dir = Math.sign(dx) || 1;

      /* Evadir / bloquear proyectiles. */
      const pr = this.incomingProjectile();
      if (pr && f.ground && this.chance(0.15 + sk * 0.65)) {
        this.mode = 'evade';
        if ((H.reflect || H.absorb) && this.chance(0.6)) return this.q([{ n: 1, tap: ['special'], y: 1 }, { n: 26 }]);
        if (this.chance(0.55)) return this.q([{ n: U.randi(12, 22), hold: ['shield'] }]);
        return this.q([{ n: 5, hold: ['jump'], x: dir }, { n: 10, x: dir }]);
      }

      /* Ataque cuerpo a cuerpo inminente: escudo, contra, rodar o saltar. */
      if (f.ground && this.threat(t) && this.chance(0.12 + sk * 0.6)) {
        this.mode = 'shield';
        if (H.counter && this.chance(0.35 + sk * 0.2)) return this.q([{ n: 1, tap: ['special'], y: 1 }, { n: 30 }]);
        const r = Math.random();
        if (r < 0.55) {
          const steps = [{ n: U.randi(8, 18), hold: ['shield'] }];
          if (sk > 0.4 && adx < 70 && this.chance(0.6)) steps.push({ n: 1, hold: ['shield'], tap: ['grab'] }, { n: 12 });
          return this.q(steps);
        }
        if (r < 0.8) return this.q([{ n: 2, hold: ['shield'], x: 0 }, { n: 1, hold: ['shield'], x: -dir }, { n: 26 }]);
        return this.q([{ n: 1, tap: ['jump'], x: -dir }, { n: 14, x: -dir }]);
      }

      /* Guardia de borde. */
      if (this.isOffstage(t) && f.ground) return this.edgeguard(t, dx, dir);

      /* En el aire sobre el escenario. */
      if (!f.ground) return this.airDecide(t, dx, dy, dir);

      /* Plataformas: bajar o subir. */
      if (f.ground.type === 'pass' && dy > 60 && adx < 260 && this.chance(0.7)) return this.q([{ n: 1, y: 0 }, { n: 1, y: 1 }, { n: 8, x: dir * 0.5 }]);
      if (dy < -90 && adx < 160 && this.chance(0.5 + sk * 0.3)) return this.jumpAttack(t, dir, true);

      /* Especiales de carácter: constructor, proyectiles, agarre de comando. */
      if (H.builder && f.meter >= 50 && adx > 260 && this.ready('turret', 700)) return this.q([{ n: 1, tap: ['special'], y: 1 }, { n: 34 }]);
      if (H.projectile && adx > 150 && adx < 560 && Math.abs(dy) < 90 && this.ready('proj', H.zoner ? 35 : 80) && this.chance(H.zoner ? 0.75 : 0.4)) {
        this.mode = 'space';
        return this.q([{ n: 1, x: dir * 0.4 }, { n: 1, tap: ['special'], x: 0 }, { n: 22, x: 0 }]);
      }

      const reach = this.reach();
      /* Perseguir / espaciar. */
      if (adx > reach + 8) {
        this.mode = 'chase';
        if (H.zoner && adx < 200 && this.chance(0.25)) { this.hold = { x: -dir * 0.5 }; return; }
        if (adx < 230 && adx > 90 && this.chance(0.18 + this.aggro * 0.25)) return this.jumpAttack(t, dir, false);
        if (adx > 120 && adx < 300 && this.chance(0.06 + this.aggro * 0.08) && this.safeAhead(dir, 140))
          return this.q([{ n: Math.max(1, Math.round((adx - 90) / 9)), x: dir }, { n: 1, tap: ['attack'], x: dir }, { n: 26 }]);
        this.hold = { x: dir };
        return;
      }

      /* Atacar. */
      if (this.chance(0.35 + this.aggro * 0.55)) return this.groundAttack(t, dx, dy, dir);
      this.hold = { x: this.chance(0.5) ? -dir * 0.5 : 0 };
    }

    safeAhead(dir, dist) {
      const m = this.main, nx = this.f.x + dir * dist;
      return nx > m.x + 20 && nx < m.x + m.w - 20;
    }

    groundAttack(t, dx, dy, dir) {
      const f = this.f, H = this.hint, sk = this.skill;
      this.mode = 'attack';
      const killPct = 100 + (t.weight() - 100) * 0.7;
      const steps = [];
      if (f.facing !== dir) steps.push({ n: 1, x: dir * 0.4 });
      const r = Math.random();
      if (t.isShielding() || (H.grappler && r < 0.3)) {
        if (H.grappler && this.chance(0.45)) steps.push(H.inhale ? { n: 36, hold: ['special'], x: 0 } : { n: 1, tap: ['special'], x: 0 }, { n: 40 });
        else steps.push({ n: 1, tap: ['grab'] }, { n: 24 });
        return this.q(steps);
      }
      if (dy < -40 && Math.abs(dx) < 60) {
        if (t.percent > killPct * 0.9 && this.chance(0.6)) steps.push({ n: U.randi(1, 2 + Math.round(12 * sk)), hold: ['smash'], y: -1 }, { n: 30 });
        else steps.push({ n: 1, tap: ['attack'], y: -1 }, { n: 20 });
        return this.q(steps);
      }
      if (t.percent > killPct && this.chance(0.35 + sk * 0.4)) {
        const charge = U.randi(1, 2 + Math.round(16 * sk));
        const down = this.chance(0.3);
        steps.push({ n: charge, hold: ['smash'], x: down ? 0 : dir, y: down ? 1 : 0 }, { n: 34 });
        return this.q(steps);
      }
      const opts = [
        () => steps.push({ n: 1, tap: ['attack'], x: 0 }, { n: 5 }, { n: 1, tap: ['attack'] }, { n: 5 }, { n: 1, tap: ['attack'] }, { n: 18 }),
        () => steps.push({ n: 1, tap: ['attack'], x: dir }, { n: 22 }),
        () => steps.push({ n: 1, tap: ['attack'], y: 1 }, { n: 16 }),
        () => steps.push({ n: 1, tap: ['grab'] }, { n: 24 }),
        () => { if (this.safeAhead(dir, 160)) steps.push({ n: 1, tap: ['special'], x: dir }, { n: 40 }); else steps.push({ n: 1, tap: ['attack'], x: dir }, { n: 22 }); },
        () => this.jumpAttack(t, dir, false, steps),
        () => steps.push({ n: 1, tap: ['special'], y: 1 }, { n: 40 })
      ];
      const weights = [3, 3, 2, 1.5 + (H.grappler ? 2 : 0), 1.2, 2 + this.aggro, H.counter || H.reflect || H.absorb ? 0.2 : 0.9];
      let sum = weights.reduce((a, b) => a + b, 0), pick = Math.random() * sum, idx = 0;
      for (; idx < weights.length; idx++) { pick -= weights[idx]; if (pick <= 0) break; }
      opts[Math.min(idx, opts.length - 1)]();
      if (!this.queue.length || steps.length) this.q(steps);
      return true;
    }

    jumpAttack(t, dir, full, into) {
      const f = this.f;
      const dy = t.y - f.y, adx = Math.abs(t.x - f.x);
      let ax = dir, ay = 0;
      if (dy < -60 && adx < 60) { ax = 0; ay = -1; }
      else if (adx < 30) { ax = 0; ay = 0; }
      const steps = into || [];
      steps.push(full ? { n: 5, hold: ['jump'], x: dir } : { n: 1, tap: ['jump'], x: dir });
      steps.push({ n: full ? 8 : 6, x: dir });
      steps.push({ n: 1, tap: ['attack'], x: ax, y: ay });
      if (this.chance(this.skill * 0.6)) steps.push({ n: 4, x: dir }, { n: 1, y: 1 }, { n: 14, x: dir * 0.3 });
      else steps.push({ n: 18, x: dir * 0.4 });
      if (!into) this.q(steps);
      return true;
    }

    airDecide(t, dx, dy, dir) {
      const f = this.f, adx = Math.abs(dx);
      this.mode = 'air';
      const d = U.dist(f.x, f.y - f.h / 2, t.x, t.y - t.h / 2);
      if (d < 70 + this.reach() * 0.6 && this.chance(0.5 + this.skill * 0.4)) {
        let x = 0, y = 0;
        if (adx < 26) y = dy < 0 ? -1 : 1;
        else x = dir;
        if (y > 0 && this.offstage({ ground: null, x: f.x, y: f.y + 200 })) { y = 0; x = dir; }
        return this.q([{ n: 1, tap: ['attack'], x, y }, { n: 14, x: dir * 0.3 }]);
      }
      if (dy < -80 && f.jumpsLeft > 0 && f.vy > -2 && adx < 160 && this.chance(0.25 + this.skill * 0.3)) return this.q([{ n: 1, tap: ['jump'], x: dir }, { n: 8, x: dir }]);
      this.hold = { x: dir };
      if (f.vy > 0 && dy > 40 && !f.fastFalling && this.chance(this.skill * 0.6)) return this.q([{ n: 1, y: 0, x: dir }, { n: 1, y: 1, x: dir }, { n: 6, x: dir }]);
    }

    edgeguard(t, dx, dir) {
      const f = this.f, m = this.main, H = this.hint;
      this.mode = 'edgeguard';
      const side = t.x < m.x + m.w / 2 ? -1 : 1;
      const edgeX = side < 0 ? m.x + 40 : m.x + m.w - 40;
      const toEdge = edgeX - f.x;
      if (Math.abs(toEdge) > 30) { this.hold = { x: Math.sign(toEdge) }; return; }
      if (f.facing !== side) return this.q([{ n: 1, x: side * 0.4 }, { n: 4 }]);
      if (H.projectile && Math.abs(t.y - f.y) < 140 && this.ready('eproj', 60) && this.chance(0.5)) return this.q([{ n: 1, tap: ['special'], x: 0 }, { n: 22 }]);
      if (t.state === ST.LEDGE && this.chance(0.25 + this.skill * 0.4)) return this.q([{ n: 1, tap: ['attack'], y: 1 }, { n: 18 }]);
      if (Math.abs(t.x - f.x) < 110 && t.y < f.y + 40 && this.chance(0.4 + this.skill * 0.3)) return this.q([{ n: U.randi(1, 8), hold: ['smash'], x: side }, { n: 30 }]);
      this.hold = { x: 0 };
    }
  }

  NX.BotController = BotController;
})(window.NX = window.NX || {});
