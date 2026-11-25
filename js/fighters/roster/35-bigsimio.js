/* NEXUS CLASH — js/fighters/roster/35-bigsimio.js · luchador 35 del plantel (ver js/fighters/lib.js). */
(function (NX) {
  'use strict';
  const U = NX.U, R = NX.Render, OUT = NX.Render.OUT;
  const PI = Math.PI, TAU = Math.PI * 2;
  const ST = NX.ST;
  const { shoot, groundWave, hairCap, fighter, glasses } = NX.RosterLib;

  /* ======================================================================
   * v1.1 · BIGSIMIO — Simio del Termo (pesado, lento y con mucho daño)
   * Normales con su TERMO negro; especiales con BANANAS.
   * Pasiva "Simio Molesto": desde 100% entra en cólera hasta perder la vida:
   * partículas de enojo, +15% de velocidad y +15% de daño.
   * ==================================================================== */
  const BANANA = '#ffd23a', RAGE_AT = 100, RAGE_MULT = 1.15;   // V1.2.1: la furia se activa al 100% (antes 110%)
  const RAGE_STATS = new Set(['walk', 'run', 'dash', 'airSpeed']);
  function bananaShape(ctx, s, col) {
    ctx.save();
    ctx.fillStyle = col || BANANA; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.1, s * 0.09); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s, -s * 0.25);
    ctx.quadraticCurveTo(0, s * 0.9, s, -s * 0.3);
    ctx.quadraticCurveTo(0, s * 0.35, -s, -s * 0.25);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(0.8, s * 0.06);
    ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.02); ctx.quadraticCurveTo(0, s * 0.3, s * 0.5, -s * 0.06); ctx.stroke();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath(); ctx.arc(s, -s * 0.3, s * 0.11, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-s, -s * 0.25, s * 0.09, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function bunchShape(ctx, s) {
    [-0.55, 0, 0.55].forEach(a => { ctx.save(); ctx.rotate(a - PI / 2); ctx.translate(s * 0.9, 0); ctx.rotate(PI / 2); bananaShape(ctx, s); ctx.restore(); });
    R.disc(ctx, 0, 0, s * 0.22, '#6a8a2a');
  }
  function peelShape(ctx, s) {
    ctx.save();
    [-1.05, -0.35, 0.35, 1.05].forEach(a => {
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = BANANA; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-s * 0.18, 0); ctx.quadraticCurveTo(-s * 0.25, s * 0.7, 0, s * 1.05); ctx.quadraticCurveTo(s * 0.25, s * 0.7, s * 0.18, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.ellipse(0, s * 0.45, s * 0.07, s * 0.3, 0, 0, TAU); ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-s * 0.1, -s * 0.38, s * 0.2, s * 0.4);
    ctx.restore();
  }
  function bananaDraw(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.4 * U.sign(p.vx || 1)); bananaShape(ctx, p.r * 1.2); ctx.restore(); }
  function bunchDraw(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 0.18 * U.sign(p.vx || 1)); bunchShape(ctx, p.r * 0.75); ctx.restore(); }
  function thermosDraw(ctx, w) {
    const L = w.len, W = w.w;
    const g = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
    g.addColorStop(0, '#0b0b0d'); g.addColorStop(0.32, '#45454e'); g.addColorStop(0.55, '#16161a'); g.addColorStop(1, '#050506');
    ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.rect(-W / 2, -9, W, L - 1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.rect(-W * 0.42, L - 10, W * 0.84, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b9c0c8'; ctx.fillRect(-W / 2, L - 13, W, 2.6); ctx.fillRect(-W / 2, -9, W, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-W * 0.22, -5, W * 0.12, L - 12);
  }
  function rageMark(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * PI / 2);
      ctx.beginPath(); ctx.moveTo(2.5, -9); ctx.quadraticCurveTo(2.5, -2.5, 9, -2.5); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  /* En cólera se le enrojecen la cara y las manos (el suéter y el cabello no cambian). */
  function rageOn(f) {
    f.data.rage = true; f.data.calmPal = f.palette;
    const red = c => { const m = U.mixRgb(U.hexToRgb(c), { r: 235, g: 60, b: 45 }, 0.45); return '#' + [m.r, m.g, m.b].map(v => v.toString(16).padStart(2, '0')).join(''); };
    f.palette = Object.assign({}, f.palette, { skin: red(f.palette.skin), head: red(f.palette.head), hand: red(f.palette.hand) });
  }
  function rageOff(f) { f.data.rage = false; if (f.data.calmPal) f.palette = f.data.calmPal; f.data.calmPal = null; }
  fighter({
    id: 'bigsimio', name: 'BigSimio', title: 'Simio del Termo',
    passive: 'Simio Molesto: al llegar a 100% se enfurece (partículas de enojo), se mueve un 15% más rápido y pega un 15% más fuerte hasta perder la vida.',
    palette: { primary: '#f1efe8', secondary: '#2b3240', skin: '#d9a37a', head: '#d9a37a', hand: '#d9a37a', arms: '#f1efe8', legs: '#2b3240', feet: '#1e1e22', accent: BANANA, hair: '#131315', eye: '#1a1208' },
    stats: { weight: 132, height: 104, width: 50, walk: 2.6, run: 6.0, dash: 6.6, airSpeed: 3.4, gravity: 0.64, fall: 11, fastFall: 16, jump: 12.8, shortHop: 8.4, airJump: 11.8, traction: 0.58 },
    profile: { style: 'heavy', reach: 1.15, power: 1.2, speed: 0.86 },
    meter: { max: RAGE_AT, label: 'RABIA', short: 'RABIA', color: '#ff3a2a', text: f => f.data.rage ? 'SIMIO MOLESTO' : 'RABIA' },
    ai: { recovery: 'up', projectile: 'neutral', range: 90, heavy: true },
    onLifeReset(f) { if (f.data.rage) rageOff(f); },
    onUpdate(f) {
      f.meter = Math.min(RAGE_AT, f.percent);
      const rage = f.inPlay() && f.state !== ST.RESPAWN && f.percent >= RAGE_AT;
      if (rage && !f.data.rage) {
        rageOn(f);
        f.fx('text', f.x, f.y - f.h - 34, { text: '¡SIMIO MOLESTO!', color: '#ff3a2a', size: 24 });
        f.fx('ring', f.x, f.y - f.h / 2, { r: 90, color: '#ff3a2a', w: 6 });
        NX.Audio.play('lethal'); NX.Audio.play('stomp', { pitch: 0.6 }); f.match.camera.shake(9);
      } else if (!rage && f.data.rage) rageOff(f);
      if (f.data.rage && !f.hidden) {
        if (f.tick % 4 === 0) f.match.effects.list.push({ type: 'wisp', x: f.x + U.rand(-f.w * 0.5, f.w * 0.5), y: f.y - U.rand(f.h * 0.3, f.h), vx: U.rand(-0.6, 0.6), vy: -U.rand(1, 2.2), life: 24, max: 24, size: U.rand(4, 8), color: U.pick(['#ff3a2a', '#ff7a3a', '#ffd0c8']) });
        if (f.tick % 10 === 0) f.fx('sparkle', f.x + U.rand(-24, 24), f.y - f.h - 4, { color: '#ff3a2a' });
      }
    },
    statMod(f, k, v) { return f.data.rage && RAGE_STATS.has(k) ? v * RAGE_MULT : v; },
    damageMod(f) { return f.data.rage ? RAGE_MULT : 1; },
    drawOverlay(ctx, f, x, y) {
      if (!f.data || !f.data.rage || f.hidden) return;
      const t = f.tick || 0;
      rageMark(ctx, x + f.facing * f.w * 0.42, y - f.h - 10 + Math.sin(t * 0.2) * 2, 1 + Math.sin(t * 0.35) * 0.15);
    },
    rig: {
      torsoW: 40, hipW: 34, torsoH: 36, torsoRound: 14, headR: 14, neck: 1, armW: 12, upperArm: 19, foreArm: 18, handR: 7,
      thigh: 16, shin: 15, legW: 13, footL: 15, footH: 8,
      weapon: { type: 'thermos', len: 32, w: 11, trail: '#b9c0c8' },
      parts: {
        head(ctx, a) {
          const r = a.rig.headR;
          hairCap(ctx, r, a.pal.hair, { a1: -0.25 });
          /* Cabello negro "tipo Ben 10": gran copete peinado hacia delante con puntas sobre la frente. */
          ctx.fillStyle = a.pal.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(-r * 1.02, -r * 0.1);
          ctx.quadraticCurveTo(-r * 1.15, -r * 1.25, -r * 0.2, -r * 1.42);
          ctx.quadraticCurveTo(r * 0.85, -r * 1.5, r * 1.3, -r * 0.72);
          ctx.lineTo(r * 1.0, -r * 0.62); ctx.lineTo(r * 1.08, -r * 0.18);
          ctx.lineTo(r * 0.74, -r * 0.46); ctx.lineTo(r * 0.66, -r * 0.08);
          ctx.lineTo(r * 0.42, -r * 0.44); ctx.lineTo(r * 0.24, -r * 0.2);
          ctx.quadraticCurveTo(-r * 0.3, -r * 0.6, -r * 0.6, -r * 0.0);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = U.shade(a.pal.hair, 0.4); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 1.0); ctx.quadraticCurveTo(r * 0.1, -r * 1.3, r * 0.95, -r * 0.82); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.75); ctx.quadraticCurveTo(r * 0.2, -r * 0.95, r * 0.7, -r * 0.6); ctx.stroke();
          glasses(ctx, r);
        },
        torso(ctx, a) {
          const r = a.rig;
          /* Suéter blanco de punto: cuello redondo, ochos trenzados y elástico abajo. */
          ctx.fillStyle = '#dcd8cc'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(r.torsoW * 0.08, -r.torsoH + 2, r.torsoW * 0.26, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#cfcabd'; ctx.lineWidth = 1.6;
          [-0.18, 0.28].forEach(cx => {
            ctx.beginPath();
            for (let y = -r.torsoH + 8, i = 0; y < -8; y += 4, i++) { const x = r.torsoW * cx + (i % 2 ? 2.2 : -2.2); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
            ctx.stroke();
          });
          ctx.fillStyle = '#dcd8cc'; ctx.fillRect(-r.hipW / 2, -6, r.hipW, 6);
          ctx.strokeStyle = '#bdb8aa'; ctx.lineWidth = 1;
          for (let x = -r.hipW / 2 + 3; x < r.hipW / 2; x += 3.5) { ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, 0); ctx.stroke(); }
        },
        weapon(ctx, f, w) {
          if (f.move && /^special/.test(f.move.def.key)) return;
          thermosDraw(ctx, w);
        },
        front(ctx, a) {
          const mv = a.f.move;
          if (!mv || !/^special/.test(mv.def.key)) return;
          const h = a.J.haF, key = mv.def.key;
          ctx.save(); ctx.translate(h.x, h.y);
          if (key === 'special_neutral') { const k = Math.min(1, (mv.charge || 0) / 60); if (mv.frame < 15) { ctx.scale(1 + 0.45 * k, 1 + 0.45 * k); bunchShape(ctx, 8); } }
          else if (key === 'special_side') { if (mv.frame < 11) { ctx.rotate(0.5); ctx.translate(0, -6); peelShape(ctx, 9); } }
          else if (key === 'special_down') { ctx.rotate(-0.7); ctx.translate(14, 0); bananaShape(ctx, 17); }
          ctx.restore();
        }
      }
    },
    specials: {
      /* Racimo Explosivo: cargable; el racimo cae en arco y estalla en 3 bananas. */
      neutral: {
        frames: 42, pose: 'overhead', limb: [], charge: { at: 9, max: 60, key: 'special', mult: 1 },
        onCharge(f, mv) { if (mv.charge % 10 === 0) f.fx('sparkle', f.x + f.facing * 10, f.y - f.h - 6, { color: BANANA }); },
        onFrame(f, fr, mv) {
          if (fr !== 14) return;
          const k = (mv.charge || 0) / 60;
          NX.Audio.play('swing', { pitch: 0.7, size: 1 + k });
          shoot(f, { ox: 22, oy: -f.h * 0.9, speed: 5.5 + 3.5 * k, vy: -6.5 - 1.5 * k, gravity: 0.36, r: 14 + 4 * k, life: 120, dmg: 9 + 9 * k, ang: 50, bkb: 35 + 15 * k, kbg: 62 + 22 * k,
            effect: 'heavy', color: BANANA, glow: false, passCollide: true, data: { k }, draw: bunchDraw,
            onDestroy(p, why, m) {
              if (why === 'out') return;
              m.effects.spawn('pop', p.x, p.y, { color: BANANA, r: 20 });
              NX.Audio.play('stomp', { pitch: 1.4 });
              [-1, 0, 1].forEach(i => p.owner.spawnProjectile({ x: p.x, y: p.y - 8, vx: i * 3.4, vy: i === 0 ? -8 : -6, gravity: 0.45, r: 8, life: 50, dmg: 3 + 2 * p.data.k, ang: 70, bkb: 25, kbg: 40,
                effect: 'hit', color: BANANA, glow: false, draw: bananaDraw }));
            } });
          if (k > 0.9) f.fx('text', f.x, f.y - f.h - 18, { text: '¡RACIMO MÁX!', color: BANANA, size: 20 });
        }
      },
      /* Cáscara Traicionera: deja hasta 2 cáscaras; quien las pisa resbala. */
      side: {
        frames: 36, pose: 'shoot', limb: [],
        onFrame(f, fr) {
          if (fr !== 11) return;
          NX.Audio.play('swing', { pitch: 1.3 });
          const peels = (f.data.peels || []).filter(p => p.active);
          while (peels.length >= 2) peels.shift().destroy('replace');
          const peel = shoot(f, { ox: 22, oy: -f.h * 0.55, speed: 6.5, vy: -4.5, gravity: 0.42, r: 9, life: 720, dmg: 5, ang: 60, bkb: 30, kbg: 40,
            effect: 'hit', color: BANANA, glow: false, passCollide: true, data: {},
            onGround(q, pl) {
              q.vx = 0; q.vy = 0; q.gravity = 0; q.stageCollide = false; q.harmless = true;
              q.data.landed = true; q.data.plat = pl; q.data.ox = q.x - pl.x; q.y = pl.y - q.r - 0.5;
              NX.Audio.play('land', { pitch: 1.6 });
            },
            update(q, m) {
              if (!q.data.landed) return;
              const pl = q.data.plat;
              if (pl.removed) { q.destroy('stage'); return false; }
              q.x = pl.x + q.data.ox; q.y = pl.y - q.r - 0.5;
              for (const t of m.fighters) {
                if (t === q.owner || !t.inPlay() || t.ground !== pl || !t.canBeHit()) continue;
                if (Math.abs(t.x - q.x) < 16 + t.w * 0.3) {
                  q.owner.hitTarget(t, { dmg: 7, ang: 88, fkb: 62, bkb: 0, kbg: 0, effect: 'hit' }, { x: q.x, y: q.y });
                  m.effects.spawn('text', t.x, t.y - t.h - 12, { text: '¡RESBALÓN!', color: BANANA, size: 18 });
                  NX.Audio.play('spin', { pitch: 1.7 });
                  q.destroy('trigger'); return false;
                }
              }
            },
            draw(ctx, q) {
              ctx.save(); ctx.translate(q.x, q.y + (q.data.landed ? q.r - 4 : 0));
              if (q.data.landed) ctx.scale(1.1, 0.75); else ctx.rotate(q.t * 0.35);
              peelShape(ctx, 10); ctx.restore();
            } });
          peels.push(peel); f.data.peels = peels;
        }
      },
      /* Banana Cohete: sube montado en una banana gigante (dirigible). */
      up: {
        frames: 62, pose: 'rise', limb: [], helplessLag: 22, drift: 0.5,
        hitboxes: [
          { f: [6, 9], x: 0, y: -50, r: 32, dmg: 7, ang: 80, bkb: 55, kbg: 45, effect: 'heavy', group: 1 },
          { f: [13, 25], x: 6, y: -60, r: 26, dmg: 3.5, ang: 78, bkb: 45, kbg: 30, effect: 'hit', group: 2 },
          { f: [27, 30], x: 10, y: -84, r: 32, dmg: 8, ang: 70, bkb: 50, kbg: 88, effect: 'heavy', group: 3 }],
        onFrame(f, fr, mv) {
          if (fr === 5) {
            NX.Audio.play('explosion', { pitch: 1.7 });
            f.spawnProjectile({ x: f.x, y: f.y + 4, vx: 0, vy: 0, r: 1, life: 30, dmg: 0, harmless: true, pierce: true, stageCollide: false, reflectable: false, absorbable: false, destructible: false, glow: false, data: { mv },
              update(p) { const o = p.owner; if (o.move !== p.data.mv) { p.destroy('end'); return false; } p.x = o.x; p.y = o.y + 4; },
              onDestroy() {},
              draw(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.owner.facing, 1); ctx.rotate(-0.12); bananaShape(ctx, 38); ctx.restore(); } });
          }
          if (fr >= 6 && fr <= 26) {
            f.vy = -12.5; mv.velY = true;
            f.vx = U.approach(f.vx, f.input.x * 3.4, 0.4); mv.velX = true;
            if (fr % 2 === 0) f.fx('flame', f.x - f.facing * 34, f.y + 2, { scale: 1.2 });
          } else if (fr > 26 && fr <= 32) { f.vy = U.approach(f.vy, 0, 1.6); mv.velY = true; }
        }
      },
      /* Pisotón Platanero: golpe al suelo con una banana gigante y ondas de cáscara. En el aire cae en picado. */
      down: {
        frames: 46, pose: 'slam', limb: [],
        onStart(f, mv) { mv.data.air = !f.ground; if (mv.data.air) f.vy = Math.min(f.vy, -3); },
        onFrame(f, fr, mv) {
          if (mv.data.air) {
            if (fr >= 8) {
              f.vy = 14; f.vx *= 0.9; mv.velY = true;
              mv.extraBoxes = [{ x: 0, y: -10, r: 30, dmg: 12, ang: 270, bkb: 30, kbg: 70, effect: 'heavy', meteor: true }];
            }
            return;
          }
          if (fr === 18) {
            NX.Audio.play('stomp'); NX.Audio.play('explosion', { pitch: 0.7 }); f.match.camera.shake(10);
            f.fx('dust', f.x + 40, f.y, { n: 6 }); f.fx('dust', f.x - 40, f.y, { n: 6 });
            f.fx('debris', f.x, f.y, { n: 6, color: BANANA });
            if (f.ground) [-1, 1].forEach(d => groundWave(f, d, { r: 14, speed: 7.5, life: 24, dmg: 6, ang: 75, bkb: 45, kbg: 55, color: BANANA }));
          }
          mv.extraBoxes = (fr >= 18 && fr <= 21) ? [
            { x: 36, y: -18, r: 34, dmg: 14, ang: 75, bkb: 50, kbg: 82, effect: 'heavy' },
            { x: -36, y: -18, r: 34, dmg: 14, ang: 75, bkb: 50, kbg: 82, effect: 'heavy', reverse: true }] : null;
        },
        onLand(f, mv) {
          if (!mv.data.air) return 'continue';
          mv.data.air = false; mv.extraBoxes = null; mv.hitSets = {}; mv.frame = 17;
          return 'continue';
        }
      }
    }
  });

})(window.NX = window.NX || {});
