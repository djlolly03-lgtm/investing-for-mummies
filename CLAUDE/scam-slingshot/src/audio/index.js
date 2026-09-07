/**
 * audio/index.js — Web Audio synth. PURE SUBSCRIBER. No samples, no downloads, no licences.
 *
 * Every sound in this game is generated from oscillators and a procedurally-filled noise
 * buffer. The cue table below is the whole vocabulary; later pieces add rows, they do not
 * add a second audio system.
 *
 * ── TWO RULES THAT MATTER ────────────────────────────────────────────────────
 * 1. The AudioContext is created LAZILY, on the first real user gesture. Creating it at boot
 *    makes Chrome log "The AudioContext was not allowed to start" — a warning in a headless
 *    critic run that reads as noise, and an autoplay-policy suspension in a real one.
 *    So: no gesture, no context, no logs. `SS.audioMute(true)` short-circuits before any of it.
 * 2. Voice budget + a global compressor. A structure collapsing fires dozens of impacts in
 *    ten frames; without the budget it turns into a wall of static and someone closes the tab.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { on } from '../events.js';

const MAX_VOICES = 14;

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.voices = 0;
    this.lastAt = new Map();     // cue -> ctx.currentTime, for per-cue rate limiting
    this.noiseBuf = null;
    this.subscribe();
  }

  /** Called from the first pointerdown/keydown. Safe to call repeatedly. */
  unlock() {
    if (this.ctx || this.muted) return this.ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      const ctx = new AC({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 24;
      comp.ratio.value = 7; comp.attack.value = 0.003; comp.release.value = 0.18;
      const master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp); comp.connect(ctx.destination);
      this.ctx = ctx; this.master = master;
      this.noiseBuf = makeNoise(ctx, 1.2);
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch { return null; }
  }

  setMute(on) {
    this.muted = !!on;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  // -------------------------------------------------------------------------
  // subscriptions
  // -------------------------------------------------------------------------
  subscribe() {
    on('bandStretch', ({ t, delta }) => {
      // A creak only when the band is actually being pulled further — silence when held.
      if (Math.abs(delta) < 0.006) return;
      this.cue('creak', { t, rate: 0.05 });
    });
    on('launch', ({ power }) => {
      this.cue('twang', { power });
      this.cue('whoosh', { power, delay: 0.045 });
    });
    on('impact', ({ material, impulse, hard }) => {
      this.cue(material === 'glass' ? 'glassTap' : material === 'stone' ? 'stoneTap' : 'woodTap',
        { gain: Math.min(1, impulse / 12), rate: 0.028 });
      if (hard) this.cue('thump', { gain: Math.min(1, impulse / 18) });
    });
    on('break', ({ material }) => {
      this.cue(material === 'glass' ? 'glassBreak' : material === 'stone' ? 'stoneBreak' : 'woodBreak',
        { rate: 0.03 });
    });
    on('villainDefeated', () => this.cue('pop'));
    on('abilityUsed', () => this.cue('split'));
    on('levelWon', () => this.cue('win'));
    on('levelLost', () => this.cue('lose'));
    on('uiClick', () => this.cue('click'));
  }

  // -------------------------------------------------------------------------
  // the synth
  // -------------------------------------------------------------------------
  /**
   * @param {string} name cue id
   * @param {object} [o] { gain, power, t, rate (min seconds between repeats), delay }
   */
  cue(name, o = {}) {
    if (this.muted || !this.ctx) return false;
    const ctx = this.ctx;
    const now = ctx.currentTime + (o.delay ?? 0);
    if (o.rate) {
      const last = this.lastAt.get(name) ?? -1e9;
      if (now - last < o.rate) return false;
      this.lastAt.set(name, now);
    }
    if (this.voices >= MAX_VOICES) return false;

    const g = ctx.createGain();
    g.connect(this.master);
    this.voices++;
    const done = (at) => setTimeout(() => { this.voices--; try { g.disconnect(); } catch {} },
      Math.max(30, (at - ctx.currentTime) * 1000 + 60));

    switch (name) {
      case 'creak': {
        // filtered noise, pitch rises with draw — the band getting tighter
        const t = clamp01(o.t ?? 0.5);
        const src = this.noise(0.14);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 9;
        bp.frequency.setValueAtTime(340 + t * 900, now);
        src.connect(bp); bp.connect(g);
        env(g.gain, now, 0.006, 0.10, 0.05 + t * 0.06);
        src.start(now); src.stop(now + 0.16); done(now + 0.16); break;
      }
      case 'twang': {
        const p = clamp01(o.power ?? 1);
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180 + p * 200, now);
        osc.frequency.exponentialRampToValueAtTime(58 + p * 40, now + 0.20);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2600, now);
        lp.frequency.exponentialRampToValueAtTime(420, now + 0.22);
        osc.connect(lp); lp.connect(g);
        env(g.gain, now, 0.004, 0.26, 0.22 + p * 0.18);
        osc.start(now); osc.stop(now + 0.3); done(now + 0.3); break;
      }
      case 'whoosh': {
        const p = clamp01(o.power ?? 1);
        const src = this.noise(0.3);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 1.1;
        bp.frequency.setValueAtTime(420, now);
        bp.frequency.exponentialRampToValueAtTime(1500 + p * 900, now + 0.16);
        bp.frequency.exponentialRampToValueAtTime(300, now + 0.34);
        src.connect(bp); bp.connect(g);
        env(g.gain, now, 0.05, 0.32, 0.10 + p * 0.10);
        src.start(now); src.stop(now + 0.36); done(now + 0.36); break;
      }
      case 'woodTap': case 'woodBreak': {
        const brk = name === 'woodBreak';
        const src = this.noise(brk ? 0.28 : 0.09);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = brk ? 2.2 : 5;
        bp.frequency.setValueAtTime(brk ? 900 : 620, now);
        bp.frequency.exponentialRampToValueAtTime(brk ? 220 : 380, now + (brk ? 0.24 : 0.08));
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(brk ? 150 : 210, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.14);
        src.connect(bp); bp.connect(g); osc.connect(g);
        env(g.gain, now, 0.002, brk ? 0.30 : 0.10, (brk ? 0.42 : 0.22) * (o.gain ?? 1));
        src.start(now); src.stop(now + 0.32); osc.start(now); osc.stop(now + 0.16);
        done(now + 0.34); break;
      }
      case 'glassTap': case 'glassBreak': {
        const brk = name === 'glassBreak';
        // stacked inharmonic partials = "glass"; the noise tail = "shattering"
        const parts = brk ? [2340, 3110, 4270, 5600, 6900] : [2600, 3400];
        for (const f of parts) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f * (0.98 + 0.04 * (parts.indexOf(f) / parts.length)), now);
          const gg = ctx.createGain();
          gg.gain.setValueAtTime(0, now);
          gg.gain.linearRampToValueAtTime((brk ? 0.10 : 0.07) * (o.gain ?? 1), now + 0.002);
          gg.gain.exponentialRampToValueAtTime(0.0001, now + (brk ? 0.55 : 0.16));
          osc.connect(gg); gg.connect(g);
          osc.start(now); osc.stop(now + (brk ? 0.6 : 0.2));
        }
        if (brk) {
          const src = this.noise(0.5);
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass'; hp.frequency.value = 2400;
          const ng = ctx.createGain();
          env(ng.gain, now, 0.004, 0.45, 0.30);
          src.connect(hp); hp.connect(ng); ng.connect(g);
          src.start(now); src.stop(now + 0.5);
        }
        g.gain.value = 1;
        done(now + 0.62); break;
      }
      case 'stoneTap': case 'stoneBreak': {
        const brk = name === 'stoneBreak';
        const src = this.noise(brk ? 0.4 : 0.11);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(brk ? 1400 : 900, now);
        lp.frequency.exponentialRampToValueAtTime(160, now + (brk ? 0.36 : 0.10));
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(96, now);
        osc.frequency.exponentialRampToValueAtTime(44, now + 0.2);
        src.connect(lp); lp.connect(g); osc.connect(g);
        env(g.gain, now, 0.002, brk ? 0.42 : 0.13, (brk ? 0.55 : 0.28) * (o.gain ?? 1));
        src.start(now); src.stop(now + 0.44); osc.start(now); osc.stop(now + 0.24);
        done(now + 0.46); break;
      }
      case 'thump': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
        osc.connect(g);
        env(g.gain, now, 0.003, 0.22, 0.42 * (o.gain ?? 1));
        osc.start(now); osc.stop(now + 0.24); done(now + 0.26); break;
      }
      case 'pop': {
        // squelchy comedy pop: fast up-chirp, then a wobbling deflate
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 22;
        const lfoG = ctx.createGain(); lfoG.gain.value = 60;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        osc.connect(lp); lp.connect(g);
        env(g.gain, now, 0.004, 0.30, 0.40);
        osc.start(now); osc.stop(now + 0.32); lfo.start(now); lfo.stop(now + 0.32);
        done(now + 0.34); break;
      }
      case 'split': {
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          const t0 = now + i * 0.045;
          osc.frequency.setValueAtTime(520 + i * 190, t0);
          osc.frequency.exponentialRampToValueAtTime(980 + i * 260, t0 + 0.09);
          const gg = ctx.createGain();
          env(gg.gain, t0, 0.004, 0.11, 0.16);
          osc.connect(gg); gg.connect(g);
          osc.start(t0); osc.stop(t0 + 0.13);
        }
        g.gain.value = 1; done(now + 0.3); break;
      }
      case 'win': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const t0 = now + i * 0.11;
          const osc = ctx.createOscillator(); osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t0);
          const gg = ctx.createGain();
          env(gg.gain, t0, 0.01, 0.34, 0.24);
          osc.connect(gg); gg.connect(g);
          osc.start(t0); osc.stop(t0 + 0.38);
        });
        g.gain.value = 1; done(now + 0.85); break;
      }
      case 'lose': {
        const notes = [392, 349.23, 293.66];
        notes.forEach((f, i) => {
          const t0 = now + i * 0.15;
          const osc = ctx.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, t0);
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
          const gg = ctx.createGain();
          env(gg.gain, t0, 0.02, 0.36, 0.18);
          osc.connect(lp); lp.connect(gg); gg.connect(g);
          osc.start(t0); osc.stop(t0 + 0.4);
        });
        g.gain.value = 1; done(now + 0.95); break;
      }
      case 'click': {
        const osc = ctx.createOscillator();
        osc.type = 'square'; osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1500, now + 0.04);
        osc.connect(g);
        env(g.gain, now, 0.002, 0.06, 0.10);
        osc.start(now); osc.stop(now + 0.08); done(now + 0.1); break;
      }
      default:
        this.voices--; return false;
    }
    return true;
  }

  noise(dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = 1;
    return src;
  }
}

// --- helpers ---------------------------------------------------------------
function env(param, t0, attack, decay, peak) {
  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(peak, t0 + attack);
  param.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

/**
 * White noise buffer, filled from a small deterministic PRNG rather than Math.random().
 * Not because audio needs to be reproducible — it doesn't — but because a stray
 * Math.random() in this codebase is exactly the kind of thing that gets copy-pasted into
 * a gameplay file six hours later and quietly destroys determinism.
 */
function makeNoise(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 0x1234567 >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    d[i] = (((t ^ (t >>> 14)) >>> 0) / 2147483648) - 1;
  }
  return buf;
}

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
