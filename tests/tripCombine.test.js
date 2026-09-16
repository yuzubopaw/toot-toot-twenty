import { describe, expect, it } from 'vitest';
import { autoCombineDelayMs, JOIN_MS } from '../src/app/screens/TripScreen.js';

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
