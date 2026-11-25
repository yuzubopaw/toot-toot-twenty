import { describe, expect, it } from 'vitest';
import { defaultState, defaultStorage, load, persist, resetProgress, SAVE_KEY } from '../src/app/storage/save.js';

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
  it('round-trips a clean save', () => {
    const storage = memory();
    const state = defaultState();
    state.progress.visits.plop = 2;
    state.progress.band.plop = 'B';
    state.settings.muted = true;
    expect(persist(state, storage)).toBe(true);
    const again = load(storage);
    expect(again.progress.visits.plop).toBe(2);
    expect(again.progress.band.plop).toBe('B');
    expect(again.settings.muted).toBe(true);
    expect(again.settings.voice).toBe(true);
  });

  it('replaces bad JSON, the wrong version, a bad band, and a long list', () => {
    const storage = memory();
    storage.setItem(SAVE_KEY, '{');
    expect(load(storage).progress.band.plop).toBe('A');
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 2, progress: { visits: { plop: 9 } } }));
    expect(load(storage).progress.visits.plop).toBe(0);
    storage.setItem(SAVE_KEY, JSON.stringify({
      v: 1,
      progress: {
        band: { plop: 'Z', dripDrop: 'C' },
        recent: { plop: [1, 'x', 2, 3, 4, 5, 6, 7, 8, 9] },
        visits: { plop: 'many' },
      },
    }));
    const loaded = load(storage);
    expect(loaded.progress.band.plop).toBe('A');
    expect(loaded.progress.band.dripDrop).toBe('C');
    expect(loaded.progress.recent.plop).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(loaded.progress.visits.plop).toBe(0);
  });

  it('keeps going when storage throws and leaves the other games alone', () => {
    const storage = memory();
    storage.setItem('tootTootTwenty.v1', 'train');
    storage.setItem('jumpJumpBunny.v1', 'bunny');
    const state = defaultState();
    persist(state, storage);
    expect(storage.getItem('tootTootTwenty.v1')).toBe('train');
    expect(storage.getItem('jumpJumpBunny.v1')).toBe('bunny');
    expect(SAVE_KEY).toBe('ohNoIceCream.v1');
    const throwing = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    expect(load(throwing).v).toBe(1);
    expect(persist(defaultState(), throwing)).toBe(false);
    const real = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('no storage');
      },
    });
    try {
      const fallback = defaultStorage();
      expect(persist(defaultState(), fallback)).toBe(true);
      expect(load(fallback).settings.motion).toBe('auto');
    } finally {
      if (real === undefined) delete globalThis.localStorage;
      else {
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: real });
      }
    }
  });

  it('resets progress and the unlock switch', () => {
    const state = defaultState();
    state.progress.visits.sampler = 3;
    state.settings.muted = true;
    state.settings.unlockAll = true;
    resetProgress(state);
    expect(state.progress.visits.sampler).toBe(0);
    expect(state.settings.muted).toBe(true);
    expect(state.settings.unlockAll).toBe(false);
  });
});
