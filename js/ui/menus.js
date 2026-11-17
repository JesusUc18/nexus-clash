/* ==========================================================================
 * NEXUS CLASH — js/ui/menus.js
 * Pantalla de título, menú principal, selector de modo, selección de
 * personajes con fichas móviles (arrastrables), selección de escenario,
 * controles, pausa y pantalla de victoria/resultados.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  const TIME_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0];
  const fmtMin = m => (m ? m + ':00' : '∞');
  function rulesHTML() {
    const S = NX.Settings;
    return `<span class="chip"><b>${S.stocks}</b> ${S.stocks === 1 ? 'VIDA' : 'VIDAS'}</span><span class="chip"><b>${fmtMin(S.minutes)}</b> ${S.minutes ? 'MIN' : 'TIEMPO'}</span><span class="chip chip-red">SIN OBJETOS</span>`;
  }

  const Menus = {
    init(game) {
      this.game = game;
      this.root = document.getElementById('screens');
      this.trans = document.getElementById('transition');
      this.screen = null; this.locked = false; this.anim = []; this.tickN = 0;
      NX.Input.onMenu((ev, src, e) => this.onInput(ev, src, e));
      window.addEventListener('resize', () => { if (this.screen === 'select') this.layoutTokens(); });
    },

    /* --------------------------- TRANSICIONES ---------------------------- */
    show(name, data, instant) {
      const build = () => {
        this.root.innerHTML = ''; this.anim = []; this.focusables = []; this.focusIdx = 0;
        this.screen = name; this.data = data;
        this.root.className = 'screens on scr-' + name;
        this['build_' + name](data);
        this.refreshFocus();
      };
      if (instant) { build(); return; }
      this.locked = true;
      this.trans.classList.remove('go'); void this.trans.offsetWidth; this.trans.classList.add('go');
      setTimeout(build, 320);
      setTimeout(() => { this.locked = false; }, 640);
    },
    hideAll() {
      this.root.innerHTML = ''; this.root.className = 'screens'; this.screen = null; this.anim = [];
    },
    wipe() { this.trans.classList.remove('go'); void this.trans.offsetWidth; this.trans.classList.add('go'); },

    /* ------------------------------ FOCO --------------------------------- */
    setFocusables(list, horizontal) { this.focusables = list; this.focusHorizontal = !!horizontal; this.focusIdx = 0; this.refreshFocus(); },
    refreshFocus() { (this.focusables || []).forEach((b, i) => b.classList.toggle('focus', i === this.focusIdx)); },
    moveFocus(d) {
      if (!this.focusables || !this.focusables.length) return;
      let i = this.focusIdx;
      for (let k = 0; k < this.focusables.length; k++) {
        i = (i + d + this.focusables.length) % this.focusables.length;
        if (!this.focusables[i].disabled) break;
      }
      this.focusIdx = i; this.refreshFocus(); NX.Audio.play('menuMove');
    },

    onInput(ev) {
      if (this.game.state === 'match' && this.screen !== 'pause') {
        if (ev === 'pause' || ev === 'escape') this.game.togglePause();
        return;
      }
      if (!this.screen || this.locked) return;
      if (this.screen === 'select') { this.selectInput(ev); return; }
      if (this.screen === 'title') { if (ev === 'confirm') this.titleGo(); return; }
      if (this.screen === 'rules') { this.rulesInput(ev); return; }
      if (this.screen === 'pause' && (ev === 'pause' || ev === 'escape')) { this.game.togglePause(); return; }
      const fwd = this.focusHorizontal ? 'right' : 'down', back = this.focusHorizontal ? 'left' : 'up';
      if (ev === fwd) this.moveFocus(1);
      else if (ev === back) this.moveFocus(-1);
      else if (ev === 'confirm') { const b = this.focusables && this.focusables[this.focusIdx]; if (b && !b.disabled) b.click(); }
      else if (ev === 'back' || ev === 'escape') { if (this.onBack) this.onBack(); }
    },

    /* ------------------------------ TÍTULO ------------------------------- */
    build_title() {
      const s = el('div', 'scr scr-title');
      s.innerHTML = `
        <div class="slash s1"></div><div class="slash s2"></div><div class="slash s3"></div>
        <div class="logo">
          <div class="logo-emblem"><span></span><span></span><span></span></div>
          <div class="logo-a">NEXUS</div><div class="logo-b">CLASH</div>
          <div class="logo-sub">ULTIMATE ARENA · V5</div>
        </div>
        <div class="press"><span class="kb-only">PULSA <b>ENTER</b> O HAZ CLIC PARA EMPEZAR</span><span class="touch-only"><b>TOCA</b> LA PANTALLA PARA EMPEZAR</span></div>
        <div class="title-foot"><span class="kb-only">Teclado · Gamepad · Pulsa <b>M</b> para silenciar</span><span class="touch-only">Controles táctiles activados · Juega en horizontal</span></div>`;
      s.addEventListener('click', () => this.titleGo());
      this.root.appendChild(s);
      this.onBack = null;
    },
    titleGo() {
      if (this.locked) return;
      NX.Audio.unlock(); NX.Audio.play('menuSelect');
      if (NX.Touch && NX.Touch.enabled) NX.Touch.tryFullscreen();
      NX.Audio.playMusic('menu');
      this.show('main');
    },

    /* --------------------------- MENÚ PRINCIPAL -------------------------- */
    build_main() {
      const missing = this.game.missingModules();
      const s = el('div', 'scr scr-main');
      s.innerHTML = `
        <div class="main-head"><div class="mh-k">MENÚ PRINCIPAL</div><div class="mh-rules">${rulesHTML()}</div></div>
        <div class="main-tiles"></div>
        <div class="main-foot"><span class="kb-only">WASD / Flechas mover · Espacio saltar · J ataque · U smash · K especial · L escudo · I agarre</span><span class="touch-only">Joystick a la izquierda · A ataque · B especial · ▲ salto · S smash · ◆ escudo · ✊ agarre</span></div>`;
      const tiles = s.querySelector('.main-tiles');
      const mk = (cls, k, d, act) => {
        const b = el('button', 'mbtn tile ' + cls, `<span class="tile-k">${k}</span><span class="tile-d">${d}</span>`);
        b.addEventListener('click', () => { NX.Audio.play('menuSelect'); act(); });
        b.addEventListener('mouseenter', () => { this.focusIdx = this.focusables.indexOf(b); this.refreshFocus(); });
        tiles.appendChild(b); return b;
      };
      const list = [];
      const b1 = mk('tile-red', '1 VS 1', 'Tú contra un CPU · Dificultad nivel 1 a 9', () => this.show('select', { mode: '1v1' }));
      const b2 = mk('tile-black', 'BATALLA CAMPAL', 'Tú contra 3 CPUs · Todos contra todos', () => this.show('select', { mode: 'ffa' }));
      const S = NX.Settings;
      const bR = mk('tile-white tile-rules', 'REGLAS', `${S.stocks} ${S.stocks === 1 ? 'vida' : 'vidas'} · ${fmtMin(S.minutes)} · audio`, () => this.show('rules', { back: 'main' }));
      const b3 = mk('tile-white', 'CONTROLES', 'Teclado, gamepad y táctil', () => this.show('controls'));
      list.push(b1, b2, bR, b3);
      if (NX.Packager) list.push(mk('tile-white tile-zip', 'DESCARGAR .ZIP', '🔒 Protegido con contraseña', () => NX.Packager.download()));
      if (missing.length) {
        b1.disabled = b2.disabled = true;
        const m = el('div', 'missing', `<b>PROYECTO INCOMPLETO</b> · Faltan módulos: ${missing.join(' · ')}`);
        s.appendChild(m);
      }
      this.root.appendChild(s);
      this.setFocusables(list);
      if (b1.disabled) { this.focusIdx = 2; this.refreshFocus(); }
      this.onBack = () => { NX.Audio.play('menuBack'); this.show('title'); };
    },

    /* ------------------------------ CONTROLES ---------------------------- */
    build_controls() {
      const s = el('div', 'scr scr-controls');
      const rows = [
        ['Mover / Dirección', 'WASD o Flechas', 'Stick izq. / D-Pad', 'Joystick (mitad izquierda)'],
        ['Caminar', 'Mantener Shift + dirección', 'Stick a medias', 'Joystick a medias'],
        ['Saltar (doble salto en el aire)', 'Espacio o W / ↑', 'X / Y', '▲ o joystick arriba'],
        ['Caída rápida', 'Pulsar ↓ en el aire', 'Stick ↓', 'Joystick ↓'],
        ['Ataque normal / Tilts / Aéreos', 'J (+ dirección)', 'A', 'A (+ joystick)'],
        ['Ataque Smash cargable', 'U + dirección (mantener para cargar)', 'RT o Stick derecho', 'S + joystick (mantener)'],
        ['Especiales (Neutral, Lateral, Arriba, Abajo)', 'K (+ dirección)', 'B', 'B (+ joystick)'],
        ['Escudo / Esquiva / Esquiva aérea', 'L (+ dirección para rodar)', 'LB / LT', '◆ (+ joystick)'],
        ['Agarre (luego dirección para lanzar, J golpea)', 'I', 'RB', '✊'],
        ['Soltarse de agarres / aturdimientos', 'Pulsar teclas rápidamente', 'Machacar botones', 'Tocar botones rápido'],
        ['Bordes: subir / saltar / atacar / rodar / soltar', '→ / Espacio / J / L / ↓', 'Igual', 'Igual'],
        ['Pausa', 'Esc o P', 'Start', '❚❚ (arriba a la izquierda)'],
        ['Silenciar audio', 'M', '—', 'REGLAS → MÚSICA']
      ];
      s.innerHTML = `<div class="sel-header"><div class="sel-title">CONTROLES</div><div class="sel-rules">${rulesHTML()}</div></div>
        <div class="ctrl-wrap"><table class="ctrl-table"><thead><tr><th>Acción</th><th>Teclado</th><th>Gamepad</th><th>Táctil</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td><kbd>${r[1]}</kbd></td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
      const back = el('button', 'mbtn back-btn', '◄ VOLVER');
      back.addEventListener('click', () => { NX.Audio.play('menuBack'); this.show('main'); });
      s.appendChild(back);
      this.root.appendChild(s);
      this.setFocusables([back]);
      this.onBack = () => back.click();
    },

    /* ------------------------------ REGLAS ------------------------------- */
    build_rules(data) {
      this.rulesData = data || { back: 'main' };
      const s = el('div', 'scr scr-rules');
      s.innerHTML = `
        <div class="sel-header"><div class="sel-title">REGLAS</div><div class="sel-mode">SIN OBJETOS · COMPETITIVO</div><div class="sel-rules"></div></div>
        <div class="rules-wrap"><div class="rules-list"></div>
          <div class="rules-help"><span class="kb-only">↑↓ elegir · ←→ cambiar · Enter alternar · Esc volver</span><span class="touch-only">Toca ◄ ► para cambiar cada opción</span></div></div>
        <button class="back-mini">◄ VOLVER <span class="kb-only">(Esc)</span></button>`;
      this.root.appendChild(s);
      this.rulesEl = s;
      const list = s.querySelector('.rules-list');
      const S = NX.Settings;
      const rows = [
        { label: 'VIDAS', desc: 'Stocks por jugador (1 a 9)', val: () => S.stocks + (S.stocks === 1 ? ' VIDA' : ' VIDAS'), change: d => { S.stocks = U.clamp(S.stocks + d, 1, 9); } },
        { label: 'TIEMPO', desc: 'Límite de combate (∞ = sin límite)', val: () => fmtMin(S.minutes), change: d => { const i = Math.max(0, TIME_STEPS.indexOf(S.minutes)); S.minutes = TIME_STEPS[(i + d + TIME_STEPS.length) % TIME_STEPS.length]; } },
        { label: 'MÚSICA', desc: 'Pistas sintetizadas', val: () => (S.music ? 'SÍ' : 'NO'), change: () => { S.music = !S.music; NX.Audio.setMusic(S.music); } },
        { label: 'NARRADOR', desc: 'Voz del anunciador', val: () => (S.narrator ? 'SÍ' : 'NO'), change: () => { S.narrator = !S.narrator; NX.Audio.setNarrator(S.narrator); } },
        { label: 'CONTROLES TÁCTILES', desc: 'Auto: se activan en teléfono/tablet o al tocar la pantalla', val: () => (NX.Touch ? NX.Touch.modeLabel() : 'NO'), change: d => { if (NX.Touch) NX.Touch.cycleMode(d); } },
        { label: 'RESTABLECER', desc: 'Reglamento competitivo: 3 vidas · 7:00', val: () => '↺', change: () => { S.stocks = 3; S.minutes = 7; } }
      ];
      this.ruleRows = rows.map((r, i) => {
        const row = el('div', 'rule-row');
        row.innerHTML = `<div class="rule-l"><b>${r.label}</b><small>${r.desc}</small></div>
          <div class="rule-ctrl"><button class="rule-btn" data-d="-1">◄</button><span class="rule-val"></span><button class="rule-btn" data-d="1">►</button></div>`;
        row.querySelectorAll('.rule-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.ruleIdx = i; this.changeRule(Number(b.dataset.d)); }));
        row.addEventListener('click', () => { this.ruleIdx = i; this.changeRule(1); });
        row.addEventListener('mouseenter', () => { this.ruleIdx = i; this.refreshRules(); });
        list.appendChild(row);
        return { r, row, v: row.querySelector('.rule-val') };
      });
      this.ruleIdx = 0;
      s.querySelector('.back-mini').addEventListener('click', () => this.rulesBack());
      this.refreshRules();
    },
    changeRule(d) {
      const R = this.ruleRows[this.ruleIdx];
      R.r.change(d);
      NX.saveSettings();
      NX.Audio.play('menuMove');
      R.row.classList.remove('bump'); void R.row.offsetWidth; R.row.classList.add('bump');
      this.refreshRules();
    },
    refreshRules() {
      this.ruleRows.forEach((R, i) => { R.v.textContent = R.r.val(); R.row.classList.toggle('focus', i === this.ruleIdx); });
      this.rulesEl.querySelector('.sel-rules').innerHTML = rulesHTML();
    },
    rulesInput(ev) {
      const n = this.ruleRows.length;
      if (ev === 'up') { this.ruleIdx = (this.ruleIdx - 1 + n) % n; NX.Audio.play('menuMove'); this.refreshRules(); }
      else if (ev === 'down') { this.ruleIdx = (this.ruleIdx + 1) % n; NX.Audio.play('menuMove'); this.refreshRules(); }
      else if (ev === 'left') this.changeRule(-1);
      else if (ev === 'right' || ev === 'confirm') this.changeRule(1);
      else if (ev === 'back' || ev === 'escape') this.rulesBack();
    },
    rulesBack() {
      NX.Audio.play('menuBack');
      const d = this.rulesData || {};
      if (d.back === 'select') this.show('select', { mode: d.mode, keep: true });
      else this.show('main');
    },

    /* ------------------------ SELECCIÓN DE PERSONAJES -------------------- */
    build_select(data) {
      const mode = data.mode;
      const roster = NX.ROSTER || [];
      const prev = this.game.setup && this.game.setup.mode === mode ? this.game.setup : null;
      const nCpu = mode === 'ffa' ? 3 : 1;
      this.sel = {
        mode, cursor: 0, dragging: null,
        slots: [{ human: true, fighterId: prev ? prev.players[0].fighterId : null, level: 0, color: NX.SLOT_COLORS[0], tag: 'P1' }]
      };
      for (let i = 0; i < nCpu; i++) {
        const pp = prev && prev.players[i + 1];
        this.sel.slots.push({ human: false, fighterId: pp ? pp.fighterId : U.pick(roster).id, level: pp ? pp.level : 5, color: NX.SLOT_COLORS[i + 1], tag: 'CPU' + (nCpu > 1 ? (i + 2) : '') });
      }
      if (data.keep && this.selMemo) this.selMemo.forEach((m, i) => { if (this.sel.slots[i]) { this.sel.slots[i].fighterId = m.fighterId; if (!this.sel.slots[i].human) this.sel.slots[i].level = m.level; } });
      if (this.sel.slots[0].fighterId) this.sel.cursor = Math.max(0, roster.findIndex(r => r.id === this.sel.slots[0].fighterId));

      const s = el('div', 'scr scr-select');
      s.innerHTML = `
        <div class="sel-header">
          <div class="sel-title">ELIGE A TU LUCHADOR</div>
          <div class="sel-mode">${mode === 'ffa' ? 'BATALLA CAMPAL · 4 JUGADORES' : '1 VS 1 · COMPETITIVO'}</div>
          <div class="sel-rules">${rulesHTML()}</div>
          <button class="rules-btn">⚙ REGLAS <small class="kb-only">(R)</small></button>
        </div>
        <div class="sel-grid"></div>
        <div class="sel-cards"></div>
        <div class="sel-tokens"></div>
        <div class="ready-bar"><div class="rb-in"><span>¡LISTOS PARA LUCHAR!</span><small><span class="kb-only">ENTER / CLIC</span><span class="touch-only">TOCA AQUÍ</span></small></div></div>
        <button class="back-mini">◄ VOLVER <span class="kb-only">(Esc)</span></button>`;
      this.root.appendChild(s);
      this.selEl = s;
      const grid = s.querySelector('.sel-grid');
      grid.style.setProperty('--cols', roster.length > 16 ? Math.ceil(roster.length / 2) : 8);
      this.cells = roster.map((d, i) => {
        const c = el('div', 'cell');
        c.dataset.idx = i;
        c.style.setProperty('--fc', NX.Render.resolveDef(d).palette.primary);
        if (d.forms) c.appendChild(el('div', 'cell-forms', '⇄ ' + d.forms.length));
        const cv = el('canvas', 'cell-art'); cv.width = 160; cv.height = 120;
        NX.Render.drawPortrait(cv, d);
        c.append(cv, el('div', 'cell-name', d.name.toUpperCase()), el('div', 'cell-num', String(i + 1).padStart(2, '0')));
        c.addEventListener('mouseenter', () => { if (!this.sel.slots[0].fighterId || this.sel.dragging) { this.sel.cursor = i; this.updateSelect(); } });
        c.addEventListener('click', () => { if (this.sel.justDropped) return; this.sel.cursor = i; this.assign(0, d.id); });
        grid.appendChild(c);
        return c;
      });
      const cards = s.querySelector('.sel-cards');
      this.cards = this.sel.slots.map((slot, i) => {
        const c = el('div', 'card' + (slot.human ? ' human' : ' cpu'));
        c.style.setProperty('--pc', slot.color);
        const art = el('canvas', 'card-art'); art.width = 240; art.height = 260;
        c.innerHTML = `<div class="card-tag">${slot.tag}</div>`;
        c.appendChild(art);
        c.appendChild(el('div', 'card-name', '—'));
        c.appendChild(el('div', 'card-title', ''));
        c.appendChild(el('div', 'card-passive', ''));
        const ctrl = el('div', 'card-ctrl');
        if (slot.human) ctrl.innerHTML = '<span>JUGADOR</span>';
        else {
          ctrl.innerHTML = `<button class="lv-btn" data-d="-1">−</button><span class="lv">CPU NV <b>${slot.level}</b></span><button class="lv-btn" data-d="1">+</button>`;
          ctrl.querySelectorAll('.lv-btn').forEach(b => b.addEventListener('click', e => {
            e.stopPropagation(); slot.level = U.clamp(slot.level + Number(b.dataset.d), 1, 9);
            ctrl.querySelector('b').textContent = slot.level; NX.Audio.play('menuMove');
          }));
          const r = el('button', 'rand-btn', 'ALEATORIO');
          r.addEventListener('click', e => { e.stopPropagation(); this.assign(i, U.pick(roster).id); });
          c.appendChild(r);
        }
        c.appendChild(ctrl);
        cards.appendChild(c);
        return { c, art, name: c.querySelector('.card-name'), title: c.querySelector('.card-title'), passive: c.querySelector('.card-passive') };
      });
      const tokens = s.querySelector('.sel-tokens');
      this.tokens = this.sel.slots.map((slot, i) => {
        const t = el('div', 'token' + (slot.human ? ' human' : ''), slot.human ? 'P1' : 'CPU');
        t.style.setProperty('--pc', slot.color);
        t.addEventListener('pointerdown', e => this.tokenDown(e, i));
        tokens.appendChild(t);
        return t;
      });
      s.addEventListener('pointermove', e => this.tokenMove(e));
      s.addEventListener('pointerup', e => this.tokenUp(e));
      s.querySelector('.ready-bar').addEventListener('click', () => this.selectDone());
      s.querySelector('.back-mini').addEventListener('click', () => { NX.Audio.play('menuBack'); this.show('main'); });
      s.querySelector('.rules-btn').addEventListener('click', () => this.openRulesFromSelect());
      this.onBack = null;
      this.updateSelect();
      requestAnimationFrame(() => this.layoutTokens());
      if (!data.keep) NX.Audio.say('Choose your fighter!', { rate: 0.9 });
    },

    assign(slotIdx, fighterId) {
      const slot = this.sel.slots[slotIdx];
      slot.fighterId = fighterId;
      NX.Audio.play('token');
      if (slotIdx === 0) {
        const d = NX.getFighter(fighterId);
        NX.Audio.say(d.name, { rate: 0.95, pitch: 0.6 });
      }
      const card = this.cards[slotIdx];
      card.c.classList.remove('pop'); void card.c.offsetWidth; card.c.classList.add('pop');
      this.updateSelect(); this.layoutTokens();
    },

    updateSelect() {
      const roster = NX.ROSTER;
      this.cells.forEach((c, i) => {
        c.classList.toggle('cursor', i === this.sel.cursor);
        c.classList.toggle('picked', this.sel.slots.some(s => s.fighterId === roster[i].id));
      });
      this.sel.slots.forEach((slot, i) => {
        const card = this.cards[i];
        const id = slot.fighterId || (i === 0 ? roster[this.sel.cursor].id : null);
        const d = id ? NX.getFighter(id) : null;
        card.c.classList.toggle('empty', !slot.fighterId);
        card.name.textContent = d ? d.name.toUpperCase() : '—';
        card.title.textContent = d ? (d.title || '') : '';
        card.passive.textContent = d ? (d.passive || (d.forms ? d.forms.map(x => x.name).join(' ⇄ ') : '')) : '';
        card.def = d;
      });
      const ready = this.sel.slots.every(s => s.fighterId);
      this.selEl.classList.toggle('ready', ready);
      if (ready && !this.sel.wasReady) NX.Audio.play('ready');
      this.sel.wasReady = ready;
      this.anim = this.cards.filter(c => c.def).map(c => ({ canvas: c.art, def: c.def, full: true, state: NX.ST.IDLE }));
    },

    layoutTokens() {
      if (!this.selEl || this.screen !== 'select') return;
      const box = this.selEl.getBoundingClientRect();
      this.sel.slots.forEach((slot, i) => {
        const t = this.tokens[i];
        if (this.sel.dragging && this.sel.dragging.idx === i) return;
        let x, y;
        if (slot.fighterId) {
          const ci = NX.ROSTER.findIndex(r => r.id === slot.fighterId);
          const r = this.cells[ci].getBoundingClientRect();
          const off = [[0.28, 0.32], [0.72, 0.32], [0.28, 0.72], [0.72, 0.72]][i];
          x = r.left + r.width * off[0] - box.left; y = r.top + r.height * off[1] - box.top;
        } else if (i === 0) {
          const r = this.cells[this.sel.cursor].getBoundingClientRect();
          x = r.left + r.width * 0.5 - box.left; y = r.top + r.height * 0.5 - box.top;
          t.classList.add('floating');
        } else {
          const r = this.cards[i].c.getBoundingClientRect();
          x = r.left + r.width / 2 - box.left; y = r.top + 20 - box.top;
        }
        if (slot.fighterId) t.classList.remove('floating');
        t.style.transform = `translate(${x}px, ${y}px)`;
      });
    },

    tokenDown(e, i) {
      e.preventDefault();
      const t = this.tokens[i];
      t.setPointerCapture && t.setPointerCapture(e.pointerId);
      this.sel.dragging = { idx: i, id: e.pointerId };
      t.classList.add('drag');
      NX.Audio.play('menuMove');
      this.tokenMove(e);
    },
    tokenMove(e) {
      const d = this.sel && this.sel.dragging;
      if (!d) return;
      const box = this.selEl.getBoundingClientRect();
      this.tokens[d.idx].style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px)`;
      const ci = this.cellAt(e.clientX, e.clientY);
      this.cells.forEach((c, i) => c.classList.toggle('hover', i === ci));
      if (ci >= 0 && d.idx === 0) { this.sel.cursor = ci; }
    },
    tokenUp(e) {
      const d = this.sel && this.sel.dragging;
      if (!d) return;
      this.sel.dragging = null;
      this.tokens[d.idx].classList.remove('drag');
      this.cells.forEach(c => c.classList.remove('hover'));
      const ci = this.cellAt(e.clientX, e.clientY);
      if (ci >= 0) this.assign(d.idx, NX.ROSTER[ci].id);
      else { this.sel.slots[d.idx].fighterId = d.idx === 0 ? null : this.sel.slots[d.idx].fighterId; NX.Audio.play('menuBack'); this.updateSelect(); this.layoutTokens(); }
      this.sel.justDropped = true; setTimeout(() => { if (this.sel) this.sel.justDropped = false; }, 50);
    },
    cellAt(x, y) {
      for (let i = 0; i < this.cells.length; i++) {
        const r = this.cells[i].getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
      }
      return -1;
    },

    openRulesFromSelect() {
      NX.Audio.play('menuSelect');
      this.selMemo = this.sel.slots.map(s => ({ fighterId: s.fighterId, level: s.level }));
      this.show('rules', { back: 'select', mode: this.sel.mode });
    },

    selectInput(ev) {
      if (ev === 'rules') { this.openRulesFromSelect(); return; }
      const S = this.sel, n = this.cells.length;
      const cols = Math.max(1, Math.round(this.selEl.querySelector('.sel-grid').getBoundingClientRect().width / this.cells[0].getBoundingClientRect().width));
      const p1 = S.slots[0];
      const move = d => { if (p1.fighterId) return; S.cursor = (S.cursor + d + n) % n; NX.Audio.play('menuMove'); this.updateSelect(); this.layoutTokens(); };
      switch (ev) {
        case 'left': move(-1); break;
        case 'right': move(1); break;
        case 'up': move(-cols); break;
        case 'down': move(cols); break;
        case 'confirm':
          if (!p1.fighterId) this.assign(0, NX.ROSTER[S.cursor].id);
          else if (S.slots.every(s => s.fighterId)) this.selectDone();
          break;
        case 'back': case 'escape':
          if (p1.fighterId) { p1.fighterId = null; NX.Audio.play('menuBack'); this.updateSelect(); this.layoutTokens(); }
          else { NX.Audio.play('menuBack'); this.show('main'); }
          break;
        default: break;
      }
    },

    selectDone() {
      if (!this.sel.slots.every(s => s.fighterId) || this.locked) return;
      NX.Audio.play('menuSelect');
      this.game.setup = {
        mode: this.sel.mode,
        players: this.sel.slots.map(s => ({ fighterId: s.fighterId, human: s.human, level: s.level })),
        stageId: this.game.setup && this.game.setup.stageId
      };
      this.show('stage');
    },

    /* ----------------------- SELECCIÓN DE ESCENARIO ---------------------- */
    build_stage() {
      const s = el('div', 'scr scr-stage');
      s.innerHTML = `<div class="sel-header"><div class="sel-title">ELIGE ESCENARIO</div><div class="sel-mode">COMPETITIVO · SIN HAZARDS</div><div class="sel-rules">${rulesHTML()}</div></div>
        <div class="stage-cards"></div><button class="back-mini">◄ VOLVER <span class="kb-only">(Esc)</span></button>`;
      const wrap = s.querySelector('.stage-cards');
      const list = (NX.STAGES || []).map(sd => {
        const b = el('button', 'mbtn stage-card');
        const cv = el('canvas', 'stage-art'); cv.width = 480; cv.height = 270;
        b.appendChild(cv);
        b.appendChild(el('div', 'stage-name', sd.name.toUpperCase()));
        b.appendChild(el('div', 'stage-desc', sd.desc || ''));
        try { this.drawStagePreview(cv, sd); } catch (e) { console.error('[NEXUS CLASH] Vista previa de escenario:', e); }
        b.addEventListener('click', () => {
          NX.Audio.play('menuSelect');
          this.game.setup.stageId = sd.id;
          this.game.startMatch(this.game.setup);
        });
        b.addEventListener('mouseenter', () => { this.focusIdx = list.indexOf(b); this.refreshFocus(); });
        wrap.appendChild(b);
        return b;
      });
      s.querySelector('.back-mini').addEventListener('click', () => this.onBack());
      this.root.appendChild(s);
      this.setFocusables(list, true);
      const prevIdx = (NX.STAGES || []).findIndex(x => x.id === this.game.setup.stageId);
      if (prevIdx >= 0) { this.focusIdx = prevIdx; this.refreshFocus(); }
      this.onBack = () => { NX.Audio.play('menuBack'); this.show('select', { mode: this.game.setup.mode }); };
    },

    drawStagePreview(cv, sd) {
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const stub = { stagePlatforms: sd.platforms.map(p => Object.assign({ type: 'solid' }, p)), dynamicSolids: [], fighters: [], frame: 0, stageDef: sd, blast: sd.blast };
      const cam = new NX.Camera(); cam.resize(W, H); cam.padBottom = 0;
      const cb = sd.camera;
      cam.zoom = Math.min(W / (cb.right - cb.left), H / (cb.bottom - cb.top)) * 1.25;
      cam.x = (cb.left + cb.right) / 2; cam.y = (cb.top + cb.bottom) / 2 + 60;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (sd.drawBackground) sd.drawBackground(ctx, W, H, cam, 0, stub);
      else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); }
      cam.apply(ctx, 1);
      if (sd.drawStage) sd.drawStage(ctx, stub, 0);
      else NX.Match.prototype.drawDefaultStage.call(stub, ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },

    /* ------------------------------ PAUSA -------------------------------- */
    showPause() {
      this.prevScreen = this.screen;
      const s = el('div', 'scr scr-pause');
      const R = this.game.match ? this.game.match.rules : NX.Settings;
      s.innerHTML = `<div class="pause-k">PAUSA</div><div class="pause-rules"><span class="chip"><b>${R.stocks}</b> VIDAS</span><span class="chip"><b>${fmtMin(R.minutes)}</b></span><span class="chip chip-red">SIN OBJETOS</span></div>`;
      const btns = el('div', 'pause-btns');
      const mk = (t, fn) => { const b = el('button', 'mbtn', t); b.addEventListener('click', () => { NX.Audio.play('menuSelect'); fn(); }); btns.appendChild(b); return b; };
      const list = [
        mk('CONTINUAR', () => this.game.togglePause()),
        mk('REINICIAR COMBATE', () => { this.game.togglePause(true); this.game.startMatch(this.game.setup); }),
        mk('SALIR AL MENÚ', () => { this.game.togglePause(true); this.game.quitToMenu(); })
      ];
      s.appendChild(btns);
      this.root.innerHTML = ''; this.root.className = 'screens on scr-pause'; this.root.appendChild(s);
      this.screen = 'pause';
      this.setFocusables(list);
      this.onBack = () => this.game.togglePause();
    },
    hidePause() { this.hideAll(); },

    /* ---------------------------- RESULTADOS ----------------------------- */
    build_results(res) {
      const w = res.winner;
      const s = el('div', 'scr scr-results');
      s.style.setProperty('--pc', w ? w.color : '#fff');
      s.innerHTML = `
        <div class="res-left">
          <div class="res-burst"></div>
          <canvas class="res-art" width="520" height="600"></canvas>
          <div class="res-winner"><small>GANADOR</small><b>${w ? w.slotDef.name.toUpperCase() : 'EMPATE'}</b><span>${w ? w.tag : ''}${res.sudden ? ' · MUERTE SÚBITA' : ''}</span></div>
        </div>
        <div class="res-right">
          <div class="res-title">RESULTADOS</div>
          <table class="res-table"><thead><tr><th>#</th><th>Luchador</th><th>KOs</th><th>Caídas</th><th>SD</th><th>Daño inf.</th><th>Daño rec.</th></tr></thead><tbody></tbody></table>
          <div class="res-time">Tiempo de combate: ${NX.fmtTime(res.frames).m}:${NX.fmtTime(res.frames).s}</div>
          <div class="res-btns"></div>
        </div>`;
      const tb = s.querySelector('tbody');
      res.ranking.forEach((f, i) => {
        const tr = el('tr', i === 0 ? 'first' : '');
        tr.style.setProperty('--pc', f.color);
        const icon = el('canvas', 'res-icon'); icon.width = 28; icon.height = 28;
        NX.Render.drawStockIcon(icon, f.def, f.color);
        const td = el('td', 'res-name'); td.appendChild(icon); td.appendChild(el('span', '', `${f.slotDef.name}${f.slotDef.forms ? ' · ' + f.def.name : ''} <small>${f.tag}</small>`));
        tr.appendChild(el('td', 'res-rank', String(i + 1)));
        tr.appendChild(td);
        [f.stats.kos, f.stats.falls, f.stats.sds, f.stats.damageDealt.toFixed(1) + '%', f.stats.damageTaken.toFixed(1) + '%'].forEach(v => tr.appendChild(el('td', '', String(v))));
        tb.appendChild(tr);
      });
      const btns = s.querySelector('.res-btns');
      const mk = (t, fn, cls) => { const b = el('button', 'mbtn ' + (cls || ''), t); b.addEventListener('click', () => { NX.Audio.play('menuSelect'); fn(); }); btns.appendChild(b); return b; };
      const list = [
        mk('REVANCHA', () => this.game.startMatch(this.game.setup), 'btn-red'),
        mk('CAMBIAR LUCHADORES', () => this.show('select', { mode: this.game.setup.mode })),
        mk('MENÚ PRINCIPAL', () => { NX.Audio.playMusic('menu'); this.show('main'); })
      ];
      this.root.appendChild(s);
      this.setFocusables(list);
      this.onBack = null;
      if (w) {
        this.anim = [{ canvas: s.querySelector('.res-art'), def: w.def, full: true, state: NX.ST.VICTORY, t0: this.tickN }];
        setTimeout(() => NX.Audio.say('The winner is... ' + w.slotDef.name + '!', { rate: 0.85 }), 500);
      }
      NX.Audio.playMusic('victory');
    },

    /* Animación de retratos en las pantallas de menú. */
    tick() {
      this.tickN++;
      if (!this.anim.length || this.tickN % 2) return;
      for (const a of this.anim) {
        if (!a.canvas.isConnected) continue;
        NX.Render.drawPortrait(a.canvas, a.def, { full: a.full, state: a.state, tick: this.tickN, stateTime: a.t0 != null ? this.tickN - a.t0 : 60 });
      }
    }
  };

  NX.Menus = Menus;
})(window.NX = window.NX || {});
