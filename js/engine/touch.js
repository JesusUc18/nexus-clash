/* ==========================================================================
 * NEXUS CLASH — js/engine/touch.js  (v5)
 * Detección de dispositivo (laptop/PC vs teléfono/tablet) y controles
 * táctiles: joystick virtual a la izquierda, botones de acción a la derecha
 * y botón de pausa. Escribe en el mismo formato crudo que teclado y gamepad.
 *
 * Modo táctil: AUTO (por defecto) · SÍ · NO  (pantalla REGLAS).
 * En AUTO se activa en dispositivos cuyo puntero principal es un dedo y,
 * además, cambia sobre la marcha: tocar la pantalla lo activa y usar el
 * teclado o un gamepad lo oculta (útil en laptops con pantalla táctil).
 * ========================================================================== */
(function (NX) {
  'use strict';

  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const hasTouch = () => ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  /* Teléfono/tablet: puntero principal grueso (dedo) y sin hover real.
   * iPadOS se presenta como Mac: se reconoce por los puntos táctiles. */
  function detectMobile() {
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) return true;
    if (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true;
    return mq('(pointer: coarse)') && !mq('(hover: hover)');
  }

  const Device = {
    mobile: detectMobile(),
    touchCapable: hasTouch(),
    lastInput: null,            // 'touch' | 'kb' | 'pad'
    get kind() { return this.mobile ? (Math.min(screen.width, screen.height) >= 600 ? 'tablet' : 'phone') : 'desktop'; }
  };

  /* --------------------------- ESTADO DE ENTRADA ------------------------- */
  const BTN_ACTIONS = ['attack', 'special', 'smash', 'shield', 'grab', 'jump'];
  const held = {}; const tapped = {};
  BTN_ACTIONS.forEach(a => { held[a] = 0; tapped[a] = false; });
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, R: 60 };

  let root = null, base = null, knob = null, pauseBtn = null, rotateEl = null;
  let active = false;           // capa visible (en combate)
  let enabled = false;          // modo táctil decidido (auto/manual)

  function mode() { return (NX.Settings && NX.Settings.touch) || 'auto'; }
  function computeEnabled() {
    const m = mode();
    if (m === 'on') return true;
    if (m === 'off') return false;
    if (Device.lastInput === 'touch') return true;
    if (Device.lastInput === 'kb' || Device.lastInput === 'pad') return false;
    return Device.mobile;
  }
  function refresh() {
    const was = enabled;
    enabled = computeEnabled();
    document.body.classList.toggle('touch-mode', enabled);
    document.body.classList.toggle('is-mobile', Device.mobile);
    if (root) root.classList.toggle('on', enabled && active);
    if (!enabled) resetAll();
    if (was !== enabled && NX.Camera && NX.Game && NX.Game.match) NX.Game.resize();
    if (was !== enabled && Touch.onChange) Touch.onChange(enabled);
  }

  function resetAll() {
    BTN_ACTIONS.forEach(a => { held[a] = 0; });
    stick.id = null; stick.x = stick.y = 0;
    if (root) root.querySelectorAll('.tbtn.down').forEach(b => b.classList.remove('down'));
    if (base) base.classList.remove('live');
    placeKnob(0, 0);
  }

  /* ------------------------------ CONSTRUCCIÓN --------------------------- */
  const BUTTONS = [
    // acción, etiqueta, subtítulo, clase de posición
    ['attack', 'A', 'ATAQUE', 'b-attack'],
    ['special', 'B', 'ESPECIAL', 'b-special'],
    ['jump', '▲', 'SALTO', 'b-jump'],
    ['smash', 'S', 'SMASH', 'b-smash'],
    ['shield', '◆', 'ESCUDO', 'b-shield'],
    ['grab', '✊', 'AGARRE', 'b-grab']
  ];

  function build() {
    root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = `
      <div class="t-zone t-left"><div class="t-stick"><div class="t-knob"></div></div></div>
      <div class="t-zone t-right">${BUTTONS.map(b => `<div class="tbtn ${b[3]}" data-a="${b[0]}"><b>${b[1]}</b><small>${b[2]}</small></div>`).join('')}</div>
      <button class="t-pause" aria-label="Pausa"><i></i><i></i></button>`;
    document.getElementById('app').appendChild(root);
    base = root.querySelector('.t-stick'); knob = root.querySelector('.t-knob');
    pauseBtn = root.querySelector('.t-pause');

    rotateEl = document.createElement('div');
    rotateEl.id = 'rotate-hint';
    rotateEl.innerHTML = '<div class="rh-phone"></div><b>GIRA TU DISPOSITIVO</b><small>Nexus Clash se juega en horizontal</small>';
    document.getElementById('app').appendChild(rotateEl);

    const left = root.querySelector('.t-left');
    left.addEventListener('pointerdown', stickDown, { passive: false });
    window.addEventListener('pointermove', stickMove, { passive: false });
    window.addEventListener('pointerup', stickUp);
    window.addEventListener('pointercancel', stickUp);

    root.querySelectorAll('.tbtn').forEach(b => {
      const a = b.dataset.a;
      const ids = new Set();
      const down = e => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch (_) { /* puntero ya liberado */ }
        ids.add(e.pointerId); held[a] = ids.size; tapped[a] = true; b.classList.add('down');
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) { /* sin vibración */ }
      };
      const up = e => {
        ids.delete(e.pointerId); held[a] = ids.size;
        if (!ids.size) b.classList.remove('down');
      };
      b.addEventListener('pointerdown', down, { passive: false });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
    });
    pauseBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (NX.Game) NX.Game.togglePause(); });
    root.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* -------------------------------- JOYSTICK ----------------------------- */
  function placeKnob(dx, dy) { if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`; }

  function stickDown(e) {
    if (stick.id !== null) return;
    e.preventDefault();
    stick.id = e.pointerId;
    /* Joystick flotante: la base aparece donde apoyas el pulgar. */
    const zone = e.currentTarget.getBoundingClientRect();
    stick.R = Math.max(36, base.offsetWidth * 0.42);
    const cx = Math.max(zone.left + stick.R, Math.min(zone.right - stick.R, e.clientX));
    const cy = Math.max(zone.top + stick.R, Math.min(zone.bottom - stick.R, e.clientY));
    stick.ox = cx; stick.oy = cy;
    base.style.left = (cx - zone.left) + 'px'; base.style.top = (cy - zone.top) + 'px';
    base.classList.add('live');
    stickMove(e);
  }
  function stickMove(e) {
    if (e.pointerId !== stick.id) return;
    e.preventDefault();
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy), R = stick.R;
    if (d > R) { dx *= R / d; dy *= R / d; }
    placeKnob(dx, dy);
    const nx = dx / R, ny = dy / R, mag = Math.min(1, d / R);
    if (mag < 0.18) { stick.x = 0; stick.y = 0; return; }
    /* Zona muerta por eje + ajuste a 8 direcciones cerca de los ejes. */
    stick.x = Math.abs(nx) < 0.3 ? 0 : nx;
    stick.y = Math.abs(ny) < 0.3 ? 0 : ny;
    if (mag > 0.85) {
      if (Math.abs(stick.x) > 0.38) stick.x = Math.sign(stick.x);
      if (Math.abs(stick.y) > 0.38) stick.y = Math.sign(stick.y);
    }
  }
  function stickUp(e) {
    if (e.pointerId !== stick.id) return;
    stick.id = null; stick.x = stick.y = 0;
    placeKnob(0, 0);
    base.classList.remove('live');
    base.style.left = ''; base.style.top = '';
  }

  /* ------------------------------ LECTURA -------------------------------- */
  function read() {
    if (!enabled || !active) return null;
    const out = { x: stick.x, y: stick.y, cx: 0, cy: 0, tapjump: stick.y < -0.8, pause: false };
    for (const a of BTN_ACTIONS) { out[a] = held[a] > 0 || tapped[a]; tapped[a] = false; }
    return out;
  }

  /* ------------------------------ PANTALLA ------------------------------- */
  function tryFullscreen() {
    if (!Device.mobile) return;
    const d = document.documentElement;
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const p = req.call(d, { navigationUI: 'hide' });
      const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (_) { /* sin bloqueo */ } };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (_) { /* pantalla completa no disponible (p. ej. iPhone) */ }
  }

  /* --------------------------- DETECCIÓN EN VIVO ------------------------- */
  function noteInput(kind) {
    if (Device.lastInput === kind) return;
    Device.lastInput = kind;
    if (mode() === 'auto') refresh();
  }
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.pointerType === 'pen') noteInput('touch'); }, true);
  window.addEventListener('touchstart', () => noteInput('touch'), { passive: true, capture: true });
  window.addEventListener('keydown', e => {
    const tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    noteInput('kb');
  }, true);
  window.addEventListener('gamepadconnected', () => noteInput('pad'));
  /* Evita el zoom por doble toque y el menú contextual largo en móviles. */
  document.addEventListener('dblclick', e => { if (Device.mobile) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  const Touch = {
    Device,
    onChange: null,
    init() { build(); refresh(); },
    read,
    refresh,
    tryFullscreen,
    get enabled() { return enabled; },
    setActive(on) { active = !!on; if (!active) resetAll(); if (root) root.classList.toggle('on', enabled && active); },
    noteInput,
    cycleMode(d) {
      const order = ['auto', 'on', 'off'];
      const i = order.indexOf(mode());
      NX.Settings.touch = order[(i + d + order.length) % order.length];
      refresh();
    },
    modeLabel() { const m = mode(); return m === 'on' ? 'SÍ' : m === 'off' ? 'NO' : 'AUTO · ' + (enabled ? 'TÁCTIL' : 'TECLADO'); }
  };

  NX.Device = Device;
  NX.Touch = Touch;
})(window.NX = window.NX || {});
