import { describe, expect, it } from 'vitest';
import { load, persist, resetProgress, SAVE_KEY } from '../src/app/storage/save.js';
import { computeLayout } from '../src/app/layoutMode.js';
import { bundleParentHref } from '../src/app/gate.js';

function memory() {
  const mem = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
  };
}

describe('save', () => {
  it('round-trips progress and ignores a broken blob', () => {
    const storage = memory();
    const state = load(storage);
    state.progress.visits.howMany = 2;
    state.settings.muted = true;
    expect(persist(state, storage)).toBe(true);
    const again = load(storage);
    expect(again.progress.visits.howMany).toBe(2);
    expect(again.settings.muted).toBe(true);
    expect(again.settings.voice).toBe(true);
    storage.setItem(SAVE_KEY, '{');
    expect(load(storage).progress.visits.howMany).toBe(0);
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 2 }));
    expect(load(storage).v).toBe(1);
  });

  it('resets meadows and keeps the key private to this game', () => {
    const state = load(memory());
    state.progress.visits.next = 4;
    resetProgress(state);
    expect(state.progress.visits.next).toBe(0);
    expect(SAVE_KEY).toBe('jumpJumpBunny.v1');
    expect(SAVE_KEY).not.toBe('tootTootTwenty.v1');
  });
});

describe('layout and gate', () => {
  it('matches the train game breakpoints', () => {
    expect(computeLayout(1024, 768)).toBe('wide');
    expect(computeLayout(834, 1112)).toBe('stacked');
    expect(computeLayout(390, 844)).toBe('stacked');
    expect(computeLayout(320, 700)).toBe('unsupported');
  });

  it('links back to the chooser from the bundled path', () => {
    expect(bundleParentHref('/toot-toot-and-jump-jump/jjb/')).toBe('../');
    expect(bundleParentHref('/')).toBeNull();
  });
});
