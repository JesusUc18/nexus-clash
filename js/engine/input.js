/* ==========================================================================
 * NEXUS CLASH — js/engine/input.js
 * Teclado (WASD/Flechas + J K U L I Espacio) y Gamepad (navigator.getGamepads).
 * Cada luchador lee un InputState; humanos y bots escriben en el mismo formato.
 * ========================================================================== */
(function (NX) {
  'use strict';

  const ACTIONS = ['attack', 'special', 'smash', 'shield', 'grab', 'jump', 'tapjump', 'pause'];
  const BUFFER = 8;

  class InputState {
    constructor() {
      this.x = 0; this.y = 0;          // stick principal [-1..1] (y+ = abajo)
      this.cx = 0; this.cy = 0;        // stick C (smash directo)
      this.px = 0; this.py = 0;        // valores del frame anterior
      this.held = {}; this.prev = {}; this.buffer = {};
      this.tapDown = 0; this.tapSide = 0; this.tapSideDir = 0; this.cTap = 0;
      this.mashCount = 0;
      ACTIONS.forEach(a => { this.held[a] = false; this.prev[a] = false; this.buffer[a] = 0; });
    }
    /* Aplica la lectura cruda del frame y calcula flancos y buffer. */
    commit(raw) {
      this.px = this.x; this.py = this.y;
      this.x = raw.x || 0; this.y = raw.y || 0;
      const pcx = this.cx, pcy = this.cy;
      this.cx = raw.cx || 0; this.cy = raw.cy || 0;
      let anyNew = false;
      for (const a of ACTIONS) {
        this.prev[a] = this.held[a];
        this.held[a] = !!raw[a];
        if (this.held[a] && !this.prev[a]) { this.buffer[a] = BUFFER; anyNew = true; }
        else if (this.buffer[a] > 0) this.buffer[a]--;
      }
      if (this.y > 0.5 && this.py <= 0.5) { this.tapDown = 4; anyNew = true; } else if (this.tapDown > 0) this.tapDown--;
      if (Math.abs(this.x) > 0.5 && Math.abs(this.px) <= 0.5) { this.tapSide = 4; this.tapSideDir = Math.sign(this.x); anyNew = true; }
      else if (this.tapSide > 0) this.tapSide--;
      const cMag = Math.max(Math.abs(this.cx), Math.abs(this.cy));
      if (cMag > 0.6 && Math.max(Math.abs(pcx), Math.abs(pcy)) <= 0.6) this.cTap = BUFFER;
      else if (this.cTap > 0) this.cTap--;
      this.mashCount = anyNew ? this.mashCount + 1 : this.mashCount;
      this.mashed = anyNew;
    }
    pressed(a) { return this.buffer[a] > 0; }
    isHeld(a) { return !!this.held[a]; }
    consume(a) { this.buffer[a] = 0; if (a === 'smash') this.cTap = 0; }
    clearBuffers() { for (const a of ACTIONS) this.buffer[a] = 0; this.tapDown = 0; this.tapSide = 0; this.cTap = 0; }
    /* Dirección dominante: 'up' | 'down' | 'side' | 'neutral'. */
    dir(useC) {
      const x = useC ? this.cx : this.x, y = useC ? this.cy : this.y;
      if (Math.abs(y) >= 0.5 && Math.abs(y) >= Math.abs(x)) return y < 0 ? 'up' : 'down';
      if (Math.abs(x) >= 0.5) return 'side';
      return 'neutral';
    }
    smashPressed() { return this.pressed('smash') || this.cTap > 0; }
  }

  /* --------------------------- TECLADO ---------------------------------- */
  const keys = new Set();
  const tapped = new Set();   // teclas pulsadas y soltadas entre dos frames (no se pierden)
  const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
  const menuListeners = new Set();

  function menuEventFromKey(code) {
    switch (code) {
      case 'ArrowUp': case 'KeyW': return 'up';
      case 'ArrowDown': case 'KeyS': return 'down';
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'Enter': case 'KeyJ': case 'Space': return 'confirm';
      case 'Backspace': case 'KeyK': return 'back';
      case 'KeyP': return 'pause';
      case 'KeyR': return 'rules';
      default: return null;
    }
  }

  window.addEventListener('keydown', e => {
    /* Escribiendo en un campo de texto (p. ej. la contraseña del ZIP): no es juego. */
    const tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    if (BLOCK.has(e.code)) e.preventDefault();
    const fresh = !keys.has(e.code);
    keys.add(e.code); tapped.add(e.code);
    if (NX.Audio) NX.Audio.unlock();
    if (fresh) {
      const ev = menuEventFromKey(e.code);
      if (ev) menuListeners.forEach(fn => fn(ev, 'kb', e));
      if (e.code === 'Escape') menuListeners.forEach(fn => fn('escape', 'kb', e));
      if (e.code === 'KeyM' && NX.Audio) NX.Audio.toggleMute();
    }
  }, { passive: false });
  window.addEventListener('keyup', e => { keys.delete(e.code); });
  window.addEventListener('blur', () => { keys.clear(); tapped.clear(); });
  window.addEventListener('pointerdown', () => { if (NX.Audio) NX.Audio.unlock(); });

  function readKeyboard() {
    const k = c => keys.has(c) || tapped.has(c);
    const walk = k('ShiftLeft') || k('ShiftRight') ? 0.5 : 1;
    const left = k('KeyA') || k('ArrowLeft'), right = k('KeyD') || k('ArrowRight');
    const up = k('KeyW') || k('ArrowUp'), down = k('KeyS') || k('ArrowDown');
    const out = {
      x: ((right ? 1 : 0) - (left ? 1 : 0)) * walk,
      y: (down ? 1 : 0) - (up ? 1 : 0),
      cx: 0, cy: 0,
      attack: k('KeyJ'), special: k('KeyK'), smash: k('KeyU'),
      shield: k('KeyL'), grab: k('KeyI'), jump: k('Space'), tapjump: up,
      pause: k('Escape') || k('KeyP')
    };
    tapped.clear();
    return out;
  }

  /* --------------------------- GAMEPAD ---------------------------------- */
  const DEAD = 0.25;
  const dz = v => (Math.abs(v) < DEAD ? 0 : v);
  let padPrev = {};

  function firstPad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) return pads[i];
    return null;
  }

  function readGamepad() {
    const p = firstPad();
    if (!p) return null;
    const b = i => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
    let x = dz(p.axes[0] || 0), y = dz(p.axes[1] || 0);
    if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
    return {
      x, y, cx: dz(p.axes[2] || 0), cy: dz(p.axes[3] || 0),
      attack: b(0), special: b(1), jump: b(2) || b(3), shield: b(4) || b(6),
      grab: b(5), smash: b(7), tapjump: y < -0.7, pause: b(9)
    };
  }

  /* Eventos de menú desde gamepad (flancos). */
  function pollMenuPad() {
    const p = firstPad();
    if (!p) { padPrev = {}; return; }
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const now = {
      up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6,
      confirm: b(0), back: b(1), pause: b(9)
    };
    for (const k in now) if (now[k] && !padPrev[k]) menuListeners.forEach(fn => fn(k, 'pad'));
    padPrev = now;
  }

  /* Controlador humano: combina teclado + gamepad. */
  class HumanController {
    constructor(fighter) { this.fighter = fighter; this.human = true; }
    update() {
      const kb = readKeyboard();
      const gp = readGamepad();
      const raw = Object.assign({}, kb);
      const tc = NX.Touch && NX.Touch.read();
      if (tc) {
        if (Math.abs(tc.x) > Math.abs(raw.x)) raw.x = tc.x;
        if (Math.abs(tc.y) > Math.abs(raw.y)) raw.y = tc.y;
        for (const a of ACTIONS) raw[a] = raw[a] || tc[a];
      }
      if (gp) {
        if (Math.abs(gp.x) > Math.abs(raw.x)) raw.x = gp.x;
        if (Math.abs(gp.y) > Math.abs(raw.y)) raw.y = gp.y;
        raw.cx = gp.cx; raw.cy = gp.cy;
        for (const a of ACTIONS) raw[a] = raw[a] || gp[a];
      }
      this.fighter.input.commit(raw);
    }
  }

  NX.InputState = InputState;
  NX.Input = {
    HumanController,
    readKeyboard,
    readGamepad,
    pollMenuPad,
    isDown(code) { return keys.has(code); },
    onMenu(fn) { menuListeners.add(fn); return () => menuListeners.delete(fn); },
    hasGamepad() { return !!firstPad(); }
  };
})(window.NX = window.NX || {});
