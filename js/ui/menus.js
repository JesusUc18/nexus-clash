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
  function rulesHTML(mode) {
    const S = NX.Settings;
    /* V1.4.1 · Rey de la Colina: no hay vidas; la meta es estar 30 s solo en la zona. */
    if (mode === 'koth') return `<span class="chip chip-hill">META <b>${Math.round((NX.KOTH ? NX.KOTH.target : 1800) / 60)} s</b></span><span class="chip"><b>${fmtMin(S.minutes)}</b> ${S.minutes ? 'MIN' : 'TIEMPO'}</span><span class="chip">VIDAS <b>∞</b></span>`;
    return `<span class="chip"><b>${S.stocks}</b> ${S.stocks === 1 ? 'VIDA' : 'VIDAS'}</span><span class="chip"><b>${fmtMin(S.minutes)}</b> ${S.minutes ? 'MIN' : 'TIEMPO'}</span><span class="chip chip-red">SIN OBJETOS</span>`;
  }
  /* V1.4.1 · SMASH y REY DE LA COLINA: el jugador elige de 1 a 3 CPUs. */
  const CPU_MODES = { smash: 1, koth: 1 };

  /* v8 · Récord de la Horda (mejor tiempo), guardado en el navegador. */
  const BEST_KEY = 'nexusclash.hordeBest';
  function hordeBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch (e) { return null; } }
  function saveHordeBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* almacenamiento no disponible */ } }
  function fmtClock(frames) { const t = NX.fmtTime(frames); return `${t.m}:${t.s}.${t.cs}`; }

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
      if (this.modal) { this.modalInput(ev); return; }
      if (!this.screen || this.locked) return;
      if (this.screen === 'select') { this.selectInput(ev); return; }
      if (this.screen === 'tierlist') { this.tierInput(ev); return; }
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
          <div class="logo-sub">ULTIMATE ARENA <span class="ver">V${NX.VERSION || '1.2'}</span></div>
        </div>
        <div class="press"><span class="kb-only">PULSA <b>ENTER</b> O HAZ CLIC PARA EMPEZAR</span><span class="touch-only"><b>TOCA</b> LA PANTALLA PARA EMPEZAR</span></div>
        <div class="title-roster"><div class="tr-track"></div></div>
        <div class="title-foot"><span class="kb-only">Teclado · Gamepad · Pulsa <b>M</b> para silenciar</span><span class="touch-only">Controles táctiles activados · Juega en horizontal</span></div>`;
      /* V1.0 · Desfile del plantel en la portada (retratos que cruzan la pantalla). */
      const track = s.querySelector('.tr-track');
      const roster = NX.ROSTER || [];
      for (let k = 0; k < 2; k++) roster.forEach(d => {
        const c = el('canvas', 'tr-face'); c.width = 96; c.height = 96;
        c.style.setProperty('--fc', NX.Render.resolveDef(d).palette.primary);
        NX.Render.drawPortrait(c, d); track.appendChild(c);
      });
      track.style.setProperty('--n', roster.length);
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
        <div class="main-tiles v8 v12"></div>
        <div class="main-foot"><span class="kb-only">WASD / Flechas mover · Espacio saltar · J ataque · U smash · K especial · L escudo · I agarre</span><span class="touch-only">Joystick a la izquierda · A ataque · B especial · ▲ salto · S smash · ◆ escudo · ✊ agarre</span></div>`;
      const tiles = s.querySelector('.main-tiles');
      const mk = (cls, k, d, act) => {
        const b = el('button', 'mbtn tile ' + cls, `<span class="tile-k">${k}</span><span class="tile-d">${d}</span>`);
        b.addEventListener('click', () => { NX.Audio.play('menuSelect'); act(); });
        b.addEventListener('mouseenter', () => { this.focusIdx = this.focusables.indexOf(b); this.refreshFocus(); });
        tiles.appendChild(b); return b;
      };
      const list = [];
      const b1 = mk('tile-red', 'SMASH', 'Tú contra 1, 2 o 3 CPUs · Dificultad nivel 1 a 9', () => this.show('select', { mode: 'smash' }));
      const best = hordeBest();
      const bH = mk('tile-horde', 'HORDA', `10 oleadas de rivales al azar · Contra reloj${best ? ' · Récord ' + fmtClock(best.frames) : ''}`, () => this.show('select', { mode: 'horde' }));
      const b2 = mk('tile-black tile-hill', 'REY DE LA COLINA', `Quédate ${Math.round((NX.KOTH ? NX.KOTH.target : 1800) / 60)} s en la zona · Contra 1 a 3 CPUs`, () => this.show('select', { mode: 'koth' }));
      const bP = mk('tile-practice', 'PRÁCTICA', 'Tú contra un muñeco quieto · Prueba combos a gusto', () => this.show('select', { mode: 'practice' }));
      /* Mosaico de NOVEDADES: muestra la versión actual y avisa si aún no se ha visto. */
      const log0 = (NX.CHANGELOG || [])[0];
      const bN = mk('tile-news', 'NOVEDADES', log0 ? `V${log0.version} · ${log0.title}` : 'Cambios de cada versión', () => this.showNews());
      if (NX.News && NX.News.isNew()) bN.appendChild(el('span', 'tile-new', 'NUEVO'));
      const S = NX.Settings;
      const bR = mk('tile-white tile-rules', 'REGLAS', `${S.stocks} ${S.stocks === 1 ? 'vida' : 'vidas'} · ${fmtMin(S.minutes)} · audio · Tier List`, () => this.show('rules', { back: 'main' }));
      const b3 = mk('tile-white', 'CONTROLES', 'Teclado, gamepad y táctil', () => this.show('controls'));
      list.push(b1, bH, b2, bP, bN, bR, b3);
      if (NX.Packager) {
        const z = el('button', 'mbtn zip-mini', '⬇ .ZIP <small>🔒</small>');
        z.title = 'Descargar el juego (.zip protegido con contraseña)';
        z.addEventListener('click', () => { NX.Audio.play('menuSelect'); NX.Packager.download(); });
        z.addEventListener('mouseenter', () => { this.focusIdx = this.focusables.indexOf(z); this.refreshFocus(); });
        s.querySelector('.main-head').appendChild(z);
        list.push(z);
      }
      if (missing.length) {
        b1.disabled = b2.disabled = bH.disabled = bP.disabled = true;
        const m = el('div', 'missing', `<b>PROYECTO INCOMPLETO</b> · Faltan módulos: ${missing.join(' · ')}`);
        s.appendChild(m);
      }
      this.root.appendChild(s);
      this.setFocusables(list);
      if (b1.disabled) { this.focusIdx = 2; this.refreshFocus(); }
      this.onBack = () => { NX.Audio.play('menuBack'); this.show('title'); };
      /* V1.2 · El panel de novedades aparece solo la primera vez de cada versión. */
      if (NX.News && NX.News.isNew()) setTimeout(() => { if (this.screen === 'main' && !this.modal) this.showNews(); }, 450);
    },

    /* --------------------------- V1.2 · NOVEDADES ------------------------ */
    showNews(vIdx) {
      if (this.modal) this.closeModal(true);
      const log = NX.CHANGELOG || [];
      if (!log.length) return;
      let cur = U.clamp(vIdx || 0, 0, log.length - 1);
      const TAG = { nuevo: 'NUEVO', cambio: 'CAMBIO', ajuste: 'AJUSTE', arreglo: 'ARREGLO' };
      const ov = el('div', 'nx-modal');
      ov.innerHTML = `<div class="news-box" role="dialog" aria-modal="true" aria-label="Novedades">
          <div class="news-head"><small>NOVEDADES</small><b class="news-v"></b><span class="news-t"></span></div>
          <div class="news-tabs"></div>
          <ul class="news-list"></ul>
          <div class="news-btns"><button class="mbtn news-tier">VER TIER LIST</button><button class="mbtn btn-red news-ok">¡A JUGAR!</button></div>
        </div>`;
      const tabs = ov.querySelector('.news-tabs');
      const render = () => {
        const e = log[cur];
        ov.querySelector('.news-v').textContent = /^\d/.test(e.version) ? 'V' + e.version : e.version.toUpperCase();
        ov.querySelector('.news-t').textContent = e.title + (e.date ? ' · ' + e.date : '');
        ov.querySelector('.news-list').innerHTML = e.items.map(([t, txt]) => `<li><span class="news-tag tag-${t}">${TAG[t] || t.toUpperCase()}</span><span>${txt}</span></li>`).join('');
        tabs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === cur));
      };
      log.forEach((e, i) => {
        const b = el('button', 'news-tab', /^\d/.test(e.version) ? 'V' + e.version : e.version);
        b.addEventListener('click', () => { cur = i; NX.Audio.play('menuMove'); render(); });
        tabs.appendChild(b);
      });
      const btnTier = ov.querySelector('.news-tier'), btnOk = ov.querySelector('.news-ok');
      btnOk.addEventListener('click', () => { NX.Audio.play('menuSelect'); this.closeModal(); });
      btnTier.addEventListener('click', () => { NX.Audio.play('menuSelect'); this.closeModal(); this.show('tierlist', { back: this.screen === 'rules' ? 'rules' : 'main' }); });
      ov.addEventListener('pointerdown', e => { if (e.target === ov) this.closeModal(); });
      document.body.appendChild(ov);
      this.modal = { el: ov, btns: [btnTier, btnOk], idx: 1, step: d => { cur = (cur + d + log.length) % log.length; NX.Audio.play('menuMove'); render(); } };
      render(); this.refreshModal();
      NX.Audio.play('ready');
    },
    refreshModal() { const M = this.modal; if (M) M.btns.forEach((b, i) => b.classList.toggle('focus', i === M.idx)); },
    modalInput(ev) {
      const M = this.modal;
      if (ev === 'left' || ev === 'right') { M.idx = (M.idx + 1) % M.btns.length; NX.Audio.play('menuMove'); this.refreshModal(); }
      else if (ev === 'up') M.step(-1);
      else if (ev === 'down') M.step(1);
      else if (ev === 'confirm') M.btns[M.idx].click();
      else if (ev === 'back' || ev === 'escape' || ev === 'pause') this.closeModal();
    },
    closeModal(silent) {
      if (!this.modal) return;
      this.modal.el.remove(); this.modal = null;
      if (NX.News) NX.News.markSeen();
      document.querySelectorAll('.tile-new').forEach(b => b.remove());
      if (!silent) NX.Audio.play('menuBack');
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
        <div class="ctrl-wrap">
          <div class="touch-only touch-map" aria-hidden="true">
            <div class="tm-screen">
              <div class="tm-stick"><i></i></div><span class="tm-lab tm-l1">Mover · arrastra donde quieras</span>
              <div class="tm-pause"><i></i><i></i></div>
              <div class="tm-btns"><b class="g">✊</b><b class="y">B</b><b class="o">S</b><b class="r">A</b><b class="w">▲</b><b class="c">◆</b></div>
              <span class="tm-lab tm-l2">A ataque · B especial · S smash · ▲ salto · ◆ escudo · ✊ agarre</span>
            </div>
          </div>
          <table class="ctrl-table"><thead><tr><th>Acción</th><th class="kb-only">Teclado</th><th class="kb-only">Gamepad</th><th class="touch-only">Táctil</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="kb-only"><kbd>${r[1]}</kbd></td><td class="kb-only">${r[2]}</td><td class="touch-only">${r[3]}</td></tr>`).join('')}</tbody></table></div>
        <div class="ctrl-foot"></div>`;
      const back = el('button', 'mbtn back-btn', '◄ VOLVER');
      back.addEventListener('click', () => { NX.Audio.play('menuBack'); this.show('main'); });
      s.querySelector('.ctrl-foot').appendChild(back);
      this.root.appendChild(s);
      this.setFocusables([back]);
      this.onBack = () => back.click();
    },

    /* ------------------------------ REGLAS ------------------------------- */
    build_rules(data) {
      if (!data || !data.keep) this.rulesData = data || { back: 'main' };
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
        /* Solo en pantallas táctiles: tamaño de los botones y vibración. */
        ...(NX.Touch && (NX.Device.mobile || NX.Device.touchCapable) ? [
          { label: 'BOTONES TÁCTILES', desc: 'Tamaño de los botones y del joystick en combate', val: () => NX.Touch.sizeLabel(), change: d => NX.Touch.cycleSize(d) },
          { label: 'VIBRACIÓN', desc: 'Vibra un poco al pulsar los botones táctiles', val: () => (S.haptics !== false ? 'SÍ' : 'NO'), change: () => { S.haptics = S.haptics === false; if (S.haptics) NX.Touch.haptic(20); } }
        ] : []),
        { label: 'RESTABLECER', desc: 'Reglamento competitivo: 3 vidas · 7:00', val: () => '↺', change: () => { S.stocks = 3; S.minutes = 7; } },
        /* V1.2 · accesos a la Tier List y al panel de novedades. */
        { link: true, cls: 'rule-tier', label: 'TIER LIST', desc: `Los ${(NX.ROSTER || []).length} luchadores, del más fuerte al más débil`, val: () => 'VER', change: () => this.show('tierlist', { back: 'rules' }) },
        { link: true, cls: 'rule-news', label: 'NOVEDADES', desc: `Qué trae la versión ${NX.VERSION || ''} y las anteriores`, val: () => 'VER', change: () => this.showNews() }
      ];
      this.ruleRows = rows.map((r, i) => {
        const row = el('div', 'rule-row' + (r.link ? ' rule-link ' + r.cls : ''));
        row.innerHTML = `<div class="rule-l"><b>${r.label}</b><small>${r.desc}</small></div>
          <div class="rule-ctrl">${r.link ? '<span class="rule-val"></span><button class="rule-btn" data-d="1">►</button>' : '<button class="rule-btn" data-d="-1">◄</button><span class="rule-val"></span><button class="rule-btn" data-d="1">►</button>'}</div>`;
        row.querySelectorAll('.rule-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.ruleIdx = i; this.changeRule(Number(b.dataset.d)); }));
        row.addEventListener('click', () => { this.ruleIdx = i; this.changeRule(1); });
        row.addEventListener('mouseenter', () => { this.ruleIdx = i; this.refreshRules(); });
        list.appendChild(row);
        return { r, row, v: row.querySelector('.rule-val') };
      });
      this.ruleIdx = U.clamp((data && data.focus) || 0, 0, rows.length - 1);
      s.querySelector('.back-mini').addEventListener('click', () => this.rulesBack());
      this.refreshRules();
    },
    changeRule(d) {
      const R = this.ruleRows[this.ruleIdx];
      if (R.r.link) { if (d > 0) { NX.Audio.play('menuSelect'); R.r.change(); } return; }
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
      if (d.back === 'select') this.show('select', { mode: d.mode, cpus: d.cpus, keep: true });
      else this.show('main');
    },

    /* ---------------------------- V1.2 · TIER LIST ----------------------- */
    build_tierlist(data) {
      this.tierData = data || { back: 'main' };
      const TL = NX.TierList;
      const s = el('div', 'scr scr-tier');
      s.innerHTML = `
        <div class="sel-header"><div class="sel-title">TIER LIST</div><div class="sel-mode">OFICIAL · V${TL.version}</div>
          <div class="tl-legend">Daño · Reacción · Peso · Movilidad · Alcance · Kit</div></div>
        <div class="tl-wrap">
          <div class="tl-board"></div>
          <aside class="tl-detail">
            <div class="tl-badge"></div>
            <canvas class="tl-art" width="240" height="260"></canvas>
            <div class="tl-name"></div><div class="tl-title"></div>
            <div class="tl-bars"></div>
            <p class="tl-why"></p>
            <p class="tl-passive"></p>
            <button class="mbtn btn-red tl-play"></button>
          </aside>
        </div>
        <div class="tl-help"><span class="kb-only">Flechas elegir · Enter luchar con él · Esc volver</span><span class="touch-only">Toca un luchador para ver su ficha</span></div>
        <button class="back-mini">◄ VOLVER <span class="kb-only">(Esc)</span></button>`;
      this.root.appendChild(s);
      this.tierEl = s;
      const board = s.querySelector('.tl-board');
      const roster = NX.ROSTER || [];
      this.tierRows = [];
      this.tierCells = [];
      /* Agrupa las sub-filas (+ · −) bajo una sola letra, como en las tier lists clásicas. */
      const groups = [];
      TL.tiers.forEach(t => {
        const ids = t.ids.filter(id => roster.some(r => r.id === id));
        if (!ids.length) return;
        let g = groups[groups.length - 1];
        if (!g || g.tier !== t.tier) groups.push(g = { tier: t.tier, color: t.color, subs: [] });
        g.subs.push({ sub: t.sub, ids });
      });
      /* Luchadores nuevos que aún no estén en la lista: se muestran aparte. */
      const listed = new Set(TL.order);
      const extra = roster.filter(r => !listed.has(r.id)).map(r => r.id);
      if (extra.length) groups.push({ tier: '?', color: '#8c8c96', subs: [{ sub: 'NUEVOS', ids: extra }] });
      groups.forEach(g => {
        const ge = el('div', 'tl-group');
        ge.style.setProperty('--tc', g.color);
        ge.appendChild(el('div', 'tl-letter', g.tier));
        const subs = el('div', 'tl-subs');
        g.subs.forEach(sb => {
          const row = el('div', 'tl-row');
          row.appendChild(el('div', 'tl-sub' + (sb.sub.length > 1 ? ' tl-sub-word' : ''), sb.sub === '·' ? '•' : sb.sub));
          const faces = el('div', 'tl-faces');
          const rowCells = sb.ids.map(id => {
            const d = NX.getFighter(id);
            const b = el('button', 'tl-face');
            b.style.setProperty('--fc', NX.Render.resolveDef(d).palette.primary);
            const cv = el('canvas', 'tl-face-art'); cv.width = 96; cv.height = 96;
            NX.Render.drawPortrait(cv, d);
            b.append(cv, el('span', 'tl-face-name', d.name));
            const idx = this.tierCells.length;
            b.addEventListener('click', () => { if (this.tierIdx === idx) return; this.tierSelect(idx, true); NX.Audio.play('menuMove'); });
            faces.appendChild(b);
            this.tierCells.push({ b, id, row: this.tierRows.length });
            return idx;
          });
          row.appendChild(faces);
          subs.appendChild(row);
          this.tierRows.push(rowCells);
        });
        ge.appendChild(subs);
        board.appendChild(ge);
      });
      s.querySelector('.tl-play').addEventListener('click', () => this.tierPlay());
      s.querySelector('.back-mini').addEventListener('click', () => this.tierBack());
      this.onBack = () => this.tierBack();
      const start = data && data.pick ? this.tierCells.findIndex(c => c.id === data.pick) : 0;
      this.tierSelect(Math.max(0, start), true);
    },
    tierSelect(idx, noScroll) {
      const cells = this.tierCells;
      if (!cells || !cells.length) return;
      this.tierIdx = U.clamp(idx, 0, cells.length - 1);
      const C = cells[this.tierIdx], TL = NX.TierList, s = this.tierEl;
      cells.forEach((c, i) => c.b.classList.toggle('on', i === this.tierIdx));
      if (!noScroll) C.b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const d = NX.getFighter(C.id), t = TL.tierOf(C.id), st = TL.stats(C.id);
      const det = s.querySelector('.tl-detail');
      det.style.setProperty('--tc', t ? t.color : '#8c8c96');
      det.style.setProperty('--fc', NX.Render.resolveDef(d).palette.primary);
      s.querySelector('.tl-badge').textContent = t ? t.label : '?';
      s.querySelector('.tl-name').textContent = d.name.toUpperCase();
      s.querySelector('.tl-title').textContent = d.title || '';
      s.querySelector('.tl-bars').innerHTML = st ? TL.bars.map(B => {
        const v = st[B.k];
        return `<div class="tl-bar"><span>${B.label}</span><i><em style="width:${(v * 10).toFixed(0)}%"></em></i><b>${v.toFixed(1)}</b></div>`;
      }).join('') : '';
      s.querySelector('.tl-why').textContent = TL.why[C.id] || 'Luchador nuevo: aún no tiene puesto en la Tier List.';
      const passive = d.passive || (d.forms ? d.forms.map(x => x.name).join(' ⇄ ') : '');
      s.querySelector('.tl-passive').innerHTML = passive ? '<b>PASIVA</b> ' + passive.replace(/</g, '&lt;') : '';
      s.querySelector('.tl-play').textContent = 'LUCHAR CON ' + d.name.toUpperCase() + ' ►';
      this.anim = [{ canvas: s.querySelector('.tl-art'), def: d, full: true, state: NX.ST.IDLE }];
    },
    tierInput(ev) {
      const C = this.tierCells[this.tierIdx];
      if (!C) { if (ev === 'back' || ev === 'escape') this.tierBack(); return; }
      const rows = this.tierRows;
      const vert = d => {
        const r = U.clamp(C.row + d, 0, rows.length - 1);
        if (r === C.row) return;
        const pos = rows[C.row].indexOf(this.tierIdx);
        this.tierSelect(rows[r][Math.min(pos, rows[r].length - 1)]);
        NX.Audio.play('menuMove');
      };
      switch (ev) {
        case 'left': this.tierSelect((this.tierIdx - 1 + this.tierCells.length) % this.tierCells.length); NX.Audio.play('menuMove'); break;
        case 'right': this.tierSelect((this.tierIdx + 1) % this.tierCells.length); NX.Audio.play('menuMove'); break;
        case 'up': vert(-1); break;
        case 'down': vert(1); break;
        case 'confirm': this.tierPlay(); break;
        case 'back': case 'escape': this.tierBack(); break;
        default: break;
      }
    },
    tierPlay() {
      const C = this.tierCells[this.tierIdx];
      if (!C || this.locked) return;
      NX.Audio.play('menuSelect');
      this.show('select', { mode: 'smash', pick: C.id });
    },
    tierBack() {
      NX.Audio.play('menuBack');
      const d = this.tierData || {};
      if (d.back === 'rules') this.show('rules', { keep: true, focus: this.ruleRows ? this.ruleRows.findIndex(R => R.r.cls === 'rule-tier') : 0 });
      else this.show('main');
    },

    /* ------------------------ SELECCIÓN DE PERSONAJES -------------------- */
    build_select(data) {
      const mode = data.mode;
      const roster = NX.ROSTER || [];
      const prev = this.game.setup && this.game.setup.mode === mode ? this.game.setup : null;
      const nCpu = mode in CPU_MODES
        ? U.clamp(data.cpus || (prev ? prev.players.length - 1 : CPU_MODES[mode]), 1, 3)
        : mode === 'horde' ? 0 : 1;
      this.sel = {
        mode, cursor: 0, dragging: null, active: 0,
        slots: [{ human: true, fighterId: prev ? prev.players[0].fighterId : null, level: 0, color: NX.SLOT_COLORS[0], tag: 'P1' }]
      };
      for (let i = 0; i < nCpu; i++) {
        const pp = prev && prev.players[i + 1];
        this.sel.slots.push({ human: false, fighterId: pp ? pp.fighterId : U.pick(roster).id, level: mode === 'practice' ? 0 : (pp ? pp.level : 5), color: NX.SLOT_COLORS[i + 1], tag: mode === 'practice' ? 'MUÑECO' : 'CPU' + (nCpu > 1 ? (i + 2) : '') });
      }
      if (data.keep && this.selMemo) this.selMemo.forEach((m, i) => { if (this.sel.slots[i]) { this.sel.slots[i].fighterId = m.fighterId; if (!this.sel.slots[i].human) this.sel.slots[i].level = m.level; } });
      /* V1.2 · "LUCHAR CON…" desde la Tier List: P1 llega con el luchador ya elegido. */
      if (data.pick && NX.getFighter(data.pick)) this.sel.slots[0].fighterId = data.pick;
      if (this.sel.slots[0].fighterId) this.sel.cursor = Math.max(0, roster.findIndex(r => r.id === this.sel.slots[0].fighterId));

      const s = el('div', 'scr scr-select');
      s.innerHTML = `
        <div class="sel-header">
          <div class="sel-title">ELIGE A TU LUCHADOR</div>
          <div class="sel-mode">${mode === 'koth' ? 'REY DE LA COLINA · ' + (nCpu === 1 ? '1 VS 1' : (nCpu + 1) + ' JUGADORES') : mode === 'horde' ? 'HORDA · 10 OLEADAS · CONTRA RELOJ' : mode === 'practice' ? 'PRÁCTICA · MUÑECO QUIETO · SIN LÍMITES' : 'SMASH · ' + (nCpu === 1 ? '1 VS 1' : (nCpu + 1) + ' JUGADORES')}</div>
          ${mode in CPU_MODES ? `<div class="cpu-pick"><button data-d="-1" aria-label="Menos CPUs"${nCpu <= 1 ? ' disabled' : ''}>−</button><span>CPUs <b>${nCpu}</b></span><button data-d="1" aria-label="Más CPUs"${nCpu >= 3 ? ' disabled' : ''}>+</button></div>` : ''}
          <div class="sel-rules">${mode === 'practice' ? '<span class="chip chip-practice">VIDAS <b>∞</b></span><span class="chip">TIEMPO <b>∞</b></span>' : rulesHTML(mode)}</div>
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
      grid.style.setProperty('--cols', roster.length > 24 ? Math.ceil(roster.length / 3) : roster.length > 16 ? Math.ceil(roster.length / 2) : 8);
      grid.style.setProperty('--cols-short', Math.ceil(roster.length / (roster.length > 24 ? 3 : 2)));   // teléfono en horizontal: 3 filas, casillas táctiles más grandes
      this.cells = roster.map((d, i) => {
        const c = el('div', 'cell');
        c.dataset.idx = i;
        c.style.setProperty('--fc', NX.Render.resolveDef(d).palette.primary);
        if (d.forms) c.appendChild(el('div', 'cell-forms', '⇄ ' + d.forms.length));
        const cv = el('canvas', 'cell-art'); cv.width = 160; cv.height = 120;
        NX.Render.drawPortrait(cv, d);
        c.append(cv, el('div', 'cell-name', d.name.toUpperCase()), el('div', 'cell-num', String(i + 1).padStart(2, '0')));
        c.addEventListener('mouseenter', () => { if (!this.sel.slots[0].fighterId || this.sel.dragging) { this.sel.cursor = i; this.updateSelect(); } });
        /* Tocar un retrato lo asigna al jugador activo (P1, o el CPU cuya tarjeta se tocó antes). */
        c.addEventListener('click', () => {
          if (this.sel.justDropped) return;
          const a = this.sel.active;
          if (a === 0) this.sel.cursor = i;
          this.sel.active = 0;
          this.assign(a, d.id);
        });
        grid.appendChild(c);
        return c;
      });
      const cards = s.querySelector('.sel-cards');
      this.cards = this.sel.slots.map((slot, i) => {
        const c = el('div', 'card' + (slot.human ? ' human' : ' cpu'));
        c.style.setProperty('--pc', slot.color);
        const art = el('canvas', 'card-art'); art.width = 240; art.height = 260;
        c.innerHTML = `<div class="card-tag">${slot.tag}</div>` + (slot.human ? '' : '<div class="card-pick"></div>');
        if (!slot.human) c.addEventListener('click', () => {
          this.sel.active = this.sel.active === i ? 0 : i;
          NX.Audio.play(this.sel.active ? 'menuSelect' : 'menuBack');
          this.updateSelect();
        });
        c.appendChild(art);
        c.appendChild(el('div', 'card-name', '—'));
        c.appendChild(el('div', 'card-title', ''));
        c.appendChild(el('div', 'card-passive', ''));
        const ctrl = el('div', 'card-ctrl');
        if (slot.human) ctrl.innerHTML = '<span>JUGADOR</span>';
        else if (mode === 'practice') {
          ctrl.innerHTML = '<span>QUIETO · SIN IA</span>';
          const r = el('button', 'rand-btn', 'ALEATORIO');
          r.addEventListener('click', e => { e.stopPropagation(); this.assign(i, U.pick(roster).id); });
          c.appendChild(r);
        } else {
          ctrl.innerHTML = `<button class="lv-btn" data-d="-1" aria-label="Bajar nivel">−</button><span class="lv">NIVEL <b>${slot.level}</b></span><button class="lv-btn" data-d="1" aria-label="Subir nivel">+</button>`;
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
      s.querySelectorAll('.cpu-pick button').forEach(b => b.addEventListener('click', () => this.setCpus(nCpu + Number(b.dataset.d))));
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
        card.c.classList.toggle('picking', this.sel.active === i);
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

    /* V1.4.1 · Cambia cuántos CPUs hay (1 a 3) conservando las elecciones hechas. */
    setCpus(n) {
      n = U.clamp(n, 1, 3);
      if (!this.sel || n === this.sel.slots.length - 1) return;
      NX.Audio.play('menuMove');
      this.selMemo = this.sel.slots.map(s => ({ fighterId: s.fighterId, level: s.level }));
      this.show('select', { mode: this.sel.mode, cpus: n, keep: true });
    },

    openRulesFromSelect() {
      NX.Audio.play('menuSelect');
      this.selMemo = this.sel.slots.map(s => ({ fighterId: s.fighterId, level: s.level }));
      this.show('rules', { back: 'select', mode: this.sel.mode, cpus: this.sel.slots.length - 1 });
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
          if (S.active) { S.active = 0; NX.Audio.play('menuBack'); this.updateSelect(); }
          else if (p1.fighterId) { p1.fighterId = null; NX.Audio.play('menuBack'); this.updateSelect(); this.layoutTokens(); }
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
      s.innerHTML = `<div class="sel-header"><div class="sel-title">ELIGE ESCENARIO</div><div class="sel-mode">COMPETITIVO · SIN HAZARDS</div><div class="sel-rules">${rulesHTML(this.game.setup && this.game.setup.mode)}</div></div>
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
      this.onBack = () => { NX.Audio.play('menuBack'); this.show('select', { mode: this.game.setup.mode, cpus: this.game.setup.players.length - 1 }); };
    },

    drawStagePreview(cv, sd) {
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const stub = { stagePlatforms: sd.platforms.map(p => Object.assign({ type: 'solid' }, p)), dynamicSolids: [], fighters: [], frame: 0, stageDef: sd, blast: sd.blast };
      const cam = new NX.Camera(); cam.resize(W, H); cam.padBottom = 0; cam.padTop = 0;
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
      const H = this.game.match && this.game.match.horde;
      const PR = this.game.match && this.game.match.practice;
      const KH = this.game.match && this.game.match.koth;
      const chips = KH ? `<span class="chip chip-hill">REY DE LA COLINA</span><span class="chip">META <b>${Math.round(KH.target / 60)} s</b></span><span class="chip">VIDAS <b>∞</b></span>`
        : H ? `<span class="chip chip-horde">HORDA</span><span class="chip">OLEADA <b>${H.wave}</b>/${H.total}</span><span class="chip">VIDAS <b>∞</b></span>`
        : PR ? `<span class="chip chip-practice">PRÁCTICA</span><span class="chip">MEJOR COMBO <b>${PR.best ? PR.best.toFixed(1) + '%' : '—'}</b></span><span class="chip">VIDAS <b>∞</b></span>`
        : `<span class="chip"><b>${R.stocks}</b> VIDAS</span><span class="chip"><b>${fmtMin(R.minutes)}</b></span><span class="chip chip-red">SIN OBJETOS</span>`;
      s.innerHTML = `<div class="pause-k">PAUSA</div><div class="pause-rules">${chips}</div>`;
      const btns = el('div', 'pause-btns');
      const mk = (t, fn) => { const b = el('button', 'mbtn', t); b.addEventListener('click', () => { NX.Audio.play('menuSelect'); fn(); }); btns.appendChild(b); return b; };
      /* V1.2 · Práctica: reiniciar posiciones y daño sin recargar el escenario. */
      const list = PR ? [
        mk('CONTINUAR', () => this.game.togglePause()),
        mk('REINICIAR POSICIONES (0%)', () => { this.game.match.resetPractice(); this.game.togglePause(); }),
        mk('CAMBIAR LUCHADORES', () => { this.game.togglePause(true); this.game.quitToMenu('select', { mode: 'practice' }); }),
        mk('SALIR AL MENÚ', () => { this.game.togglePause(true); this.game.quitToMenu(); })
      ] : [
        mk('CONTINUAR', () => this.game.togglePause()),
        mk(H ? 'REINICIAR HORDA' : 'REINICIAR COMBATE', () => { this.game.togglePause(true); this.game.startMatch(this.game.setup); }),
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
      if (res.horde) { this.build_hordeResults(res); return; }
      const w = res.winner;
      const s = el('div', 'scr scr-results');
      s.style.setProperty('--pc', w ? w.color : '#fff');
      s.innerHTML = `
        <div class="res-left">
          <div class="res-burst"></div>
          <canvas class="res-art" width="520" height="600"></canvas>
          <div class="res-winner"><small>${res.koth ? 'REY DE LA COLINA' : 'GANADOR'}</small><b>${w ? w.slotDef.name.toUpperCase() : 'EMPATE'}</b><span>${w ? w.tag : ''}${res.sudden ? ' · MUERTE SÚBITA' : ''}</span></div>
        </div>
        <div class="res-right">
          <div class="res-title">RESULTADOS</div>
          <table class="res-table"><thead><tr><th>#</th><th>Luchador</th>${res.koth ? '<th>Colina</th>' : ''}<th>KOs</th><th>Caídas</th><th>SD</th><th>Daño inf.</th><th>Daño rec.</th></tr></thead><tbody></tbody></table>
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
        if (res.koth) tr.appendChild(el('td', 'res-hill', (f.hill / 60).toFixed(1) + ' s'));
        [f.stats.kos, f.stats.falls, f.stats.sds, f.stats.damageDealt.toFixed(1) + '%', f.stats.damageTaken.toFixed(1) + '%'].forEach(v => tr.appendChild(el('td', '', String(v))));
        tb.appendChild(tr);
      });
      const btns = s.querySelector('.res-btns');
      const mk = (t, fn, cls) => { const b = el('button', 'mbtn ' + (cls || ''), t); b.addEventListener('click', () => { NX.Audio.play('menuSelect'); fn(); }); btns.appendChild(b); return b; };
      const list = [
        mk('REVANCHA', () => this.game.startMatch(this.game.setup), 'btn-red'),
        mk('CAMBIAR LUCHADORES', () => this.show('select', { mode: this.game.setup.mode, cpus: this.game.setup.players.length - 1 })),
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

    /* v8 · Resultados de la Horda: tiempo final, récord y estadísticas. */
    build_hordeResults(res) {
      const h = res.horde, p = h.player;
      const prev = hordeBest();
      const record = h.cleared && (!prev || h.time < prev.frames);
      if (record) saveHordeBest({ frames: h.time, fighter: p.slotDef.name, stage: h.stageId });
      const best = record ? { frames: h.time, fighter: p.slotDef.name } : prev;
      const s = el('div', 'scr scr-results scr-horde');
      s.style.setProperty('--pc', '#9b3cff');
      s.innerHTML = `
        <div class="res-left">
          <div class="res-burst"></div>
          <canvas class="res-art" width="520" height="600"></canvas>
          <div class="res-winner"><small>HORDA SUPERADA</small><b>${p.slotDef.name.toUpperCase()}</b><span>${h.waves} OLEADAS</span></div>
        </div>
        <div class="res-right">
          <div class="res-title">¡HORDA COMPLETADA!</div>
          <div class="horde-time"><small>TIEMPO FINAL</small><b>${fmtClock(h.time)}</b>${record ? '<em>¡NUEVO RÉCORD!</em>' : ''}</div>
          <div class="horde-best">Récord: <b>${best ? fmtClock(best.frames) : '—'}</b>${best && best.fighter ? ' · ' + best.fighter : ''}</div>
          <table class="res-table"><tbody>
            <tr><td>Oleadas derrotadas</td><td>${h.waves} / ${h.waves}</td></tr>
            <tr><td>Caídas</td><td>${h.falls}</td></tr>
            <tr><td>Daño infligido</td><td>${h.dealt.toFixed(1)}%</td></tr>
            <tr><td>Daño recibido</td><td>${h.taken.toFixed(1)}%</td></tr>
          </tbody></table>
          <div class="res-btns"></div>
        </div>`;
      const btns = s.querySelector('.res-btns');
      const mk = (t, fn, cls) => { const b = el('button', 'mbtn ' + (cls || ''), t); b.addEventListener('click', () => { NX.Audio.play('menuSelect'); fn(); }); btns.appendChild(b); return b; };
      const list = [
        mk('REINTENTAR', () => this.game.startMatch(this.game.setup), 'btn-red'),
        mk('CAMBIAR LUCHADOR', () => this.show('select', { mode: 'horde' })),
        mk('MENÚ PRINCIPAL', () => { NX.Audio.playMusic('menu'); this.show('main'); })
      ];
      this.root.appendChild(s);
      this.setFocusables(list);
      this.onBack = null;
      this.anim = [{ canvas: s.querySelector('.res-art'), def: p.def, full: true, state: NX.ST.VICTORY, t0: this.tickN }];
      setTimeout(() => NX.Audio.say(record ? 'New record!' : 'Horde complete!', { rate: 0.85 }), 500);
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
