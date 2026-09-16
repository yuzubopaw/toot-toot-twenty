import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import { defaultState } from '../src/app/storage/save.js';
import {
  OP,
  ROUTE_ID,
  STATION,
  generateTrip,
  nextTakeAway,
  isCorrect,
  equationParts,
  packSpec,
} from '../src/game/ops/takeAway.js';

const mastery = defaultState().mastery;

function assertLegal(p) {
  expect(p.op).toBe('takeaway');
  expect(p.routeId).toBe(7);
  expect(p.a).toBeGreaterThanOrEqual(2);
  expect(p.a).toBeLessThanOrEqual(10);
  expect(p.b).toBeGreaterThanOrEqual(1);
  expect(p.b).toBeLessThan(p.a);
  expect(p.answer).toBe(p.a - p.b);
  expect(p.answer).toBeGreaterThanOrEqual(1);
  expect(p.answer).toBeLessThanOrEqual(9);
  expect(p.sum).toBe(p.a);
  expect(p.factKey).toBe(`${p.a}-${p.b}`);
  expect(p.choices.includes(p.answer)).toBe(true);
  expect(new Set(p.choices).size).toBe(p.choices.length);
  expect(p.choices.length).toBeGreaterThanOrEqual(3);
  expect(p.choices.length).toBeLessThanOrEqual(4);
  expect(p.choiceCount).toBe(p.choices.length);
  expect(p.choices.every((n) => Number.isInteger(n) && n >= 0 && n <= 20)).toBe(true);
  expect(p.speciesA).not.toBe(p.speciesB);
  expect(p.speciesA).toBeTruthy();
  expect(p.speciesB).toBeTruthy();
  expect(p.input).toBe('choices');
  expect(p.strategy).toBe('takeaway');
  expect(p.frameSize).toBe(p.a <= 5 ? 5 : 10);
  expect(p.frameCount).toBe(p.a <= 10 ? 1 : 2);
  expect(typeof p.requireCombine).toBe('boolean');
}

describe('station contract', () => {
  it('exports Hop-Off Halt on route 7', () => {
    expect(OP).toBe('takeaway');
    expect(ROUTE_ID).toBe(7);
    expect(STATION).toEqual({ id: 7, op: 'takeaway', name: 'Hop-Off Halt', emoji: '🍃' });
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

  it('new players only subtract within 5', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const trip = generateTrip({ mastery: { ...mastery, tripsCompleted: 0 }, seed });
      expect(trip.every((p) => p.a <= 5)).toBe(true);
      expect(trip.every((p) => p.choices.every((n) => n >= 1))).toBe(true);
    }
  });

  it('is deterministic for a numeric seed', () => {
    const a = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    const b = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    expect(a).toEqual(b);
  });
});

describe('nextTakeAway never throws', () => {
  it('50 sequential draws stay legal', () => {
    const rng = mulberry32(99);
    const usedThisTrip = [];
    for (let i = 0; i < 50; i += 1) {
      const p = nextTakeAway({
        rng,
        mastery,
        usedThisTrip: usedThisTrip.slice(-6),
        tripIndex: i % 6,
        tripsCompleted: Math.floor(i / 6),
      });
      assertLegal(p);
      usedThisTrip.push(p.factKey);
    }
  });
});

describe('isCorrect', () => {
  it('is true only for stay', () => {
    const p = nextTakeAway({ rng: mulberry32(7), mastery, tripIndex: 0, tripsCompleted: 0 });
    expect(isCorrect(p, p.answer)).toBe(true);
    expect(isCorrect(p, p.a)).toBe(p.a === p.answer);
    expect(isCorrect(p, p.b)).toBe(p.b === p.answer);
    expect(isCorrect(p, 0)).toBe(p.answer === 0);
    expect(isCorrect(p, p.answer + 1)).toBe(false);
    expect(isCorrect(p, p.a - p.b)).toBe(true);
  });
});

describe('equationParts', () => {
  it('celebrating shows the stay number', () => {
    const p = generateTrip({ mastery, seed: 8 })[0];
    const hidden = equationParts(p, { celebrating: false });
    expect(hidden.map((part) => part.text)).toEqual([String(p.a), '−', String(p.b), '=', '?']);
    const shown = equationParts(p, { celebrating: true });
    expect(shown.map((part) => part.text)).toEqual([String(p.a), '−', String(p.b), '=', String(p.answer)]);
    expect(shown[shown.length - 1].text).toBe(String(p.answer));
    expect(shown[shown.length - 1].text).not.toBe('?');
  });
});

describe('packSpec', () => {
  it('describes stay vs leave groups', () => {
    const p = nextTakeAway({ rng: mulberry32(11), mastery, tripIndex: 1, tripsCompleted: 0 });
    expect(packSpec(p)).toEqual({
      kind: 'takeaway',
      start: p.a,
      leave: p.b,
      stay: p.answer,
      speciesStay: p.speciesA,
      speciesLeave: p.speciesB,
    });
  });
});
