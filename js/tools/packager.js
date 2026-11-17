/* ==========================================================================
 * NEXUS CLASH — js/tools/packager.js
 * Botón "DESCARGAR .ZIP": empaqueta /index.html, /css y /js en un .zip.
 * - Usa JSZip desde CDN (compresión DEFLATE).
 * - Sin conexión, usa un compresor ZIP propio (método STORE + CRC32).
 * - Las fuentes salen de js/tools/bundle.js (funciona con file://); si el
 *   juego se sirve por http(s) se leen los archivos actuales con fetch.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const BUNDLE_PATH = 'js/tools/bundle.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve(); s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  async function getBundle() {
    if (!NX.BUNDLE) await loadScript(BUNDLE_PATH);
    if (!NX.BUNDLE) throw new Error('bundle.js no disponible');
    return NX.BUNDLE;
  }

  /* bundle.js se regenera a partir de su propio contenido: el ZIP siempre
   * incluye un empaquetador funcional. */
  function bundleSource(files, version) {
    return '/* NEXUS CLASH — js/tools/bundle.js (generado automáticamente: copia de todas las fuentes para el botón ZIP) */\n' +
      'window.NX = window.NX || {};\nNX.BUNDLE = ' + JSON.stringify({ version, files }) + ';\n';
  }

  async function freshFiles(files) {
    if (!/^https?:$/.test(location.protocol)) return files;
    const out = Object.assign({}, files);
    await Promise.all(Object.keys(files).map(async p => {
      try { const r = await fetch(p, { cache: 'no-store' }); if (r.ok) out[p] = await r.text(); } catch (e) { /* se conserva la copia del bundle */ }
    }));
    return out;
  }

  /* ---------------- ZIP de respaldo (STORE, sin dependencias) ------------- */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  function storeZip(entries) {
    const enc = new TextEncoder();
    const chunks = [], central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const [name, text] of entries) {
      const nameB = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), nameB, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nameB.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);
      offset += 30 + nameB.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }

  /* ------------------------------ AVISO UI -------------------------------- */
  function toast(msg, ms) {
    let t = document.getElementById('nx-toast');
    if (!t) { t = document.createElement('div'); t.id = 'nx-toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h);
    if (ms) t._h = setTimeout(() => t.classList.remove('on'), ms);
  }

  /* -------------------- DESCARGA PROTEGIDA (v3.1) -------------------------
   * Solo se guarda el hash SHA-256 de la contraseña, nunca el texto. */
  const PASS_HASH = 'b78f9f2e3c37a7ea8ac96257260b15ec9e24617af877a6ca5f9085420881c7f9';
  function sha256Fallback(str) {
    const K = [], H = [], isP = n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    const frac = x => ((x - Math.floor(x)) * 4294967296) | 0;
    for (let n = 2, c = 0; c < 64; n++) if (isP(n)) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c++] = frac(Math.pow(n, 1 / 3)); }
    const bytes = Array.from(new TextEncoder().encode(str)), bl = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bl >>> (i * 8)) & 0xff);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = [];
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
    }
    return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }
  async function sha256(str) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* contexto no seguro: usar la implementación propia */ }
    return sha256Fallback(str);
  }
  let unlocked = false;
  function askPassword() {
    if (unlocked) return Promise.resolve(true);
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'pw-overlay';
      ov.innerHTML = `<form class="pw-box" autocomplete="off">
          <div class="pw-k">DESCARGA PROTEGIDA</div>
          <div class="pw-d">Introduce la contraseña para descargar el proyecto .zip</div>
          <input class="pw-in" type="password" placeholder="Contraseña" aria-label="Contraseña">
          <div class="pw-err" aria-live="polite"></div>
          <div class="pw-btns"><button type="submit" class="pw-ok">DESCARGAR</button><button type="button" class="pw-no">CANCELAR</button></div>
        </form>`;
      document.body.appendChild(ov);
      const form = ov.querySelector('form'), inp = ov.querySelector('.pw-in'), err = ov.querySelector('.pw-err');
      const close = ok => { ov.remove(); resolve(ok); };
      setTimeout(() => inp.focus(), 30);
      ov.querySelector('.pw-no').addEventListener('click', () => { NX.Audio.play('menuBack'); close(false); });
      ov.addEventListener('pointerdown', e => { if (e.target === ov) close(false); });
      inp.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(false); } });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if ((await sha256(inp.value)) === PASS_HASH) { unlocked = true; close(true); return; }
        err.textContent = 'Contraseña incorrecta';
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        NX.Audio.play('menuBack'); inp.select();
      });
    });
  }

  let busy = false;
  async function download() {
    if (busy) return;
    if (!(await askPassword())) return;
    busy = true;
    try {
      toast('Empaquetando proyecto…');
      const b = await getBundle();
      const files = await freshFiles(b.files);
      delete files[BUNDLE_PATH];
      const all = Object.assign({}, files);
      all[BUNDLE_PATH] = bundleSource(files, b.version);
      const names = Object.keys(all).sort();
      let blob, method = 'DEFLATE';
      try {
        if (!window.JSZip) await loadScript(JSZIP_URL);
        const zip = new window.JSZip();
        const root = zip.folder('nexus-clash');
        names.forEach(n => root.file(n, all[n]));
        blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      } catch (e) {
        method = 'STORE (sin conexión)';
        blob = storeZip(names.map(n => ['nexus-clash/' + n, all[n]]));
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nexus-clash.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('ZIP listo · ' + names.length + ' archivos · ' + method, 3500);
      NX.Audio.play('menuSelect');
    } catch (e) {
      toast('No se pudo crear el ZIP: ' + e.message, 5000);
    } finally { busy = false; }
  }

  NX.Packager = { download, storeZip, crc32, sha256, sha256Fallback };
})(window.NX = window.NX || {});
