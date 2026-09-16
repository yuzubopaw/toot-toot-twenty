/** Ten Bond Bay: fill the ten-car. Child taps B = 10 − A. */
import { OP, baseProblem } from './contract.js';
import { SPECIES_PAIRS } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';
import { emptyFact, strength } from '../mastery.js';

export const ROUTE_ID = 10;
export const STATION = { id: 10, op: 'bond', name: 'Ten Bond Bay', emoji: '🧩' };

const ALL_A_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ALL_A_5 = [1, 2, 3, 4];
const FAMILY_A_10 = new Set([1, 4, 5, 6, 9]);
const FAMILY_A_5 = new Set([1, 2]);
const FALLBACK_A = 2;
const PAIR_FALLBACK = ['duck', 'bunny'];

export function bondFactKey(a, target = 10) {
  const t = target === 5 ? 5 : 10;
  const shown = clampA(a, t);
  return `bond:${shown}+${t - shown}`;
}

function clampA(a, target = 10) {
  const max = target - 1;
  const n = Math.floor(Number(a));
  return n >= 1 && n <= max ? n : Math.min(FALLBACK_A, max);
}

function isFamilyA(a, target) {
  return (target === 5 ? FAMILY_A_5 : FAMILY_A_10).has(a);
}

function aFromFactKey(key) {
  if (typeof key !== 'string') return null;
  const m = /^bond:(\d+)\+\d+$/.exec(key);
  if (!m) return null;
  const a = Number(m[1]);
  return a >= 1 && a <= 9 ? a : null;
}

function targetFromKey(key) {
  if (typeof key !== 'string') return 10;
  const m = /^bond:\d+\+(\d+)$/.exec(key);
  if (!m) return 10;
  const b = Number(m[1]);
  const a = aFromFactKey(key);
  if (a == null) return 10;
  const t = a + b;
  return t === 5 || t === 10 ? t : 10;
}

function partsFor(target) {
  return target === 5 ? ALL_A_5 : ALL_A_10;
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

function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function makeRng(rng, seed) {
  if (typeof rng === 'function') return rng;
  if (typeof seed === 'function') return seed;
  return mulberry32(seed == null ? Date.now() : seed);
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

/** Distractors: nearby, target−a ± 1, a itself. Never 0 or the target. */
function makeBondChoices(a, b, target, rng) {
  const max = target - 1;
  const prefer = [b - 1, b + 1, a, a - 1, a + 1, b - 2, b + 2];
  const used = new Set([b]);
  const extras = [];
  for (const n of prefer) {
    if (!Number.isInteger(n) || n < 1 || n > max || used.has(n)) continue;
    used.add(n);
    extras.push(n);
  }
  for (let d = 1; extras.length < 3 && d <= max; d++) {
    for (const n of [b - d, b + d]) {
      if (n >= 1 && n <= max && !used.has(n)) {
        used.add(n);
        extras.push(n);
        if (extras.length >= 3) break;
      }
    }
  }
  const choiceCount = extras.length >= 3 ? 4 : Math.max(3, extras.length + 1);
  const choices = [b, ...extras.slice(0, choiceCount - 1)];
  return shuffle(choices, rng);
}

function weightOf(a, target, mastery, recentKeys, usedThisTrip) {
  const key = bondFactKey(a, target);
  const fact = (mastery && mastery.facts && mastery.facts[key]) || emptyFact();
  let w = 1 + 2 * (1 - strength(fact));
  if (recentKeys && recentKeys.includes(key)) w *= 0.15;
  if (usedThisTrip && usedThisTrip.includes(key)) w *= 0.02;
  const familySeen = (usedThisTrip || []).some((k) => isFamilyA(aFromFactKey(k), targetFromKey(k)));
  if (!familySeen && isFamilyA(a, target)) w *= 2.4;
  return w;
}

function aCountsFromUsed(usedThisTrip) {
  const counts = Object.create(null);
  for (const key of usedThisTrip || []) {
    const a = aFromFactKey(key);
    if (a == null) continue;
    counts[a] = (counts[a] || 0) + 1;
  }
  return counts;
}

function decorate(a, target, rng, tripIndex, tripsCompleted) {
  const t = target === 5 ? 5 : 10;
  const shown = clampA(a, t);
  const b = t - shown;
  const [speciesA, speciesB] = speciesPair(tripIndex, tripsCompleted);
  const choices = makeBondChoices(shown, b, t, rng);
  return baseProblem({
    op: OP.BOND,
    routeId: ROUTE_ID,
    a: shown,
    b,
    sum: t,
    answer: b,
    factKey: bondFactKey(shown, t),
    speciesA,
    speciesB,
    choices,
    choiceCount: choices.length,
    requireCombine: false,
    frameSize: t === 5 ? 5 : 10,
    frameCount: 1,
    strategy: 'bond',
  });
}

function fallbackProblem(rng, tripIndex, tripsCompleted, target = 5) {
  const rand = typeof rng === 'function' ? rng : () => 0.5;
  return decorate(FALLBACK_A, target, rand, tripIndex || 0, tripsCompleted || 0);
}

function pickTarget(tripsCompleted, tripIndex, usedThisTrip) {
  if ((tripsCompleted || 0) < 2) return tripIndex < 4 ? 5 : 10;
  const used5 = (usedThisTrip || []).filter((k) => targetFromKey(k) === 5).length;
  const used10 = (usedThisTrip || []).filter((k) => targetFromKey(k) === 10).length;
  if (used5 < 2 && tripIndex >= 4) return 5;
  if (used10 < 2 && tripIndex >= 4) return 10;
  if (tripIndex < 3) return tripIndex % 2 === 0 ? 5 : 10;
  return used5 <= used10 ? 5 : 10;
}

export function nextBond(args = {}) {
  try {
    const rng = typeof args.rng === 'function' ? args.rng : () => Math.random();
    const mastery = args.mastery || { facts: {} };
    const usedThisTrip = args.usedThisTrip || [];
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = args.tripsCompleted || (mastery && mastery.tripsCompleted) || 0;
    const recentKeys = args.recentKeys || mastery.recentKeys || [];
    const counts = aCountsFromUsed(usedThisTrip);
    const target = args.forceTarget || pickTarget(tripsCompleted, tripIndex, usedThisTrip);
    const parts = partsFor(target);

    let pool = parts.filter((a) => !usedThisTrip.includes(bondFactKey(a, target)) && (counts[a] || 0) < 2);
    if (!pool.length) pool = parts.filter((a) => (counts[a] || 0) < 2);
    if (!pool.length) pool = parts.slice();

    const picked = pickWeighted(pool, (a) => weightOf(a, target, mastery, recentKeys, usedThisTrip), rng);
    return decorate(picked == null ? FALLBACK_A : picked, target, rng, tripIndex, tripsCompleted);
  } catch {
    return fallbackProblem(args && args.rng, args && args.tripIndex, args && args.tripsCompleted);
  }
}

function isFamilyProblem(p) {
  return Boolean(p) && isFamilyA(p.a, p.sum) && p.a + p.b === p.sum;
}

function ensureTripInvariants(problems, rng, tripsCompleted) {
  const usedKeys = () => problems.map((p) => p.factKey);

  if (!problems.some(isFamilyProblem)) {
    const keys = new Set(usedKeys());
    const target = problems[problems.length - 1]?.sum === 5 ? 5 : 10;
    const family = target === 5 ? FAMILY_A_5 : FAMILY_A_10;
    const options = partsFor(target).filter((a) => family.has(a) && !keys.has(bondFactKey(a, target)));
    const pool = options.length ? options : partsFor(target).filter((a) => family.has(a));
    const a = pickWeighted([...pool], () => 1, rng) || FALLBACK_A;
    problems[problems.length - 1] = decorate(a, target, rng, problems.length - 1, tripsCompleted);
  }

  if ((tripsCompleted || 0) >= 2) {
    const n5 = problems.filter((p) => p.sum === 5).length;
    const n10 = problems.filter((p) => p.sum === 10).length;
    if (n5 < 2) {
      problems[0] = decorate(2, 5, rng, 0, tripsCompleted);
    }
    if (n10 < 2) {
      problems[5] = decorate(6, 10, rng, 5, tripsCompleted);
    }
  }

  const counts = Object.create(null);
  for (const p of problems) counts[`${p.sum}:${p.a}`] = (counts[`${p.sum}:${p.a}`] || 0) + 1;
  for (let i = 0; i < problems.length; i++) {
    const stamp = `${problems[i].sum}:${problems[i].a}`;
    if ((counts[stamp] || 0) <= 2) continue;
    const t = problems[i].sum;
    const keys = new Set(problems.map((p) => p.factKey));
    const replacement = partsFor(t).find((n) => !keys.has(bondFactKey(n, t))) || FALLBACK_A;
    counts[stamp] -= 1;
    problems[i] = decorate(replacement, t, rng, i, tripsCompleted);
  }
}

export function generateTrip({ mastery, seed, rng, recentKeys = [], tripsCompleted } = {}) {
  const rand = makeRng(rng, seed);
  const masterySafe = mastery || { facts: {} };
  const trips = tripsCompleted ?? masterySafe.tripsCompleted ?? 0;
  const usedThisTrip = [];
  const problems = [];

  for (let i = 0; i < 6; i++) {
    const p = nextBond({
      rng: rand,
      mastery: masterySafe,
      usedThisTrip,
      tripIndex: i,
      tripsCompleted: trips,
      recentKeys,
    });
    problems.push(p);
    usedThisTrip.push(p.factKey);
  }

  ensureTripInvariants(problems, rand, trips);
  return problems;
}

export function isCorrect(problem, value) {
  return Boolean(problem) && value === problem.answer;
}

export function equationParts(problem, { celebrating } = {}) {
  const a = problem && problem.a;
  const b = problem && problem.b;
  const t = (problem && problem.sum) || 10;
  if (celebrating) return [a, '+', b, '=', t];
  return [a, '+', '?', '=', t];
}

export function packSpec(problem) {
  return {
    kind: 'bond',
    a: problem.a,
    b: problem.b,
    target: problem.sum || 10,
    speciesA: problem.speciesA,
    speciesB: problem.speciesB,
  };
}
