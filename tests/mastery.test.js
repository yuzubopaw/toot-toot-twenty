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

  it('Tally Track unlocks after Ten Bond Bay in the extra-mode chain', () => {
    const save = {
      mastery: {
        adultUnlockedAll: false,
        highestRouteUnlocked: 11,
        tripsCompleted: 8,
        tripsByRoute: { 10: 1 },
        recentByRoute: {},
      },
    };
    expect(unlockMet(save, 11)).toBe(true);
    expect(maybeUnlock(save)).toBe(12);
  });

  it('Date Depot unlocks after Mix-Up Main in the extra-mode chain', () => {
    const save = {
      mastery: {
        adultUnlockedAll: false,
        highestRouteUnlocked: 12,
        tripsCompleted: 9,
        tripsByRoute: { 11: 1 },
        recentByRoute: {},
      },
    };
    expect(unlockMet(save, 12)).toBe(true);
    expect(maybeUnlock(save)).toBe(13);
  });
});
