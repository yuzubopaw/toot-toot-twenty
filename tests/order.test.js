import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import { defaultState } from '../src/app/storage/save.js';
import { generateTrip as generateAnyTrip } from '../src/game/problemGenerator.js';
import {
  MAX_N,
  MIN_N,
  OP,
  ROUTE_ID,
  SEQ_LEN,
  STATION,
  bandFor,
  equationParts,
  generateTrip,
  gappedFor,
  isCorrect,
  nextOrder,
  orderFactKey,
  packSpec,
  scrambleSeq,
} from '../src/game/ops/order.js';
import { OP as OPS } from '../src/game/ops/contract.js';

const mastery = defaultState().mastery;

function assertLegal(p) {
  expect(p.op).toBe('order');
  expect(p.routeId).toBe(13);
  expect(p.sequence).toHaveLength(SEQ_LEN);
  expect(p.sequence).toEqual([...p.sequence].sort((a, b) => a - b));
  expect(new Set(p.sequence).size).toBe(SEQ_LEN);
  expect(p.sequence.every((n) => Number.isInteger(n) && n >= MIN_N && n <= MAX_N)).toBe(true);
  expect(p.a).toBe(p.sequence[0]);
  expect(p.b).toBe(p.sequence[SEQ_LEN - 1]);
  expect(p.sum).toBe(p.b);
  expect(p.answer).toBe(p.sequence[0]);
  expect(p.factKey).toBe(orderFactKey(p.sequence));
  expect(p.choices).toHaveLength(SEQ_LEN);
  expect(p.choiceCount).toBe(SEQ_LEN);
  expect([...p.choices].sort((a, b) => a - b)).toEqual(p.sequence);
  expect(p.choices).not.toEqual(p.sequence);
  expect(p.speciesA).toBeTruthy();
  expect(p.speciesB).toBeTruthy();
  expect(p.speciesA).not.toBe(p.speciesB);
  expect(p.input).toBe('choices');
  expect(p.strategy).toBe('order');
  expect(p.requireCombine).toBe(false);
}

describe('station contract', () => {
  it('exports Date Depot on route 13', () => {
    expect(OP).toBe(OPS.ORDER);
    expect(ROUTE_ID).toBe(13);
    expect(STATION).toEqual({ id: 13, op: 'order', name: 'Date Depot', emoji: '📅' });
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

  it('new players only order within 1–10 consecutive days', () => {
    for (let seed = 1; seed <= 15; seed += 1) {
      const trip = generateTrip({ mastery: { ...mastery, tripsByRoute: {} }, seed });
      expect(trip.every((p) => p.a >= 1 && p.b <= 10)).toBe(true);
      expect(trip.every((p) => p.b - p.a === 2)).toBe(true);
      expect(trip.some((p) => p.a <= 5)).toBe(true);
    }
  });

  it('later trips include days above 20 and up to 31', () => {
    const later = { ...mastery, tripsByRoute: { 13: 3 }, tripsCompleted: 8 };
    let sawMonthEnd = false;
    for (let seed = 1; seed <= 12; seed += 1) {
      const trip = generateTrip({ mastery: later, seed });
      expect(trip).toHaveLength(6);
      trip.forEach(assertLegal);
      expect(trip.some((p) => p.b >= 21)).toBe(true);
      expect(trip.every((p) => p.b <= 31 && p.a >= 1)).toBe(true);
      if (trip.some((p) => p.b >= 28)) sawMonthEnd = true;
    }
    expect(sawMonthEnd).toBe(true);
  });

  it('is deterministic for a numeric seed', () => {
    const a = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    const b = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    expect(a).toEqual(b);
  });

  it('problemGenerator route 13 matches Date Depot', () => {
    const trip = generateAnyTrip({ routeId: 13, mastery, seed: 21 });
    expect(trip).toHaveLength(6);
    expect(trip.every((p) => p.op === 'order' && p.routeId === 13)).toBe(true);
    trip.forEach(assertLegal);
  });
});

describe('nextOrder never throws', () => {
  it('100 sequential draws stay legal and within 1–31', () => {
    const rng = mulberry32(99);
    const usedThisTrip = [];
    for (let i = 0; i < 100; i += 1) {
      const p = nextOrder({
        rng,
        mastery: { ...mastery, tripsByRoute: { 13: Math.floor(i / 6) } },
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
  it('is true only for the next day in order', () => {
    const p = nextOrder({ rng: mulberry32(7), mastery, tripIndex: 0, tripsOnRoute: 0 });
    expect(isCorrect(p, p.sequence[0])).toBe(true);
    expect(isCorrect(p, p.sequence[1])).toBe(false);
    expect(isCorrect(p, p.sequence[0], [p.sequence[0]])).toBe(false);
    expect(isCorrect(p, p.sequence[1], [p.sequence[0]])).toBe(true);
    expect(isCorrect(p, p.sequence[2], p.sequence.slice(0, 2))).toBe(true);
  });

  it('objects lead: ? → ? → ? until days board, then the ordered days', () => {
    const p = generateTrip({ mastery, seed: 8 })[0];
    const hidden = equationParts(p, { celebrating: false });
    expect(hidden.map((part) => part.text)).toEqual(['?', '→', '?', '→', '?']);
    const mid = equationParts(p, { celebrating: false, placed: [p.sequence[0]] });
    expect(mid.map((part) => part.text)).toEqual([String(p.sequence[0]), '→', '?', '→', '?']);
    const shown = equationParts(p, { celebrating: true });
    expect(shown.map((part) => part.text).join('')).toBe(p.sequence.join('→'));
    expect(shown.every((part) => part.text !== '📅')).toBe(true);
  });

  it('packSpec describes the sequence', () => {
    const p = nextOrder({ rng: mulberry32(4), mastery, tripIndex: 0, tripsOnRoute: 0 });
    const spec = packSpec(p);
    expect(spec.kind).toBe('order');
    expect(spec.sequence).toEqual(p.sequence);
    expect(spec.first).toBe(p.a);
    expect(spec.last).toBe(p.b);
  });
});

describe('scramble and bands', () => {
  it('scrambleSeq is a derangement of order, not the sorted days', () => {
    const a = scrambleSeq([4, 5, 6], mulberry32(4));
    const b = scrambleSeq([4, 5, 6], mulberry32(4));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual([4, 5, 6]);
    expect(a).not.toEqual([4, 5, 6]);
  });

  it('bands ramp from 1–10 up to 21–31', () => {
    expect(bandFor(0, 0)).toEqual([1, 10]);
    expect(bandFor(0, 5)).toEqual([1, 10]);
    expect(bandFor(3, 5)).toEqual([21, 31]);
    expect(gappedFor(0, 5)).toBe(false);
    expect(gappedFor(3, 5)).toBe(true);
  });
});
