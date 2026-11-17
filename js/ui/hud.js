/* ==========================================================================
 * NEXUS CLASH — js/ui/hud.js
 * HUD estilo arena competitiva: cronómetro 07:00.00, cuenta gigante de los
 * últimos 5 s, paneles con retrato, nombre, 3 stocks, porcentaje con color
 * dinámico y vibración, barras especiales de medidor y "ELIMINATED".
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U;

  const PCT_STOPS = [
    [0, { r: 255, g: 255, b: 255 }], [40, { r: 255, g: 238, b: 140 }], [80, { r: 255, g: 186, b: 60 }],
    [120, { r: 255, g: 118, b: 30 }], [160, { r: 232, g: 40, b: 30 }], [220, { r: 140, g: 0, b: 12 }]
  ];
  function pctColor(p) {
    for (let i = 1; i < PCT_STOPS.length; i++) {
      if (p <= PCT_STOPS[i][0]) {
        const a = PCT_STOPS[i - 1], b = PCT_STOPS[i];
        const c = U.mixRgb(a[1], b[1], (p - a[0]) / (b[0] - a[0]));
        return `rgb(${c.r},${c.g},${c.b})`;
      }
    }
    const c = PCT_STOPS[PCT_STOPS.length - 1][1];
    return `rgb(${c.r},${c.g},${c.b})`;
  }

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function fmtTime(frames) {
    const total = Math.max(0, frames) / 60;
    const m = Math.floor(total / 60), s = Math.floor(total % 60), cs = Math.floor((total * 100) % 100);
    return { m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0'), cs: String(cs).padStart(2, '0') };
  }

  const HUD = {
    init() {
      this.root = document.getElementById('hud');
      this.root.innerHTML = '';
      this.timerEl = el('div', 'hud-timer');
      this.timerEl.innerHTML = '<span class="tm">07</span><span class="colon">:</span><span class="ts">00</span><span class="tc">.00</span>';
      this.rulesEl = el('div', 'hud-rules', '<b>3</b> STOCKS <i></i> <b>7:00</b> <i></i> SIN OBJETOS');
      this.panelsEl = el('div', 'hud-panels');
      this.bigEl = el('div', 'hud-bigcount');
      this.root.append(this.timerEl, this.rulesEl, this.panelsEl, this.bigEl);
      this.annEl = document.getElementById('announcer');
      this.panels = [];
      this.lastTimer = '';
    },

    show() { this.root.classList.remove('hidden'); },
    hide() { this.root.classList.add('hidden'); this.annEl.innerHTML = ''; this.bigEl.innerHTML = ''; },

    build(match) {
      this.match = match;
      const R = match.rules;
      this.rulesEl.innerHTML = `<b>${R.stocks}</b> ${R.stocks === 1 ? 'STOCK' : 'STOCKS'} <i></i> <b>${R.minutes ? R.minutes + ':00' : '∞'}</b> <i></i> SIN OBJETOS`;
      this.timerEl.className = 'hud-timer' + (match.infiniteTime ? ' inf' : '');
      this.timerEl.innerHTML = (match.infiniteTime ? '<span class="infs">∞</span>' : '') + '<span class="tm">07</span><span class="colon">:</span><span class="ts">00</span><span class="tc">.00</span>';
      this.panelsEl.innerHTML = '';
      this.panels = [];
      this.panelsEl.style.setProperty('--n', match.fighters.length);
      this.panelsEl.dataset.n = match.fighters.length;
      match.fighters.forEach(f => { const P = this.makePanel(f); this.panelsEl.appendChild(P.p); this.panels.push(P); });
      this.rulesEl.classList.toggle('horde', !!match.horde);
      if (match.horde) this.setWave(match.horde.wave, match.horde.total);
      this.lastTimer = '';
      this.bigEl.innerHTML = '';
      this.annEl.innerHTML = '';
      match.on('announce', a => this.announce(a.text, a.style, a.say));
      match.on('finalCount', n => this.finalCount(n));
      match.on('eliminated', f => this.markEliminated(f));
      match.on('ko', d => this.flashPanel(d.f));
      match.on('sudden', () => this.rebuildStocks());
      match.on('wave', d => { this.replacePanel(d.idx, d.f); this.setWave(d.wave, d.total); });
      this.update(match);
    },

    makePanel(f) {
      const p = el('div', 'hud-panel');
      p.style.setProperty('--pc', f.color);
      const port = el('canvas', 'hud-portrait'); port.width = 120; port.height = 120;
      NX.Render.drawPortrait(port, f.def);
      const info = el('div', 'hud-info');
      const name = el('div', 'hud-name', f.def.name.toUpperCase());
      const many = f.stocks > 5 || !!f.infiniteStocks;
      const tag = el('div', 'hud-tag', f.tag);
      if (f.boss) p.classList.add('boss');
      const pct = el('div', 'hud-pct', '<span class="pi">0</span><span class="pd">.0</span><span class="ps">%</span>');
      const stocks = el('div', 'hud-stocks');
      const icons = [];
      for (let i = 0; i < (many ? 1 : f.stocks); i++) {
        const c = el('canvas', 'hud-stock'); c.width = 26; c.height = 26;
        NX.Render.drawStockIcon(c, f.slotDef, f.color);
        stocks.appendChild(c); icons.push(c);
      }
      const stockX = many ? el('span', 'hud-stock-x', f.infiniteStocks ? '∞' : '×' + f.stocks) : null;
      if (stockX) stocks.appendChild(stockX);
      let meter = null, meterFill = null, meterLabel = null;
      if (f.def.meter) {
        meter = el('div', 'hud-meter');
        meter.style.setProperty('--mc', f.def.meter.color || '#fff');
        meterFill = el('div', 'hud-meter-fill');
        meterLabel = el('div', 'hud-meter-label', f.def.meter.label || 'MEDIDOR');
        meter.append(meterFill, meterLabel);
      }
      const elim = el('div', 'hud-elim', 'ELIMINATED');
      info.append(tag, name);
      p.append(port, info, pct, stocks);
      if (meter) p.appendChild(meter);
      p.appendChild(elim);
      return { f, p, pct, pi: pct.querySelector('.pi'), pd: pct.querySelector('.pd'), icons, stockX, many, meterFill, meterLabel, port, name, def: f.def, last: {} };
    },

    /* v8 · Horda: cambia el panel del rival al entrar una nueva oleada. */
    replacePanel(i, f) {
      const old = this.panels[i];
      if (!old) return;
      const P = this.makePanel(f);
      old.p.replaceWith(P.p);
      this.panels[i] = P;
      this.update(this.match);
    },
    setWave(w, total) {
      this.rulesEl.innerHTML = `HORDA <i></i> OLEADA <b>${w}</b>/${total}${w >= total ? ' <i></i> <b class="boss-tag">JEFE</b>' : ''}`;
    },

    rebuildStocks() {
      for (const P of this.panels) {
        P.icons.forEach((c, i) => { c.style.display = i < P.f.stocks ? '' : 'none'; c.classList.remove('lost'); });
        if (P.stockX) P.stockX.textContent = '×' + P.f.stocks;
        P.p.classList.toggle('eliminated', P.f.eliminated);
      }
      this.timerEl.classList.add('sudden');
      this.timerEl.innerHTML = '<span class="sd">SUDDEN DEATH</span>';
    },

    update(match) {
      if (!this.panels.length) return;
      if (!match.suddenDeath) {
        const t = fmtTime(match.timer);
        if (match.infiniteTime) t.cs = '00';
        const key = t.m + t.s + t.cs;
        if (key !== this.lastTimer) {
          this.lastTimer = key;
          this.timerEl.querySelector('.tm').textContent = t.m;
          this.timerEl.querySelector('.ts').textContent = t.s;
          this.timerEl.querySelector('.tc').textContent = '.' + t.cs;
          this.timerEl.classList.toggle('low', !match.infiniteTime && match.timer <= 60 * 60);
        }
      }
      for (const P of this.panels) {
        const f = P.f, L = P.last;
        const pct = Math.min(999.9, f.percent);
        const iv = Math.floor(pct), dv = Math.floor((pct * 10) % 10);
        const dead = f.state === NX.ST.DEAD;
        if (L.iv !== iv || L.dv !== dv || L.dead !== dead) {
          P.pi.textContent = dead ? '' : iv; P.pd.textContent = dead ? '' : '.' + dv;
          P.pct.style.color = pctColor(pct);
          P.pct.classList.toggle('hidden-pct', dead);
          L.iv = iv; L.dv = dv; L.dead = dead;
        }
        const shake = f.hudShake > 0 ? f.hudShake * 0.6 : (pct > 100 ? Math.min(3, (pct - 100) / 40) : 0);
        if (shake > 0.2) P.pct.style.transform = `translate(${U.rand(-shake, shake).toFixed(1)}px, ${U.rand(-shake, shake).toFixed(1)}px) scale(${1 + (f.hudShake > 0 ? 0.08 : 0)})`;
        else if (L.shook) P.pct.style.transform = '';
        L.shook = shake > 0.2;
        if (L.stocks !== f.stocks && !f.infiniteStocks) {
          if (P.many) { P.stockX.textContent = '×' + f.stocks; P.icons[0].classList.toggle('lost', f.stocks <= 0); }
          else P.icons.forEach((c, i) => { c.classList.toggle('lost', i >= f.stocks); });
          L.stocks = f.stocks;
        }
        if (P.def !== f.def) {
          P.def = f.def;
          NX.Render.drawPortrait(P.port, f.def);
          P.name.textContent = f.def.name.toUpperCase();
          P.p.classList.remove('swap'); void P.p.offsetWidth; P.p.classList.add('swap');
        }
        if (P.meterFill && f.def.meter) {
          const k = f.meterMax ? f.meter / f.meterMax : 0;
          const w = Math.round(k * 1000) / 10;
          if (L.meter !== w) { P.meterFill.style.width = w + '%'; P.p.classList.toggle('meter-full', k >= 1); L.meter = w; }
          const lbl = f.def.meter.text ? f.def.meter.text(f) : f.def.meter.label;
          if (L.mlabel !== lbl) { P.meterLabel.textContent = lbl; L.mlabel = lbl; }
        }
        if (L.elim !== f.eliminated) { P.p.classList.toggle('eliminated', f.eliminated); L.elim = f.eliminated; }
      }
    },

    flashPanel(f) {
      const P = this.panels.find(x => x.f === f);
      if (!P) return;
      P.p.classList.remove('ko-flash'); void P.p.offsetWidth; P.p.classList.add('ko-flash');
    },
    markEliminated(f) {
      const P = this.panels.find(x => x.f === f);
      if (P) P.p.classList.add('eliminated');
    },

    announce(text, style, say) {
      const a = el('div', 'ann ann-' + (style || 'default'));
      a.setAttribute('data-text', text);
      a.textContent = text;
      this.annEl.innerHTML = '';
      this.annEl.appendChild(a);
      const life = style === 'count' ? 900 : (style === 'go' ? 1100 : 2200);
      setTimeout(() => { if (a.parentNode) a.classList.add('out'); }, life);
      setTimeout(() => { if (a.parentNode) a.remove(); }, life + 400);
      if (say) NX.Audio.say(say, { rate: style === 'count' ? 1.0 : 0.85 });
    },

    finalCount(n) {
      const d = el('div', 'big-n', String(n));
      this.bigEl.innerHTML = ''; this.bigEl.appendChild(d);
      setTimeout(() => d.remove(), 950);
    }
  };

  NX.HUD = HUD;
  NX.pctColor = pctColor;
  NX.fmtTime = fmtTime;
})(window.NX = window.NX || {});
