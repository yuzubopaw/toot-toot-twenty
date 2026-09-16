import { baseProblem, OP } from './contract.js';
import { SPECIES_PAIRS, factKeyOf, legalPairs, makeChoices, presentationFor } from '../problemGenerator.js';
import { mulberry32 } from '../rng.js';

export const ROUTE_ID = 11;
export const STATION = { id: 11, op: 'mixed', name: 'Mix-Up Main', emoji: '🎲' };

const KINDS = [OP.ADD, OP.ADD, OP.TAKEAWAY, OP.MISSING, OP.COMPARE, OP.BOND];
const COMPARE_CHOICES = ['left', 'right', 'same'];

function resolveRng(args = {}) {
  if (typeof args.rng === 'function') return args.rng;
  if (typeof args.seed === 'function') return args.seed;
  const n = Number(args.seed);
  return mulberry32(Number.isFinite(n) ? n : 11);
}

function clampIndex(rng, length) {
  if (length <= 0) return 0;
  const r = rng();
  const u = Number.isFinite(r) ? Math.min(Math.max(r, 0), 0.999999) : 0;
  return Math.min(length - 1, Math.floor(u * length));
}

function pick(arr, rng) {
  if (!arr || !arr.length) return undefined;
  return arr[clampIndex(rng, arr.length)];
}

function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = clampIndex(rng, i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function speciesPair(tripsCompleted, tripIndex) {
  const pairs = SPECIES_PAIRS && SPECIES_PAIRS.length ? SPECIES_PAIRS : [['duck', 'bunny']];
  return pairs[(tripsCompleted * 6 + tripIndex + ROUTE_ID) % pairs.length];
}

function numericChoices(answer, prefer, count, rng, min = 1, max = 20) {
  const used = new Set([answer]);
  const pool = [];
  for (const n of prefer) {
    if (!Number.isInteger(n) || n < min || n > max || used.has(n)) continue;
    used.add(n);
    pool.push(n);
  }
  for (let d = 1; pool.length < count - 1 && d <= 20; d++) {
    for (const n of [answer - d, answer + d]) {
      if (n >= min && n <= max && !used.has(n)) {
        used.add(n);
        pool.push(n);
        if (pool.length >= count - 1) break;
      }
    }
  }
  return shuffle([answer, ...pool.slice(0, Math.max(0, count - 1))], rng);
}

function unused(pool, usedKeys, keyFn) {
  const fresh = pool.filter((item) => !usedKeys.has(keyFn(item)));
  return fresh.length ? fresh : pool;
}

function addPairPool() {
  const out = [];
  const seen = new Set();
  for (const routeId of [1, 2]) {
    for (const [a, b] of legalPairs(routeId)) {
      if (a < 1 || b < 1) continue;
      const s = a + b;
      if (s < 2 || s > 10) continue;
      const k = `${a},${b}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([a, b]);
    }
  }
  return out;
}

const ADD_PAIRS = addPairPool();

function adopt(problem) {
  const choices = problem.choices && problem.choices.length ? problem.choices : [];
  const easyAdd = problem.op === OP.ADD && problem.a >= 1 && problem.b >= 1 && problem.a + problem.b <= 10;
  return baseProblem({
    ...problem,
    routeId: ROUTE_ID,
    choices,
    choiceCount: choices.length,
    input: 'choices',
    requireCombine: easyAdd,
  });
}

function stampAdd(p, tripsCompleted, tripIndex) {
  const sum = p.a + p.b;
  const pair = speciesPair(tripsCompleted, tripIndex);
  const choices = p.choices && p.choices.length ? p.choices : makeChoices(p.a, p.b, 3, () => 0.3);
  return adopt({
    ...p,
    op: OP.ADD,
    a: p.a,
    b: p.b,
    sum,
    answer: sum,
    factKey: factKeyOf(p.a, p.b),
    speciesA: p.a === 0 ? null : pair[0],
    speciesB: p.b === 0 ? null : pair[1],
    choices,
    strategy: p.strategy || 'count-all',
    frameSize: p.frameSize || (sum <= 5 ? 5 : 10),
    frameCount: p.frameCount || 1,
  });
}

function nextAdd({ mastery, rng, recentKeys, usedKeys, tripIndex, tripsCompleted }) {
  const easy = (tripsCompleted || 0) < 2;
  const addPool = easy ? ADD_PAIRS.filter(([a, b]) => a + b <= 5) : ADD_PAIRS;
  const pair = pick(
    unused(addPool.length ? addPool : ADD_PAIRS, usedKeys, ([a, b]) => factKeyOf(a, b)),
    rng,
  ) || [1, 1];
  const presentRoute = pair[0] + pair[1] <= 5 ? 1 : 2;
  const pres = presentationFor(pair[0], pair[1], presentRoute);
  return stampAdd(
    {
      a: pair[0],
      b: pair[1],
      sum: pair[0] + pair[1],
      strategy: pres.strategy,
      choices: makeChoices(pair[0], pair[1], pres.choiceCount, rng),
      frameSize: pres.frameSize,
      frameCount: pres.frameCount,
      makeTenSplit: pres.makeTenSplit,
      splitIntoFirst: pres.splitIntoFirst,
    },
    tripsCompleted,
    tripIndex,
  );
}

function nextTakeaway({ rng, usedKeys, tripIndex, tripsCompleted }) {
  const cap = (tripsCompleted || 0) < 2 ? 5 : 10;
  const pool = [];
  for (let start = 2; start <= cap; start++) {
    for (let leave = 1; leave < start; leave++) pool.push([start, leave]);
  }
  const [a, b] = pick(
    unused(pool, usedKeys, ([start, leave]) => `${start}-${leave}`),
    rng,
  ) || [5, 2];
  const stay = a - b;
  const pair = speciesPair(tripsCompleted, tripIndex);
  const choices = numericChoices(stay, [stay - 1, stay + 1, b, a], a <= 5 ? 3 : 4, rng);
  return adopt({
    op: OP.TAKEAWAY,
    a,
    b,
    sum: a,
    answer: stay,
    factKey: `${a}-${b}`,
    speciesA: pair[0],
    speciesB: pair[1],
    choices,
    frameSize: a <= 5 ? 5 : 10,
    frameCount: 1,
    strategy: 'takeaway',
  });
}

function nextMissing({ rng, usedKeys, tripIndex, tripsCompleted }) {
  const pool = [];
  for (const target of [5, 10]) {
    for (let seated = 1; seated < target; seated++) pool.push([target, seated]);
  }
  const [target, seated] = pick(
    unused(pool, usedKeys, ([t, s]) => `${s}+?=${t}`),
    rng,
  ) || [5, 2];
  const missing = target - seated;
  const pair = speciesPair(tripsCompleted, tripIndex);
  const nChoices = target === 5 ? 3 : 4;
  const choices = numericChoices(missing, [seated, target, missing - 1, missing + 1], nChoices, rng, 0, 10);
  return adopt({
    op: OP.MISSING,
    a: seated,
    b: missing,
    sum: target,
    answer: missing,
    factKey: `${seated}+?=${target}`,
    speciesA: pair[0],
    speciesB: null,
    choices,
    frameSize: target === 5 ? 5 : 10,
    frameCount: 1,
    strategy: 'missing',
  });
}

function nextCompare({ rng, usedKeys, tripIndex, tripsCompleted }) {
  const pool = [];
  for (let left = 1; left <= 8; left++) {
    for (let right = 1; right <= 8; right++) {
      if (Math.abs(left - right) > 3) continue;
      pool.push([left, right]);
    }
  }
  const [a, b] = pick(
    unused(pool, usedKeys, ([left, right]) => `cmp:${left}v${right}`),
    rng,
  ) || [3, 3];
  const answer = a === b ? 'same' : a > b ? 'left' : 'right';
  const pair = speciesPair(tripsCompleted, tripIndex);
  const max = Math.max(a, b);
  return adopt({
    op: OP.COMPARE,
    a,
    b,
    sum: a + b,
    answer,
    factKey: `cmp:${a}v${b}`,
    speciesA: pair[0],
    speciesB: pair[1],
    choices: COMPARE_CHOICES.slice(),
    frameSize: max <= 5 ? 5 : 10,
    frameCount: 2,
    strategy: 'compare',
  });
}

function nextBond({ rng, usedKeys, tripIndex, tripsCompleted }) {
  const parts = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const a = pick(
    unused(parts, usedKeys, (part) => `bond:${part}+${10 - part}`),
    rng,
  ) ?? 3;
  const b = 10 - a;
  const pair = speciesPair(tripsCompleted, tripIndex);
  const choices = numericChoices(b, [b - 1, b + 1, a, a - 1, a + 1], 4, rng, 1, 9);
  return adopt({
    op: OP.BOND,
    a,
    b,
    sum: 10,
    answer: b,
    factKey: `bond:${a}+${b}`,
    speciesA: pair[0],
    speciesB: pair[1],
    choices,
    frameSize: 10,
    frameCount: 1,
    strategy: 'bond',
  });
}

const LOCAL_NEXT = {
  [OP.ADD]: nextAdd,
  [OP.TAKEAWAY]: nextTakeaway,
  [OP.MISSING]: nextMissing,
  [OP.COMPARE]: nextCompare,
  [OP.BOND]: nextBond,
};

function buildTrip(args = {}) {
  const mastery = args.mastery || { facts: {}, tripsCompleted: 0 };
  const rng = resolveRng(args);
  const recentKeys = args.recentKeys || [];
  const tripsCompleted = args.tripsCompleted ?? mastery.tripsCompleted ?? 0;
  const kinds = shuffle(KINDS, rng);
  const usedKeys = new Set();
  const problems = [];

  for (let i = 0; i < 6; i++) {
    const ctx = { mastery, rng, recentKeys, usedKeys, tripIndex: i, tripsCompleted };
    const problem = LOCAL_NEXT[kinds[i]](ctx);
    usedKeys.add(problem.factKey);
    problems.push(problem);
  }

  return problems;
}

const SAFE_TRIP = [
  stampAdd({ a: 1, b: 1, sum: 2, choices: [2, 1, 3], frameSize: 5, frameCount: 1, strategy: 'count-all' }, 0, 0),
  stampAdd({ a: 2, b: 3, sum: 5, choices: [5, 4, 6], frameSize: 5, frameCount: 1, strategy: 'count-all' }, 0, 1),
  adopt({
    op: OP.TAKEAWAY,
    a: 5,
    b: 2,
    sum: 5,
    answer: 3,
    factKey: '5-2',
    speciesA: 'duck',
    speciesB: 'bunny',
    choices: [3, 2, 5],
    frameSize: 5,
    frameCount: 1,
    strategy: 'takeaway',
  }),
  adopt({
    op: OP.MISSING,
    a: 3,
    b: 2,
    sum: 5,
    answer: 2,
    factKey: '3+?=5',
    speciesA: 'puppy',
    speciesB: null,
    choices: [2, 3, 5],
    frameSize: 5,
    frameCount: 1,
    strategy: 'missing',
  }),
  adopt({
    op: OP.COMPARE,
    a: 4,
    b: 2,
    sum: 6,
    answer: 'left',
    factKey: 'cmp:4v2',
    speciesA: 'pig',
    speciesB: 'chick',
    choices: COMPARE_CHOICES.slice(),
    frameSize: 5,
    frameCount: 2,
    strategy: 'compare',
  }),
  adopt({
    op: OP.BOND,
    a: 7,
    b: 3,
    sum: 10,
    answer: 3,
    factKey: 'bond:7+3',
    speciesA: 'bear',
    speciesB: 'frog',
    choices: [3, 2, 4, 7],
    frameSize: 10,
    frameCount: 1,
    strategy: 'bond',
  }),
];

export function generateTrip(args = {}) {
  try {
    const trip = buildTrip(args);
    if (Array.isArray(trip) && trip.length === 6) return trip;
    return SAFE_TRIP.map((p) => ({ ...p, choices: p.choices.slice() }));
  } catch {
    return SAFE_TRIP.map((p) => ({ ...p, choices: p.choices.slice() }));
  }
}

export function isCorrect(problem, value) {
  if (!problem) return false;
  if (problem.op === OP.COMPARE) return value === problem.answer;
  return Number(value) === Number(problem.answer);
}

function reveal(value, celebrating) {
  return celebrating ? value : '?';
}

export function equationParts(problem, ctx = {}) {
  const celebrating = !!(ctx && ctx.celebrating);
  switch (problem && problem.op) {
    case OP.TAKEAWAY:
      return [
        { className: 'eq-num eq-a', text: String(problem.a) },
        { className: 'eq-op', text: '−' },
        { className: 'eq-num eq-b', text: String(problem.b) },
        { className: 'eq-op', text: '=' },
        { className: celebrating ? 'eq-sum is-reveal' : 'eq-sum', text: celebrating ? String(problem.answer) : '?' },
      ];
    case OP.MISSING:
      return [problem.a, '+', reveal(problem.b, celebrating), '=', problem.sum];
    case OP.COMPARE: {
      const parts = [problem.a, 'vs', problem.b];
      if (celebrating) parts.push(problem.answer === 'same' ? '=' : problem.answer === 'left' ? '◀' : '▶');
      return parts;
    }
    case OP.BOND:
      return celebrating ? [problem.a, '+', problem.b, '=', 10] : [problem.a, '+', '?', '=', 10];
    default:
      return [
        { className: 'eq-num eq-a', text: String(problem ? problem.a : 0) },
        { className: 'eq-op', text: '+' },
        { className: 'eq-num eq-b', text: String(problem ? problem.b : 0) },
        { className: 'eq-op', text: '=' },
        {
          className: celebrating ? 'eq-sum is-reveal' : 'eq-sum',
          text: celebrating ? String(problem ? problem.answer ?? problem.sum : 0) : '?',
        },
      ];
  }
}

export function packSpec(problem) {
  if (!problem) return { kind: 'join', left: 0, right: 0 };
  switch (problem.op) {
    case OP.TAKEAWAY:
      return {
        kind: 'takeaway',
        start: problem.a,
        leave: problem.b,
        stay: problem.answer,
        speciesStay: problem.speciesA,
        speciesLeave: problem.speciesB,
      };
    case OP.MISSING:
      return {
        kind: 'missing',
        seated: problem.a,
        missing: problem.b,
        target: problem.sum,
        speciesA: problem.speciesA,
        emptyCells: true,
      };
    case OP.COMPARE:
      return {
        kind: 'compare',
        left: problem.a,
        right: problem.b,
        speciesA: problem.speciesA,
        speciesB: problem.speciesB,
      };
    case OP.BOND:
      return {
        kind: 'bond',
        a: problem.a,
        b: problem.b,
        target: 10,
        speciesA: problem.speciesA,
        speciesB: problem.speciesB,
      };
    default:
      return {
        kind: 'join',
        left: problem.a,
        right: problem.b,
        speciesA: problem.speciesA,
        speciesB: problem.speciesB,
      };
  }
}
