import { shuffle } from './rng.js';

export const MODES = Object.freeze(['howMany', 'countOut', 'next']);
export const TRIP_LENGTH = 5;
export const RECENT_CAP = 8;

export const MODE_COPY = Object.freeze({
  howMany: { name: 'How many', label: 'How many bunnies' },
  countOut: { name: 'Hop to', label: 'Hop to the number' },
  next: { name: 'What next', label: 'What number is next' },
});

/** Last 6 problems, at least 5 solved on the first or second try. */
export function wideRange(recent) {
  const last = (recent || []).slice(-6);
  if (last.length < 6) return false;
  return last.filter((n) => n <= 2).length >= 5;
}

export function rangeFor(mode, recent) {
  const wide = wideRange(recent);
  if (mode === 'next') return { min: 2, max: wide ? 10 : 5 };
  return { min: 1, max: wide ? 10 : 5 };
}

/** Three nearby numerals in 1..10. The answer is always included. */
export function makeChoices(target, rng, min = 1, max = 10) {
  const chosen = [target];
  for (const delta of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
    const n = target + delta;
    if (n < min || n > max || chosen.includes(n)) continue;
    chosen.push(n);
    if (chosen.length === 3) break;
  }
  let guard = 0;
  while (chosen.length < 3 && guard < 20) {
    guard += 1;
    const n = min + Math.floor(rng() * (max - min + 1));
    if (!chosen.includes(n)) chosen.push(n);
  }
  return shuffle(chosen, rng);
}

export function nextProblem(mode, recent, rng, previousTarget) {
  const { min, max } = rangeFor(mode, recent);
  let target = min;
  for (let i = 0; i < 8; i += 1) {
    target = min + Math.floor(rng() * (max - min + 1));
    if (target !== previousTarget || min === max) break;
  }
  const problem = {
    mode,
    target,
    choices: makeChoices(target, rng),
  };
  if (mode === 'howMany') {
    problem.bunnyCount = target;
    problem.padCount = target <= 5 ? 5 : 10;
  } else if (mode === 'countOut') {
    problem.bunnyCount = Math.min(10, target + 2);
    problem.padCount = problem.bunnyCount;
  } else {
    problem.shown = [];
    for (let n = 1; n < target; n += 1) problem.shown.push(n);
    problem.padCount = target;
  }
  return problem;
}

export function generateTrip(mode, recent, rng) {
  const problems = [];
  let prev = null;
  for (let i = 0; i < TRIP_LENGTH; i += 1) {
    const problem = nextProblem(mode, recent, rng, prev);
    problems.push(problem);
    prev = problem.target;
  }
  return problems;
}

export function freshRound(problem, index) {
  return {
    problem,
    index,
    hopped: 0,
    ready: false,
    misses: 0,
    hintLevel: 0,
    solved: false,
    revealed: false,
    locked: false,
    wrongPicks: [],
    triesUntilCorrect: 0,
    tripDone: false,
  };
}

export function hopOnce(round) {
  if (!round || round.locked || round.solved || round.hintLevel >= 2) {
    return { round, hoppedNow: false };
  }
  const mode = round.problem.mode;
  if (mode === 'next') {
    if (round.ready) return { round, hoppedNow: false };
    return {
      round: { ...round, hopped: 1, ready: true },
      hoppedNow: true,
      count: null,
    };
  }
  const cap = mode === 'howMany' ? round.problem.target : round.problem.bunnyCount;
  if (round.hopped >= cap || (mode === 'howMany' && round.ready)) {
    return { round, hoppedNow: false };
  }
  const hopped = round.hopped + 1;
  const ready = mode === 'howMany' ? hopped >= round.problem.target : true;
  return {
    round: { ...round, hopped, ready },
    hoppedNow: true,
    count: hopped,
  };
}

function withHint(round, hintLevel, wrongPicks) {
  let next = {
    ...round,
    misses: round.misses + 1,
    hintLevel,
    hopped: 0,
    ready: false,
    revealed: hintLevel >= 3,
    wrongPicks,
    locked: false,
    solved: false,
  };
  if (hintLevel < 2) return next;
  if (round.problem.mode === 'next') {
    return { ...next, hopped: 1, ready: true };
  }
  return { ...next, hopped: round.problem.target, ready: true };
}

export function answer(round, value) {
  if (!round || round.locked || round.solved) return { round, ignored: true };
  const mode = round.problem.mode;
  if (mode === 'countOut') {
    if (round.hopped < 1) return { round, ignored: true };
  } else if (!round.ready) {
    return { round, ignored: true };
  }
  if (round.revealed && value !== round.problem.target) return { round, ignored: true };
  if (value !== round.problem.target) {
    const hintLevel = Math.min(3, round.misses + 1);
    const wrongPicks = hintLevel === 1 ? [...(round.wrongPicks || []), value] : [];
    return {
      round: withHint(round, hintLevel, wrongPicks),
      correct: false,
      hintLevel,
      ignored: false,
    };
  }
  const triesUntilCorrect = round.misses + 1;
  const tripDone = round.index === TRIP_LENGTH - 1;
  return {
    round: {
      ...round,
      solved: true,
      locked: true,
      triesUntilCorrect,
      tripDone,
      hopped: mode === 'next' ? 1 : round.problem.target,
      ready: true,
    },
    correct: true,
    triesUntilCorrect,
    tripDone,
    ignored: false,
  };
}

export function submitCountOut(round) {
  if (!round || round.problem.mode !== 'countOut') return { round, ignored: true };
  return answer(round, round.hopped);
}

export function recordCorrect(progress, mode, tries) {
  const recent = [...(progress.recent[mode] || []), tries].slice(-RECENT_CAP);
  return {
    ...progress,
    recent: { ...progress.recent, [mode]: recent },
  };
}

export function recordTrip(progress, mode) {
  return {
    ...progress,
    visits: { ...progress.visits, [mode]: (progress.visits[mode] || 0) + 1 },
  };
}

export function recommendedMode(progress) {
  const modes = [...MODES];
  modes.sort((a, b) => (progress.visits[a] || 0) - (progress.visits[b] || 0));
  return modes[0];
}
