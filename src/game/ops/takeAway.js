import { emptyFact, strength } from '../mastery.js';
import { SPECIES_PAIRS } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';
import { OP as OPS, baseProblem } from './contract.js';

/** Take-away: start S aboard, L hop off, child reports who stay (S − L). */
export const OP = OPS.TAKEAWAY;
export const ROUTE_ID = 7;
export const STATION = { id: ROUTE_ID, op: OP, name: 'Hop-Off Halt', emoji: '🍃' };

const FALLBACK = [4, 1];
const MINUS = '−';

function legalFacts() {
  const out = [];
  for (let start = 2; start <= 10; start += 1) {
    for (let leave = 1; leave <= start - 1; leave += 1) {
      const stay = start - leave;
      if (stay >= 1 && stay <= 9) out.push([start, leave]);
    }
  }
  return out;
}

const LEGAL = legalFacts();

function pickWeighted(items, weightFn, rng) {
  if (!items.length) return null;
  const weights = items.map((it) => Math.max(0, weightFn(it)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)] || items[0];
  let r = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function nearestFill(need, used, stay) {
  const out = [];
  for (let d = 1; out.length < need && d <= 20; d += 1) {
    for (const n of [stay - d, stay + d]) {
      if (n >= 1 && n <= 20 && !used.has(n) && n !== stay) {
        used.add(n);
        out.push(n);
        if (out.length >= need) return out;
      }
    }
  }
  return out;
}

function makeChoices(start, leave, stay, count, rng) {
  const used = new Set([stay]);
  const prefer = [stay - 1, stay + 1, leave, start];
  const pool = [];
  for (const n of prefer) {
    if (!Number.isInteger(n) || n < 1 || n > 20 || used.has(n)) continue;
    used.add(n);
    pool.push(n);
  }
  if (pool.length < count - 1) {
    const extra = nearestFill(count - 1 - pool.length, used, stay).filter((n) => n >= 1);
    pool.push(...extra);
  }
  const extras = pool.slice(0, Math.max(0, count - 1));
  const choices = [stay, ...extras];
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = choices[i];
    choices[i] = choices[j];
    choices[j] = tmp;
  }
  return choices;
}

function factKeyOf(start, leave) {
  return `${start}-${leave}`;
}

function pairFor(tripIndex, tripsCompleted) {
  const pairs = SPECIES_PAIRS && SPECIES_PAIRS.length ? SPECIES_PAIRS : [['duck', 'bunny']];
  return pairs[(tripsCompleted * 6 + tripIndex + ROUTE_ID) % pairs.length];
}

function decorate(start, leave, rng, tripIndex, tripsCompleted) {
  const stay = start - leave;
  const choiceCount = start <= 5 ? 3 : 4;
  const pair = pairFor(tripIndex, tripsCompleted);
  const flip = rng() < 0.5;
  const speciesStay = flip ? pair[1] : pair[0];
  const speciesLeave = flip ? pair[0] : pair[1];
  const choices = makeChoices(start, leave, stay, choiceCount, rng);
  return baseProblem({
    op: OP,
    routeId: ROUTE_ID,
    a: start,
    b: leave,
    sum: start,
    answer: stay,
    factKey: factKeyOf(start, leave),
    speciesA: speciesStay,
    speciesB: speciesLeave,
    choices,
    choiceCount: choices.length,
    input: 'choices',
    requireCombine: tripIndex < 2,
    frameSize: start <= 5 ? 5 : 10,
    frameCount: start <= 10 ? 1 : 2,
    strategy: 'takeaway',
  });
}

function weightOf(start, leave, mastery, recentKeys, tripsCompleted) {
  const key = factKeyOf(start, leave);
  const fact = (mastery && mastery.facts && mastery.facts[key]) || emptyFact();
  let w = 1 + 2 * (1 - strength(fact));
  if ((tripsCompleted || 0) < 2 && start <= 5) w *= 1.8;
  if (leave === 1 || start - leave === 1) w *= 1.4;
  if (recentKeys.includes(key)) w *= 0.15;
  return w;
}

function resolveRng(rng) {
  if (typeof rng === 'function') return rng;
  return () => Math.random();
}

export function nextTakeAway(args = {}) {
  try {
    const rng = resolveRng(args.rng);
    const mastery = args.mastery || { facts: {}, tripsCompleted: 0 };
    const usedThisTrip = args.usedThisTrip || [];
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = args.tripsCompleted != null ? args.tripsCompleted : mastery.tripsCompleted || 0;
    const recentKeys = args.recentKeys || mastery.recentKeys || [];

    const within5 = (tripsCompleted || 0) < 2 || tripIndex < 4;
    const pool = within5 ? LEGAL.filter(([start]) => start <= 5) : LEGAL;
    let candidates = pool.filter(([start, leave]) => !usedThisTrip.includes(factKeyOf(start, leave)));
    if (!candidates.length) candidates = pool.slice();
    if (!candidates.length) candidates = LEGAL.slice();
    const picked = pickWeighted(candidates, ([start, leave]) => weightOf(start, leave, mastery, recentKeys, tripsCompleted), rng);
    const pair = picked || FALLBACK;
    return decorate(pair[0], pair[1], rng, tripIndex, tripsCompleted);
  } catch {
    return decorate(FALLBACK[0], FALLBACK[1], () => 0.5, (args && args.tripIndex) || 0, (args && args.tripsCompleted) || 0);
  }
}

export function generateTrip({ mastery, seed, rng, recentKeys = [], tripsCompleted } = {}) {
  const rand =
    typeof rng === 'function' ? rng : typeof seed === 'function' ? seed : mulberry32(seed == null ? Date.now() : seed);
  const usedThisTrip = [];
  const completed = tripsCompleted != null ? tripsCompleted : (mastery && mastery.tripsCompleted) || 0;
  const problems = [];
  for (let i = 0; i < 6; i += 1) {
    const p = nextTakeAway({
      rng: rand,
      mastery,
      usedThisTrip,
      tripIndex: i,
      tripsCompleted: completed,
      recentKeys,
    });
    problems.push(p);
    usedThisTrip.push(p.factKey);
  }
  if (completed < 2) {
    for (let i = 0; i < problems.length; i += 1) {
      if (problems[i].a <= 5) continue;
      const p = nextTakeAway({
        rng: rand,
        mastery,
        usedThisTrip: problems.map((x) => x.factKey).filter((_, j) => j !== i),
        tripIndex: i,
        tripsCompleted: 0,
        recentKeys,
      });
      problems[i] = p;
    }
  }
  return problems;
}

export function isCorrect(problem, value) {
  return problem != null && value === problem.answer;
}

export function equationParts(problem, { celebrating } = {}) {
  const stayText = celebrating ? String(problem.answer) : '?';
  return [
    { className: 'eq-num eq-a', text: String(problem.a) },
    { className: 'eq-op', text: MINUS },
    { className: 'eq-num eq-b', text: String(problem.b) },
    { className: 'eq-op', text: '=' },
    { className: celebrating ? 'eq-sum is-reveal' : 'eq-sum', text: stayText },
  ];
}

export function packSpec(problem) {
  return {
    kind: 'takeaway',
    start: problem.a,
    leave: problem.b,
    stay: problem.answer,
    speciesStay: problem.speciesA,
    speciesLeave: problem.speciesB,
  };
}
