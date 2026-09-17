import { describe, expect, it } from 'vitest';
import {
  applyFactOutcome,
  emptyFact,
  isMastered,
  isWeak,
  maybeUnlock,
  strength,
  unlockMet,
} from '../src/game/mastery.js';
import { defaultState } from '../src/app/storage/save.js';
import { STATIONS, stationLocked } from '../src/app/screens/MapScreen.js';

describe('FactStats table', () => {
  it('first-try hit', () => {
    const f = applyFactOutcome(emptyFact(), 1, 0, 1);
    expect(f).toMatchObject({ seen: 1, correctFirst: 1, correctRetry: 0, wrong: 0, streak: 1 });
    expect(f.correctFirst + f.correctRetry).toBe(f.seen);
  });

  it('miss then retry', () => {
    const f = applyFactOutcome(emptyFact(), 2, 1, 1);
    expect(f).toMatchObject({ seen: 1, correctFirst: 0, correctRetry: 1, wrong: 1, streak: 0 });
    expect(f.correctFirst + f.correctRetry).toBe(f.seen);
  });

  it('auto-count then success', () => {
    const f = applyFactOutcome(emptyFact(), 3, 2, 1);
    expect(f.wrong).toBe(2);
    expect(f.streak).toBe(0);
  });

  it('reveal then success', () => {
    const f = applyFactOutcome(emptyFact(), 4, 3, 1);
    expect(f.wrong).toBe(3);
    expect(f.correctRetry).toBe(1);
  });
});

describe('derived flags', () => {
  it('unseen is not weak', () => {
    expect(isWeak(emptyFact())).toBe(false);
    expect(strength(emptyFact())).toBeGreaterThanOrEqual(0);
  });

  it('mastered needs seen, streak, first-try rate', () => {
    let f = emptyFact();
    for (let i = 0; i < 4; i++) f = applyFactOutcome(f, 1, 0, i + 1);
    expect(isMastered(f)).toBe(true);
  });
});

describe('unlockMet', () => {
  it('needs 3 trips and 10 of 12', () => {
    const save = {
      mastery: {
        tripsByRoute: { 1: 3 },
        recentByRoute: {
          1: Array.from({ length: 12 }, (_, i) => ({ triesUntilCorrect: i < 10 ? 1 : 3 })),
        },
        adultUnlockedAll: false,
        highestRouteUnlocked: 1,
      },
    };
    expect(unlockMet(save, 1)).toBe(true);
    save.mastery.recentByRoute[1][9].triesUntilCorrect = 3;
    expect(unlockMet(save, 1)).toBe(false);
  });

  it('adult flag wins', () => {
    const save = {
      mastery: {
        adultUnlockedAll: true,
        highestRouteUnlocked: 1,
        tripsByRoute: {},
        recentByRoute: {},
      },
    };
    expect(maybeUnlock(save)).toBe(13);
  });

  it('Tally Track and Date Depot are available at start', () => {
    const mastery = defaultState().mastery;
    expect(STATIONS.slice(0, 3).map((s) => s.name)).toEqual([
      'Garden Siding',
      'Tally Track',
      'Date Depot',
    ]);
    expect(stationLocked({ id: 1 }, mastery)).toBe(false);
    expect(stationLocked({ id: 12 }, mastery)).toBe(false);
    expect(stationLocked({ id: 13 }, mastery)).toBe(false);
    for (const id of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(stationLocked({ id }, mastery)).toBe(true);
    }
    expect(maybeUnlock({ mastery: { ...mastery } })).toBe(1);
  });

  it('addition routes 1–6 still need 3 trips and 10 of 12', () => {
    const save = {
      mastery: {
        tripsByRoute: { 1: 2 },
        recentByRoute: {
          1: Array.from({ length: 12 }, () => ({ triesUntilCorrect: 1 })),
        },
        adultUnlockedAll: false,
        highestRouteUnlocked: 1,
      },
    };
    expect(unlockMet(save, 1)).toBe(false);
    expect(stationLocked({ id: 2 }, save.mastery)).toBe(true);
    save.mastery.tripsByRoute[1] = 3;
    expect(unlockMet(save, 1)).toBe(true);
    expect(maybeUnlock(save)).toBe(2);
    expect(stationLocked({ id: 2 }, save.mastery)).toBe(false);
    expect(stationLocked({ id: 3 }, save.mastery)).toBe(true);
  });

  it('extra ops 7–11 stay sequential', () => {
    const save = {
      mastery: {
        adultUnlockedAll: false,
        highestRouteUnlocked: 7,
        tripsCompleted: 1,
        tripsByRoute: {},
        recentByRoute: {},
      },
    };
    expect(stationLocked({ id: 7 }, save.mastery)).toBe(false);
    expect(stationLocked({ id: 8 }, save.mastery)).toBe(true);
    expect(unlockMet(save, 7)).toBe(true);
    expect(maybeUnlock(save)).toBe(8);
    expect(stationLocked({ id: 8 }, save.mastery)).toBe(false);
    expect(stationLocked({ id: 9 }, save.mastery)).toBe(true);

    save.mastery.highestRouteUnlocked = 10;
    save.mastery.tripsByRoute = { 9: 1 };
    expect(maybeUnlock(save)).toBe(11);
    expect(stationLocked({ id: 11 }, save.mastery)).toBe(false);

    save.mastery.highestRouteUnlocked = 11;
    save.mastery.tripsByRoute = {};
    expect(maybeUnlock(save)).toBe(11);
    expect(stationLocked({ id: 12 }, save.mastery)).toBe(false);
    expect(stationLocked({ id: 13 }, save.mastery)).toBe(false);
  });
});
