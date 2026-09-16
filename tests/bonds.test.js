import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import {
  ROUTE_ID,
  STATION,
  bondFactKey,
  equationParts,
  generateTrip,
  isCorrect,
  nextBond,
  packSpec,
} from '../src/game/ops/bonds.js';

const mastery = { facts: {}, tripsCompleted: 0, recentKeys: [] };

function assertBondProblem(p) {
  expect(p.op).toBe('bond');
  expect(p.routeId).toBe(10);
  expect([5, 10]).toContain(p.sum);
  expect(p.a).toBeGreaterThanOrEqual(1);
  expect(p.a).toBeLessThan(p.sum);
  expect(p.b).toBe(p.sum - p.a);
  expect(p.a + p.b).toBe(p.sum);
  expect(p.answer).toBe(p.b);
  expect(p.factKey).toBe(`bond:${p.a}+${p.b}`);
  expect(p.speciesA).toBeTruthy();
  expect(p.speciesB).toBeTruthy();
  expect(p.speciesA).not.toBe(p.speciesB);
  expect(p.choices.length).toBeGreaterThanOrEqual(3);
  expect(p.choices.length).toBeLessThanOrEqual(4);
  expect(p.choiceCount).toBe(p.choices.length);
  expect(p.choices.includes(p.answer)).toBe(true);
  expect(p.choices.every((n) => Number.isInteger(n) && n >= 1 && n < p.sum)).toBe(true);
  expect(p.choices.includes(0)).toBe(false);
  expect(p.choices.includes(p.sum)).toBe(false);
  expect(new Set(p.choices).size).toBe(p.choices.length);
  expect(p.requireCombine).toBe(false);
  expect(p.frameSize).toBe(p.sum === 5 ? 5 : 10);
  expect(p.frameCount).toBe(1);
  expect(p.strategy).toBe('bond');
  expect(p.input).toBe('choices');
}

describe('station', () => {
  it('is Ten Bond Bay on route 10', () => {
    expect(ROUTE_ID).toBe(10);
    expect(STATION).toEqual({ id: 10, op: 'bond', name: 'Ten Bond Bay', emoji: '🧩' });
  });
});

describe('generateTrip', () => {
  it('returns 6 problems with unique factKeys', () => {
    const trip = generateTrip({ mastery, seed: 3 });
    expect(trip).toHaveLength(6);
    const keys = trip.map((p) => p.factKey);
    expect(new Set(keys).size).toBe(keys.length);
    trip.forEach(assertBondProblem);
  });

  it('new players mostly bond to 5; later trips mix 5 and 10', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const easy = generateTrip({ mastery, seed });
      expect(easy.filter((p) => p.sum === 5).length).toBeGreaterThanOrEqual(4);
      const later = generateTrip({ mastery: { ...mastery, tripsCompleted: 4 }, seed });
      expect(later.some((p) => p.sum === 5)).toBe(true);
      expect(later.some((p) => p.sum === 10)).toBe(true);
    }
  });

  it('choices include the answer and stay below the target', () => {
    const trip = generateTrip({ mastery, seed: 11 });
    for (const p of trip) {
      expect(p.choices.includes(p.answer)).toBe(true);
      expect(p.choices.every((n) => n >= 1 && n < p.sum)).toBe(true);
    }
  });

  it('covers several different a and repeats an a at most twice', () => {
    const trip = generateTrip({ mastery, seed: 21 });
    const counts = Object.create(null);
    for (const p of trip) counts[p.a] = (counts[p.a] || 0) + 1;
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(3);
    expect(Object.values(counts).every((n) => n <= 2)).toBe(true);
  });

  it('includes a make-five family fact for new players', () => {
    for (let seed = 0; seed < 40; seed++) {
      const trip = generateTrip({ mastery, seed });
      const family = trip.some(
        (p) =>
          p.sum === 5 &&
          ((p.a === 1 && p.b === 4) ||
            (p.a === 4 && p.b === 1) ||
            (p.a === 2 && p.b === 3) ||
            (p.a === 3 && p.b === 2)),
      );
      expect(family).toBe(true);
    }
  });

  it('is deterministic for a seed', () => {
    const a = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    const b = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    expect(a).toEqual(b);
  });
});

describe('nextBond', () => {
  it('never throws across 50 draws', () => {
    const rng = mulberry32(99);
    const usedThisTrip = [];
    for (let i = 0; i < 50; i++) {
      const p = nextBond({
        rng,
        mastery,
        usedThisTrip: usedThisTrip.slice(-6),
        tripIndex: i % 6,
        tripsCompleted: 0,
      });
      assertBondProblem(p);
      usedThisTrip.push(p.factKey);
    }
  });

  it('never throws with missing args', () => {
    for (let i = 0; i < 50; i++) {
      expect(() => nextBond({})).not.toThrow();
      expect(() => nextBond()).not.toThrow();
    }
  });
});

describe('isCorrect', () => {
  it('accepts b and rejects 10', () => {
    const p = nextBond({ rng: mulberry32(4), mastery, usedThisTrip: [], tripIndex: 0, tripsCompleted: 0 });
    expect(isCorrect(p, p.answer)).toBe(true);
    expect(isCorrect(p, p.b)).toBe(true);
    expect(isCorrect(p, 10)).toBe(false);
    expect(isCorrect(p, 0)).toBe(false);
  });
});

describe('equationParts', () => {
  it('celebrating equation shows the target and b', () => {
    const trip = generateTrip({ mastery, seed: 8 });
    for (const p of trip) {
      const parts = equationParts(p, { celebrating: true }).map(String);
      expect(parts).toContain(String(p.sum));
      expect(parts).toContain(String(p.b));
      const ask = equationParts(p, { celebrating: false }).map(String);
      expect(ask).toContain(String(p.a));
      expect(ask).toContain('+');
      expect(ask).toContain('?');
    }
  });
});

describe('packSpec', () => {
  it('describes a bond pair at the problem target', () => {
    const p = generateTrip({ mastery, seed: 2 })[0];
    expect(packSpec(p)).toEqual({
      kind: 'bond',
      a: p.a,
      b: p.b,
      target: p.sum,
      speciesA: p.speciesA,
      speciesB: p.speciesB,
    });
  });
});

describe('bondFactKey', () => {
  it('keeps shown-part order', () => {
    expect(bondFactKey(3)).toBe('bond:3+7');
    expect(bondFactKey(7)).toBe('bond:7+3');
    expect(bondFactKey(5)).toBe('bond:5+5');
  });
});
