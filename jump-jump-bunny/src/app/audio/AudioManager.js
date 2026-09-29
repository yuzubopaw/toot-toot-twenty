const NUMBER_CHIMES = Object.freeze([
  262, 294, 330, 392, 440, 523, 587, 659, 698, 784, 880,
]);

export function numberChimeFreq(n) {
  const i = Math.round(Number(n));
  if (!Number.isFinite(i) || i < 0) return NUMBER_CHIMES[0];
  if (i <= 10) return NUMBER_CHIMES[i];
  return NUMBER_CHIMES[10];
}

export function createAudioManager({ getSettings, captionEl }) {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = Ctx ? new Ctx() : null;
  let master = null;
  let captionTimer = 0;
  let captionAt = 0;

  function ensure() {
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!master) {
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function muted() {
    return Boolean(getSettings()?.muted);
  }

  function showCaption(text, ms) {
    if (!captionEl) return;
    captionEl.textContent = String(text);
    captionEl.classList.add('is-on');
    captionAt = Date.now();
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => {
      if (Date.now() - captionAt >= ms - 30) captionEl.classList.remove('is-on');
    }, ms);
  }

  function tone({ freq, dur = 0.18, type = 'sine', peak = 0.12, slide = 0 }) {
    const audio = ensure();
    if (!audio || muted()) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  return {
    unlock() {
      ensure();
      return Promise.resolve();
    },
    setMuted() {},
    showCaption,
    clearCaption() {
      clearTimeout(captionTimer);
      if (!captionEl) return;
      captionEl.classList.remove('is-on');
      captionEl.textContent = '';
    },
    speakNumber(n, ms = 500, options = {}) {
      if (options.caption !== false) showCaption(n, ms);
      if (!getSettings()?.voice) return;
      tone({ freq: numberChimeFreq(n), dur: 0.22, peak: 0.14, type: 'sine' });
    },
    playSfx(id) {
      if (id === 'hop') {
        tone({ freq: 240, dur: 0.14, peak: 0.1, type: 'sine', slide: 280 });
        return;
      }
      if (id === 'cheer') {
        tone({ freq: 523, dur: 0.16, peak: 0.12 });
        tone({ freq: 659, dur: 0.16, peak: 0.1 });
        tone({ freq: 784, dur: 0.22, peak: 0.1 });
        return;
      }
      if (id === 'nudge') {
        tone({ freq: 196, dur: 0.16, peak: 0.06, type: 'triangle' });
        return;
      }
      tone({ freq: 440, dur: 0.08, peak: 0.06 });
    },
  };
}
