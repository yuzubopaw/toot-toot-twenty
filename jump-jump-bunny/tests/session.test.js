import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/rng.js';
import {
  TRIP_LENGTH,
  answer,
  freshRound,
  generateTrip,
  hopOnce,
  makeChoices,
  nextProblem,
  rangeFor,
  recommendedMode,
  recordCorrect,
  recordTrip,
  submitCountOut,
  wideRange,
} from '../src/game/session.js';

describe('counting 1 to 10', () => {
  it('starts inside 1–5 and can widen to 10', () => {
    expect(rangeFor('howMany', []).max).toBe(5);
    expect(rangeFor('next', []).min).toBe(2);
    expect(wideRange([1, 1, 1, 1, 1])).toBe(false);
    expect(wideRange([1, 1, 2, 1, 1, 2])).toBe(true);
    expect(rangeFor('howMany', [1, 1, 2, 1, 1, 2]).max).toBe(10);
    expect(rangeFor('countOut', [4, 4, 4, 1, 1, 1]).max).toBe(5);
  });

  it('builds three nearby choices that include the answer', () => {
    const rng = mulberry32(3);
    for (const target of [1, 2, 5, 10]) {
      const choices = makeChoices(target, rng);
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      expect(choices).toContain(target);
      for (const n of choices) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(10);
      }
    }
  });

  it('keeps a new trip inside the early range and avoids an immediate repeat', () => {
    const trip = generateTrip('howMany', [], mulberry32(7));
    expect(trip).toHaveLength(TRIP_LENGTH);
    for (let i = 0; i < trip.length; i += 1) {
      expect(trip[i].target).toBeGreaterThanOrEqual(1);
      expect(trip[i].target).toBeLessThanOrEqual(5);
      expect(trip[i].bunnyCount).toBe(trip[i].target);
      expect(trip[i].padCount).toBe(trip[i].target);
      if (i > 0) expect(trip[i].target).not.toBe(trip[i - 1].target);
    }
  });

  it('gives hop-to one empty pad for each count in the number', () => {
    const problem = nextProblem('countOut', [], mulberry32(4), null);
    expect(problem.bunnyCount).toBe(problem.target);
    expect(problem.padCount).toBe(problem.target);
    expect(problem.target).toBeGreaterThanOrEqual(1);
    expect(problem.target).toBeLessThanOrEqual(5);
  });

  it('asks what comes next as the count from 1', () => {
    const problem = nextProblem('next', [], mulberry32(1), null);
    expect(problem.shown).toEqual(Array.from({ length: problem.target - 1 }, (_, i) => i + 1));
    expect(problem.target).toBeGreaterThanOrEqual(2);
    expect(problem.target).toBeLessThanOrEqual(5);
  });

  it('lets a wide range include numbers above 5', () => {
    const recent = [1, 1, 1, 1, 1, 1];
    const rng = mulberry32(9);
    const seen = new Set();
    for (let i = 0; i < 30; i += 1) seen.add(nextProblem('howMany', recent, rng, null).target);
    expect([...seen].some((n) => n > 5)).toBe(true);
    expect([...seen].every((n) => n >= 1 && n <= 10)).toBe(true);
  });
});

describe('hop then answer', () => {
  it('answers how many on the first tap', () => {
    const problem = { mode: 'howMany', target: 3, choices: [2, 3, 4], bunnyCount: 3, padCount: 3 };
    const round = freshRound(problem, 0);
    expect(round.ready).toBe(true);
    const hit = answer(round, 3);
    expect(hit.correct).toBe(true);
    expect(hit.triesUntilCorrect).toBe(1);
    expect(hit.tripDone).toBe(false);
    expect(hit.round.hopped).toBe(3);
  });

  it('uses retry, then shows the count, and still requires the right tap', () => {
    const problem = { mode: 'howMany', target: 2, choices: [1, 2, 3], bunnyCount: 2, padCount: 2 };
    const round = freshRound(problem, 1);
    expect(round.ready).toBe(true);
    const miss = answer(round, 1);
    expect(miss.hintLevel).toBe(1);
    expect(miss.round.ready).toBe(true);
    expect(miss.round.hopped).toBe(0);
    expect(miss.round.wrongPicks).toEqual([1]);
    const shown = answer(miss.round, 3);
    expect(shown.hintLevel).toBe(2);
    expect(shown.round.hopped).toBe(2);
    expect(shown.round.ready).toBe(true);
    const again = answer(shown.round, 1);
    expect(again.hintLevel).toBe(3);
    expect(again.round.revealed).toBe(true);
    expect(answer(again.round, 1).ignored).toBe(true);
    const hit = answer(again.round, 2);
    expect(hit.correct).toBe(true);
    expect(hit.triesUntilCorrect).toBe(4);
  });

  it('solves hop-to when the hops match the number', () => {
    const problem = { mode: 'countOut', target: 2, bunnyCount: 2, padCount: 2, choices: [1, 2, 3] };
    let round = freshRound(problem, 4);
    expect(submitCountOut(round).ignored).toBe(true);
    const first = hopOnce(round);
    expect(first.count).toBe(1);
    expect(submitCountOut(first.round).correct).toBe(false);
    const second = hopOnce(first.round);
    expect(second.round.hopped).toBe(2);
    expect(hopOnce(second.round).hoppedNow).toBe(false);
    const hit = submitCountOut(second.round);
    expect(hit.correct).toBe(true);
    expect(hit.tripDone).toBe(true);
  });

  it('does not speak the next number on the approach hop', () => {
    const problem = { mode: 'next', target: 4, shown: [1, 2, 3], choices: [3, 4, 5] };
    const hopped = hopOnce(freshRound(problem, 0));
    expect(hopped.count).toBeNull();
    expect(hopped.round.ready).toBe(true);
    expect(answer(hopped.round, 4).correct).toBe(true);
  });
});

describe('progress', () => {
  it('records tries without a visit until the trip is finished', () => {
    let progress = {
      visits: { howMany: 0, countOut: 0, next: 0 },
      recent: { howMany: [], countOut: [], next: [] },
    };
    progress = recordCorrect(progress, 'howMany', 1);
    expect(progress.visits.howMany).toBe(0);
    expect(progress.recent.howMany).toEqual([1]);
    progress = recordTrip(progress, 'howMany');
    expect(progress.visits.howMany).toBe(1);
    expect(recommendedMode(progress)).toBe('countOut');
  });
});
