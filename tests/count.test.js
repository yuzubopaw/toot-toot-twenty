import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import { defaultState } from '../src/app/storage/save.js';
import { packCount } from '../src/game/pack.js';
import { generateTrip as generateAnyTrip } from '../src/game/problemGenerator.js';
import {
  MAX_COUNT,
  MIN_COUNT,
  OP,
  ROUTE_ID,
  STATION,
  bandFor,
  countFactKey,
  equationParts,
  generateTrip,
  isCorrect,
  makeCountChoices,
  nextCount,
  packSpec,
} from '../src/game/ops/count.js';
import { OP as OPS } from '../src/game/ops/contract.js';

const mastery = defaultState().mastery;

function assertLegal(p) {
  expect(p.op).toBe('count');
  expect(p.routeId).toBe(12);
  expect(p.answer).toBeGreaterThanOrEqual(MIN_COUNT);
  expect(p.answer).toBeLessThanOrEqual(MAX_COUNT);
  expect(p.sum).toBe(p.answer);
  expect(p.a + p.b).toBe(p.answer);
  expect(p.factKey).toBe(countFactKey(p.answer));
  expect(p.choices.includes(p.answer)).toBe(true);
  expect(new Set(p.choices).size).toBe(p.choices.length);
  expect(p.choices.length).toBe(p.answer <= 10 ? 3 : 4);
  expect(p.choiceCount).toBe(p.choices.length);
  expect(p.choices.every((n) => Number.isInteger(n) && n >= 1 && n <= 50)).toBe(true);
  expect(p.speciesA).toBeTruthy();
  if (p.b > 0) {
    expect(p.speciesB).toBeTruthy();
    expect(p.speciesA).not.toBe(p.speciesB);
  } else {
    expect(p.speciesB).toBeNull();
  }
  expect(p.input).toBe('choices');
  expect(p.strategy).toBe('count-all');
  expect(p.requireCombine).toBe(false);
  if (p.answer <= 5) {
    expect(p.frameSize).toBe(5);
    expect(p.frameCount).toBe(1);
  } else {
    expect(p.frameSize).toBe(10);
    expect(p.frameCount).toBe(Math.ceil(p.answer / 10));
  }
}

describe('station contract', () => {
  it('exports Tally Track on route 12', () => {
    expect(OP).toBe(OPS.COUNT);
    expect(ROUTE_ID).toBe(12);
    expect(STATION).toEqual({ id: 12, op: 'count', name: 'Tally Track', emoji: '🖐️' });
  });
});

describe('generateTrip', () => {
  it('returns 6 problems with unique factKeys', () => {
    const trip = generateTrip({ mastery, seed: 3 });
    expect(trip).toHaveLength(6);
    const keys = trip.map((p) => p.factKey);
    expect(new Set(keys).size).toBe(keys.length);
    trip.forEach(assertLegal);
  });

  it('new players only count within 10', () => {
    for (let seed = 1; seed <= 15; seed += 1) {
      const trip = generateTrip({ mastery: { ...mastery, tripsByRoute: {} }, seed });
      expect(trip.every((p) => p.answer >= 1 && p.answer <= 10)).toBe(true);
      expect(trip.some((p) => p.answer <= 5)).toBe(true);
      expect(trip.some((p) => p.answer >= 6)).toBe(true);
    }
  });

  it('later trips include counts above 20 and up to 50', () => {
    const later = { ...mastery, tripsByRoute: { 12: 3 }, tripsCompleted: 8 };
    let sawBig = false;
    let sawDecade = false;
    for (let seed = 1; seed <= 12; seed += 1) {
      const trip = generateTrip({ mastery: later, seed });
      expect(trip).toHaveLength(6);
      trip.forEach(assertLegal);
      expect(trip.some((p) => p.answer >= 21)).toBe(true);
      expect(trip.some((p) => p.answer >= 35)).toBe(true);
      expect(trip.every((p) => p.answer <= 50)).toBe(true);
      if (trip.some((p) => p.answer >= 40)) sawBig = true;
      if (trip.some((p) => p.answer % 10 === 0)) sawDecade = true;
    }
    expect(sawBig).toBe(true);
    expect(sawDecade).toBe(true);
  });

  it('is deterministic for a numeric seed', () => {
    const a = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    const b = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    expect(a).toEqual(b);
  });

  it('problemGenerator route 12 matches Tally Track', () => {
    const trip = generateAnyTrip({ routeId: 12, mastery, seed: 21 });
    expect(trip).toHaveLength(6);
    expect(trip.every((p) => p.op === 'count' && p.routeId === 12)).toBe(true);
    trip.forEach(assertLegal);
  });
});

describe('nextCount never throws', () => {
  it('100 sequential draws stay legal and within 1–50', () => {
    const rng = mulberry32(99);
    const usedThisTrip = [];
    for (let i = 0; i < 100; i += 1) {
      const p = nextCount({
        rng,
        mastery: { ...mastery, tripsByRoute: { 12: Math.floor(i / 6) } },
        usedThisTrip: usedThisTrip.slice(-6),
        tripIndex: i % 6,
        tripsCompleted: Math.floor(i / 6),
        tripsOnRoute: Math.floor(i / 6),
      });
      assertLegal(p);
      usedThisTrip.push(p.factKey);
    }
  });
});

describe('isCorrect / equation / pack', () => {
  it('is true only for the count', () => {
    const p = nextCount({ rng: mulberry32(7), mastery, tripIndex: 0, tripsOnRoute: 0 });
    expect(isCorrect(p, p.answer)).toBe(true);
    expect(isCorrect(p, p.answer + 1)).toBe(false);
    expect(isCorrect(p, 0)).toBe(false);
  });

  it('objects lead: ? until celebrate, then the count', () => {
    const p = generateTrip({ mastery, seed: 8 })[0];
    const hidden = equationParts(p, { celebrating: false });
    expect(hidden.map((part) => part.text)).toEqual(['🖐️', '?']);
    const shown = equationParts(p, { celebrating: true });
    expect(shown.map((part) => part.text)).toEqual(['🖐️', String(p.answer)]);
  });

  it('packSpec describes tens and ones', () => {
    const p = nextCount({
      rng: () => 0.9,
      mastery: { ...mastery, tripsByRoute: { 12: 3 } },
      tripIndex: 5,
      tripsOnRoute: 3,
    });
    const spec = packSpec(p);
    expect(spec.kind).toBe('count');
    expect(spec.n).toBe(p.answer);
    expect(spec.tens).toBe(Math.floor(p.answer / 10));
    expect(spec.ones).toBe(p.answer % 10);
    const packed = packCount(spec.n, p.frameSize);
    expect(packed).toHaveLength(p.answer);
    packed.forEach((row) => {
      expect(row.frame).toBeLessThanOrEqual(p.frameCount);
    });
  });
});

describe('choices and bands', () => {
  it('makeCountChoices is deterministic and contains n once', () => {
    const a = makeCountChoices(23, 4, mulberry32(4));
    const b = makeCountChoices(23, 4, mulberry32(4));
    expect(a).toEqual(b);
    expect(a.filter((n) => n === 23)).toHaveLength(1);
    expect(a).toHaveLength(4);
    expect(a.every((n) => n >= 1 && n <= 50)).toBe(true);
  });

  it('bands ramp from 1–5 up to 35–50', () => {
    expect(bandFor(0, 0)).toEqual([1, 5]);
    expect(bandFor(0, 5)).toEqual([6, 10]);
    expect(bandFor(3, 5)).toEqual([35, 50]);
  });
});
