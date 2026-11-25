import { TRIP_LENGTH } from './modes.js';

export function freshRound(problem, index) {
  return {
    problem,
    index,
    taken: 0,
    phase: problem.mode === 'oops' ? 'answering' : 'acting',
    misses: 0,
    hintLevel: 0,
    wrongPicks: [],
    triesUntilCorrect: 0,
    tripDone: false,
  };
}

export function revealed(round) {
  return Boolean(round && round.hintLevel >= 3);
}

function watchesTen(problem) {
  return problem.mode === 'tenTrick' || (problem.mode === 'plop' && problem.band === 'D');
}

export function act(round) {
  if (!round || round.phase !== 'acting' || round.taken === round.problem.take) {
    return { round, acted: false, count: round?.taken || 0, reachedTen: false };
  }
  const taken = round.taken + 1;
  const reachedTen = watchesTen(round.problem) && round.problem.start - taken === 10;
  return {
    round: {
      ...round,
      taken,
      phase: taken === round.problem.take ? 'answering' : 'acting',
    },
    acted: true,
    count: taken,
    reachedTen,
  };
}

export function answer(round, value) {
  if (!round || round.phase !== 'answering') {
    return { round, correct: false, hintLevel: round?.hintLevel || 0, ignored: true };
  }
  if (revealed(round) && value !== round.problem.answer) {
    return { round, correct: false, hintLevel: round.hintLevel, ignored: true };
  }
  if (value !== round.problem.answer) {
    const hintLevel = Math.min(3, round.misses + 1);
    const wrongPicks = hintLevel === 1 ? [...(round.wrongPicks || []), value] : round.wrongPicks || [];
    return {
      round: { ...round, misses: round.misses + 1, hintLevel, wrongPicks },
      correct: false,
      hintLevel,
      ignored: false,
    };
  }
  const triesUntilCorrect = round.hintLevel >= 3 ? 4 : round.misses + 1;
  const tripDone = round.index === TRIP_LENGTH - 1;
  return {
    round: { ...round, phase: 'solved', triesUntilCorrect, tripDone },
    correct: true,
    hintLevel: round.hintLevel,
    ignored: false,
  };
}
