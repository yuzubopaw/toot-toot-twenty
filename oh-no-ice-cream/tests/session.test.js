import { describe, expect, it } from 'vitest';
import { act, answer, freshRound, revealed } from '../src/game/session.js';

function problem(extra) {
  return {
    mode: 'plop',
    band: 'A',
    start: 5,
    take: 2,
    left: 3,
    answer: 3,
    choices: [3, 4, 2],
    ...extra,
  };
}

describe('act', () => {
  it('counts up to take and then ignores more taps', () => {
    let round = freshRound(problem(), 0);
    expect(round.phase).toBe('acting');
    const first = act(round);
    expect(first.acted).toBe(true);
    expect(first.count).toBe(1);
    round = first.round;
    const second = act(round);
    expect(second.round.phase).toBe('answering');
    expect(second.count).toBe(2);
    const extra = act(second.round);
    expect(extra.acted).toBe(false);
    expect(extra.round.taken).toBe(2);
  });

  it('ignores an answer before the action is finished', () => {
    const round = freshRound(problem(), 0);
    expect(answer(round, 3).ignored).toBe(true);
  });

  it('marks Ten Trick exactly once, on the tap that lands on ten', () => {
    let round = freshRound(problem({ mode: 'tenTrick', band: 'D', start: 13, take: 5, left: 8, answer: 8 }), 0);
    const flags = [];
    for (let i = 0; i < 6; i += 1) {
      const result = act(round);
      flags.push(result.reachedTen);
      round = result.round;
    }
    expect(flags).toEqual([false, false, true, false, false, false]);
    expect(round.phase).toBe('answering');
  });
});

describe('answer', () => {
  it('walks the hint ladder and counts a reveal as four tries', () => {
    let round = freshRound(problem(), 1);
    round = act(act(round).round).round;
    const miss1 = answer(round, 4);
    expect(miss1.hintLevel).toBe(1);
    expect(miss1.round.wrongPicks).toEqual([4]);
    const miss2 = answer(miss1.round, 2);
    expect(miss2.hintLevel).toBe(2);
    const miss3 = answer(miss2.round, 5);
    expect(miss3.hintLevel).toBe(3);
    expect(revealed(miss3.round)).toBe(true);
    const blocked = answer(miss3.round, 4);
    expect(blocked.ignored).toBe(true);
    const solved = answer(miss3.round, 3);
    expect(solved.correct).toBe(true);
    expect(solved.round.triesUntilCorrect).toBe(4);
    expect(solved.round.phase).toBe('solved');
  });

  it('starts Oops in answering and expects how many fell', () => {
    const round = freshRound(problem({ mode: 'oops', answer: 2, take: 2, left: 3 }), 0);
    expect(round.phase).toBe('answering');
    const solved = answer(round, 2);
    expect(solved.correct).toBe(true);
    expect(solved.round.triesUntilCorrect).toBe(1);
  });

  it('marks the last problem as the end of the visit', () => {
    let round = freshRound(problem(), 4);
    round = act(act(round).round).round;
    expect(answer(round, 3).round.tripDone).toBe(true);
  });
});
