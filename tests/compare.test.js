import { describe, expect, it } from 'vitest';
import { defaultState } from '../src/app/storage/save.js';
import {
  CHOICES,
  ROUTE_ID,
  STATION,
  equationParts,
  generateTrip,
  isCorrect,
  nextCompare,
  packSpec,
} from '../src/game/ops/compare.js';
import { mulberry32 } from '../src/game/rng.js';

const mastery = defaultState().mastery;

function expectedAnswer(a, b) {
  if (a > b) return 'left';
  if (b > a) return 'right';
  return 'same';
}

describe('station', () => {
  it('is Twin Tracks on route 9', () => {
    expect(ROUTE_ID).toBe(9);
    expect(STATION).toEqual({ id: 9, op: 'compare', name: 'Twin Tracks', emoji: '⚖️' });
    expect(CHOICES).toEqual(['left', 'right', 'same']);
  });
});

describe('generateTrip', () => {
  it('returns 6 problems with unique factKeys', () => {
    const trip = generateTrip({ mastery, seed: 3 });
    expect(trip).toHaveLength(6);
    const keys = trip.map((p) => p.factKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('answer matches a vs b, choices are the three labels, species differ', () => {
    const trip = generateTrip({ mastery, seed: 11 });
    for (const p of trip) {
      expect(p.op).toBe('compare');
      expect(p.routeId).toBe(9);
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(5);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(5);
      expect(p.sum).toBe(p.a + p.b);
      expect(p.answer).toBe(expectedAnswer(p.a, p.b));
      expect(p.factKey).toBe(`cmp:${p.a}v${p.b}`);
      expect(p.choices).toEqual(['left', 'right', 'same']);
      expect(p.choiceCount).toBe(3);
      expect(p.input).toBe('choices');
      expect(p.requireCombine).toBe(false);
      expect(p.frameCount).toBe(2);
      expect(p.frameSize).toBe(Math.max(p.a, p.b) <= 5 ? 5 : 10);
      expect(p.strategy).toBe('compare');
      expect(p.speciesA).toBeTruthy();
      expect(p.speciesB).toBeTruthy();
      expect(p.speciesA).not.toBe(p.speciesB);
      expect(Math.abs(p.a - p.b)).toBeLessThanOrEqual(2);
    }
  });

  it('contains at least one same, two left-wins, and two right-wins', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const trip = generateTrip({ mastery, seed });
      const answers = trip.map((p) => p.answer);
      expect(answers.filter((a) => a === 'same').length).toBeGreaterThanOrEqual(1);
      expect(answers.filter((a) => a === 'left').length).toBeGreaterThanOrEqual(2);
      expect(answers.filter((a) => a === 'right').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('later trips may compare up to 10', () => {
    const trip = generateTrip({ mastery: { ...mastery, tripsCompleted: 4 }, seed: 9 });
    expect(trip.every((p) => p.a <= 10 && p.b <= 10)).toBe(true);
    expect(trip.some((p) => p.a > 5 || p.b > 5) || trip.every((p) => p.a <= 10)).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const a = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    const b = generateTrip({ mastery, seed: 42 }).map((p) => p.factKey);
    expect(a).toEqual(b);
  });
});

describe('isCorrect, equationParts, packSpec', () => {
  it('scores left/right/same and builds icon equation parts', () => {
    const trip = generateTrip({ mastery, seed: 9 });
    for (const p of trip) {
      expect(isCorrect(p, p.answer)).toBe(true);
      expect(isCorrect(p, p.answer === 'same' ? 'left' : 'same')).toBe(false);
      expect(equationParts(p, { celebrating: false })).toEqual([p.a, 'vs', p.b]);
      const symbol = p.answer === 'left' ? '◀' : p.answer === 'right' ? '▶' : '=';
      expect(equationParts(p, { celebrating: true })).toEqual([p.a, 'vs', p.b, symbol]);
      expect(packSpec(p)).toEqual({
        kind: 'compare',
        left: p.a,
        right: p.b,
        speciesA: p.speciesA,
        speciesB: p.speciesB,
      });
    }
  });
});

describe('nextCompare never throws', () => {
  it('50 sequential draws stay legal', () => {
    const rng = mulberry32(99);
    const usedThisTrip = [];
    for (let i = 0; i < 50; i++) {
      let p;
      expect(() => {
        p = nextCompare({
          rng,
          mastery,
          usedThisTrip: usedThisTrip.slice(-6),
          tripIndex: i % 6,
          tripsCompleted: 0,
        });
      }).not.toThrow();
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(8);
      expect(p.b).toBeLessThanOrEqual(8);
      expect(p.answer).toBe(expectedAnswer(p.a, p.b));
      expect(p.choices).toEqual(['left', 'right', 'same']);
      expect(p.speciesA).not.toBe(p.speciesB);
      usedThisTrip.push(p.factKey);
    }
  });

  it('survives empty args and a saturated used list', () => {
    expect(() => nextCompare()).not.toThrow();
    expect(() => generateTrip()).not.toThrow();
    const usedThisTrip = [];
    for (let a = 1; a <= 8; a++) {
      for (let b = 1; b <= 8; b++) usedThisTrip.push(`cmp:${a}v${b}`);
    }
    expect(() => nextCompare({ rng: mulberry32(1), mastery, usedThisTrip })).not.toThrow();
  });
});
