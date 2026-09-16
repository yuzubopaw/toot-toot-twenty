/** Tally Track: how many friends ride? Counts 1–50 in ten-frames. */

import { emptyFact, strength } from '../mastery.js';
import { SPECIES_PAIRS } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';
import { OP as OPS, baseProblem } from './contract.js';

export const OP = OPS.COUNT;
export const ROUTE_ID = 12;
export const STATION = { id: ROUTE_ID, op: OP, name: 'Tally Track', emoji: '🖐️' };

export const MIN_COUNT = 1;
export const MAX_COUNT = 50;

const FALLBACK_BY_SLOT = [3, 8, 12, 20, 35, 47];
const PAIR_FALLBACK = ['duck', 'bunny'];

export function countFactKey(n) {
  return `count:${clampCount(n)}`;
}

function clampCount(n) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 5;
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, v));
}

function resolveRng(rng, seed) {
  if (typeof rng === 'function') return rng;
  if (typeof seed === 'function') return seed;
  return mulberry32(seed == null ? Date.now() : seed);
}

function tripsOnRouteOf(mastery) {
  const t = mastery && mastery.tripsByRoute && mastery.tripsByRoute[String(ROUTE_ID)];
  return Number.isFinite(t) ? t : 0;
}

/** Smaller groups first in a trip so a round stays countable in ~50s. */
export function bandFor(tripsOnRoute, tripIndex) {
  const trips = tripsOnRoute || 0;
  const i = tripIndex || 0;
  if (trips < 1) return i < 3 ? [1, 5] : [6, 10];
  if (trips < 2) return i < 3 ? [6, 12] : [11, 20];
  if (trips < 3) return i < 3 ? [11, 20] : [21, 30];
  if (i < 2) return [16, 25];
  if (i < 4) return [26, 40];
  return [35, 50];
}

function poolFor(min, max) {
  const lo = Math.max(MIN_COUNT, min);
  const hi = Math.min(MAX_COUNT, max);
  const out = [];
  for (let n = lo; n <= hi; n += 1) out.push(n);
  return out;
}

function pickWeighted(items, weightFn, rng) {
  if (!items.length) return null;
  const weights = items.map((it) => Math.max(0, weightFn(it)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (!(total > 0)) return items[Math.min(items.length - 1, Math.floor(rng() * items.length))] || items[0];
  let r = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function speciesPair(tripIndex, tripsCompleted) {
  const pairs = SPECIES_PAIRS && SPECIES_PAIRS.length ? SPECIES_PAIRS : [PAIR_FALLBACK];
  const idx = Math.abs((tripsCompleted || 0) * 6 + (tripIndex || 0) + ROUTE_ID) % pairs.length;
  const pair = pairs[idx] || PAIR_FALLBACK;
  const speciesA = pair[0] || PAIR_FALLBACK[0];
  let speciesB = pair[1] || PAIR_FALLBACK[1];
  if (speciesB === speciesA) {
    speciesB = PAIR_FALLBACK[0] === speciesA ? PAIR_FALLBACK[1] : PAIR_FALLBACK[0];
  }
  return [speciesA, speciesB];
}

/** Nearby, off-by-ten, and decade misses. Always in 1..50. */
export function makeCountChoices(n, count, rng) {
  const answer = clampCount(n);
  const nChoices = count === 3 ? 3 : 4;
  const used = new Set([answer]);
  const decade = Math.round(answer / 10) * 10;
  const prefer = [
    answer - 1,
    answer + 1,
    answer - 10,
    answer + 10,
    answer - 2,
    answer + 2,
    decade,
    decade - 10,
    decade + 10,
    answer - 5,
    answer + 5,
  ];
  const extras = [];
  for (const v of prefer) {
    if (!Number.isInteger(v) || v < MIN_COUNT || v > MAX_COUNT || used.has(v)) continue;
    used.add(v);
    extras.push(v);
    if (extras.length >= nChoices - 1) break;
  }
  for (let d = 1; extras.length < nChoices - 1 && d <= MAX_COUNT; d += 1) {
    for (const v of [answer - d, answer + d]) {
      if (v < MIN_COUNT || v > MAX_COUNT || used.has(v)) continue;
      used.add(v);
      extras.push(v);
      if (extras.length >= nChoices - 1) break;
    }
  }
  return shuffle([answer, ...extras.slice(0, nChoices - 1)], rng);
}

function weightOf(n, mastery, recentKeys) {
  const key = countFactKey(n);
  const fact = (mastery && mastery.facts && mastery.facts[key]) || emptyFact();
  let w = 1 + 2 * (1 - strength(fact));
  if (n % 10 === 0) w *= 1.25;
  if (n % 10 === 5) w *= 1.15;
  if ((recentKeys || []).includes(key)) w *= 0.15;
  return w;
}

function framesFor(n) {
  if (n <= 5) return { frameSize: 5, frameCount: 1 };
  return { frameSize: 10, frameCount: Math.max(1, Math.ceil(n / 10)) };
}

function decorate(n, rng, tripIndex, tripsCompleted) {
  const count = clampCount(n);
  const tens = Math.floor(count / 10) * 10;
  const ones = tens > 0 ? count % 10 : 0;
  const [speciesA, pairB] = speciesPair(tripIndex, tripsCompleted);
  const speciesB = tens > 0 && ones > 0 ? pairB : null;
  const { frameSize, frameCount } = framesFor(count);
  const choiceCount = count <= 10 ? 3 : 4;
  const choices = makeCountChoices(count, choiceCount, rng);
  return baseProblem({
    op: OP,
    routeId: ROUTE_ID,
    a: tens > 0 ? tens : count,
    b: tens > 0 ? ones : 0,
    sum: count,
    answer: count,
    factKey: countFactKey(count),
    speciesA,
    speciesB,
    choices,
    choiceCount: choices.length,
    requireCombine: false,
    frameSize,
    frameCount,
    strategy: 'count-all',
  });
}

function fallbackProblem(rng, tripIndex, tripsCompleted) {
  const rand = typeof rng === 'function' ? rng : () => 0.5;
  const n = FALLBACK_BY_SLOT[(tripIndex || 0) % FALLBACK_BY_SLOT.length];
  return decorate(n, rand, tripIndex || 0, tripsCompleted || 0);
}

export function nextCount(args = {}) {
  try {
    const rng = typeof args.rng === 'function' ? args.rng : () => Math.random();
    const mastery = args.mastery || { facts: {}, tripsByRoute: {} };
    const usedThisTrip = args.usedThisTrip || [];
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = args.tripsCompleted != null ? args.tripsCompleted : mastery.tripsCompleted || 0;
    const recentKeys = args.recentKeys || mastery.recentKeys || [];
    const tripsOnRoute = args.tripsOnRoute != null ? args.tripsOnRoute : tripsOnRouteOf(mastery);
    const [min, max] = args.forceBand || bandFor(tripsOnRoute, tripIndex);
    const usedSet = new Set(usedThisTrip);
    let pool = poolFor(min, max).filter((n) => !usedSet.has(countFactKey(n)));
    if (!pool.length) pool = poolFor(min, max);
    if (!pool.length) pool = poolFor(MIN_COUNT, MAX_COUNT);
    const picked = pickWeighted(pool, (n) => weightOf(n, mastery, recentKeys), rng);
    return decorate(picked == null ? FALLBACK_BY_SLOT[tripIndex % 6] : picked, rng, tripIndex, tripsCompleted);
  } catch {
    return fallbackProblem(args && args.rng, args && args.tripIndex, args && args.tripsCompleted);
  }
}

function ensureTripInvariants(problems, rng, tripsOnRoute, tripsCompleted) {
  const keys = new Set(problems.map((p) => p.factKey));
  for (let i = 0; i < problems.length; i += 1) {
    const dup = problems.findIndex((p, j) => j !== i && p.factKey === problems[i].factKey);
    if (dup < 0) continue;
    const [min, max] = bandFor(tripsOnRoute, i);
    const fresh = poolFor(min, max).filter((n) => !keys.has(countFactKey(n)));
    const n = fresh[0] || clampCount(problems[i].answer + i + 1);
    keys.delete(problems[i].factKey);
    problems[i] = decorate(n, rng, i, tripsCompleted);
    keys.add(problems[i].factKey);
  }

  const nums = problems.map((p) => p.answer);
  const [lowMin, lowMax] = bandFor(tripsOnRoute, 0);
  const [highMin, highMax] = bandFor(tripsOnRoute, 5);
  if (!nums.some((n) => n >= lowMin && n <= lowMax)) {
    problems[0] = decorate(lowMin, rng, 0, tripsCompleted);
  }
  if (!nums.some((n) => n >= highMin && n <= highMax)) {
    const used = new Set(problems.slice(0, 5).map((p) => p.factKey));
    const pool = poolFor(highMin, highMax).filter((n) => !used.has(countFactKey(n)));
    problems[5] = decorate(pool[0] || highMax, rng, 5, tripsCompleted);
  }

  if (tripsOnRoute >= 3 && !problems.some((p) => p.answer % 10 === 0)) {
    const used = new Set(problems.map((p) => p.factKey));
    const decades = [30, 40, 50].filter((n) => !used.has(countFactKey(n)));
    problems[5] = decorate(decades[0] || 40, rng, 5, tripsCompleted);
  }
}

export function generateTrip({ mastery, seed, rng, recentKeys = [], tripsCompleted } = {}) {
  const rand = resolveRng(rng, seed);
  const masterySafe = mastery || { facts: {}, tripsByRoute: {} };
  const trips = tripsCompleted != null ? tripsCompleted : masterySafe.tripsCompleted || 0;
  const tripsOnRoute = tripsOnRouteOf(masterySafe);
  const usedThisTrip = [];
  const problems = [];
  for (let i = 0; i < 6; i += 1) {
    const p = nextCount({
      rng: rand,
      mastery: masterySafe,
      usedThisTrip,
      tripIndex: i,
      tripsCompleted: trips,
      tripsOnRoute,
      recentKeys,
    });
    problems.push(p);
    usedThisTrip.push(p.factKey);
  }
  ensureTripInvariants(problems, rand, tripsOnRoute, trips);
  return problems;
}

export function isCorrect(problem, value) {
  return Boolean(problem) && value === problem.answer;
}

export function equationParts(problem, { celebrating } = {}) {
  const n = problem && problem.answer;
  return [
    { className: 'eq-op', text: '🖐️' },
    { className: celebrating ? 'eq-sum is-reveal' : 'eq-sum', text: celebrating ? String(n) : '?' },
  ];
}

export function packSpec(problem) {
  const n = problem.answer;
  return {
    kind: 'count',
    n,
    tens: Math.floor(n / 10),
    ones: n % 10,
    speciesA: problem.speciesA,
    speciesB: problem.speciesB,
    frameSize: problem.frameSize,
  };
}

