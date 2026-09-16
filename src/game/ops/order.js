/** Date Depot: line up three day-tickets from smallest to largest (1–31). */

import { emptyFact, strength } from '../mastery.js';
import { SPECIES_PAIRS } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';
import { OP as OPS, baseProblem } from './contract.js';

export const OP = OPS.ORDER;
export const ROUTE_ID = 13;
export const STATION = { id: ROUTE_ID, op: OP, name: 'Date Depot', emoji: '📅' };

export const MIN_N = 1;
export const MAX_N = 31;
export const SEQ_LEN = 3;

const FALLBACK_BY_SLOT = [
  [1, 2, 3],
  [4, 5, 6],
  [2, 3, 4],
  [7, 8, 9],
  [5, 6, 7],
  [8, 9, 10],
];
const PAIR_FALLBACK = ['duck', 'bunny'];

export function orderFactKey(seq) {
  return `ord:${normalizeSeq(seq).join('-')}`;
}

function clampN(n) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(MIN_N, Math.min(MAX_N, v));
}

function normalizeSeq(seq) {
  const raw = Array.isArray(seq) ? seq.map(clampN) : [];
  const uniq = [];
  const seen = new Set();
  for (const n of raw) {
    if (seen.has(n)) continue;
    seen.add(n);
    uniq.push(n);
  }
  uniq.sort((a, b) => a - b);
  while (uniq.length < SEQ_LEN) {
    const next = clampN((uniq[uniq.length - 1] || 0) + 1);
    if (seen.has(next)) {
      let fill = MIN_N;
      while (seen.has(fill) && fill < MAX_N) fill += 1;
      if (seen.has(fill)) break;
      seen.add(fill);
      uniq.push(fill);
      uniq.sort((a, b) => a - b);
    } else {
      seen.add(next);
      uniq.push(next);
    }
  }
  return uniq.slice(0, SEQ_LEN);
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

/** Inclusive [min, max] for the three day-numbers. First trips stay in 1–10. */
export function bandFor(tripsOnRoute, tripIndex) {
  const trips = tripsOnRoute || 0;
  const i = tripIndex || 0;
  if (trips < 1) return [1, 10];
  if (trips < 2) return [1, 20];
  if (trips < 3) return i < 3 ? [8, 20] : [15, 31];
  if (i < 2) return [1, 20];
  if (i < 4) return [12, 31];
  return [21, 31];
}

export function gappedFor(tripsOnRoute, tripIndex) {
  const trips = tripsOnRoute || 0;
  const i = tripIndex || 0;
  if (trips < 2) return false;
  if (trips < 3) return i >= 4;
  return i >= 2;
}

function sameSeq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((n, i) => n === b[i]);
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

export function scrambleSeq(sorted, rng) {
  const src = normalizeSeq(sorted);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const mixed = shuffle(src, rng);
    if (!sameSeq(mixed, src)) return mixed;
  }
  const forced = src.slice();
  const i = forced.length - 1;
  const tmp = forced[i];
  forced[i] = forced[i - 1];
  forced[i - 1] = tmp;
  return forced;
}

function consecutiveStarts(min, max, length) {
  const lastStart = max - length + 1;
  const out = [];
  for (let n = min; n <= lastStart; n += 1) out.push(n);
  return out;
}

function consecutiveSeq(start) {
  const s = clampN(start);
  return normalizeSeq([s, s + 1, s + 2]);
}

function gappedPool(min, max) {
  const out = [];
  for (let a = min; a <= max - 2; a += 1) {
    for (let b = a + 1; b <= max - 1; b += 1) {
      for (let c = b + 1; c <= max; c += 1) {
        if (c - a <= 2) continue;
        out.push([a, b, c]);
      }
    }
  }
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

function weightOf(seq, mastery, recentKeys) {
  const key = orderFactKey(seq);
  const fact = (mastery && mastery.facts && mastery.facts[key]) || emptyFact();
  let w = 1 + 2 * (1 - strength(fact));
  const span = seq[seq.length - 1] - seq[0];
  if (span === 2) w *= 1.15;
  if (seq[seq.length - 1] >= 28) w *= 1.2;
  if ((recentKeys || []).includes(key)) w *= 0.15;
  return w;
}

function decorate(seq, rng, tripIndex, tripsCompleted) {
  const sequence = normalizeSeq(seq);
  const choices = scrambleSeq(sequence, rng);
  const [speciesA, speciesB] = speciesPair(tripIndex, tripsCompleted);
  return baseProblem({
    op: OP,
    routeId: ROUTE_ID,
    a: sequence[0],
    b: sequence[sequence.length - 1],
    sum: sequence[sequence.length - 1],
    answer: sequence[0],
    sequence,
    factKey: orderFactKey(sequence),
    speciesA,
    speciesB,
    choices,
    choiceCount: choices.length,
    requireCombine: false,
    frameSize: 10,
    frameCount: 1,
    strategy: 'order',
  });
}

function fallbackProblem(rng, tripIndex, tripsCompleted) {
  const rand = typeof rng === 'function' ? rng : () => 0.5;
  const seq = FALLBACK_BY_SLOT[(tripIndex || 0) % FALLBACK_BY_SLOT.length];
  return decorate(seq, rand, tripIndex || 0, tripsCompleted || 0);
}

function poolFor(min, max, gapped) {
  const lo = Math.max(MIN_N, min);
  const hi = Math.min(MAX_N, max);
  if (gapped) {
    const gappedItems = gappedPool(lo, hi);
    if (gappedItems.length) return gappedItems;
  }
  return consecutiveStarts(lo, hi, SEQ_LEN).map((start) => consecutiveSeq(start));
}

export function nextOrder(args = {}) {
  try {
    const rng = typeof args.rng === 'function' ? args.rng : () => Math.random();
    const mastery = args.mastery || { facts: {}, tripsByRoute: {} };
    const usedThisTrip = args.usedThisTrip || [];
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = args.tripsCompleted != null ? args.tripsCompleted : mastery.tripsCompleted || 0;
    const recentKeys = args.recentKeys || mastery.recentKeys || [];
    const tripsOnRoute = args.tripsOnRoute != null ? args.tripsOnRoute : tripsOnRouteOf(mastery);
    const [min, max] = args.forceBand || bandFor(tripsOnRoute, tripIndex);
    const gapped = args.forceGapped != null ? args.forceGapped : gappedFor(tripsOnRoute, tripIndex);
    const usedSet = new Set(usedThisTrip);
    let pool = poolFor(min, max, gapped).filter((seq) => !usedSet.has(orderFactKey(seq)));
    if (!pool.length) pool = poolFor(min, max, false).filter((seq) => !usedSet.has(orderFactKey(seq)));
    if (!pool.length) pool = poolFor(min, max, gapped);
    if (!pool.length) pool = poolFor(MIN_N, Math.min(MAX_N, min + 9), false);
    const picked = pickWeighted(pool, (seq) => weightOf(seq, mastery, recentKeys), rng);
    return decorate(picked || FALLBACK_BY_SLOT[tripIndex % 6], rng, tripIndex, tripsCompleted);
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
    const fresh = poolFor(min, max, gappedFor(tripsOnRoute, i)).filter((seq) => !keys.has(orderFactKey(seq)));
    const seq = fresh[0] || consecutiveSeq((problems[i].a || 1) + i + 1);
    keys.delete(problems[i].factKey);
    problems[i] = decorate(seq, rng, i, tripsCompleted);
    keys.add(problems[i].factKey);
  }

  const highs = problems.map((p) => p.b);
  const [lowMin, lowMax] = bandFor(tripsOnRoute, 0);
  const [highMin, highMax] = bandFor(tripsOnRoute, 5);
  if (!problems.some((p) => p.a >= lowMin && p.b <= lowMax)) {
    problems[0] = decorate(consecutiveSeq(lowMin), rng, 0, tripsCompleted);
  }
  if (!highs.some((n) => n >= highMin && n <= highMax)) {
    const used = new Set(problems.slice(0, 5).map((p) => p.factKey));
    const pool = poolFor(highMin, highMax, gappedFor(tripsOnRoute, 5)).filter((seq) => !used.has(orderFactKey(seq)));
    problems[5] = decorate(pool[0] || consecutiveSeq(Math.max(highMin, highMax - 2)), rng, 5, tripsCompleted);
  }

  if (tripsOnRoute >= 3 && !problems.some((p) => p.b >= 28)) {
    const used = new Set(problems.map((p) => p.factKey));
    const monthEnd = gappedPool(21, 31).filter((seq) => seq[2] >= 28 && !used.has(orderFactKey(seq)));
    problems[5] = decorate(monthEnd[0] || [28, 29, 31], rng, 5, tripsCompleted);
  }

  const seen = new Set();
  for (let i = 0; i < problems.length; i += 1) {
    if (!seen.has(problems[i].factKey)) {
      seen.add(problems[i].factKey);
      continue;
    }
    const [min, max] = bandFor(tripsOnRoute, i);
    const fresh = poolFor(min, max, gappedFor(tripsOnRoute, i)).filter((seq) => !seen.has(orderFactKey(seq)));
    problems[i] = decorate(fresh[0] || consecutiveSeq(min + i), rng, i, tripsCompleted);
    seen.add(problems[i].factKey);
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
    const p = nextOrder({
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

export function isCorrect(problem, value, placed = []) {
  if (!problem || !Array.isArray(problem.sequence)) return false;
  const i = Array.isArray(placed) ? placed.length : 0;
  return value === problem.sequence[i];
}

export function equationParts(problem, { celebrating, placed = [] } = {}) {
  const seq = (problem && problem.sequence) || [];
  const shown = celebrating ? seq.length : (Array.isArray(placed) ? placed.length : 0);
  const parts = [];
  seq.forEach((n, i) => {
    if (i > 0) parts.push({ className: 'eq-op', text: '→' });
    const reveal = celebrating || i < shown;
    parts.push({
      className: reveal ? 'eq-sum is-reveal' : 'eq-sum',
      text: reveal ? String(n) : '?',
    });
  });
  return parts;
}

export function packSpec(problem) {
  const sequence = (problem && problem.sequence) || [];
  return {
    kind: 'order',
    sequence,
    choices: (problem && problem.choices) || [],
    first: sequence[0],
    last: sequence[sequence.length - 1],
    speciesA: problem && problem.speciesA,
    speciesB: problem && problem.speciesB,
  };
}
