/* ==========================================================================
 * NEXUS CLASH — js/engine/combat.js
 * Hitboxes / Hurtboxes, escudos, agarres, proyectiles, reflectores,
 * contraataques, choques (clank), hitstun, hitlag y relámpago rojo de KO.
 * También contiene el sistema de partículas/efectos visuales.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U, P = NX.Physics, PHYS = NX.PHYS;

  const EFFECT_COLORS = {
    hit: ['#ffffff', '#fff3a0'], slash: ['#ffffff', '#bfe8ff'], fire: ['#ffb02e', '#ff4b1f'],
    elec: ['#fff36b', '#7fe9ff'], dark: ['#c46bff', '#40125e'], magic: ['#9ff4ff', '#ff8cf2'],
    water: ['#8fd8ff', '#2f7dff'], ice: ['#dff7ff', '#7cc8ff'], wind: ['#e8fff0', '#9affc8'],
    grab: ['#ffffff', '#cccccc'], heavy: ['#ffe28a', '#ff7a1a']
  };

  /* ============================== PROYECTILES ============================= */
  let PROJ_ID = 0;
  const PROJ_HOOKS = ['update', 'draw', 'onHit', 'onDestroy', 'onGround', 'onWall', 'onReflect', 'onShield'];
  class Projectile {
    constructor(match, owner, opts) {
      this.id = ++PROJ_ID;
      this.match = match; this.owner = owner;
      const o = {};
      for (const k in opts) {
        if (PROJ_HOOKS.indexOf(k) >= 0 && typeof opts[k] === 'function') this[k + '_'] = opts[k];
        else o[k] = opts[k];
      }
      Object.assign(this, {
        x: owner.x, y: owner.y - owner.h / 2, vx: 0, vy: 0, r: 10, life: 90, maxLife: o.life || 90,
        gravity: 0, maxFall: 12, dmg: 5, ang: 45, bkb: 30, kbg: 60, effect: 'hit', hitlag: 1,
        shieldDmg: 0, hits: 1, rehit: 0, reflectable: true, absorbable: true, destructible: true,
        bounce: 0, bounceDamp: 0.7, stageCollide: true, passCollide: false, pierce: false,
        color: owner.def.palette ? owner.def.palette.accent : '#fff', facing: owner.facing,
        unblockable: false, dir: null, transcendent: false, name: 'proj', spin: 0, t: 0,
        trail: 0, glow: true, scale: 1, data: {}
      }, o);
      this.active = true; this.hitSet = new Set(); this.reflected = 0; this.rehitTimer = 0;
      this.trailPts = [];
    }
    toBox() {
      return { owner: this.owner, def: this, x: this.x, y: this.y, r: this.r, set: this.hitSet, mult: 1, kind: 'proj', proj: this };
    }
    update() {
      if (!this.active) return;
      this.t++;
      if (this.rehit > 0 && ++this.rehitTimer >= this.rehit) { this.rehitTimer = 0; this.hitSet.clear(); }
      if (this.update_ && this.update_(this, this.match) === false) return;
      if (!this.active) return;
      this.vy = Math.min(this.vy + this.gravity, this.maxFall);
      const py = this.y;
      this.x += this.vx; this.y += this.vy;
      if (this.trail) { this.trailPts.push({ x: this.x, y: this.y }); if (this.trailPts.length > this.trail) this.trailPts.shift(); }
      if (this.stageCollide) this.collideStage(py);
      if (--this.life <= 0) this.destroy('expire');
      const b = this.match.blast;
      if (this.x < b.left - 200 || this.x > b.right + 200 || this.y > b.bottom + 200 || this.y < b.top - 400) this.destroy('out');
    }
    collideStage(py) {
      const plats = this.match.platforms();
      for (const p of plats) {
        if (p.type === 'pass') {
          if (!this.passCollide && !this.bounce) continue;
          if (this.vy > 0 && py + this.r <= p.y && this.y + this.r >= p.y && this.x > p.x && this.x < p.x + p.w) {
            if (this.hitGround(p)) return;
          }
          continue;
        }
        if (!P.circleRect(this.x, this.y, this.r, p.x, p.y, p.w, p.h)) continue;
        if (py + this.r <= p.y + 2 && this.vy >= 0) { if (this.hitGround(p)) return; continue; }
        if (this.onWall_) { this.onWall_(this, p); if (!this.active) return; continue; }
        if (this.bounce > 0) { this.vx = -this.vx * this.bounceDamp; this.x += this.vx * 2; this.bounce--; NX.Audio.play('block'); }
        else { this.destroy('stage'); return; }
      }
    }
    hitGround(p) {
      if (this.onGround_) { this.onGround_(this, p); return !this.active; }
      if (this.bounce > 0) {
        this.y = p.y - this.r; this.vy = -Math.abs(this.vy) * this.bounceDamp; this.bounce--;
        this.match.effects.spawn('dust', this.x, p.y, { n: 3 });
        return false;
      }
      this.destroy('stage');
      return true;
    }
    reflect(by, mult) {
      mult = mult || 1.5;
      this.owner = by; this.vx = -this.vx * 1.15; this.vy = -this.vy * 0.5;
      this.facing = U.sign(this.vx);
      this.dmg = Math.min(50, this.dmg * mult);
      this.hitSet.clear(); this.reflected++;
      this.life = Math.max(this.life, 60);
      if (this.onReflect_) this.onReflect_(this, by);
      this.match.effects.spawn('ring', this.x, this.y, { color: '#7ff', r: 30 });
      NX.Audio.play('reflect');
    }
    destroy(reason) {
      if (!this.active) return;
      this.active = false;
      if (this.onDestroy_) this.onDestroy_(this, reason, this.match);
      else if (reason !== 'out') this.match.effects.spawn('pop', this.x, this.y, { color: this.color, r: this.r });
    }
    draw(ctx) {
      if (!this.active) return;
      if (this.trailPts.length > 1) {
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 1; i < this.trailPts.length; i++) {
          const a = this.trailPts[i - 1], b = this.trailPts[i], k = i / this.trailPts.length;
          ctx.strokeStyle = U.rgba(this.color.startsWith('#') ? this.color : '#ffffff', k * 0.6);
          ctx.lineWidth = this.r * 1.6 * k;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.restore();
      }
      if (this.draw_) { this.draw_(ctx, this); return; }
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.glow) { ctx.globalAlpha = 0.3; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, this.r * 1.9, 0, U.TAU); ctx.fill(); ctx.globalAlpha = 1; }
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, this.r);
      g.addColorStop(0, '#fff'); g.addColorStop(0.45, this.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, this.r * 1.2, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
  }

  /* ============================== EFECTOS ================================= */
  class Effects {
    constructor(match) { this.match = match; this.list = []; this.screen = []; }
    spawn(type, x, y, o) {
      o = o || {};
      const L = this.list;
      switch (type) {
        case 'spark': {
          const n = o.n || 8, cols = EFFECT_COLORS[o.effect || 'hit'] || EFFECT_COLORS.hit;
          const pow = o.power || 1;
          L.push({ type: 'burst', x, y, life: 10, max: 10, r: 14 * pow, color: cols[0] });
          for (let i = 0; i < n; i++) {
            const a = Math.random() * U.TAU, sp = U.rand(3, 9) * pow;
            L.push({ type: 'streak', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.randi(8, 16), max: 16, len: U.rand(8, 18) * pow, color: cols[i % 2] });
          }
          if (o.effect === 'fire') for (let i = 0; i < 8; i++) this.spawn('flame', x + U.rand(-10, 10), y + U.rand(-10, 10));
          if (o.effect === 'elec') L.push({ type: 'zap', x, y, life: 12, max: 12, r: 30 * pow });
          if (o.effect === 'dark') for (let i = 0; i < 6; i++) L.push({ type: 'wisp', x, y, vx: U.rand(-3, 3), vy: U.rand(-3, 1), life: 30, max: 30, size: U.rand(6, 12), color: '#8a3cff' });
          if (o.effect === 'slash') L.push({ type: 'cut', x, y, a: Math.random() * Math.PI, life: 10, max: 10, len: 46 * pow });
          break;
        }
        case 'flame': L.push({ type: 'flame', x, y, vx: U.rand(-1, 1), vy: U.rand(-3, -1), life: U.randi(14, 26), max: 26, size: U.rand(5, 11) * (o.scale || 1) }); break;
        case 'ring': L.push({ type: 'ring', x, y, life: o.life || 14, max: o.life || 14, r: o.r || 30, color: o.color || '#fff', w: o.w || 4 }); break;
        case 'pop': L.push({ type: 'ring', x, y, life: 10, max: 10, r: (o.r || 10) * 2, color: o.color || '#fff', w: 3 }); break;
        case 'dust':
          for (let i = 0; i < (o.n || 5); i++) L.push({ type: 'dust', x: x + U.rand(-8, 8), y: y - 3, vx: U.rand(-2, 2) + (o.vx || 0), vy: U.rand(-1.5, -0.2), life: U.randi(16, 28), max: 28, size: U.rand(5, 10) * (o.scale || 1) });
          break;
        case 'bolt': L.push({ type: 'bolt', x, y, x2: o.x2, y2: o.y2, life: o.life || 10, max: o.life || 10, color: o.color || '#7fe9ff', w: o.w || 3 }); break;
        case 'shockwave': L.push({ type: 'wave', x, y, life: 18, max: 18, r: o.r || 120, color: o.color || '#fff' }); break;
        case 'star': L.push({ type: 'star', x, y, life: o.life || 60, max: o.life || 60, follow: o.follow, phase: Math.random() * U.TAU }); break;
        case 'debris':
          for (let i = 0; i < (o.n || 8); i++) L.push({ type: 'debris', x, y, vx: U.rand(-5, 5), vy: U.rand(-8, -2), life: 40, max: 40, size: U.rand(4, 9), color: o.color || '#7a5a3a', rot: Math.random() * 6 });
          break;
        case 'water':
          for (let i = 0; i < (o.n || 6); i++) L.push({ type: 'drop', x, y, vx: (o.vx || 0) + U.rand(-1.5, 1.5), vy: (o.vy || 0) + U.rand(-1.5, 1.5), life: 24, max: 24, size: U.rand(3, 6) });
          break;
        case 'feather':
          L.push({ type: 'feather', x, y, vx: U.rand(-1, 1), vy: U.rand(0.3, 1.2), life: 70, max: 70, rot: Math.random() * 6, color: o.color || '#111' });
          break;
        case 'sparkle': L.push({ type: 'sparkle', x: x + U.rand(-14, 14), y: y + U.rand(-14, 14), life: 16, max: 16, color: o.color || '#fff' }); break;
        case 'text': L.push({ type: 'text', x, y, vy: -1, life: 50, max: 50, text: o.text, color: o.color || '#fff', size: o.size || 22 }); break;
        case 'explosion':
          L.push({ type: 'boom', x, y, life: 26, max: 26, r: o.r || 70 });
          for (let i = 0; i < 14; i++) this.spawn('flame', x + U.rand(-o.r / 2 || -30, o.r / 2 || 30), y + U.rand(-20, 20), { scale: 1.6 });
          this.spawn('debris', x, y, { n: 8, color: '#555' });
          break;
        case 'blast': {
          /* Rayo de KO en la Blast Zone, orientado hacia el centro. */
          L.push({ type: 'blast', x, y, life: 70, max: 70, angle: o.angle, color: o.color || '#fff' });
          break;
        }
        case 'flash': this.screen.push({ type: 'flash', life: o.life || 8, max: o.life || 8, color: o.color || '#fff', alpha: o.alpha || 0.6 }); break;
        case 'lightning': {
          const bolts = [];
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * U.TAU + U.rand(-0.2, 0.2);
            const pts = []; let r = 20;
            while (r < 1400) { pts.push({ a: a + U.rand(-0.12, 0.12), r }); r += U.rand(40, 110); }
            bolts.push(pts);
          }
          this.screen.push({ type: 'lightning', wx: x, wy: y, life: o.life || 28, max: o.life || 28, bolts });
          break;
        }
        case 'speedlines': this.screen.push({ type: 'speedlines', life: o.life || 30, max: o.life || 30, color: o.color || '#fff' }); break;
        default: break;
      }
    }
    update() {
      for (const p of this.list) {
        p.life--;
        if (p.vx != null) { p.x += p.vx; p.y += p.vy; }
        switch (p.type) {
          case 'streak': p.vx *= 0.82; p.vy *= 0.82; break;
          case 'dust': p.vx *= 0.92; p.size *= 1.02; break;
          case 'flame': p.vy -= 0.08; p.size *= 0.96; break;
          case 'debris': p.vy += 0.4; p.rot += 0.2; break;
          case 'drop': p.vy += 0.35; break;
          case 'feather': p.vx = Math.sin(p.life * 0.1) * 1.2; p.rot += 0.05; break;
          case 'wisp': p.vy -= 0.05; break;
          case 'star': if (p.follow) { p.x = p.follow.x; p.y = p.follow.y - p.follow.h - 8; } break;
          default: break;
        }
      }
      this.list = this.list.filter(p => p.life > 0);
      for (const s of this.screen) s.life--;
      this.screen = this.screen.filter(s => s.life > 0);
    }
    draw(ctx) {
      for (const p of this.list) {
        const k = p.life / p.max;
        ctx.save();
        switch (p.type) {
          case 'burst':
            ctx.globalAlpha = k; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - k), 0, U.TAU); ctx.fill(); break;
          case 'streak':
            ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = 3 * k + 1; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            { const m = Math.hypot(p.vx, p.vy) || 1; ctx.lineTo(p.x - p.vx / m * p.len, p.y - p.vy / m * p.len); }
            ctx.stroke(); break;
          case 'cut':
            ctx.globalAlpha = k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * k + 1;
            ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.a) * p.len, p.y - Math.sin(p.a) * p.len);
            ctx.lineTo(p.x + Math.cos(p.a) * p.len, p.y + Math.sin(p.a) * p.len); ctx.stroke(); break;
          case 'zap':
            ctx.globalAlpha = k; ctx.strokeStyle = '#fff36b'; ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
              ctx.beginPath(); ctx.moveTo(p.x, p.y);
              let a = Math.random() * U.TAU, x = p.x, y = p.y;
              for (let j = 0; j < 4; j++) { x += Math.cos(a) * p.r / 4 + U.rand(-6, 6); y += Math.sin(a) * p.r / 4 + U.rand(-6, 6); ctx.lineTo(x, y); }
              ctx.stroke();
            }
            break;
          case 'bolt': {
            const n = 7, pts = [];
            for (let i = 0; i <= n; i++) {
              const t = i / n, j = (i === 0 || i === n) ? 0 : U.rand(-14, 14);
              pts.push([p.x + (p.x2 - p.x) * t + j, p.y + (p.y2 - p.y) * t + j]);
            }
            ctx.globalAlpha = Math.min(1, k * 1.5); ctx.lineJoin = 'round';
            for (let pass = 0; pass < 2; pass++) {
              ctx.strokeStyle = pass ? '#ffffff' : p.color; ctx.lineWidth = pass ? p.w * 0.5 : p.w * 2.4;
              if (!pass) ctx.globalAlpha *= 0.6;
              ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
              ctx.globalAlpha = Math.min(1, k * 1.5);
            }
            break;
          }
          case 'ring':
            ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = p.w * k + 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.2 - k * 0.8), 0, U.TAU); ctx.stroke(); break;
          case 'wave':
            ctx.globalAlpha = k * 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 6 * k;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (1 - k) + 10, (p.r * (1 - k) + 10) * 0.22, 0, 0, U.TAU); ctx.stroke(); break;
          case 'dust':
            ctx.globalAlpha = k * 0.55; ctx.fillStyle = '#d9d2c5';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill(); break;
          case 'flame': {
            ctx.globalAlpha = Math.min(1, k * 1.4);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffae2a'); g.addColorStop(1, 'rgba(255,60,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill(); break;
          }
          case 'wisp':
            ctx.globalAlpha = k * 0.7; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, U.TAU); ctx.fill(); break;
          case 'star': {
            const n = 3;
            for (let i = 0; i < n; i++) {
              const a = p.phase + (p.max - p.life) * 0.15 + i * U.TAU / n;
              drawStar(ctx, p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 6, 6, '#ffe14d');
            }
            break;
          }
          case 'debris':
            ctx.globalAlpha = Math.min(1, k * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size); break;
          case 'drop':
            ctx.globalAlpha = k; ctx.fillStyle = '#8fd8ff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill(); break;
          case 'feather':
            ctx.globalAlpha = Math.min(1, k * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0, 0, 3, 10, 0, 0, U.TAU); ctx.fill(); break;
          case 'sparkle':
            ctx.globalAlpha = k; drawStar(ctx, p.x, p.y, 7 * k + 2, p.color, 4); break;
          case 'text':
            ctx.globalAlpha = Math.min(1, k * 2); ctx.font = `900 ${p.size}px "Barlow Condensed", Impact, sans-serif`;
            ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); break;
          case 'boom': {
            const r = p.r * (1.3 - k * 0.6);
            ctx.globalAlpha = k;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ffe066'); g.addColorStop(0.7, '#ff5a1f'); g.addColorStop(1, 'rgba(80,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, U.TAU); ctx.fill(); break;
          }
          case 'blast': {
            ctx.translate(p.x, p.y); ctx.rotate(p.angle);
            const len = 1500 * Math.min(1, (p.max - p.life) / 8 + 0.2), wid = 240 * k + 30;
            ctx.globalAlpha = Math.min(1, k * 1.5);
            const g = ctx.createLinearGradient(0, 0, len, 0);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(0, -wid * 0.15); ctx.lineTo(len, -wid); ctx.lineTo(len, wid); ctx.lineTo(0, wid * 0.15); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = k; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(0, -wid * 0.05); ctx.lineTo(len * 0.7, -wid * 0.25); ctx.lineTo(len * 0.7, wid * 0.25); ctx.lineTo(0, wid * 0.05); ctx.closePath(); ctx.fill();
            break;
          }
          default: break;
        }
        ctx.restore();
      }
    }
    /* Efectos en espacio de pantalla (flash, relámpago rojo, líneas de velocidad). */
    drawScreen(ctx, w, h, cam) {
      for (const s of this.screen) {
        const k = s.life / s.max;
        ctx.save();
        if (s.type === 'flash') {
          ctx.globalAlpha = k * s.alpha; ctx.fillStyle = s.color; ctx.fillRect(0, 0, w, h);
        } else if (s.type === 'lightning') {
          const c = cam.worldToScreen(s.wx, s.wy);
          ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#300'; ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = Math.min(1, k * 1.6);
          for (const bolt of s.bolts) {
            ctx.strokeStyle = 'rgba(255,30,30,.35)'; ctx.lineWidth = 22 * k + 4; ctx.lineJoin = 'miter';
            ctx.beginPath(); ctx.moveTo(c.x, c.y);
            for (const pt of bolt) ctx.lineTo(c.x + Math.cos(pt.a) * pt.r, c.y + Math.sin(pt.a) * pt.r);
            ctx.stroke();
            ctx.strokeStyle = '#ff2020'; ctx.lineWidth = 9 * k + 2;
            ctx.beginPath(); ctx.moveTo(c.x, c.y);
            for (const pt of bolt) ctx.lineTo(c.x + Math.cos(pt.a) * pt.r, c.y + Math.sin(pt.a) * pt.r);
            ctx.stroke();
            ctx.strokeStyle = '#ffd0d0'; ctx.lineWidth = 2.5 * k + 0.5;
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 220);
          g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * k) + ')'); g.addColorStop(1, 'rgba(255,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        } else if (s.type === 'speedlines') {
          ctx.globalAlpha = k * 0.5; ctx.strokeStyle = s.color; ctx.lineWidth = 2;
          for (let i = 0; i < 40; i++) {
            const a = Math.random() * U.TAU, r0 = Math.min(w, h) * U.rand(0.35, 0.5), r1 = Math.max(w, h);
            ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
            ctx.lineTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1); ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }

  function drawStar(ctx, x, y, r, color, points) {
    points = points || 5;
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * 0.45 : r, a = i * Math.PI / points - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ============================== COMBATE ================================= */
  class Combat {
    constructor(match) { this.match = match; }

    update() {
      const m = this.match;
      const fighters = m.fighters.filter(f => f.inPlay());
      const boxes = [];
      for (const f of fighters) f.collectHitboxes(boxes);
      for (const p of m.projectiles) if (p.active && p.dmg > 0 && !p.harmless) boxes.push(p.toBox());

      this.processReflectAbsorb(fighters);
      this.processProjectileClash();
      this.processClanks(boxes);

      for (const box of boxes) {
        if (box.cancelled) continue;
        if (box.kind === 'proj' && !box.proj.active) continue;
        for (const t of fighters) {
          if (t === box.owner || !t.canBeHit(box)) continue;
          if (box.set.has(t.uid)) continue;
          if (box.def.filter && !box.def.filter(box.owner, t)) continue;
          const hr = t.hurtRect();
          if (!P.circleRect(box.x, box.y, box.r, hr.x, hr.y, hr.w, hr.h)) continue;
          this.resolveHit(box, t);
          if (box.kind === 'proj' && !box.proj.active) break;
          if (box.owner.move && box.owner.move.cancelHits) break;
        }
      }
      this.processGrabs(fighters);
    }

    processReflectAbsorb(fighters) {
      for (const p of this.match.projectiles) {
        if (!p.active) continue;
        for (const f of fighters) {
          if (f === p.owner) continue;
          const rf = f.reflector;
          if (rf && p.reflectable) {
            const c = f.localToWorld(rf.x || 0, rf.y == null ? -f.h / 2 : rf.y);
            if (P.circleCircle(c.x, c.y, rf.r || 40, p.x, p.y, p.r)) {
              p.reflect(f, rf.mult || 1.5);
              if (rf.onReflect) rf.onReflect(f, p);
              break;
            }
          }
          const ab = f.absorber;
          if (ab && p.absorbable) {
            const c = f.localToWorld(ab.x || 0, ab.y == null ? -f.h / 2 : ab.y);
            if (P.circleCircle(c.x, c.y, ab.r || 40, p.x, p.y, p.r)) {
              const heal = p.dmg * (ab.mult || 1.6);
              f.percent = Math.max(0, f.percent - heal);
              this.match.effects.spawn('ring', p.x, p.y, { color: '#8ff', r: 26 });
              NX.Audio.play('heal');
              p.destroy('absorbed');
              if (ab.onAbsorb) ab.onAbsorb(f, p);
              break;
            }
          }
        }
      }
    }

    processProjectileClash() {
      const ps = this.match.projectiles.filter(p => p.active && p.destructible && !p.transcendent);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (!a.active || !b.active || a.owner === b.owner) continue;
        if (!P.circleCircle(a.x, a.y, a.r, b.x, b.y, b.r)) continue;
        const diff = a.dmg - b.dmg;
        this.match.effects.spawn('spark', (a.x + b.x) / 2, (a.y + b.y) / 2, { n: 6 });
        NX.Audio.play('clank');
        if (Math.abs(diff) < 3) { a.destroy('clash'); b.destroy('clash'); }
        else if (diff > 0) { a.dmg -= b.dmg * 0.5; b.destroy('clash'); }
        else { b.dmg -= a.dmg * 0.5; a.destroy('clash'); }
      }
    }

    processClanks(boxes) {
      const melee = boxes.filter(b => b.kind === 'melee' && !b.def.transcendent && b.owner.ground);
      for (let i = 0; i < melee.length; i++) for (let j = i + 1; j < melee.length; j++) {
        const a = melee[i], b = melee[j];
        if (a.owner === b.owner || a.cancelled || b.cancelled) continue;
        if (!P.circleCircle(a.x, a.y, a.r, b.x, b.y, b.r)) continue;
        if (a.set.has(b.owner.uid) || b.set.has(a.owner.uid)) continue;
        const da = a.def.dmg * a.mult, db = b.def.dmg * b.mult;
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        this.match.effects.spawn('spark', cx, cy, { n: 10, power: 1.2 });
        NX.Audio.play('clank');
        if (Math.abs(da - db) < 9) {
          a.cancelled = b.cancelled = true;
          a.owner.rebound(); b.owner.rebound();
        } else if (da > db) { b.cancelled = true; b.owner.rebound(); }
        else { a.cancelled = true; a.owner.rebound(); }
      }
    }

    resolveHit(box, target) {
      const atk = box.owner, d = box.def;
      box.set.add(target.uid);
      if (target.counterWin && !d.unblockable && !d.windbox) {
        const cw = target.counterWin;
        target.triggerCounter(atk, box);
        if (box.kind === 'proj' && cw.destroyProjectiles !== false) box.proj.destroy('countered');
        return;
      }
      if (d.windbox) { this.applyWind(atk, target, d, box); return; }
      if (target.isShielding() && !d.unblockable) { this.shieldHit(box, target); return; }
      this.applyHit(atk, target, d, { mult: box.mult, x: box.x, y: box.y, projectile: box.proj || null, box });
      if (box.kind === 'proj') {
        const pr = box.proj;
        if (pr.onHit_) pr.onHit_(pr, target, this.match);
        if (!pr.pierce && --pr.hits <= 0) pr.destroy('hit');
      }
    }

    applyWind(atk, target, d, box) {
      const dir = box.proj ? U.sign(box.proj.vx || box.proj.facing) : atk.facing;
      const push = d.push || 3, cap = Math.abs(push);
      target.lvx = U.clamp(target.lvx + dir * push * 0.35, -cap, cap);
      if (d.lift) target.lvy = Math.min(target.lvy, -d.lift);
      if (target.ground && d.lift) target.leaveGround();
      this.match.effects.spawn('water', box.x, box.y, { n: 2, vx: dir * 2 });
      box.set.delete(target.uid);
    }

    shieldHit(box, target) {
      const atk = box.owner, d = box.def;
      const dmg = d.dmg * (box.mult || 1);
      const sd = dmg * (d.shieldMult || 1) + (d.shieldDmg || 0);
      target.shieldHP -= sd;
      const dir = box.proj ? U.sign(box.proj.vx || box.proj.facing) : U.sign(target.x - atk.x);
      if (d.shieldBreak || target.shieldHP <= 0) {
        target.breakShield();
        if (box.kind === 'proj' && !box.proj.pierce) box.proj.destroy('shield');
        return;
      }
      const hl = Math.floor(P.hitlagFrames(dmg, d.hitlag) * 0.67);
      target.hitlag = Math.max(target.hitlag, hl);
      target.enterShieldStun(Math.floor(dmg * 0.8 + 2));
      target.lvx = dir * Math.min(7, 0.1 * dmg + 0.8);
      if (box.kind === 'melee') { atk.hitlag = Math.max(atk.hitlag, hl); if (atk.ground) atk.lvx = -dir * Math.min(4, 0.05 * dmg + 0.4); }
      const c = target.shieldCenter();
      this.match.effects.spawn('ring', c.x, c.y, { color: target.color, r: target.shieldRadius() * 1.1, w: 6 });
      NX.Audio.play('shieldHit');
      if (atk.move && atk.move.def.onShieldHit) atk.move.def.onShieldHit(atk, target, atk.move);
      if (box.kind === 'proj') {
        if (box.proj.onShield_) box.proj.onShield_(box.proj, target);
        if (!box.proj.pierce) box.proj.destroy('shield');
      }
    }

    /* Aplica un golpe directamente (también usado por agarres, lanzamientos
     * y contraataques de los luchadores). */
    applyHit(atk, target, d, o) {
      o = o || {};
      const m = this.match;
      let dmg = (d.dmg || 0) * (o.mult || 1);
      if (atk && !o.raw) dmg *= atk.damageMultiplier(d, o);
      dmg = target.modifyIncomingDamage(dmg, atk, d);
      dmg = Math.max(0, Math.round(dmg * 10) / 10);
      target.addDamage(dmg, atk);

      let kb = d.fkb != null ? d.fkb : P.calcKnockback(target.percent, dmg, target.weight(), d.kbg == null ? 100 : d.kbg, d.bkb || 0);
      if (atk && d.fkb == null) kb *= atk.knockbackMultiplier(d, target);
      kb *= target.incomingKBMultiplier(d);

      const grounded = !!target.ground;
      let ang = d.ang == null ? 361 : d.ang;
      if (ang === 361) ang = P.sakuraiAngle(kb, grounded);

      let dir;
      if (o.dir != null) dir = o.dir;
      else if (d.dir === 'auto') dir = U.sign(target.x - (o.x != null ? o.x : atk.x));
      else if (o.projectile) dir = U.sign(o.projectile.dir != null ? o.projectile.dir : (o.projectile.vx || o.projectile.facing));
      else dir = (atk ? atk.facing : 1) * (d.reverse ? -1 : 1);

      const effect = d.effect || 'hit';
      const hl = P.hitlagFrames(dmg, (d.hitlag == null ? 1 : d.hitlag) * (effect === 'elec' ? 1.5 : 1));
      const hx = o.x != null ? o.x : target.x, hy = o.y != null ? o.y : target.y - target.h / 2;

      if (atk) {
        atk.stats.damageDealt += dmg;
        target.lastAttacker = atk; target.lastAttackerTimer = 360;
        if (!o.projectile && !o.noStale && atk.move) atk.registerStale(atk.move.def.key);
      }

      const armor = target.armorThreshold(d);
      if (armor > 0 && kb <= armor && !d.unarmorable) {
        target.hitlag = Math.max(target.hitlag, Math.floor(hl * 0.7));
        if (atk && !o.projectile) atk.hitlag = Math.max(atk.hitlag, Math.floor(hl * 0.7));
        m.effects.spawn('spark', hx, hy, { effect, n: 5, power: 0.8 });
        target.flashArmor = 10;
        NX.Audio.play('hit', { dmg: dmg * 0.6, effect });
        if (atk && atk.move && atk.move.def.onHit) atk.move.def.onHit(atk, target, atk.move, { armored: true });
        return { armored: true, dmg, kb };
      }

      let v = P.launchVelocity(kb, ang, dir);
      if (grounded && v.vy > 0 && !d.bury) v.vy = -v.vy * 0.8;

      const hitstun = Math.floor(P.hitstunFrames(kb) * (d.hitstunMult == null ? 1 : d.hitstunMult));
      target.receiveHit({ attacker: atk, def: d, kb, vx: v.vx, vy: v.vy, hitlag: hl, hitstun, dmg, effect, ang, noDI: d.noDI });

      if (atk && !o.projectile && !o.noAttackerLag) atk.hitlag = Math.max(atk.hitlag, hl);
      if (atk) atk.onHitConfirm(target, d, o);
      if (d.burn) target.applyBurn(d.burn.frames || 120, d.burn.dmg || 1, atk, d.burn.kind);
      if (d.stun) target.pendingStun = d.stun;
      if (d.bury && grounded) target.pendingBury = d.bury === true ? 40 + target.percent * 0.4 : d.bury;
      if (d.meteor || (ang > 225 && ang < 315)) target.meteorFlag = true;

      m.effects.spawn('spark', hx, hy, { effect, n: 6 + Math.floor(dmg / 2), power: 0.7 + Math.min(1.6, kb / 120) });
      if (kb > 90) m.effects.spawn('ring', hx, hy, { r: 40 + kb * 0.2, color: '#fff' });
      m.camera.shake(Math.min(22, kb / 10));
      NX.Audio.play(dmg < 3 ? 'weak' : 'hit', { dmg, effect });

      if (kb > 50 && !target.isEliminatingFreeze && P.predictLethal(target, v.vx, v.vy, m)) m.onLethalHit(target, atk, kb);
      if (atk && atk.move && atk.move.def.onHit && !o.skipMoveHook) atk.move.def.onHit(atk, target, atk.move, { dmg, kb });
      return { dmg, kb, vx: v.vx, vy: v.vy };
    }

    processGrabs(fighters) {
      for (const f of fighters) {
        if (!f.move || f.move.grabbed) continue;
        const gbs = f.activeGrabBoxes();
        if (!gbs.length) continue;
        let done = false;
        for (const g of gbs) {
          for (const t of fighters) {
            if (t === f || !t.canBeGrabbed(g)) continue;
            const hr = t.hurtRect();
            if (!P.circleRect(g.x, g.y, g.r, hr.x, hr.y, hr.w, hr.h)) continue;
            f.move.grabbed = t;
            NX.Audio.play('grab');
            if (g.def.command && f.move.def.onGrab) f.move.def.onGrab(f, t, f.move);
            else f.beginGrabHold(t);
            done = true; break;
          }
          if (done) break;
        }
      }
    }
  }

  NX.Projectile = Projectile;
  NX.Effects = Effects;
  NX.Combat = Combat;
  NX.EFFECT_COLORS = EFFECT_COLORS;
  NX.drawStar = drawStar;
})(window.NX = window.NX || {});
