/* ==========================================================================
 * NEXUS CLASH — js/engine/camera.js
 * Cámara dinámica: zoom-in cuando los luchadores están cerca, zoom-out para
 * encuadrar a todos, temblor de pantalla y enfoque dramático en golpes letales.
 * ========================================================================== */
(function (NX) {
  'use strict';
  const U = NX.U;

  class Camera {
    constructor() {
      this.x = 0; this.y = -200; this.zoom = 0.8;
      this.w = 1280; this.h = 720; this.padBottom = 130;
      this.shakeAmt = 0; this.sx = 0; this.sy = 0;
      this.focus = null; this.focusTimer = 0; this.focusZoom = 1.4;
      this.initialized = false;
    }
    resize(w, h) { this.w = w; this.h = h; this.padBottom = Math.min(150, h * 0.18); }
    shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
    focusOn(target, frames, zoomMul) { this.focus = target; this.focusTimer = frames; this.focusZoom = zoomMul || 1.4; }

    computeTarget(match) {
      const st = match.stageDef, cb = st.camera;
      const pts = [];
      for (const f of match.fighters) {
        if (!f.inPlay() || f.hidden) continue;
        pts.push(f);
      }
      let minX, maxX, minY, maxY;
      if (!pts.length) {
        minX = cb.left + 200; maxX = cb.right - 200; minY = cb.top + 200; maxY = cb.bottom - 100;
      } else {
        minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
        for (const f of pts) {
          const x = U.clamp(f.x, cb.left, cb.right), y = U.clamp(f.y, cb.top, cb.bottom);
          minX = Math.min(minX, x - 150); maxX = Math.max(maxX, x + 150);
          minY = Math.min(minY, y - f.h - 150); maxY = Math.max(maxY, y + 90);
        }
      }
      const viewH = this.h - this.padBottom * 0.55;
      const minW = 1040, minH = 585;
      let bw = Math.max(maxX - minX, minW), bh = Math.max(maxY - minY, minH);
      const aspect = this.w / viewH;
      if (bw / bh > aspect) bh = bw / aspect; else bw = bh * aspect;
      let zoom = this.w / bw;
      const zMin = Math.min(this.w / (cb.right - cb.left), viewH / (cb.bottom - cb.top));
      zoom = U.clamp(zoom, zMin, (this.w / 780));
      let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const halfW = this.w / zoom / 2, halfH = viewH / zoom / 2;
      cx = (cb.right - cb.left) / 2 < halfW ? (cb.left + cb.right) / 2 : U.clamp(cx, cb.left + halfW, cb.right - halfW);
      cy = (cb.bottom - cb.top) / 2 < halfH ? (cb.top + cb.bottom) / 2 : U.clamp(cy, cb.top + halfH, cb.bottom - halfH);
      cy += (this.padBottom * 0.28) / zoom;
      return { x: cx, y: cy, zoom };
    }

    snap(match) { const t = this.computeTarget(match); this.x = t.x; this.y = t.y; this.zoom = t.zoom; this.initialized = true; }

    update(match) {
      if (!this.initialized) this.snap(match);
      let t = this.computeTarget(match);
      if (this.focusTimer > 0 && this.focus) {
        this.focusTimer--;
        const fx = this.focus.x != null ? this.focus.x : 0;
        const fy = this.focus.h ? this.focus.y - this.focus.h / 2 : this.focus.y;
        t = { x: fx, y: fy, zoom: Math.min(t.zoom * this.focusZoom, this.w / 420) };
        this.x += (t.x - this.x) * 0.25; this.y += (t.y - this.y) * 0.25; this.zoom += (t.zoom - this.zoom) * 0.2;
      } else {
        this.x += (t.x - this.x) * 0.08; this.y += (t.y - this.y) * 0.08; this.zoom += (t.zoom - this.zoom) * 0.06;
      }
      if (this.shakeAmt > 0.3) {
        this.sx = U.rand(-1, 1) * this.shakeAmt; this.sy = U.rand(-1, 1) * this.shakeAmt;
        this.shakeAmt *= 0.86;
      } else { this.sx = 0; this.sy = 0; this.shakeAmt = 0; }
    }

    apply(ctx, dpr) {
      const z = this.zoom;
      ctx.setTransform(z * dpr, 0, 0, z * dpr, (this.w / 2 - this.x * z + this.sx) * dpr, (this.h / 2 - this.y * z + this.sy) * dpr);
    }
    worldToScreen(x, y) {
      return { x: (x - this.x) * this.zoom + this.w / 2 + this.sx, y: (y - this.y) * this.zoom + this.h / 2 + this.sy };
    }
    screenToWorld(x, y) {
      return { x: (x - this.w / 2 - this.sx) / this.zoom + this.x, y: (y - this.h / 2 - this.sy) / this.zoom + this.y };
    }
    viewRect() {
      const hw = this.w / this.zoom / 2, hh = this.h / this.zoom / 2;
      return { left: this.x - hw, right: this.x + hw, top: this.y - hh, bottom: this.y + hh };
    }
  }

  NX.Camera = Camera;
})(window.NX = window.NX || {});
