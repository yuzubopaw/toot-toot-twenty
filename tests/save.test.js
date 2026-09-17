import { describe, expect, it } from 'vitest';
import { defaultState, load, persist, recordCorrect, resetAll, SAVE_KEY } from '../src/app/storage/save.js';

function mem() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
    data,
  };
}

describe('save', () => {
  it('corrupt JSON falls back to defaults', () => {
    const storage = mem();
    storage.setItem(SAVE_KEY, '{nope');
    const s = load(storage);
    expect(s.v).toBe(1);
    expect(s.mastery.highestRouteUnlocked).toBe(1);
  });

  it('persist round-trip', () => {
    const storage = mem();
    const s = defaultState();
    s.settings.muted = true;
    persist(s, storage);
    expect(load(storage).settings.muted).toBe(true);
  });

  it('6th correct tap writes trip-finished row', () => {
    const storage = mem();
    const s = defaultState();
    for (let i = 0; i < 5; i++) {
      recordCorrect(s, {
        routeId: 1,
        factKey: '1+1',
        triesUntilCorrect: 1,
        wrongEvents: 0,
        now: i,
        tripFinished: false,
      });
    }
    recordCorrect(s, {
      routeId: 1,
      factKey: '2+2',
      triesUntilCorrect: 1,
      wrongEvents: 0,
      now: 9,
      tripFinished: true,
    });
    persist(s, storage);
    const loaded = load(storage);
    expect(loaded.mastery.tripsCompleted).toBe(1);
    expect(loaded.mastery.tripsByRoute['1']).toBe(1);
    expect(loaded.collection.unlockedIds).toHaveLength(1);
    expect(loaded.mastery.recentByRoute['1']).toHaveLength(6);
  });

  it('reset keeps muted', () => {
    const s = defaultState();
    s.settings.muted = true;
    s.mastery.tripsCompleted = 4;
    resetAll(s, true);
    expect(s.settings.muted).toBe(true);
    expect(s.mastery.tripsCompleted).toBe(0);
  });

  it('reset clears unlocks so the map starts at station 1 again', () => {
    const s = defaultState();
    s.settings.muted = true;
    s.mastery.adultUnlockedAll = true;
    s.mastery.highestRouteUnlocked = 13;
    s.mastery.tripsCompleted = 9;
    s.collection.unlockedIds = ['duck'];
    resetAll(s, true);
    expect(s.settings.muted).toBe(true);
    expect(s.mastery.adultUnlockedAll).toBe(false);
    expect(s.mastery.highestRouteUnlocked).toBe(1);
    expect(s.collection.unlockedIds).toEqual([]);
  });
});
