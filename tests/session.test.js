import { describe, expect, it } from 'vitest';
import {
  AUTO_COMBINE_MS,
  advance,
  applyAnswer,
  applyCombine,
  currentProblem,
  startTrip,
} from '../src/game/session.js';
import { defaultState } from '../src/app/storage/save.js';

const mastery = defaultState().mastery;

describe('session', () => {
  it('AUTO_COMBINE_MS is 4000', () => {
    expect(AUTO_COMBINE_MS).toBe(4000);
  });

  it('starts 6 problems and ignores answers until combine', () => {
    const s = startTrip(1, mastery, 7);
    expect(s.problems).toHaveLength(6);
    const miss = applyAnswer(s, currentProblem(s).sum);
    expect(miss.ignored).toBe(true);
    expect(miss.wiggle).toBe(true);
    applyCombine(s);
    const hit = applyAnswer(s, currentProblem(s).sum);
    expect(hit.correct).toBe(true);
    expect(hit.tripDone).toBe(false);
    advance(s, 10_000);
    expect(s.combined).toBe(false);
    expect(s.hintLevel).toBe(0);
    expect(s.missesThisProblem).toBe(0);
    expect(s.problemIndex).toBe(1);
  });

  it('Tally Track trip is six count problems and accepts the count', () => {
    const s = startTrip(12, mastery, 19);
    expect(s.problems).toHaveLength(6);
    expect(s.problems.every((p) => p.op === 'count')).toBe(true);
    expect(s.problems.every((p) => p.answer >= 1 && p.answer <= 50)).toBe(true);
    applyCombine(s);
    const hit = applyAnswer(s, currentProblem(s).answer);
    expect(hit.ignored).toBe(false);
    expect(hit.correct).toBe(true);
  });

  it('Date Depot trip is six order problems and needs the full sequence', () => {
    const s = startTrip(13, mastery, 19);
    expect(s.problems).toHaveLength(6);
    expect(s.problems.every((p) => p.op === 'order')).toBe(true);
    expect(s.problems.every((p) => p.sequence.length === 3)).toBe(true);
    applyCombine(s);
    const seq = currentProblem(s).sequence;
    const first = applyAnswer(s, seq[0]);
    expect(first.ignored).toBe(false);
    expect(first.correct).toBe(true);
    expect(first.partial).toBe(true);
    expect(s.status).not.toBe('celebrating');
    applyAnswer(s, seq[1]);
    const last = applyAnswer(s, seq[2]);
    expect(last.partial).toBe(false);
    expect(last.correct).toBe(true);
    expect(s.status).toBe('celebrating');
  });

  it('keeps boarded days if the child retaps one already in the line', () => {
    const s = startTrip(13, mastery, 23);
    applyCombine(s);
    const seq = currentProblem(s).sequence;
    applyAnswer(s, seq[0]);
    const again = applyAnswer(s, seq[0]);
    expect(again.ignored).toBe(true);
    expect(s.placed).toEqual([seq[0]]);
    expect(s.status).not.toBe('celebrating');
  });


  it('hint ladder then 6th correct sets tripDone without advance', () => {
    const s = startTrip(1, mastery, 11);
    for (let i = 0; i < 5; i++) {
      applyCombine(s);
      const r = applyAnswer(s, currentProblem(s).sum);
      expect(r.tripDone).toBe(false);
      advance(s, i + 1);
    }
    applyCombine(s);
    applyAnswer(s, 0);
    applyAnswer(s, 0);
    const last = applyAnswer(s, currentProblem(s).sum);
    expect(last.correct).toBe(true);
    expect(last.tripDone).toBe(true);
    expect(s.problemIndex).toBe(6);
    expect(s.hintLevel).toBe(2);
  });
});
