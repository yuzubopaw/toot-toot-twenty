import { describe, expect, it } from 'vitest';
import {
  NUMBER_CHIMES,
  SFX_IDS,
  bedPhrase,
  createAudioManager,
  numberChimeFreq,
} from '../src/app/audio/AudioManager.js';

const PENTATONIC = new Set([262, 294, 330, 392, 440, 523, 587, 659, 784]);

describe('number chimes', () => {
  it('maps 0–20 onto a pentatonic under 800 Hz', () => {
    expect(NUMBER_CHIMES).toHaveLength(21);
    for (let n = 0; n <= 20; n++) {
      const f = numberChimeFreq(n);
      expect(f).toBeGreaterThanOrEqual(196);
      expect(f).toBeLessThanOrEqual(800);
      expect(PENTATONIC.has(f)).toBe(true);
    }
    expect(numberChimeFreq(20)).toBeLessThanOrEqual(784);
    expect(numberChimeFreq(-3)).toBe(NUMBER_CHIMES[0]);
    expect(numberChimeFreq(99)).toBe(NUMBER_CHIMES[20]);
    for (let n = 21; n <= 50; n++) {
      const f = numberChimeFreq(n);
      expect(f).toBeGreaterThanOrEqual(196);
      expect(f).toBeLessThanOrEqual(800);
      expect(PENTATONIC.has(f)).toBe(true);
    }
  });
});

describe('AudioManager', () => {
  it('exposes bed + sfx API and stays quiet without AudioContext', () => {
    const classes = new Set();
    const captionEl = {
      textContent: '',
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
      },
    };
    const settings = { muted: true, voice: true };
    const audio = createAudioManager({
      getSettings: () => settings,
      getReduceMotion: () => false,
      captionEl,
    });

    expect(typeof audio.playBed).toBe('function');
    expect(typeof audio.startBed).toBe('function');
    expect(typeof audio.stopBed).toBe('function');
    expect(typeof audio.setMuted).toBe('function');
    for (const id of SFX_IDS) audio.playSfx(id);
    audio.playSfx('not-a-sound');
    audio.playBed('parade');
    audio.startBed();
    audio.setMuted();
    audio.stopBed();

    audio.speakNumber(7, 'count');
    expect(captionEl.textContent).toBe('7');
    expect(classes.has('is-on')).toBe(true);

    audio.speakNumber(12, 'sum');
    expect(captionEl.textContent).toBe('7');

    settings.muted = false;
    settings.voice = false;
    audio.speakNumber(3, 'count');
    expect(captionEl.textContent).toBe('3');
  });

  it('scores a soft pentatonic toy-band phrase', () => {
    const a = bedPhrase('default', 0);
    const b = bedPhrase('parade', 1);
    expect(a.length).toBeGreaterThan(8);
    expect(b.length).toBeGreaterThan(8);
    for (const ev of [...a, ...b]) {
      expect(ev.freq).toBeGreaterThanOrEqual(90);
      expect(ev.freq).toBeLessThanOrEqual(659);
      expect(ev.peak).toBeLessThanOrEqual(0.012);
      expect(ev.dur).toBeGreaterThan(0.05);
    }
  });

  it('keeps design sfx ids', () => {
    for (const id of ['tap', 'couple-clank', 'toot-short', 'toot-long', 'cheer', 'nudge', 'pop-sticker', 'ticket-punch', 'whoosh-enter']) {
      expect(SFX_IDS.includes(id)).toBe(true);
    }
  });
});
