import { isUnlocked } from './progress.js';
import { CUSTOMERS, defaultBand, FLAVOURS, PLAYABLE, TRIP_LENGTH, BAND_LADDER } from './modes.js';
import { shuffle } from './rng.js';

const FALLBACK = Object.freeze({
  A: Object.freeze([5, 2]),
  B: Object.freeze([8, 3]),
  C: Object.freeze([15, 4]),
  D: Object.freeze([13, 5]),
});

function inBand(band, start, take) {
  const left = start - take;
  if (band === 'A') return start >= 2 && start <= 5 && take >= 1 && take <= start - 1 && left >= 1 && left <= 4;
  if (band === 'B') return start >= 3 && start <= 10 && take >= 1 && take <= start && left >= 0 && left <= 9;
  if (band === 'C') {
    return start >= 11 && start <= 20 && take >= 1 && take <= start - 10 && left >= 10 && left <= 19;
  }
  if (band === 'D') {
    return start >= 11 && start <= 18 && take >= start - 9 && take <= 9 && take > start - 10 && left >= 2 && left <= 9;
  }
  return false;
}

function modeAllows(mode, band, start, take) {
  const left = start - take;
  if (mode === 'plop') return true;
  if (mode === 'dripDrop') {
    if (band === 'A') return take <= 1;
    if (band === 'B') return take <= 2;
    if (band === 'C') return take <= 3;
    return false;
  }
  if (mode === 'oops') return take >= 1 && left >= 1;
  if (mode === 'tenTrick') return band === 'D' && start >= 11 && start <= 18 && take >= 3 && take <= 9;
  return false;
}

export function legalFacts(mode, band) {
  const ladder = BAND_LADDER[mode];
  if (!ladder || !ladder.includes(band)) return [];
  const facts = [];
  for (let start = 0; start <= 20; start += 1) {
    for (let take = 0; take <= start; take += 1) {
      if (!inBand(band, start, take) || !modeAllows(mode, band, start, take)) continue;
      facts.push([start, take]);
    }
  }
  return facts;
}

function isTrap(n, problem) {
  return n !== problem.answer && (n === problem.start || n === problem.take || n === problem.left);
}

export function makeChoices(problem, rng) {
  const answer = problem.answer;
  const allowTrap = problem.allowTrap !== false;
  const order = problem.mode === 'oops'
    ? [problem.take + 1, problem.take - 1, problem.left, problem.start, problem.take + 2]
    : [problem.left + 1, problem.left - 1, problem.start, problem.take, problem.left + 2, problem.left - 2];
  const chosen = [answer];
  let traps = 0;
  const consider = (n) => {
    if (!Number.isInteger(n) || n < 0 || n > 20 || chosen.includes(n)) return;
    if (isTrap(n, problem) && (!allowTrap || traps >= 1)) return;
    chosen.push(n);
    if (isTrap(n, problem)) traps += 1;
  };
  for (const n of order) {
    if (chosen.length === 3) break;
    consider(n);
  }
  for (let distance = 1; chosen.length < 3 && distance <= 20; distance += 1) {
    consider(answer + distance);
    if (chosen.length === 3) break;
    consider(answer - distance);
  }
  return shuffle(chosen, rng);
}

function pickId(ids, used, rng) {
  const fresh = ids.filter((id) => !used.has(id));
  const pool = fresh.length ? fresh : ids;
  return pool[Math.floor(rng() * pool.length)];
}

function buildProblem(mode, band, start, take, rng, history) {
  const left = start - take;
  const problem = {
    mode,
    band,
    start,
    take,
    left,
    answer: mode === 'oops' ? take : left,
    split: mode === 'tenTrick' ? [start - 10, take - (start - 10)] : null,
    flavour: pickId(FLAVOURS, new Set(history.map((item) => item.flavour)), rng),
    customer: pickId(CUSTOMERS, new Set(history.map((item) => item.customer)), rng),
    allowTrap: !(band === 'A' && history.length % 2 === 0),
    choices: [],
  };
  problem.choices = makeChoices(problem, rng);
  return problem;
}

export function nextProblem(mode, band, rng, history = []) {
  const facts = legalFacts(mode, band);
  const used = new Set(history.map((item) => `${item.start},${item.take}`));
  const lastLeft = history.length ? history[history.length - 1].left : null;
  const zeroUsed = history.some((item) => item.left === 0);
  const cleared = history.some((item) => item.take === item.start);
  const pool = facts.filter(([start, take]) => {
    const left = start - take;
    if (used.has(`${start},${take}`)) return false;
    if (left === lastLeft) return false;
    if (band === 'B' && left === 0 && zeroUsed) return false;
    if (band === 'B' && take === start && cleared) return false;
    return true;
  });
  const fallback = FALLBACK[band] || FALLBACK.A;
  const [start, take] = pool.length ? pool[Math.floor(rng() * pool.length)] : fallback;
  return buildProblem(mode, band, start, take, rng, history);
}

function samplerPool(progress, problems) {
  let pool = PLAYABLE.filter((mode) => isUnlocked(progress, mode, {}));
  if (!pool.length) pool = ['plop', 'dripDrop', 'oops'];
  const used = new Set(problems.map((problem) => problem.mode));
  if (problems.length === TRIP_LENGTH - 1 && used.size < 2) {
    const other = pool.filter((mode) => !used.has(mode));
    if (other.length) return other;
  }
  return pool;
}

export function generateTrip(mode, progress, rng) {
  const problems = [];
  for (let i = 0; i < TRIP_LENGTH; i += 1) {
    let problemMode = mode;
    let band = progress.band?.[mode] || defaultBand(mode);
    if (mode === 'sampler') {
      const pool = samplerPool(progress, problems);
      problemMode = pool[Math.floor(rng() * pool.length)];
      band = progress.band?.[problemMode] || defaultBand(problemMode);
    }
    problems.push(nextProblem(problemMode, band, rng, problems));
  }
  return problems;
}
