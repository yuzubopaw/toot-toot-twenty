import { generateTrip } from './problemGenerator.js';
import { nextHintLevel } from './hints.js';
import { tootsFor } from './scoring.js';

export const AUTO_COMBINE_MS = 4000;

export function currentProblem(session) {
  if (session.tripDone) return session.problems[5];
  return session.problems[session.problemIndex];
}

export function startTrip(routeId, mastery, seed) {
  const problems = generateTrip({
    routeId,
    mastery,
    seed,
    recentKeys: (mastery && mastery.recentKeys) || [],
  });
  const first = problems[0];
  const now = typeof seed === 'object' && seed && seed.now ? seed.now : Date.now();
  return {
    routeId,
    problemIndex: 0,
    problems,
    status: 'presenting',
    combined: false,
    hintLevel: 0,
    missesThisProblem: 0,
    toots: 0,
    rng: typeof seed === 'function' ? seed : null,
    autoCombineAt: first.requireCombine ? 0 : now + AUTO_COMBINE_MS,
    tripDone: false,
    placed: [],
  };
}

export function nextExpected(session) {
  const problem = currentProblem(session);
  if (!problem) return undefined;
  if (problem.op === 'order' && Array.isArray(problem.sequence)) {
    const i = (session.placed || []).length;
    return problem.sequence[i];
  }
  return problem.answer != null ? problem.answer : problem.sum;
}

export function applyCombine(session) {
  session.combined = true;
  session.status = 'awaitingAnswer';
  session.autoCombineAt = 0;
  return { combined: true };
}

function matchAnswer(session, problem, value) {
  if (problem && problem.op === 'order' && Array.isArray(problem.sequence)) {
    const placed = session.placed ? session.placed.slice() : [];
    if (placed.includes(value)) return { ignored: true, wiggle: false };
    if (value !== problem.sequence[placed.length]) return { miss: true };
    placed.push(value);
    if (placed.length < problem.sequence.length) return { partial: true, placed };
    return { placed };
  }
  const expected = problem.answer != null ? problem.answer : problem.sum;
  if (value !== expected) return { miss: true };
  return {};
}

export function applyAnswer(session, value) {
  if (!session.combined) {
    return {
      ignored: true,
      wiggle: true,
      correct: false,
      partial: false,
      hintLevel: session.hintLevel,
      triesUntilCorrect: 0,
      tripDone: false,
    };
  }
  const problem = currentProblem(session);
  const check = matchAnswer(session, problem, value);
  if (check.ignored) {
    return {
      ignored: true,
      wiggle: Boolean(check.wiggle),
      correct: false,
      partial: false,
      hintLevel: session.hintLevel,
      triesUntilCorrect: 0,
      tripDone: false,
    };
  }
  if (check.miss) {
    session.missesThisProblem += 1;
    session.hintLevel = nextHintLevel(session.missesThisProblem);
    session.status = `hint${session.hintLevel}`;
    return {
      ignored: false,
      wiggle: false,
      correct: false,
      partial: false,
      hintLevel: session.hintLevel,
      triesUntilCorrect: 0,
      tripDone: false,
    };
  }
  if (check.placed) session.placed = check.placed;
  if (check.partial) {
    session.status = 'awaitingAnswer';
    return {
      ignored: false,
      wiggle: false,
      correct: true,
      partial: true,
      hintLevel: session.hintLevel,
      triesUntilCorrect: 0,
      tripDone: false,
    };
  }
  const triesUntilCorrect = /** @type {1|2|3|4} */ (session.missesThisProblem + 1);
  session.toots += tootsFor(triesUntilCorrect);
  session.status = 'celebrating';
  if (session.problemIndex === 5) {
    session.tripDone = true;
    session.problemIndex = 6;
    return {
      ignored: false,
      wiggle: false,
      correct: true,
      partial: false,
      hintLevel: session.hintLevel,
      triesUntilCorrect,
      tripDone: true,
    };
  }
  return {
    ignored: false,
    wiggle: false,
    correct: true,
    partial: false,
    hintLevel: session.hintLevel,
    triesUntilCorrect,
    tripDone: false,
  };
}

export function advance(session, now) {
  session.problemIndex += 1;
  session.combined = false;
  session.hintLevel = 0;
  session.missesThisProblem = 0;
  session.status = 'presenting';
  session.tripDone = false;
  session.placed = [];
  const next = session.problems[session.problemIndex];
  session.autoCombineAt = next && next.requireCombine ? 0 : now + AUTO_COMBINE_MS;
}
