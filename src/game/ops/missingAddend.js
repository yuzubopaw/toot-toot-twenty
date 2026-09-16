/** Missing addend: how many more friends fill a 5- or 10-seat car. */

import { emptyFact, strength } from '../mastery.js';
import { SPECIES_PAIRS } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';
import { OP, baseProblem } from './contract.js';

export const ROUTE_ID = 8;

export const STATION = { id: 8, op: 'missing', name: 'Spare Seat', emoji: '🪑' };

const TARGETS = [5, 10];
const FALLBACK = { a: 2, b: 3, sum: 5 };

function resolveRng(rng, seed) {
  if (typeof rng === 'function') return rng;
  if (typeof seed === 'function') return seed;
  return mulberry32(seed == null ? Date.now() : seed);
}

function completedOf(mastery, tripsCompleted) {
  if (Number.isFinite(tripsCompleted)) return tripsCompleted;
  const n = mastery && mastery.tripsCompleted;
  return Number.isFinite(n) ? n : 0;
}

function factKeyOf(a, target) {
  return `${a}+?=${target}`;
}

function targetFromKey(key) {
  if (typeof key !== 'string') return null;
  if (key.endsWith('=10')) return 10;
  if (key.endsWith('=5')) return 5;
  return null;
}

function legalSeated(target) {
  const T = target === 5 ? 5 : 10;
  const out = [];
  for (let a = 1; a <= T - 1; a++) out.push(a);
  return out;
}

function pickWeighted(items, weightFn, rng) {
  if (!items.length) return null;
  const weights = items.map((it) => Math.max(0, weightFn(it)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (!(total > 0)) {
    return items[Math.min(items.length - 1, Math.floor(rng() * items.length))] || items[0];
  }
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function makeMissingChoices(seated, missing, target, count, rng) {
  const nChoices = count === 3 ? 3 : 4;
  const used = new Set([missing]);
  const prefer = [seated, target, missing - 1, missing + 1, seated - 1, seated + 1, 1];
  const extras = [];
  for (const n of prefer) {
    if (!Number.isInteger(n) || n < 1 || n > 10 || used.has(n)) continue;
    used.add(n);
    extras.push(n);
    if (extras.length >= nChoices - 1) break;
  }
  for (let n = 1; n <= 10 && extras.length < nChoices - 1; n++) {
    if (used.has(n)) continue;
    used.add(n);
    extras.push(n);
  }
  const choices = [missing, ...extras.slice(0, Math.max(0, nChoices - 1))];
  return shuffleInPlace(choices, rng);
}

function weightOf(a, target, mastery, recentKeys, tripsCompleted) {
  const key = factKeyOf(a, target);
  const fact = (mastery && mastery.facts && mastery.facts[key]) || emptyFact();
  let w = 1 + 2 * (1 - strength(fact));
  if (Array.isArray(recentKeys) && recentKeys.includes(key)) w *= 0.15;
  const missing = target - a;
  if ((tripsCompleted || 0) === 0 && missing <= 3) w *= 1.5;
  return w;
}

function pickTarget({ tripIndex, tripsCompleted, usedThisTrip, rng, forceTarget }) {
  if (forceTarget === 5 || forceTarget === 10) return forceTarget;
  const used = Array.isArray(usedThisTrip) ? usedThisTrip : [];
  const i = Number.isFinite(tripIndex) ? tripIndex : 0;
  const completed = tripsCompleted || 0;
  if (completed === 0 && i < 3) return 5;

  const used5 = used.filter((k) => targetFromKey(k) === 5).length;
  const used10 = used.filter((k) => targetFromKey(k) === 10).length;
  const remainingAfter = Math.max(0, 5 - i);
  const need5 = Math.max(0, 2 - used5);
  const need10 = Math.max(0, 2 - used10);
  if (need5 > remainingAfter) return 5;
  if (need10 > remainingAfter) return 10;
  if (completed === 0) return 10;

  const last = used.length ? targetFromKey(used[used.length - 1]) : null;
  if (last === 5) return 10;
  if (last === 10) return 5;
  return rng() < 0.5 ? 5 : 10;
}

function speciesFor(tripIndex, tripsCompleted, rng) {
  const pairs = SPECIES_PAIRS && SPECIES_PAIRS.length ? SPECIES_PAIRS : [['duck', 'bunny']];
  const idx = Math.abs((tripsCompleted || 0) * 6 + (tripIndex || 0) + ROUTE_ID) % pairs.length;
  const pair = pairs[idx] || pairs[0];
  const flip = rng() < 0.5 ? 1 : 0;
  return pair[flip] || pair[0] || 'duck';
}

function buildProblem({ a, sum, rng, tripIndex, tripsCompleted }) {
  const T = sum === 5 ? 5 : 10;
  const seated = Math.min(T - 1, Math.max(1, a));
  const missing = T - seated;
  const choiceCount = T === 5 ? 3 : 4;
  const choices = makeMissingChoices(seated, missing, T, choiceCount, rng);
  return baseProblem({
    op: OP.MISSING,
    routeId: ROUTE_ID,
    a: seated,
    b: missing,
    sum: T,
    answer: missing,
    factKey: factKeyOf(seated, T),
    speciesA: speciesFor(tripIndex, tripsCompleted, rng),
    speciesB: null,
    choices,
    choiceCount: choices.length,
    requireCombine: false,
    frameSize: T === 5 ? 5 : 10,
    frameCount: 1,
    strategy: 'missing',
  });
}

function pickSeated(target, usedThisTrip, mastery, recentKeys, tripsCompleted, rng) {
  const used = new Set(Array.isArray(usedThisTrip) ? usedThisTrip : []);
  const pool = legalSeated(target);
  const fresh = pool.filter((a) => !used.has(factKeyOf(a, target)));
  const candidates = fresh.length ? fresh : pool;
  return pickWeighted(
    candidates,
    (a) => weightOf(a, target, mastery, recentKeys, tripsCompleted),
    rng,
  );
}

export function nextMissing(args = {}) {
  try {
    const rng = resolveRng(args.rng, args.seed);
    const mastery = args.mastery || { facts: {}, tripsCompleted: 0 };
    const usedThisTrip = args.usedThisTrip || [];
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = completedOf(mastery, args.tripsCompleted);
    const recentKeys = args.recentKeys || (mastery && mastery.recentKeys) || [];
    let target = pickTarget({
      tripIndex,
      tripsCompleted,
      usedThisTrip,
      rng,
      forceTarget: args.forceTarget,
    });
    let seated = pickSeated(target, usedThisTrip, mastery, recentKeys, tripsCompleted, rng);
    if (seated == null) {
      const other = target === 5 ? 10 : 5;
      seated = pickSeated(other, usedThisTrip, mastery, recentKeys, tripsCompleted, rng);
      if (seated != null) target = other;
    }
    if (seated == null) {
      return buildProblem({
        a: FALLBACK.a,
        sum: FALLBACK.sum,
        rng,
        tripIndex,
        tripsCompleted,
      });
    }
    return buildProblem({ a: seated, sum: target, rng, tripIndex, tripsCompleted });
  } catch {
    return buildProblem({
      a: FALLBACK.a,
      sum: FALLBACK.sum,
      rng: () => 0.5,
      tripIndex: 0,
      tripsCompleted: 0,
    });
  }
}

function countByTarget(problems) {
  let n5 = 0;
  let n10 = 0;
  for (const p of problems) {
    if (p.sum === 5) n5 += 1;
    else if (p.sum === 10) n10 += 1;
  }
  return { 5: n5, 10: n10 };
}

function replaceIndex(problems, needT, tripsCompleted) {
  const protectFirstThree = (tripsCompleted || 0) === 0 && needT === 10;
  const start = protectFirstThree ? 3 : 0;
  for (let i = 5; i >= start; i--) {
    if (problems[i] && problems[i].sum !== needT) return i;
  }
  for (let i = 5; i >= 0; i--) {
    if (problems[i] && problems[i].sum !== needT) return i;
  }
  return -1;
}

function ensureTargetMix(problems, rng, mastery, tripsCompleted, recentKeys) {
  for (const T of TARGETS) {
    let n = countByTarget(problems)[T];
    let guard = 0;
    while (n < 2 && guard < 6) {
      guard += 1;
      const idx = replaceIndex(problems, T, tripsCompleted);
      if (idx < 0) break;
      const used = problems.map((p, i) => (i === idx ? null : p.factKey)).filter(Boolean);
      problems[idx] = nextMissing({
        rng,
        mastery,
        usedThisTrip: used,
        tripIndex: idx,
        tripsCompleted,
        recentKeys,
        forceTarget: T,
      });
      n = countByTarget(problems)[T];
    }
  }
}

function uniquifyTrip(problems, rng, mastery, tripsCompleted, recentKeys) {
  const seen = new Set();
  for (let i = 0; i < problems.length; i++) {
    const key = problems[i].factKey;
    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }
    const used = problems.map((p, j) => (j === i ? null : p.factKey)).filter(Boolean);
    const next = nextMissing({
      rng,
      mastery,
      usedThisTrip: used,
      tripIndex: i,
      tripsCompleted,
      recentKeys,
      forceTarget: problems[i].sum,
    });
    problems[i] = next;
    seen.add(next.factKey);
  }
}

export function generateTrip({ mastery, seed, rng, recentKeys, tripsCompleted } = {}) {
  const r = resolveRng(rng, seed);
  const m = mastery || { facts: {}, tripsCompleted: 0 };
  const completed = completedOf(m, tripsCompleted);
  const recents = recentKeys || m.recentKeys || [];
  const usedThisTrip = [];
  const problems = [];
  for (let i = 0; i < 6; i++) {
    const p = nextMissing({
      rng: r,
      mastery: m,
      usedThisTrip,
      tripIndex: i,
      tripsCompleted: completed,
      recentKeys: recents,
    });
    problems.push(p);
    usedThisTrip.push(p.factKey);
  }
  ensureTargetMix(problems, r, m, completed, recents);
  uniquifyTrip(problems, r, m, completed, recents);
  return problems;
}

export function isCorrect(problem, value) {
  return problem != null && value === problem.answer;
}

export function equationParts(problem, { celebrating } = {}) {
  const missing = celebrating ? problem.b : '?';
  return [problem.a, '+', missing, '=', problem.sum];
}

export function packSpec(problem) {
  return {
    kind: 'missing',
    seated: problem.a,
    missing: problem.b,
    target: problem.sum,
    speciesA: problem.speciesA,
    emptyCells: true,
  };
}
