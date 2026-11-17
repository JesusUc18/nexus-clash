/* ==========================================================================
 * NEXUS CLASH — js/engine/audio.js
 * Sintetizador Web Audio API (SFX + música procedural original) y
 * narrador con SpeechSynthesis.
 * ========================================================================== */
(function (NX) {
  'use strict';

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ----------------------- PISTAS MUSICALES ORIGINALES -------------------- */
  const TRACKS = {
    menu: {
      bpm: 118, bars: 4,
      chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
      roots: [45, 41, 36, 43],
      kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,1,0],
      bass: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0],
      lead: [
        [69,0,0,72, 0,0,71,0, 69,0,67,0, 64,0,0,0],
        [65,0,0,69, 0,0,72,0, 74,0,72,0, 69,0,0,0],
        [67,0,0,64, 0,0,67,0, 72,0,71,0, 67,0,0,0],
        [71,0,74,0, 71,0,67,0, 69,0,0,0, 0,0,0,0]
      ],
      leadWave: 'triangle', pad: true
    },
    battle: {
      bpm: 156, bars: 4,
      chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 63, 66]],
      roots: [40, 36, 38, 35],
      kick: [1,0,0,0, 1,0,0,0, 1,0,0,1, 1,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0],
      hat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      bass: [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,0,1],
      lead: [
        [76,0,79,0, 83,0,81,79, 0,76,0,74, 76,0,0,0],
        [72,0,76,0, 79,0,76,0, 84,0,83,0, 79,0,76,0],
        [74,0,78,0, 81,0,78,0, 86,0,85,83, 81,0,0,0],
        [75,0,78,0, 83,0,81,0, 78,0,75,0, 71,0,74,0]
      ],
      leadWave: 'square', pad: false
    },
    sudden: {
      bpm: 176, bars: 2,
      chords: [[64, 67, 70], [63, 66, 70]],
      roots: [40, 39],
      kick: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
      snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,1],
      hat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      bass: [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,0],
      lead: [
        [88,0,87,0, 88,0,82,0, 88,0,87,0, 85,0,82,0],
        [87,0,85,0, 87,0,82,0, 87,0,85,0, 82,0,79,0]
      ],
      leadWave: 'sawtooth', pad: false
    },
    victory: {
      bpm: 132, bars: 2, once: true,
      chords: [[60, 64, 67], [65, 69, 72]],
      roots: [36, 41],
      kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      bass: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      lead: [
        [72,0,76,0, 79,0,84,0, 0,0,79,0, 84,0,0,0],
        [81,0,0,77, 0,0,81,0, 84,0,0,0, 0,0,0,0]
      ],
      leadWave: 'square', pad: true
    }
  };

  class AudioEngine {
    constructor() {
      this.ctx = null; this.muted = false; this.musicVol = 0.32; this.sfxVol = 0.9;
      this.track = null; this.step = 0; this.nextTime = 0; this.timer = null;
      this.voice = null; this.voicesReady = false; this.lastSfx = {};
      if ('speechSynthesis' in window) {
        const pick = () => { this.voice = this.pickVoice(); this.voicesReady = true; };
        pick();
        window.speechSynthesis.onvoiceschanged = pick;
      }
    }

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.ratio.value = 4;
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.85;
      this.sfx = c.createGain(); this.sfx.gain.value = this.sfxVol;
      this.music = c.createGain(); this.music.gain.value = this.musicVol;
      this.sfx.connect(this.comp); this.music.connect(this.comp);
      this.comp.connect(this.master); this.master.connect(c.destination);
      const len = c.sampleRate * 2;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }

    unlock() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (this.pendingTrack && this.ctx) { const t = this.pendingTrack; this.pendingTrack = null; this.playMusic(t); }
    }

    setMusic(on) {
      this.musicOff = !on;
      if (!on) this.stopMusic();
      else if (this.wantTrack) { const t = this.wantTrack; this.trackName = null; this.playMusic(t); }
    }
    setNarrator(on) { this.narratorOff = !on; if (!on && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.02);
      if (this.muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      document.body.classList.toggle('muted', this.muted);
      return this.muted;
    }

    /* ---------------------------- PRIMITIVAS ----------------------------- */
    tone(o) {
      const c = this.ctx; if (!c) return;
      const t0 = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f0, t0);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
      const v = o.vol == null ? 0.3 : o.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      let node = osc;
      if (o.filter) {
        const f = c.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1200; f.Q.value = o.q || 1;
        osc.connect(f); node = f;
      }
      node.connect(g); g.connect(o.dest || this.sfx);
      osc.start(t0); osc.stop(t0 + o.dur + 0.02);
    }

    noise(o) {
      const c = this.ctx; if (!c) return;
      const t0 = c.currentTime + (o.delay || 0);
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      src.playbackRate.value = o.rate || 1;
      const f = c.createBiquadFilter(); f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.f0 || 1000, t0);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
      f.Q.value = o.q || 0.8;
      const g = c.createGain(); const v = o.vol == null ? 0.3 : o.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      src.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
      src.start(t0, Math.random() * 1.5); src.stop(t0 + o.dur + 0.02);
    }

    /* ------------------------------ SFX ---------------------------------- */
    play(name, o) {
      if (!this.ctx || this.muted) return;
      o = o || {};
      const now = this.ctx.currentTime;
      if (this.lastSfx[name] && now - this.lastSfx[name] < 0.025) return;
      this.lastSfx[name] = now;
      const p = o.pitch || 1;
      switch (name) {
        case 'hit': {
          const d = Math.min(30, o.dmg || 5), k = d / 30;
          this.noise({ dur: 0.08 + k * 0.18, f0: 2600 - k * 1500, f1: 300, q: 0.7, vol: 0.25 + k * 0.35 });
          this.tone({ type: 'sine', f0: (170 - k * 90) * p, f1: 40, dur: 0.12 + k * 0.25, vol: 0.4 + k * 0.4 });
          if (d > 14) this.tone({ type: 'square', f0: 90, f1: 30, dur: 0.3, vol: 0.18, filter: 'lowpass', ff: 600 });
          if (o.effect === 'slash') this.noise({ dur: 0.12, f0: 6000, f1: 2000, filter: 'highpass', vol: 0.22 });
          if (o.effect === 'fire') this.noise({ dur: 0.35, f0: 900, f1: 200, q: 0.4, vol: 0.25, delay: 0.02 });
          if (o.effect === 'elec') { for (let i = 0; i < 4; i++) this.tone({ type: 'sawtooth', f0: U.rand(900, 2200), f1: 300, dur: 0.05, vol: 0.12, delay: i * 0.04 }); }
          if (o.effect === 'dark' || o.effect === 'magic') this.tone({ type: 'triangle', f0: 600 * p, f1: 120, dur: 0.3, vol: 0.2 });
          if (o.effect === 'water') this.noise({ dur: 0.25, f0: 500, f1: 1800, q: 2, vol: 0.2 });
          break;
        }
        case 'weak': this.noise({ dur: 0.05, f0: 3000, f1: 1200, vol: 0.18 }); this.tone({ f0: 220, f1: 120, dur: 0.06, vol: 0.2 }); break;
        case 'swing': this.noise({ dur: 0.12 + (o.size || 0) * 0.1, f0: 900 * p, f1: 3500 * p, q: 1.6, filter: 'bandpass', vol: 0.14 }); break;
        case 'slash': this.noise({ dur: 0.16, f0: 2500 * p, f1: 7000, q: 2.2, vol: 0.18 }); this.tone({ type: 'sawtooth', f0: 1400 * p, f1: 500, dur: 0.1, vol: 0.06 }); break;
        case 'jump': this.tone({ type: 'square', f0: 220 * p, f1: 520 * p, dur: 0.09, vol: 0.08, filter: 'lowpass', ff: 1800 }); break;
        case 'airjump': this.tone({ type: 'triangle', f0: 380 * p, f1: 900 * p, dur: 0.12, vol: 0.12 }); this.noise({ dur: 0.1, f0: 1500, f1: 4000, vol: 0.06 }); break;
        case 'land': this.noise({ dur: 0.07, f0: 400, f1: 120, vol: 0.18, filter: 'lowpass' }); break;
        case 'dash': this.noise({ dur: 0.1, f0: 700, f1: 200, vol: 0.12, filter: 'lowpass' }); break;
        case 'shield': this.tone({ type: 'sine', f0: 520, f1: 760, dur: 0.12, vol: 0.12 }); break;
        case 'shieldHit': this.tone({ type: 'triangle', f0: 900, f1: 500, dur: 0.12, vol: 0.2 }); this.noise({ dur: 0.06, f0: 3000, vol: 0.12 }); break;
        case 'shieldBreak':
          this.tone({ type: 'square', f0: 1200, f1: 80, dur: 0.6, vol: 0.25 });
          this.noise({ dur: 0.5, f0: 5000, f1: 200, vol: 0.3 });
          for (let i = 0; i < 5; i++) this.tone({ type: 'sine', f0: 1800 - i * 200, dur: 0.12, vol: 0.12, delay: 0.25 + i * 0.07 });
          break;
        case 'grab': this.noise({ dur: 0.06, f0: 1200, f1: 600, vol: 0.2 }); this.tone({ f0: 300, f1: 200, dur: 0.06, vol: 0.15 }); break;
        case 'throw': this.noise({ dur: 0.2, f0: 600, f1: 2400, vol: 0.18 }); break;
        case 'dodge': this.noise({ dur: 0.14, f0: 2000, f1: 5000, q: 3, vol: 0.09 }); break;
        case 'ledge': this.tone({ type: 'triangle', f0: 300, f1: 200, dur: 0.07, vol: 0.12 }); this.noise({ dur: 0.05, f0: 1500, vol: 0.1 }); break;
        case 'clank': this.tone({ type: 'square', f0: 1600, f1: 1400, dur: 0.15, vol: 0.15 }); this.tone({ type: 'square', f0: 2410, f1: 2300, dur: 0.12, vol: 0.08 }); break;
        case 'reflect': this.tone({ type: 'sawtooth', f0: 800, f1: 2400, dur: 0.15, vol: 0.14 }); this.tone({ type: 'sine', f0: 2400, f1: 1800, dur: 0.2, vol: 0.12, delay: 0.05 }); break;
        case 'charge': this.tone({ type: 'sawtooth', f0: 200 * p, f1: 400 * p, dur: 0.12, vol: 0.05, filter: 'lowpass', ff: 900 }); break;
        case 'chargeFull': this.tone({ type: 'sine', f0: 1200, f1: 1600, dur: 0.25, vol: 0.18 }); break;
        case 'fire': this.noise({ dur: 0.3, f0: 800 * p, f1: 300, q: 0.5, vol: 0.22 }); break;
        case 'elec': for (let i = 0; i < 6; i++) this.tone({ type: 'sawtooth', f0: U.rand(600, 2400), f1: 200, dur: 0.05, vol: 0.1, delay: i * 0.03 }); break;
        case 'laser': this.tone({ type: 'square', f0: 1800 * p, f1: 300 * p, dur: 0.12, vol: 0.1 }); break;
        case 'beam': this.tone({ type: 'sawtooth', f0: 220 * p, f1: 880 * p, dur: 0.5, vol: 0.14 }); this.noise({ dur: 0.5, f0: 3000, f1: 800, vol: 0.12 }); break;
        case 'magic': this.tone({ type: 'triangle', f0: 600 * p, f1: 1400 * p, dur: 0.25, vol: 0.14 }); this.tone({ type: 'sine', f0: 900 * p, f1: 2000 * p, dur: 0.3, vol: 0.08, delay: 0.05 }); break;
        case 'explosion':
          this.noise({ dur: 0.7 * p, f0: 1200, f1: 60, q: 0.4, vol: 0.5, filter: 'lowpass' });
          this.tone({ type: 'sine', f0: 120, f1: 30, dur: 0.6, vol: 0.5 });
          break;
        case 'water': this.noise({ dur: 0.3, f0: 400, f1: 1600, q: 3, vol: 0.18 }); break;
        case 'spin': this.noise({ dur: 0.25, f0: 500 * p, f1: 2200 * p, q: 4, vol: 0.12 }); break;
        case 'stomp': this.tone({ type: 'sine', f0: 90, f1: 30, dur: 0.4, vol: 0.5 }); this.noise({ dur: 0.3, f0: 600, f1: 80, vol: 0.35, filter: 'lowpass' }); break;
        case 'block': this.noise({ dur: 0.08, f0: 900, f1: 500, q: 2, vol: 0.22 }); this.tone({ type: 'square', f0: 160, dur: 0.06, vol: 0.1 }); break;
        case 'heal': this.tone({ type: 'sine', f0: 700, f1: 1400, dur: 0.3, vol: 0.12 }); break;
        case 'lethal':
          this.tone({ type: 'sawtooth', f0: 70, f1: 40, dur: 0.9, vol: 0.35, filter: 'lowpass', ff: 500 });
          this.noise({ dur: 0.5, f0: 6000, f1: 400, vol: 0.35 });
          for (let i = 0; i < 6; i++) this.tone({ type: 'square', f0: U.rand(1000, 3000), f1: 120, dur: 0.07, vol: 0.12, delay: 0.05 + i * 0.05 });
          break;
        case 'ko':
          this.noise({ dur: 1.2, f0: 3000, f1: 80, q: 0.3, vol: 0.55 });
          this.tone({ type: 'sine', f0: 200, f1: 25, dur: 1.2, vol: 0.6 });
          this.tone({ type: 'sawtooth', f0: 1200, f1: 60, dur: 0.8, vol: 0.15 });
          this.noise({ dur: 2.0, f0: 900, f1: 1400, q: 0.3, vol: 0.12, delay: 0.3, attack: 0.4 });
          break;
        case 'respawn': [0, 4, 7, 12].forEach((n, i) => this.tone({ type: 'triangle', f0: midi(72 + n), dur: 0.2, vol: 0.12, delay: i * 0.06 })); break;
        case 'menuMove': this.tone({ type: 'square', f0: 880, f1: 990, dur: 0.04, vol: 0.06, filter: 'lowpass', ff: 3000 }); break;
        case 'menuSelect': this.tone({ type: 'square', f0: 660, f1: 1320, dur: 0.1, vol: 0.1 }); this.noise({ dur: 0.12, f0: 4000, vol: 0.06 }); break;
        case 'menuBack': this.tone({ type: 'square', f0: 660, f1: 330, dur: 0.1, vol: 0.08 }); break;
        case 'token': this.tone({ type: 'sine', f0: 300, f1: 900, dur: 0.12, vol: 0.18 }); this.noise({ dur: 0.08, f0: 2200, vol: 0.1 }); break;
        case 'ready': [0, 7, 12, 19].forEach((n, i) => this.tone({ type: 'sawtooth', f0: midi(60 + n), dur: 0.25, vol: 0.08, delay: i * 0.05, filter: 'lowpass', ff: 2400 })); break;
        case 'beep': this.tone({ type: 'square', f0: o.high ? 1320 : 880, dur: o.high ? 0.4 : 0.12, vol: 0.14 }); break;
        case 'tick': this.tone({ type: 'square', f0: 1500, dur: 0.05, vol: 0.08 }); break;
        case 'crowd': this.noise({ dur: 2.2, f0: 1100, f1: 900, q: 0.25, vol: 0.18, attack: 0.3 }); break;
        default: break;
      }
    }

    /* ------------------------------ MÚSICA ------------------------------- */
    playMusic(name) {
      this.wantTrack = name;
      if (this.musicOff) { this.stopMusic(); return; }
      if (!this.ctx) { this.pendingTrack = name; return; }
      if (this.track && this.trackName === name) return;
      this.stopMusic();
      this.track = TRACKS[name]; this.trackName = name;
      if (!this.track) return;
      this.step = 0; this.nextTime = this.ctx.currentTime + 0.08;
      this.music.gain.cancelScheduledValues(this.ctx.currentTime);
      this.music.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
      this.timer = setInterval(() => this.schedule(), 25);
    }

    stopMusic() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null; this.track = null; this.trackName = null;
    }

    schedule() {
      const T = this.track; if (!T || !this.ctx) return;
      const spb = 60 / T.bpm / 4;
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        const total = T.bars * 16;
        if (T.once && this.step >= total) { this.stopMusic(); return; }
        const s = this.step % 16, bar = Math.floor(this.step / 16) % T.bars;
        this.voiceStep(T, s, bar, this.nextTime, spb);
        this.nextTime += spb; this.step++;
      }
    }

    voiceStep(T, s, bar, t, spb) {
      const c = this.ctx, out = this.music;
      const at = (fn) => fn(t);
      if (T.kick[s]) at(tt => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(140, tt); o.frequency.exponentialRampToValueAtTime(40, tt + 0.12);
        g.gain.setValueAtTime(0.9, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.22);
        o.connect(g); g.connect(out); o.start(tt); o.stop(tt + 0.25);
      });
      if (T.snare[s]) at(tt => {
        const src = c.createBufferSource(); src.buffer = this.noiseBuf;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6;
        const g = c.createGain(); g.gain.setValueAtTime(0.45, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.16);
        src.connect(f); f.connect(g); g.connect(out); src.start(tt, Math.random()); src.stop(tt + 0.18);
        const o = c.createOscillator(), g2 = c.createGain(); o.frequency.value = 190;
        g2.gain.setValueAtTime(0.25, tt); g2.gain.exponentialRampToValueAtTime(0.001, tt + 0.08);
        o.connect(g2); g2.connect(out); o.start(tt); o.stop(tt + 0.1);
      });
      if (T.hat[s]) at(tt => {
        const src = c.createBufferSource(); src.buffer = this.noiseBuf;
        const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
        const g = c.createGain(); g.gain.setValueAtTime(s % 4 === 2 ? 0.16 : 0.08, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.04);
        src.connect(f); f.connect(g); g.connect(out); src.start(tt, Math.random()); src.stop(tt + 0.05);
      });
      if (T.bass[s]) at(tt => {
        const root = T.roots[bar] + (s % 8 === 6 ? 12 : 0);
        const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = midi(root);
        f.type = 'lowpass'; f.frequency.setValueAtTime(900, tt); f.frequency.exponentialRampToValueAtTime(180, tt + spb * 1.8);
        g.gain.setValueAtTime(0.32, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + spb * 1.9);
        o.connect(f); f.connect(g); g.connect(out); o.start(tt); o.stop(tt + spb * 2);
      });
      const n = T.lead[bar % T.lead.length][s];
      if (n) at(tt => {
        const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
        o.type = T.leadWave; o.frequency.value = midi(n);
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6; lg.gain.value = 4;
        lfo.connect(lg); lg.connect(o.frequency);
        f.type = 'lowpass'; f.frequency.value = 2600;
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.11, tt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + spb * 1.9);
        o.connect(f); f.connect(g); g.connect(out);
        o.start(tt); lfo.start(tt); o.stop(tt + spb * 2); lfo.stop(tt + spb * 2);
      });
      if (T.pad && s === 0) at(tt => {
        T.chords[bar].forEach(cn => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = 'triangle'; o.frequency.value = midi(cn - 12);
          g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.06, tt + 0.3);
          g.gain.exponentialRampToValueAtTime(0.0001, tt + spb * 16);
          o.connect(g); g.connect(out); o.start(tt); o.stop(tt + spb * 16 + 0.05);
        });
      });
    }

    /* ------------------------------ NARRADOR ----------------------------- */
    pickVoice() {
      if (!('speechSynthesis' in window)) return null;
      const vs = window.speechSynthesis.getVoices();
      if (!vs.length) return null;
      const pref = ['Google UK English Male', 'Daniel', 'Microsoft David', 'Alex', 'Fred', 'Microsoft Mark', 'Google US English'];
      for (const p of pref) { const v = vs.find(x => x.name.indexOf(p) >= 0); if (v) return v; }
      return vs.find(v => /^en/i.test(v.lang)) || vs[0];
    }

    say(text, o) {
      o = o || {};
      if (this.muted || this.narratorOff || !('speechSynthesis' in window)) return;
      try {
        if (o.interrupt !== false) window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (!this.voice) this.voice = this.pickVoice();
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-US';
        u.rate = o.rate || 0.88; u.pitch = o.pitch == null ? 0.45 : o.pitch; u.volume = 1;
        window.speechSynthesis.speak(u);
      } catch (e) { /* SpeechSynthesis no disponible: se ignora sin romper el juego */ }
    }
  }

  const U = NX.U;
  NX.Audio = new AudioEngine();
})(window.NX = window.NX || {});
