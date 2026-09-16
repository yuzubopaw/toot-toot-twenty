import { AUTO_COUNT_MS, AUTO_COUNT_REDUCED_MS, SPEAK_SUM_MS } from '../../game/hints.js';

const MASTER_GAIN = 0.86;
const BED_MELODY = 0.0094;
const BED_BASS = 0.006;
const BED_GIGGLE = 0.0038;
const BED_TINE = 0.0012;
const BED_BEAT = 0.46;
const BED_PHRASE_BEATS = 8;
const BED_HORIZON = 6.5;
const BED_POLL_MS = 240;
const BED_DUCK = 0.28;
const BED_LP = 1180;
const SFX_LP = 1700;
const MUTE_FLOOR = 0.0001;

const C3 = 131;
const G2 = 98;
const C4 = 262;
const D4 = 294;
const E4 = 330;
const G4 = 392;
const A4 = 440;
const C5 = 523;
const E5 = 659;

/** C D E G A chimes for 0–20; every value is ≤ 784 Hz. */
export const NUMBER_CHIMES = Object.freeze([
  262, 294, 330, 392, 440, 523, 587, 659, 523, 587, 392, 440, 523, 587, 659, 523, 587, 659, 784, 659, 784,
]);

export const SFX_IDS = Object.freeze([
  'tap',
  'couple-clank',
  'toot-short',
  'toot-long',
  'cheer',
  'nudge',
  'pop-sticker',
  'ticket-punch',
  'whoosh-enter',
  'sparkle',
  'hop',
  'merge',
]);

export function numberChimeFreq(n) {
  const i = Math.round(Number(n));
  if (!Number.isFinite(i) || i < 0) return NUMBER_CHIMES[0];
  if (i <= 20) return NUMBER_CHIMES[i];
  if (i > 50) return NUMBER_CHIMES[20];
  const scale = [262, 294, 330, 392, 440, 523, 587, 659, 784];
  return scale[i % scale.length];
}

function beat(n) {
  return n * BED_BEAT;
}

/** Funny-soft toy-band loop: bouncing bass, staccato tune, a hiccup, a boing. */
export function bedPhrase(mood = 'default', variant = 0) {
  const parade = mood === 'parade';
  const up = (hz) => (parade && hz * 1.25 <= 659 ? hz * 1.25 : hz);
  const bass = [
    { t: beat(0), freq: C3, dur: 0.62, peak: BED_BASS, type: 'sine' },
    { t: beat(2), freq: G2, dur: 0.62, peak: BED_BASS, type: 'sine' },
    { t: beat(4), freq: C3, dur: 0.62, peak: BED_BASS, type: 'sine' },
    { t: beat(6), freq: G2, dur: 0.78, peak: BED_BASS * 1.05, type: 'sine', slide: -22 },
  ];
  if (variant % 2 === 1) {
    return [
      ...bass,
      { t: beat(0.5), freq: up(E4), dur: 0.2, peak: BED_MELODY * 0.85, type: 'sine' },
      { t: beat(1), freq: up(G4), dur: 0.2, peak: BED_MELODY, type: 'sine' },
      { t: beat(1.5), freq: up(E4), dur: 0.18, peak: BED_MELODY * 0.8, type: 'sine' },
      { t: beat(3), freq: up(C5), dur: 0.34, peak: BED_MELODY, type: 'sine', slide: -70 },
      { t: beat(4.5), freq: up(A4), dur: 0.22, peak: BED_MELODY * 0.9, type: 'sine' },
      { t: beat(5.5), freq: up(G4), dur: 0.22, peak: BED_MELODY * 0.85, type: 'sine' },
      { t: beat(6.5), freq: up(E4), dur: 0.36, peak: BED_MELODY, type: 'triangle' },
      { t: beat(2.2), freq: up(A4), dur: 0.08, peak: BED_GIGGLE, type: 'sine' },
      { t: beat(7.2), freq: up(C5), dur: 0.1, peak: BED_GIGGLE * 0.8, type: 'sine' },
    ];
  }
  return [
    ...bass,
    { t: beat(0), freq: up(G4), dur: 0.28, peak: BED_MELODY, type: 'sine' },
    { t: beat(1), freq: up(E4), dur: 0.26, peak: BED_MELODY * 0.9, type: 'sine' },
    { t: beat(2), freq: up(G4), dur: 0.18, peak: BED_MELODY, type: 'sine' },
    { t: beat(2.5), freq: up(A4), dur: 0.18, peak: BED_MELODY * 0.85, type: 'sine' },
    { t: beat(4), freq: up(E4), dur: 0.24, peak: BED_MELODY, type: 'sine' },
    { t: beat(5), freq: up(D4), dur: 0.18, peak: BED_MELODY * 0.8, type: 'sine' },
    { t: beat(5.5), freq: up(C4), dur: 0.42, peak: BED_MELODY * 0.95, type: 'sine' },
    { t: beat(7), freq: up(E4), dur: 0.22, peak: BED_MELODY * 0.7, type: 'triangle' },
    { t: beat(3.15), freq: up(C5), dur: 0.09, peak: BED_GIGGLE, type: 'sine' },
    { t: beat(3.28), freq: up(E5), dur: 0.08, peak: BED_GIGGLE * 0.7, type: 'triangle' },
    { t: beat(6.35), freq: up(G4), dur: 0.2, peak: BED_GIGGLE, type: 'sine', slide: 70 },
  ];
}

function clampWave(type) {
  return type === 'triangle' ? 'triangle' : 'sine';
}

function consonantFifth(freq) {
  const up = freq * 1.5;
  return up <= 800 ? up : freq * (2 / 3);
}

export function createAudioManager({ getSettings, getReduceMotion, captionEl }) {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = Ctx ? new Ctx() : null;
  let unlocked = false;
  let lastCaption = 0;
  let master = null;
  let bedGain = null;
  let bedDuck = null;
  let bedWanted = false;
  let bedMood = 'default';
  let bedTimer = 0;
  let bedNext = 0;
  let bedStepIndex = 0;
  let bedAudible = false;
  let duckUntil = 0;
  let duckTimer = 0;
  let lastCheerAt = -99;
  let lastTootLongAt = -99;
  const bedNodes = new Set();

  function settingsOf() {
    return getSettings() || {};
  }

  function mutedNow() {
    return Boolean(settingsOf().muted);
  }

  function ensureMaster() {
    if (!ctx || master) return master;
    master = ctx.createGain();
    master.gain.value = mutedNow() ? MUTE_FLOOR : MASTER_GAIN;
    master.connect(ctx.destination);
    return master;
  }

  function applyMuteGain() {
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    const target = mutedNow() ? MUTE_FLOOR : MASTER_GAIN;
    const cur = Math.max(MUTE_FLOOR, Number(master.gain.value) || MUTE_FLOOR);
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(cur, now);
    master.gain.exponentialRampToValueAtTime(target, now + 0.05);
  }

  async function resume() {
    if (!ctx) return;
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  async function unlock() {
    if (!ctx) return;
    unlocked = true;
    ensureMaster();
    applyMuteGain();
    try {
      const pending = ctx.resume();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
      await pending;
    } catch {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  function live() {
    return Boolean(ctx && unlocked && !mutedNow());
  }

  function duckBedFor(seconds) {
    if (!bedDuck || !ctx || !bedAudible) return;
    const now = ctx.currentTime;
    duckUntil = Math.max(duckUntil, now + Math.max(0.18, seconds));
    const cur = Math.max(MUTE_FLOOR, Number(bedDuck.gain.value) || MUTE_FLOOR);
    bedDuck.gain.cancelScheduledValues(now);
    bedDuck.gain.setValueAtTime(cur, now);
    bedDuck.gain.exponentialRampToValueAtTime(BED_DUCK, now + 0.04);
    scheduleUnduck();
  }

  function scheduleUnduck() {
    if (typeof window === 'undefined') return;
    if (duckTimer) window.clearTimeout(duckTimer);
    const ms = Math.max(40, (duckUntil - (ctx ? ctx.currentTime : 0)) * 1000);
    duckTimer = window.setTimeout(() => {
      duckTimer = 0;
      if (!bedDuck || !ctx) return;
      if (ctx.currentTime < duckUntil - 0.01) {
        scheduleUnduck();
        return;
      }
      const now = ctx.currentTime;
      const cur = Math.max(MUTE_FLOOR, Number(bedDuck.gain.value) || MUTE_FLOOR);
      bedDuck.gain.cancelScheduledValues(now);
      bedDuck.gain.setValueAtTime(cur, now);
      bedDuck.gain.exponentialRampToValueAtTime(1, now + 0.2);
    }, ms);
  }

  function tone({ freq, dur, type = 'sine', peak = 0.06, t = 0, slide = 0, attack = 0.02, filter = SFX_LP }) {
    if (!live()) return;
    const dest = ensureMaster();
    if (!dest) return;
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') resume();
    const now = ctx.currentTime + Math.max(0, t);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    osc.type = clampWave(type);
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (slide) {
      const destFreq = Math.max(40, freq + slide);
      osc.frequency.exponentialRampToValueAtTime(destFreq, now + dur);
    }
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.max(240, filter), now);
    lp.Q.value = 0.45;
    g.gain.setValueAtTime(MUTE_FLOOR, now);
    g.gain.exponentialRampToValueAtTime(Math.max(MUTE_FLOOR, peak), now + Math.max(0.008, attack));
    g.gain.exponentialRampToValueAtTime(MUTE_FLOOR, now + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.04);
    duckBedFor(t + dur + 0.06);
  }

  function whistle(start, dur, peak = 0.036, t = 0) {
    tone({ freq: start, dur, type: 'sine', peak, filter: 1650, attack: 0.05, t });
    tone({ freq: start * 1.5, dur, type: 'sine', peak: peak * 0.26, filter: 1850, attack: 0.06, t });
  }

  function ensureBedGraph() {
    if (!ctx || bedGain) return;
    const dest = ensureMaster();
    if (!dest) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = BED_LP;
    lp.Q.value = 0.35;
    bedGain = ctx.createGain();
    bedGain.gain.value = MUTE_FLOOR;
    bedDuck = ctx.createGain();
    bedDuck.gain.value = 1;
    bedDuck.connect(bedGain);
    bedGain.connect(lp);
    lp.connect(dest);
  }

  function fadeBed(silent) {
    if (!bedGain || !ctx) return;
    const now = ctx.currentTime;
    const target = silent ? MUTE_FLOOR : 1;
    const cur = Math.max(MUTE_FLOOR, Number(bedGain.gain.value) || MUTE_FLOOR);
    bedGain.gain.cancelScheduledValues(now);
    bedGain.gain.setValueAtTime(cur, now);
    bedGain.gain.exponentialRampToValueAtTime(target, now + 0.12);
  }

  function haltBedVoices() {
    const nodes = [...bedNodes];
    bedNodes.clear();
    bedNext = 0;
    for (const node of nodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
  }

  function trackBed(node) {
    bedNodes.add(node);
    node.onended = () => bedNodes.delete(node);
  }

  function scheduleBedOsc(freq, when, dur, peak, type, extra = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const attack = extra.attack != null ? extra.attack : Math.min(0.07, dur * 0.28);
    osc.type = clampWave(type);
    osc.frequency.setValueAtTime(Math.max(40, freq), when);
    if (extra.slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + extra.slide), when + dur);
    }
    g.gain.setValueAtTime(MUTE_FLOOR, when);
    g.gain.exponentialRampToValueAtTime(Math.max(MUTE_FLOOR, peak), when + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(MUTE_FLOOR, peak * 0.45), when + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(MUTE_FLOOR, when + dur);
    osc.connect(g);
    g.connect(bedDuck);
    osc.start(when);
    osc.stop(when + dur + 0.04);
    trackBed(osc);
  }

  function scheduleBedVoice(freq, when, dur, peak, extra = {}) {
    scheduleBedOsc(freq, when, dur, peak, extra.type || 'sine', extra);
    if (peak >= BED_MELODY * 0.75 && dur > 0.16) {
      scheduleBedOsc(freq * 2, when, dur * 0.7, Math.min(BED_TINE, peak * 0.16), 'triangle', {
        attack: 0.04,
      });
    }
  }

  function bedShouldPlay() {
    if (!bedWanted || !live()) return false;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
    return true;
  }

  function tickBed() {
    if (!ctx || !bedGain || !bedDuck || !bedShouldPlay()) return;
    const now = ctx.currentTime;
    if (bedNext < now + 0.02) bedNext = now + 0.02;
    const phraseLen = BED_PHRASE_BEATS * BED_BEAT;
    while (bedNext < now + BED_HORIZON) {
      const events = bedPhrase(bedMood, bedStepIndex);
      for (const ev of events) {
        scheduleBedVoice(ev.freq, bedNext + ev.t, ev.dur, ev.peak, {
          type: ev.type,
          slide: ev.slide || 0,
        });
      }
      bedNext += phraseLen;
      bedStepIndex += 1;
    }
  }

  function syncBed() {
    applyMuteGain();
    if (!bedWanted) {
      haltBedVoices();
      fadeBed(true);
      bedAudible = false;
      return;
    }
    ensureBedGraph();
    if (!bedShouldPlay()) {
      haltBedVoices();
      fadeBed(true);
      bedAudible = false;
      return;
    }
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') resume();
    if (!bedAudible) {
      if (bedDuck) {
        bedDuck.gain.cancelScheduledValues(ctx.currentTime);
        bedDuck.gain.setValueAtTime(1, ctx.currentTime);
      }
      fadeBed(false);
    }
    bedAudible = true;
    tickBed();
  }

  function ensureBedTimer() {
    if (bedTimer || typeof window === 'undefined') return;
    bedTimer = window.setInterval(syncBed, BED_POLL_MS);
  }

  function clearBedTimer() {
    if (!bedTimer) return;
    window.clearInterval(bedTimer);
    bedTimer = 0;
  }

  function setBedMood(mood) {
    const next = mood === 'parade' ? 'parade' : 'default';
    if (next === bedMood) return;
    bedMood = next;
    bedStepIndex = 0;
    haltBedVoices();
  }

  function startBed(_mood) {
    bedWanted = false;
  }

  function playBed(_mood = 'parade') {
    startBed();
  }

  function stopBed() {
    bedWanted = false;
    bedAudible = false;
    bedMood = 'default';
    clearBedTimer();
    haltBedVoices();
    fadeBed(true);
    bedStepIndex = 0;
    applyMuteGain();
  }

  function setMuted() {
    applyMuteGain();
    if (mutedNow()) haltBedVoices();
    syncBed();
  }

  function playSparkle(delay, gainMul) {
    [659, 784, 659].forEach((f, i) => {
      tone({
        freq: f,
        dur: 0.13,
        type: 'sine',
        peak: 0.012 * gainMul,
        t: delay + i * 0.07,
        filter: 2100,
        attack: 0.018,
      });
    });
  }

  function playCheer(t0) {
    [523, 659, 784].forEach((f, i) => {
      tone({
        freq: f,
        dur: 0.2,
        type: 'sine',
        peak: 0.03,
        t: t0 + i * 0.09,
        filter: 1900,
        attack: 0.022,
      });
    });
  }

  const sfx = {
    tap: () => {
      tone({ freq: 523, dur: 0.07, type: 'sine', peak: 0.026, filter: 1500, attack: 0.01 });
    },
    'couple-clank': () => {
      tone({ freq: 196, dur: 0.1, type: 'sine', peak: 0.03, attack: 0.008, filter: 900 });
      tone({ freq: 247, dur: 0.12, type: 'triangle', peak: 0.02, t: 0.045, attack: 0.01, filter: 1100 });
    },
    'toot-short': () => {
      const t = ctx && ctx.currentTime - lastCheerAt < 0.5 ? 0.1 : 0;
      whistle(392, 0.32, 0.036, t);
    },
    'toot-long': () => {
      lastTootLongAt = ctx ? ctx.currentTime : 0;
      whistle(330, 0.36, 0.034, 0);
      whistle(392, 0.44, 0.036, 0.16);
    },
    cheer: () => {
      lastCheerAt = ctx ? ctx.currentTime : 0;
      const t0 = ctx && ctx.currentTime - lastTootLongAt < 0.22 ? 0.16 : 0;
      playCheer(t0);
    },
    sparkle: () => {
      const now = ctx ? ctx.currentTime : 0;
      const stacked = now - lastCheerAt < 0.85;
      playSparkle(stacked ? 0.26 : 0.03, stacked ? 0.38 : 0.7);
    },
    nudge: () => {
      tone({ freq: 330, dur: 0.22, type: 'sine', peak: 0.026, slide: -70, filter: 1300, attack: 0.03 });
    },
    'pop-sticker': () => {
      tone({ freq: 523, dur: 0.1, type: 'sine', peak: 0.028, filter: 1600 });
      tone({ freq: 659, dur: 0.12, type: 'sine', peak: 0.018, t: 0.05, filter: 1800 });
    },
    'ticket-punch': () => {
      tone({ freq: 392, dur: 0.08, type: 'triangle', peak: 0.024, filter: 1300, attack: 0.006 });
    },
    'whoosh-enter': () => {
      tone({ freq: 220, dur: 0.28, type: 'sine', peak: 0.02, slide: 140, filter: 1000, attack: 0.05 });
    },
    hop: () => {
      const t = ctx && ctx.currentTime - lastCheerAt < 0.5 ? 0.12 : 0;
      tone({ freq: 392, dur: 0.18, type: 'sine', peak: 0.022, slide: 80, t, filter: 1500, attack: 0.02 });
    },
    merge: () => {
      tone({ freq: 392, dur: 0.2, type: 'sine', peak: 0.026, filter: 1400 });
      tone({ freq: 523, dur: 0.24, type: 'sine', peak: 0.022, t: 0.08, filter: 1600 });
    },
  };

  function playSfx(id) {
    if (mutedNow()) return;
    sfx[id]?.();
  }

  function captionDurationMs(kind = 'count') {
    if (kind === 'sum') return SPEAK_SUM_MS;
    return getReduceMotion() ? AUTO_COUNT_REDUCED_MS : AUTO_COUNT_MS;
  }

  function showCaption(n, ms) {
    if (!captionEl) return;
    captionEl.textContent = String(n);
    captionEl.classList.add('is-on');
    lastCaption += 1;
    const token = lastCaption;
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      if (token === lastCaption) captionEl.classList.remove('is-on');
    }, ms);
  }

  function speakNumber(n, kind = 'count') {
    const settings = settingsOf();
    const ms = captionDurationMs(kind);
    if (kind !== 'sum') showCaption(n, ms);
    if (settings.muted || settings.voice === false) return;
    const freq = numberChimeFreq(n);
    const dur = Math.min(0.28, ms / 1000);
    tone({ freq, dur, type: 'sine', peak: 0.034, filter: 1600, attack: 0.018 });
    if (kind === 'sum') {
      tone({
        freq: consonantFifth(freq),
        dur: 0.2,
        type: 'sine',
        peak: 0.016,
        t: 0.05,
        filter: 1700,
        attack: 0.02,
      });
    }
  }

  function speakTryAgain() {
    if (mutedNow()) return;
    tone({ freq: 262, dur: 0.16, type: 'sine', peak: 0.024, filter: 1200, attack: 0.03 });
    tone({ freq: 220, dur: 0.2, type: 'sine', peak: 0.022, t: 0.12, slide: -28, filter: 1100, attack: 0.03 });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resume();
      if (bedWanted) syncBed();
    });
  }

  return {
    unlock,
    resume,
    playSfx,
    speakNumber,
    speakTryAgain,
    captionDurationMs,
    setMuted,
    startBed,
    stopBed,
    playBed,
  };
}
