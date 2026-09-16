import { emptyFact, strength } from '../mastery.js';
import { SPECIES_PAIRS } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';
import { OP, baseProblem } from './contract.js';

/** Twin Tracks: two groups; child taps left, right, or same. */
export const ROUTE_ID = 9;
export const STATION = { id: 9, op: 'compare', name: 'Twin Tracks', emoji: '⚖️' };
export const CHOICES = ['left', 'right', 'same'];

const MIN = 1;
const FALLBACK = [3, 3];

function maxCount(tripsCompleted) {
  return (tripsCompleted || 0) < 2 ? 5 : 10;
}

function maxDiff(tripsCompleted) {
  return (tripsCompleted || 0) < 2 ? 2 : 3;
}
const ANSWER_SYMBOL = { left: '◀', right: '▶', same: '=' };

function factKeyOf(a, b) {
  return `cmp:${a}v${b}`;
}

function answerOf(a, b) {
  if (a > b) return 'left';
  if (b > a) return 'right';
  return 'same';
}

function legalPairs(tripsCompleted) {
  const max = maxCount(tripsCompleted);
  const diff = maxDiff(tripsCompleted);
  const out = [];
  for (let a = MIN; a <= max; a++) {
    for (let b = MIN; b <= max; b++) {
      if (Math.abs(a - b) <= diff) out.push([a, b]);
    }
  }
  return out;
}

function pickWeighted(items, weightFn, rng) {
  if (!items.length) return null;
  const weights = items.map((it) => Math.max(0, weightFn(it)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)] || items[0];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function resolveRng(args) {
  if (args && typeof args.rng === 'function') return args.rng;
  if (args && typeof args.seed === 'function') return args.seed;
  const seed = args && args.seed != null ? args.seed : Date.now();
  return mulberry32(seed);
}

function speciesFor(tripIndex, tripsCompleted) {
  const pair = SPECIES_PAIRS[(tripsCompleted * 6 + tripIndex + ROUTE_ID) % SPECIES_PAIRS.length];
  return { speciesA: pair[0], speciesB: pair[1] };
}

function weightOf(a, b, mastery, recentKeys) {
  const key = factKeyOf(a, b);
  const fact = (mastery && mastery.facts && mastery.facts[key]) || emptyFact();
  const d = Math.abs(a - b);
  let w = d === 0 ? 1.5 : d === 1 ? 2.2 : d === 2 ? 1.5 : 0.35;
  w *= 1 + 2 * (1 - strength(fact));
  if ((recentKeys || []).includes(key)) w *= 0.15;
  return w;
}

function pickPair({ rng, mastery, usedThisTrip, recentKeys, wantAnswer, tripsCompleted }) {
  const used = usedThisTrip || [];
  const pool = legalPairs(tripsCompleted);
  const match = (pair) => {
    if (wantAnswer && answerOf(pair[0], pair[1]) !== wantAnswer) return false;
    return !used.includes(factKeyOf(pair[0], pair[1]));
  };
  let candidates = pool.filter(match);
  if (!candidates.length) {
    candidates = wantAnswer ? pool.filter(([a, b]) => answerOf(a, b) === wantAnswer) : pool.slice();
  }
  if (!candidates.length) candidates = pool.slice();
  return pickWeighted(candidates, ([a, b]) => weightOf(a, b, mastery, recentKeys), rng) || FALLBACK;
}

function decorate(a, b, tripIndex, tripsCompleted) {
  const { speciesA, speciesB } = speciesFor(tripIndex, tripsCompleted);
  const answer = answerOf(a, b);
  return baseProblem({
    op: OP.COMPARE,
    routeId: ROUTE_ID,
    a,
    b,
    sum: a + b,
    answer,
    factKey: factKeyOf(a, b),
    speciesA,
    speciesB,
    choices: CHOICES.slice(),
    choiceCount: CHOICES.length,
    input: 'choices',
    requireCombine: false,
    frameSize: Math.max(a, b) <= 5 ? 5 : 10,
    frameCount: 2,
    strategy: 'compare',
    makeTenSplit: false,
    splitIntoFirst: 0,
  });
}

export function nextCompare(args = {}) {
  try {
    const rng = typeof args.rng === 'function' ? args.rng : () => 0.5;
    const mastery = args.mastery || { facts: {}, tripsCompleted: 0 };
    const usedThisTrip = args.usedThisTrip || [];
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = args.tripsCompleted != null ? args.tripsCompleted : mastery.tripsCompleted || 0;
    const recentKeys = args.recentKeys || [];
    const [a, b] = pickPair({
      rng,
      mastery,
      usedThisTrip,
      recentKeys,
      wantAnswer: args.wantAnswer,
      tripsCompleted,
    });
    return decorate(a, b, tripIndex, tripsCompleted);
  } catch {
    const tripIndex = (args && args.tripIndex) || 0;
    const tripsCompleted =
      (args && (args.tripsCompleted != null ? args.tripsCompleted : args.mastery && args.mastery.tripsCompleted)) || 0;
    return decorate(FALLBACK[0], FALLBACK[1], tripIndex, tripsCompleted);
  }
}

export function isCorrect(problem, value) {
  return Boolean(problem) && problem.answer === value;
}

export function equationParts(problem, opts = {}) {
  const celebrating = Boolean(opts.celebrating);
  const parts = [problem.a, 'vs', problem.b];
  if (celebrating) parts.push(ANSWER_SYMBOL[problem.answer] || '=');
  return parts;
}

export function packSpec(problem) {
  return {
    kind: 'compare',
    left: problem.a,
    right: problem.b,
    speciesA: problem.speciesA,
    speciesB: problem.speciesB,
  };
}

function countsOf(problems) {
  const c = { left: 0, right: 0, same: 0 };
  for (const p of problems) c[p.answer] += 1;
  return c;
}

function ensureTripMix(problems, ctx) {
  const quotas = { same: 1, left: 2, right: 2 };
  for (let n = 0; n < 8; n++) {
    const c = countsOf(problems);
    const need = c.same < quotas.same ? 'same' : c.left < quotas.left ? 'left' : c.right < quotas.right ? 'right' : null;
    if (!need) return;

    const surplus = {
      same: Math.max(0, c.same - quotas.same),
      left: Math.max(0, c.left - quotas.left),
      right: Math.max(0, c.right - quotas.right),
    };
    const donorType = ['left', 'right', 'same'].reduce((best, t) => (surplus[t] > surplus[best] ? t : best), 'left');
    const donors = [];
    for (let i = 0; i < problems.length; i++) {
      if (problems[i].answer === donorType && donorType !== need) donors.push(i);
    }
    if (!donors.length) {
      for (let i = 0; i < problems.length; i++) {
        if (problems[i].answer !== need) donors.push(i);
      }
    }
    if (!donors.length) return;
    const slot = donors[Math.floor(ctx.rng() * donors.length)] ?? donors[0];
    const used = problems.filter((_, i) => i !== slot).map((p) => p.factKey);
    const [a, b] = pickPair({
      rng: ctx.rng,
      mastery: ctx.mastery,
      usedThisTrip: used,
      recentKeys: ctx.recentKeys,
      wantAnswer: need,
      tripsCompleted: ctx.tripsCompleted,
    });
    problems[slot] = decorate(a, b, slot, ctx.tripsCompleted);
  }
}

export function generateTrip(args = {}) {
  const mastery = args.mastery || { facts: {}, tripsCompleted: 0 };
  const rng = resolveRng(args);
  const recentKeys = args.recentKeys || [];
  const tripsCompleted = args.tripsCompleted != null ? args.tripsCompleted : mastery.tripsCompleted || 0;

  const bag = ['same', 'left', 'left', 'right', 'right'];
  const extraPool = ['left', 'right', 'same', 'left', 'right'];
  bag.push(extraPool[Math.floor(rng() * extraPool.length)] || 'left');
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }

  const usedThisTrip = [];
  const problems = [];
  for (let i = 0; i < 6; i++) {
    const p = nextCompare({
      rng,
      mastery,
      usedThisTrip,
      tripIndex: i,
      tripsCompleted,
      recentKeys,
      wantAnswer: bag[i],
    });
    problems.push(p);
    usedThisTrip.push(p.factKey);
  }
  ensureTripMix(problems, { rng, mastery, recentKeys, tripsCompleted });
  return problems;
}
