import { describe, expect, it } from 'vitest';
import { generateTrip, legalFacts, makeChoices, nextProblem } from '../src/game/facts.js';
import { emptyProgress } from '../src/game/progress.js';
import { mulberry32 } from '../src/game/rng.js';

const MODES = ['plop', 'dripDrop', 'oops', 'tenTrick'];
const BANDS = {
  plop: ['A', 'B', 'C', 'D'],
  dripDrop: ['A', 'B', 'C'],
  oops: ['A', 'B', 'C'],
  tenTrick: ['D'],
};

function trapsIn(problem) {
  return problem.choices.filter((n) => n !== problem.answer && [problem.start, problem.take, problem.left].includes(n));
}

describe('legal facts', () => {
  it('stays inside each band and mode rule', () => {
    for (const mode of MODES) {
      for (const band of BANDS[mode]) {
        const facts = legalFacts(mode, band);
        expect(facts.length).toBeGreaterThan(0);
        for (const [start, take] of facts) {
          const left = start - take;
          expect(left).toBeGreaterThanOrEqual(0);
          expect(start).toBeLessThanOrEqual(20);
          if (band === 'A') {
            expect(start).toBeGreaterThanOrEqual(2);
            expect(start).toBeLessThanOrEqual(5);
            expect(left).toBeGreaterThanOrEqual(1);
          }
          if (band === 'B') {
            expect(start).toBeGreaterThanOrEqual(3);
            expect(start).toBeLessThanOrEqual(10);
          }
          if (band === 'C') {
            expect(start).toBeGreaterThanOrEqual(11);
            expect(take).toBeLessThanOrEqual(start - 10);
            expect(left).toBeGreaterThanOrEqual(10);
          }
          if (band === 'D') {
            expect(take).toBeGreaterThan(start - 10);
            expect(left).toBeLessThan(10);
            expect(left).toBeGreaterThanOrEqual(2);
          }
          if (mode === 'dripDrop' && band === 'A') expect(take).toBeLessThanOrEqual(1);
          if (mode === 'dripDrop' && band === 'B') expect(take).toBeLessThanOrEqual(2);
          if (mode === 'dripDrop' && band === 'C') expect(take).toBeLessThanOrEqual(3);
          if (mode === 'oops') expect(left).toBeGreaterThanOrEqual(1);
          if (mode === 'tenTrick') {
            expect(take).toBeGreaterThanOrEqual(3);
            expect(take).toBeLessThanOrEqual(9);
          }
        }
      }
    }
  });

  it('gives Drip Drop band A only four facts', () => {
    expect(legalFacts('dripDrop', 'A')).toHaveLength(4);
    expect(legalFacts('dripDrop', 'D')).toEqual([]);
  });
});

describe('choices and trips', () => {
  it('builds three choices with the answer and at most one trap', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 40; i += 1) {
      const problem = nextProblem('plop', 'B', rng, []);
      expect(problem.choices).toHaveLength(3);
      expect(new Set(problem.choices).size).toBe(3);
      expect(problem.choices).toContain(problem.answer);
      for (const n of problem.choices) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(20);
      }
      expect(trapsIn(problem).length).toBeLessThanOrEqual(1);
      expect(problem.start - problem.take).toBe(problem.left);
    }
  });

  it('keeps band A traps on every other problem', () => {
    const rng = mulberry32(9);
    const history = [];
    for (let i = 0; i < 6; i += 1) {
      const problem = nextProblem('plop', 'A', rng, history);
      if (i % 2 === 0) expect(trapsIn(problem)).toEqual([]);
      history.push(problem);
    }
  });

  it('falls back when a mode has no facts in that band', () => {
    const problem = nextProblem('dripDrop', 'D', mulberry32(1), []);
    expect(problem.start).toBe(13);
    expect(problem.take).toBe(5);
    expect(problem.left).toBe(8);
  });

  it('keeps visits inside the picking rules', () => {
    for (const mode of ['plop', 'oops', 'tenTrick']) {
      for (let seed = 1; seed <= 200; seed += 1) {
        const progress = emptyProgress();
        const trip = generateTrip(mode, progress, mulberry32(seed));
        expect(trip).toHaveLength(5);
        const keys = trip.map((problem) => `${problem.start},${problem.take}`);
        expect(new Set(keys).size).toBe(5);
        for (let i = 1; i < trip.length; i += 1) expect(trip[i].left).not.toBe(trip[i - 1].left);
        expect(trip.filter((problem) => problem.left === 0).length).toBeLessThanOrEqual(1);
        expect(trip.filter((problem) => problem.take === problem.start).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('still returns five Drip Drop problems when band A has only four facts', () => {
    const trip = generateTrip('dripDrop', emptyProgress(), mulberry32(3));
    expect(trip).toHaveLength(5);
    expect(trip.every((problem) => problem.mode === 'dripDrop')).toBe(true);
    for (let i = 1; i < 4; i += 1) expect(trip[i].left).not.toBe(trip[i - 1].left);
  });

  it('mixes at least two unlocked modes in a sampler visit', () => {
    const locked = emptyProgress();
    const open = emptyProgress();
    open.unlocked.tenTrick = true;
    for (let seed = 1; seed <= 100; seed += 1) {
      const plain = generateTrip('sampler', locked, mulberry32(seed));
      expect(new Set(plain.map((problem) => problem.mode)).size).toBeGreaterThanOrEqual(2);
      expect(plain.every((problem) => problem.mode !== 'tenTrick')).toBe(true);
      const wider = generateTrip('sampler', open, mulberry32(seed + 500));
      expect(new Set(wider.map((problem) => problem.mode)).size).toBeGreaterThanOrEqual(2);
      expect(wider.every((problem) => ['plop', 'dripDrop', 'oops', 'tenTrick'].includes(problem.mode))).toBe(true);
    }
  });
});

describe('makeChoices', () => {
  it('includes the Oops answer and at most one trap', () => {
    const problem = {
      mode: 'oops',
      band: 'B',
      start: 9,
      take: 3,
      left: 6,
      answer: 3,
      allowTrap: true,
    };
    const choices = makeChoices(problem, mulberry32(2));
    expect(choices).toContain(3);
    expect(new Set(choices).size).toBe(3);
    expect(trapsIn({ ...problem, choices }).length).toBeLessThanOrEqual(1);
  });
});
