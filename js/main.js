/* ==========================================================================
 * NEXUS CLASH — js/main.js
 * Inicialización, bucle principal de paso fijo a 60 FPS con
 * requestAnimationFrame y gestor de estados del juego.
 * Estados: boot → title → menú → selección → escenario → match → results.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const STEP = 1000 / 60;

  /* Ajustes persistentes (vidas, tiempo, música, narrador). */
  const DEFAULT_SETTINGS = { stocks: 3, minutes: 7, music: true, narrator: true, touch: 'auto', touchSize: 'm', haptics: true };
  NX.Settings = Object.assign({}, DEFAULT_SETTINGS);
  try { const raw = window.localStorage && localStorage.getItem('nexusclash.settings'); if (raw) Object.assign(NX.Settings, JSON.parse(raw)); } catch (e) { /* almacenamiento no disponible */ }
  NX.saveSettings = function () { try { localStorage.setItem('nexusclash.settings', JSON.stringify(NX.Settings)); } catch (e) { /* almacenamiento no disponible */ } };

  const Game = {
    state: 'boot', match: null, setup: null, paused: false,
    canvas: null, ctx: null, dpr: 1, W: 1280, H: 720,
    acc: 0, last: 0, frame: 0, resultsTimer: 0, fps: 60, fpsAcc: 0, fpsFrames: 0,

    init() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      NX.HUD.init();
      if (NX.Touch) NX.Touch.init();
      NX.Menus.init(this);
      NX.Audio.setMusic(NX.Settings.music);
      NX.Audio.setNarrator(NX.Settings.narrator);
      const missing = this.missingModules();
      if (missing.length) console.warn('[NEXUS CLASH] Módulos pendientes:', missing.join(', '));
      this.state = 'menu';
      NX.Menus.show('title', null, true);
      requestAnimationFrame(t => { this.last = t; this.loop(t); });
    },

    /* Comprueba que los módulos de las Partes 2 y 3 estén cargados. */
    missingModules() {
      const out = [];
      if (!NX.ROSTER || NX.ROSTER.length < 2) out.push('Luchadores · js/fighters/lib.js + js/fighters/roster/');
      if (!NX.STAGES || !NX.STAGES.length) out.push('Escenarios · js/stages/stages.js (Parte 3)');
      if (!NX.BotController) out.push('IA de bots · js/engine/ai.js (Parte 3)');
      return out;
    },

    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = window.innerWidth; this.H = window.innerHeight;
      this.canvas.width = Math.floor(this.W * this.dpr);
      this.canvas.height = Math.floor(this.H * this.dpr);
      this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
      if (this.match) this.match.camera.resize(this.W, this.H);
    },

    startMatch(setup) {
      setup.rules = { stocks: NX.Settings.stocks, minutes: NX.Settings.minutes };
      this.setup = setup;
      this.paused = false;
      const begin = () => {
        NX.Menus.hideAll();
        this.match = new NX.Match(setup.mode === 'horde' ? this.hordeConfig(setup) : setup);
        this.match.camera.resize(this.W, this.H);
        this.match.camera.snap(this.match);
        this.match.on('finish', () => { this.resultsTimer = 40; });
        NX.HUD.build(this.match);
        NX.HUD.show();
        if (NX.Touch) NX.Touch.setActive(true);
        this.state = 'match';
        this.resultsTimer = 0;
        NX.Audio.playMusic('battle');
      };
      if (this.state === 'match') { NX.Menus.wipe(); setTimeout(begin, 300); }
      else { NX.Menus.wipe(); NX.Menus.locked = true; setTimeout(() => { begin(); NX.Menus.locked = false; }, 320); }
    },

    /* v8 · HORDA: el jugador elegido contra un primer rival aleatorio. */
    hordeConfig(setup) {
      const p1 = setup.players[0];
      const pool = (NX.ROSTER || []).filter(d => d.id !== p1.fighterId);
      const first = (pool.length ? NX.U.pick(pool) : NX.ROSTER[0]).id;
      return { mode: 'horde', stageId: setup.stageId, rules: setup.rules,
        players: [{ fighterId: p1.fighterId, human: true, level: 0 }, { fighterId: first, human: false, level: NX.hordeLevel(1) }] };
    },

    togglePause(forceOff) {
      if (this.state !== 'match' || !this.match || this.match.over) return;
      if (this.paused || forceOff) {
        if (!this.paused) return;
        this.paused = false; NX.Menus.hidePause();
        if (window.speechSynthesis) window.speechSynthesis.resume();
      } else {
        this.paused = true; NX.Menus.showPause(); NX.Audio.play('menuSelect');
      }
    },

    quitToMenu(screen, data) {
      this.match = null; this.state = 'menu'; this.paused = false;
      NX.HUD.hide();
      if (NX.Touch) NX.Touch.setActive(false);
      NX.Audio.playMusic('menu');
      NX.Menus.show(screen || 'main', data);
    },

    showResults() {
      const res = this.match.result;
      this.state = 'results';
      NX.HUD.hide();
      if (NX.Touch) NX.Touch.setActive(false);
      NX.Menus.show('results', res);
      this.lastResult = res;
      this.matchForBg = this.match;
      this.match = null;
    },

    loop(t) {
      let dt = t - this.last; this.last = t;
      if (dt > 250) dt = 250;
      this.acc += dt;
      this.fpsAcc += dt; this.fpsFrames++;
      if (this.fpsAcc >= 1000) { this.fps = this.fpsFrames; this.fpsAcc = 0; this.fpsFrames = 0; }
      let steps = 0;
      while (this.acc >= STEP && steps < 5) { this.tick(); this.acc -= STEP; steps++; }
      if (steps >= 5) this.acc = 0;
      this.render();
      requestAnimationFrame(tt => this.loop(tt));
    },

    tick() {
      this.frame++;
      NX.Input.pollMenuPad();
      if (this.state === 'match' && this.match) {
        if (!this.paused) {
          this.match.update();
          NX.HUD.update(this.match);
          if (this.match.over && this.resultsTimer > 0 && --this.resultsTimer === 0) this.showResults();
        }
      } else {
        NX.Menus.tick();
      }
    },

    render() {
      const ctx = this.ctx, W = this.W, H = this.H, dpr = this.dpr;
      if (this.state === 'match' && this.match) {
        this.match.draw(ctx, W, H, dpr);
        if (this.paused) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
        return;
      }
      this.drawMenuBackground(ctx, W, H, dpr);
    },

    /* Fondo animado de menús: franjas diagonales y partículas. */
    drawMenuBackground(ctx, W, H, dpr) {
      const t = this.frame;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0b0b0f'); g.addColorStop(0.55, '#16161d'); g.addColorStop(1, '#2a0508');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(-0.42);
      const span = Math.hypot(W, H);
      for (let i = -8; i < 9; i++) {
        const off = ((t * 1.2 + i * 160) % (160 * 17)) - 160 * 8.5;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(230,20,40,.10)' : 'rgba(255,255,255,.025)';
        ctx.fillRect(off, -span, i % 3 === 0 ? 70 : 24, span * 2);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = 0; i < 60; i++) {
        const x = (i * 97.3 + t * (0.3 + (i % 5) * 0.15)) % W, y = (i * 53.7 + Math.sin(t * 0.01 + i) * 20 + H) % H;
        ctx.globalAlpha = 0.15 + (i % 4) * 0.1;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  };

  NX.Game = Game;
  window.addEventListener('DOMContentLoaded', () => Game.init());
})(window.NX = window.NX || {});
