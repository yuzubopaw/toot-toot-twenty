import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import {
  ROUTE_ID,
  STATION,
  equationParts,
  generateTrip,
  isCorrect,
  nextMissing,
  packSpec,
} from '../src/game/ops/missingAddend.js';

function assertProblem(p) {
  expect(p.op).toBe('missing');
  expect(p.routeId).toBe(8);
  expect(p.a).toBeGreaterThanOrEqual(1);
  expect(p.b).toBeGreaterThanOrEqual(1);
  expect(p.a + p.b).toBe(p.sum);
  expect(p.answer).toBe(p.sum - p.a);
  expect(p.answer).toBe(p.b);
  expect([5, 10]).toContain(p.sum);
  expect(p.a).toBeLessThan(p.sum);
  expect(p.b).toBeLessThan(p.sum);
  expect(p.factKey).toBe(`${p.a}+?=${p.sum}`);
  expect(p.speciesB).toBeNull();
  expect(p.speciesA).toEqual(expect.any(String));
  expect(p.requireCombine).toBe(false);
  expect(p.frameSize).toBe(p.sum === 5 ? 5 : 10);
  expect(p.frameCount).toBe(1);
  expect(p.strategy).toBe('missing');
  expect(p.input).toBe('choices');
  expect(p.choices.length).toBeGreaterThanOrEqual(3);
  expect(p.choices.length).toBeLessThanOrEqual(4);
  expect(p.choiceCount).toBe(p.choices.length);
  expect(p.choices.includes(p.answer)).toBe(true);
  expect(p.choices.every((n) => Number.isInteger(n) && n >= 1 && n <= 10)).toBe(true);
  expect(new Set(p.choices).size).toBe(p.choices.length);
}

describe('missing addend station', () => {
  it('exports route 8 Spare Seat', () => {
    expect(ROUTE_ID).toBe(8);
    expect(STATION).toEqual({ id: 8, op: 'missing', name: 'Spare Seat', emoji: '🪑' });
  });
});

describe('generateTrip', () => {
  it('returns 6 problems with unique keys', () => {
    const trip = generateTrip({ mastery: { tripsCompleted: 0, facts: {} }, seed: 42 });
    expect(trip).toHaveLength(6);
    const keys = trip.map((p) => p.factKey);
    expect(new Set(keys).size).toBe(keys.length);
    trip.forEach(assertProblem);
  });

  it('answer===sum-a, a>=1, b>=1, a+b===sum, sum is 5 or 10', () => {
    for (const seed of [1, 2, 3, 7, 11, 42, 99, 2026]) {
      const trip = generateTrip({
        mastery: { tripsCompleted: seed % 4, facts: {} },
        seed,
      });
      expect(trip).toHaveLength(6);
      expect(new Set(trip.map((p) => p.factKey)).size).toBe(6);
      const n5 = trip.filter((p) => p.sum === 5).length;
      const n10 = trip.filter((p) => p.sum === 10).length;
      expect(n5).toBeGreaterThanOrEqual(2);
      expect(n10).toBeGreaterThanOrEqual(2);
      for (const p of trip) {
        expect(p.answer).toBe(p.sum - p.a);
        expect(p.a).toBeGreaterThanOrEqual(1);
        expect(p.b).toBeGreaterThanOrEqual(1);
        expect(p.a + p.b).toBe(p.sum);
        expect([5, 10]).toContain(p.sum);
      }
    }
  });

  it('choices include answer, all 1–10', () => {
    const trip = generateTrip({ mastery: { tripsCompleted: 1, facts: {} }, seed: 11 });
    for (const p of trip) {
      expect(p.choices.includes(p.answer)).toBe(true);
      expect(p.choices.every((n) => n >= 1 && n <= 10)).toBe(true);
      expect(p.choices.length).toBeGreaterThanOrEqual(3);
      expect(p.choices.length).toBeLessThanOrEqual(4);
    }
  });

  it('prefers T=5 on the first 3 problems for a new player', () => {
    const trip = generateTrip({ mastery: { tripsCompleted: 0, facts: {} }, seed: 8 });
    expect(trip.slice(0, 3).every((p) => p.sum === 5)).toBe(true);
    expect(trip.filter((p) => p.sum === 10).length).toBeGreaterThanOrEqual(2);
  });

  it('accepts an rng function and tripsCompleted override', () => {
    const trip = generateTrip({
      mastery: { tripsCompleted: 0, facts: {} },
      rng: mulberry32(77),
      tripsCompleted: 4,
      recentKeys: ['1+?=5', '2+?=5'],
    });
    expect(trip).toHaveLength(6);
    expect(new Set(trip.map((p) => p.factKey)).size).toBe(6);
    trip.forEach(assertProblem);
  });
});

describe('nextMissing', () => {
  it('never throws 50 draws', () => {
    const rng = mulberry32(5);
    const usedThisTrip = [];
    for (let i = 0; i < 50; i++) {
      let p;
      expect(() => {
        p = nextMissing({
          rng,
          mastery: { facts: {} },
          usedThisTrip,
          tripIndex: i % 6,
          tripsCompleted: i < 6 ? 0 : 2,
        });
      }).not.toThrow();
      assertProblem(p);
      usedThisTrip.push(p.factKey);
    }
  });

  it('does not throw with empty args', () => {
    expect(() => nextMissing()).not.toThrow();
    assertProblem(nextMissing({ rng: () => 0.25 }));
  });
});

describe('equation and pack', () => {
  it('celebrating equation includes the missing number', () => {
    const p = nextMissing({
      rng: () => 0.3,
      mastery: { facts: {} },
      usedThisTrip: [],
      tripIndex: 0,
      tripsCompleted: 0,
    });
    const hidden = equationParts(p, { celebrating: false });
    expect(hidden).toEqual([p.a, '+', '?', '=', p.sum]);
    const shown = equationParts(p, { celebrating: true });
    expect(shown).toEqual([p.a, '+', p.b, '=', p.sum]);
    expect(shown).toContain(p.answer);
  });

  it('packSpec shows seated friends and empty cells', () => {
    const p = nextMissing({ rng: mulberry32(3), tripIndex: 4, tripsCompleted: 2 });
    expect(packSpec(p)).toEqual({
      kind: 'missing',
      seated: p.a,
      missing: p.b,
      target: p.sum,
      speciesA: p.speciesA,
      emptyCells: true,
    });
  });

  it('isCorrect matches the missing count', () => {
    const p = nextMissing({ rng: mulberry32(9), tripIndex: 1, tripsCompleted: 1 });
    expect(isCorrect(p, p.answer)).toBe(true);
    expect(isCorrect(p, p.sum)).toBe(false);
    expect(isCorrect(p, p.answer + 1)).toBe(false);
    if (p.a !== p.answer) expect(isCorrect(p, p.a)).toBe(false);
  });
});
