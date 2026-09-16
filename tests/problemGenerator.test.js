import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import {
  SPECIES_PAIRS,
  factKeyOf,
  generateTrip,
  legalPairs,
  makeChoices,
  nextProblem,
  presentationFor,
  routeFilter,
} from '../src/game/problemGenerator.js';
import { makeTenFields } from '../src/game/pack.js';
import { defaultState } from '../src/app/storage/save.js';

describe('species pairs', () => {
  it('has twenty distinct animals in ten pairs', () => {
    expect(SPECIES_PAIRS).toHaveLength(10);
    const flat = SPECIES_PAIRS.flat();
    expect(flat).toHaveLength(20);
    expect(new Set(flat).size).toBe(20);
    SPECIES_PAIRS.forEach(([a, b]) => expect(a).not.toBe(b));
  });
});

describe('filters', () => {
  it('route 1 has no zeros and sums 1-5', () => {
    for (const [a, b] of legalPairs(1)) {
      expect(a).toBeGreaterThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(a + b).toBeLessThanOrEqual(5);
    }
  });

  it('never 0+0 and route 2 max one zero is a trip cap', () => {
    expect(routeFilter(2)(0, 0, 0)).toBe(false);
    expect(routeFilter(2)(0, 6, 6)).toBe(true);
  });
});

describe('makeChoices', () => {
  it('is deterministic and contains the sum once', () => {
    const a = makeChoices(3, 2, 3, mulberry32(42));
    const b = makeChoices(3, 2, 3, mulberry32(42));
    expect(a).toEqual(b);
    expect(a.filter((n) => n === 5)).toHaveLength(1);
    expect(a.every((n) => n >= 0 && n <= 20)).toBe(true);
  });
});

describe('makeTenFields via presentation', () => {
  it('uses a < 10 && sum > 10, not min===9', () => {
    expect(makeTenFields(11, 9)).toEqual({ makeTenSplit: false, splitIntoFirst: 0 });
    expect(presentationFor(11, 9, 5).makeTenSplit).toBe(false);
    expect(presentationFor(5, 8, 4).makeTenSplit).toBe(true);
  });
});

describe('nextProblem never throws', () => {
  it('100 sequential draws on every route with full recentKeys', () => {
    const mastery = defaultState().mastery;
    const recentKeys = ['1+1', '1+2', '1+3', '1+4', '2+2', '2+3', '3+3', '4+4'];
    for (let routeId = 1; routeId <= 6; routeId++) {
      const rng = mulberry32(routeId * 99);
      const usedThisTrip = [];
      for (let i = 0; i < 100; i++) {
        const p = nextProblem({
          routeId,
          mastery,
          rng,
          recentKeys,
          usedThisTrip: usedThisTrip.slice(-6),
          zerosUsedThisTrip: 0,
          tripIndex: i % 6,
        });
        expect(p.a + p.b).toBe(p.sum);
        expect(p.sum).toBeLessThanOrEqual(20);
        expect(p.a).toBeGreaterThanOrEqual(0);
        expect(p.choices.includes(p.sum)).toBe(true);
        if (p.a > 0 && p.b > 0) expect(p.speciesA).not.toBe(p.speciesB);
        if (p.a === 0) expect(p.speciesA).toBeNull();
        usedThisTrip.push(p.factKey);
      }
    }
  });
});

describe('kindergarten coverage', () => {
  it('route 1 trips include a partners-of-5 fact', () => {
    const mastery = defaultState().mastery;
    for (let seed = 1; seed <= 20; seed++) {
      const t = generateTrip({ routeId: 1, mastery, seed });
      expect(t.some((p) => p.a + p.b === 5)).toBe(true);
    }
  });

  it('route 4 trips include a 10+n teen', () => {
    const mastery = { ...defaultState().mastery, highestRouteUnlocked: 5 };
    for (let seed = 1; seed <= 20; seed++) {
      const t = generateTrip({ routeId: 4, mastery, seed });
      expect(t.some((p) => p.a === 10 || p.b === 10)).toBe(true);
    }
  });
});

describe('generateTrip', () => {
  it('returns 6, unique unless pool tiny, route 1 no zeros, route 2 make-ten', () => {
    const mastery = defaultState().mastery;
    const t1 = generateTrip({ routeId: 1, mastery, seed: 3 });
    expect(t1).toHaveLength(6);
    expect(t1.every((p) => p.a >= 1 && p.b >= 1)).toBe(true);
    const keys = t1.map((p) => p.factKey);
    expect(new Set(keys).size).toBe(keys.length);

    const t2 = generateTrip({ routeId: 2, mastery, seed: 8 });
    expect(t2.some((p) => p.a + p.b === 10 && p.a >= 1 && p.b >= 1)).toBe(true);
    expect(t2.filter((p) => p.a === 0 || p.b === 0).length).toBeLessThanOrEqual(1);

    for (let r = 3; r <= 6; r++) {
      const t = generateTrip({ routeId: r, mastery: { ...mastery, highestRouteUnlocked: 5 }, seed: r * 17 });
      expect(t).toHaveLength(6);
      expect(t.every((p) => p.a + p.b === p.sum && p.sum <= 20)).toBe(true);
    }
  });
});

describe('mode routes', () => {
  it('routes 7-12 emit six problems with op and answer', () => {
    const mastery = defaultState().mastery;
    for (const routeId of [7, 8, 9, 10, 11, 12]) {
      const trip = generateTrip({ routeId, mastery, seed: 21 });
      expect(trip).toHaveLength(6);
      trip.forEach((p) => {
        expect(p.answer).toBeDefined();
        expect(p.choices.includes(p.answer)).toBe(true);
        expect(p.op).toBeTruthy();
      });
    }
  });
});

describe('factKey', () => {
  it('canonical min+max', () => {
    expect(factKeyOf(3, 5)).toBe('3+5');
    expect(factKeyOf(5, 3)).toBe('3+5');
  });
});
