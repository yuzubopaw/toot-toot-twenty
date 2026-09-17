import { describe, expect, it } from 'vitest';
import { ANSWER_LOCK_MS } from '../src/game/hints.js';
import {
  JOIN_MS,
  PARTIAL_LOCK_MS,
  answerLockMs,
  autoCombineDelayMs,
  remainingOrderDays,
} from '../src/app/screens/TripScreen.js';

describe('autoCombineDelayMs', () => {
  it('returns null when the child must use the lever', () => {
    expect(autoCombineDelayMs({ requireCombine: true, op: 'add' }, { autoCombineAt: 0 }, false, 1000)).toBe(null);
    expect(autoCombineDelayMs({ requireCombine: true }, { autoCombineAt: 5000 }, true, 1000)).toBe(null);
  });

  it('skips the lever for takeaway, compare, count, and order', () => {
    expect(autoCombineDelayMs({ requireCombine: true, op: 'takeaway' }, { autoCombineAt: 9000 }, false, 1000)).toBe(0);
    expect(autoCombineDelayMs({ requireCombine: false, op: 'compare' }, { autoCombineAt: 9000 }, false, 1000)).toBe(0);
    expect(autoCombineDelayMs({ requireCombine: false, op: 'count' }, { autoCombineAt: 9000 }, false, 1000)).toBe(0);
    expect(autoCombineDelayMs({ requireCombine: false, op: 'order' }, { autoCombineAt: 9000 }, false, 1000)).toBe(0);
  });

  it('returns 0 when auto-combine and reduceMotion', () => {
    expect(autoCombineDelayMs({ requireCombine: false }, { autoCombineAt: 9000 }, true, 1000)).toBe(0);
  });

  it('waits until autoCombineAt when auto-combine', () => {
    expect(JOIN_MS).toBe(500);
    expect(autoCombineDelayMs({ requireCombine: false }, { autoCombineAt: 5000 }, false, 1000)).toBe(4000);
    expect(autoCombineDelayMs({ requireCombine: false }, { autoCombineAt: 500 }, false, 1000)).toBe(0);
  });
});

describe('order tap lock and remaining auto-count', () => {
  it('does not lock the next day after a partial sequence tap', () => {
    expect(PARTIAL_LOCK_MS).toBeLessThan(ANSWER_LOCK_MS);
    expect(answerLockMs({ partial: true, ignored: false })).toBe(PARTIAL_LOCK_MS);
    expect(answerLockMs({ correct: true, partial: false })).toBe(ANSWER_LOCK_MS);
    expect(answerLockMs({ ignored: true })).toBe(0);
  });

  it('auto-counts only the days not yet boarded', () => {
    const problem = { op: 'order', sequence: [4, 5, 6] };
    expect(remainingOrderDays(problem, { placed: [] })).toEqual([4, 5, 6]);
    expect(remainingOrderDays(problem, { placed: [4] })).toEqual([5, 6]);
    expect(remainingOrderDays(problem, { placed: [4, 5] })).toEqual([6]);
    expect(remainingOrderDays({ op: 'count', answer: 12 }, { placed: [] })).toEqual([]);
  });
});

