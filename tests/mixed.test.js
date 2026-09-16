import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import { factKeyOf } from '../src/game/problemGenerator.js';
import { defaultState } from '../src/app/storage/save.js';
import {
  ROUTE_ID,
  STATION,
  generateTrip,
  isCorrect,
  equationParts,
  packSpec,
} from '../src/game/ops/mixed.js';

const REQUIRED = ['add', 'takeaway', 'missing', 'compare', 'bond'];

function mastery() {
  return defaultState().mastery;
}

function assertShape(p) {
  expect(p.op).toEqual(expect.any(String));
  expect(p.routeId).toBe(11);
  expect(p.a).toEqual(expect.any(Number));
  expect(p.b).toEqual(expect.any(Number));
  expect(p.a).toBeGreaterThanOrEqual(0);
  expect(p.b).toBeGreaterThanOrEqual(0);
  expect(p.factKey).toEqual(expect.any(String));
  expect(p.input).toBe('choices');
  expect(Array.isArray(p.choices)).toBe(true);
  expect(p.choiceCount).toBe(p.choices.length);
  expect(p.choices).toContain(p.answer);
  expect(typeof p.requireCombine).toBe('boolean');
  expect([5, 10]).toContain(p.frameSize);
  expect([1, 2]).toContain(p.frameCount);
  expect(p.strategy).toEqual(expect.any(String));
  expect(p.sum).toEqual(expect.any(Number));
  if (p.op === 'add') {
    expect(p.requireCombine).toBe(true);
    expect(p.answer).toBe(p.sum);
    expect(p.a).toBeGreaterThanOrEqual(1);
    expect(p.b).toBeGreaterThanOrEqual(1);
    expect(p.sum).toBeGreaterThanOrEqual(2);
    expect(p.sum).toBeLessThanOrEqual(10);
    expect(p.factKey).toBe(factKeyOf(p.a, p.b));
    expect(p.speciesA).not.toBe(p.speciesB);
  } else {
    expect(p.requireCombine).toBe(false);
  }
  if (p.op === 'takeaway') {
    expect(p.answer).toBe(p.a - p.b);
    expect(p.sum).toBe(p.a);
    expect(p.speciesA).toBeTruthy();
  }
  if (p.op === 'missing') {
    expect([5, 10]).toContain(p.sum);
    expect(p.answer).toBe(p.sum - p.a);
    expect(p.speciesB).toBeNull();
  }
  if (p.op === 'compare') {
    expect(['left', 'right', 'same']).toContain(p.answer);
    expect(p.answer).toBe(p.a === p.b ? 'same' : p.a > p.b ? 'left' : 'right');
    expect(p.speciesA).not.toBe(p.speciesB);
  }
  if (p.op === 'bond') {
    expect(p.a + p.b).toBe(10);
    expect(p.sum).toBe(10);
    expect(p.answer).toBe(p.b);
  }
}

describe('Mix-Up Main', () => {
  it('exports route 11 Mix-Up Main', () => {
    expect(ROUTE_ID).toBe(11);
    expect(STATION).toEqual({ id: 11, op: 'mixed', name: 'Mix-Up Main', emoji: '🎲' });
  });

  it('returns 6 mixed problems with unique factKeys', () => {
    const trip = generateTrip({ mastery: mastery(), seed: 42 });
    expect(trip).toHaveLength(6);
    const ops = trip.map((p) => p.op);
    for (const op of REQUIRED) expect(ops).toContain(op);
    expect(ops.filter((op) => op === 'add')).toHaveLength(2);
    const keys = trip.map((p) => p.factKey);
    expect(new Set(keys).size).toBe(6);
    trip.forEach(assertShape);
  });

  it('shuffles so addition is not always first', () => {
    const firsts = new Set();
    for (let seed = 0; seed < 24; seed++) {
      firsts.add(generateTrip({ mastery: mastery(), seed })[0].op);
    }
    expect(firsts.size).toBeGreaterThan(1);
    expect([...firsts].some((op) => op !== 'add')).toBe(true);
  });

  it('isCorrect works for a numeric problem and a compare problem', () => {
    const trip = generateTrip({ mastery: mastery(), seed: 7 });
    const numeric = trip.find((p) => p.op !== 'compare');
    const compare = trip.find((p) => p.op === 'compare');
    expect(numeric).toBeTruthy();
    expect(compare).toBeTruthy();
    expect(isCorrect(numeric, numeric.answer)).toBe(true);
    expect(isCorrect(numeric, Number(numeric.answer) + 1)).toBe(false);
    expect(isCorrect(compare, compare.answer)).toBe(true);
    const wrong = ['left', 'right', 'same'].find((v) => v !== compare.answer);
    expect(isCorrect(compare, wrong)).toBe(false);
    expect(isCorrect(compare, 1)).toBe(false);
  });

  it('never throws 20 generateTrip calls', () => {
    const m = mastery();
    const recentKeys = ['1+1', '1+2', '2+2', '3+3', '4+4', '5+5'];
    for (let i = 0; i < 20; i++) {
      expect(() =>
        generateTrip({
          mastery: m,
          seed: i * 17,
          recentKeys,
          tripsCompleted: i,
        }),
      ).not.toThrow();
      const trip = generateTrip({ mastery: m, seed: i * 17, rng: mulberry32(i * 99), recentKeys });
      expect(trip).toHaveLength(6);
      const ops = new Set(trip.map((p) => p.op));
      for (const op of REQUIRED) expect(ops.has(op)).toBe(true);
      expect(new Set(trip.map((p) => p.factKey)).size).toBe(6);
      trip.forEach(assertShape);
      expect(equationParts(trip[0], { celebrating: false }).length).toBeGreaterThan(0);
      expect(equationParts(trip[0], { celebrating: true }).length).toBeGreaterThan(0);
      expect(packSpec(trip[0]).kind).toEqual(expect.any(String));
    }
  });
});
