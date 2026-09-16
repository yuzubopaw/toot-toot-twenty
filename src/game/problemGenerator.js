import { emptyFact, isWeak, strength } from './mastery.js';
import { makeTenFields } from './pack.js';
import { mulberry32 } from './rng.js';
import { generateModeTrip } from './ops/index.js';

export const SPECIES_PAIRS = [
  ['duck', 'bunny'],
  ['puppy', 'kitten'],
  ['pig', 'chick'],
  ['bear', 'frog'],
  ['fox', 'panda'],
  ['hedgehog', 'owl'],
  ['mouse', 'squirrel'],
  ['penguin', 'sheep'],
  ['cow', 'elephant'],
  ['giraffe', 'raccoon'],
];

const FALLBACK = {
  1: [1, 1],
  2: [4, 4],
  3: [3, 5],
  4: [6, 6],
  5: [8, 8],
  6: [1, 1],
};

export function factKeyOf(a, b) {
  return `${Math.min(a, b)}+${Math.max(a, b)}`;
}

export function routeFilter(routeId) {
  switch (routeId) {
    case 1:
      return (a, b, s) => a >= 1 && b >= 1 && s >= 1 && s <= 5;
    case 2:
      return (a, b, s) => a >= 0 && b >= 0 && !(a === 0 && b === 0) && s >= 6 && s <= 10;
    case 3:
      return (a, b, s) => {
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return a >= 1 && b >= 1 && (min === 1 || min === 2 || min === 3) && max >= 4 && s >= 6 && s <= 12;
      };
    case 4:
      return (a, b, s) => a >= 1 && b >= 1 && s >= 11 && s <= 15;
    case 5:
      return (a, b, s) => a >= 1 && b >= 1 && s >= 16 && s <= 20;
    default:
      return () => false;
  }
}

export function legalPairs(routeId) {
  const pred = routeFilter(routeId);
  const out = [];
  for (let a = 0; a <= 20; a++) {
    for (let b = 0; b <= 20; b++) {
      const s = a + b;
      if (s > 20) continue;
      if (pred(a, b, s)) out.push([a, b]);
    }
  }
  return out;
}

function unionPairs(maxRoute) {
  const seen = new Set();
  const out = [];
  for (let r = 1; r <= maxRoute; r++) {
    for (const pair of legalPairs(r)) {
      const k = `${pair[0]},${pair[1]}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(pair);
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

function nearestFill(need, used, sum) {
  const out = [];
  for (let d = 1; out.length < need && d <= 20; d++) {
    for (const n of [sum - d, sum + d]) {
      if (n >= 0 && n <= 20 && !used.has(n) && n !== sum) {
        used.add(n);
        out.push(n);
        if (out.length >= need) return out;
      }
    }
  }
  return out;
}

export function makeChoices(a, b, count, rng) {
  const sum = a + b;
  const prefer = [sum - 1, sum + 1, Math.max(a, b), a, b];
  if (sum >= 10) prefer.push(sum - 10);
  const used = new Set([sum]);
  const pool = [];
  for (const n of prefer) {
    if (!Number.isInteger(n) || n < 0 || n > 20 || used.has(n)) continue;
    used.add(n);
    pool.push(n);
  }
  if (pool.length < count - 1) pool.push(...nearestFill(count - 1 - pool.length, used, sum));
  const extras = pool.slice(0, Math.max(0, count - 1));
  const choices = [sum, ...extras];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = choices[i];
    choices[i] = choices[j];
    choices[j] = tmp;
  }
  return choices;
}

export function presentationFor(a, b, routeId) {
  const sum = a + b;
  const { makeTenSplit, splitIntoFirst } = makeTenFields(a, b);
  const min = Math.min(a, b);
  let strategy = 'count-all';
  let frameSize = 10;
  let frameCount = 1;
  let requireCombine = false;
  let choiceCount = 4;

  if (routeId === 1) {
    strategy = 'count-all';
    frameSize = 5;
    frameCount = 1;
    requireCombine = true;
    choiceCount = 3;
  } else if (routeId === 2) {
    strategy = min <= 2 ? 'count-on' : 'count-all';
    frameSize = 10;
    frameCount = 1;
    requireCombine = true;
    choiceCount = 3;
  } else if (routeId === 3) {
    strategy = 'count-on';
    frameSize = 10;
    frameCount = sum <= 10 ? 1 : 2;
    requireCombine = false;
    choiceCount = 4;
  } else if (routeId === 4) {
    strategy = makeTenSplit ? 'make-ten' : 'count-on';
    frameSize = 10;
    frameCount = 2;
    requireCombine = false;
    choiceCount = 4;
  } else if (routeId === 5) {
    if (a === b) strategy = 'recall';
    else if (makeTenSplit) strategy = 'make-ten';
    else strategy = 'count-on';
    frameSize = 10;
    frameCount = 2;
    requireCombine = false;
    choiceCount = 4;
  } else {
    strategy = 'count-on';
    frameSize = sum <= 5 ? 5 : 10;
    frameCount = sum <= 10 ? 1 : 2;
    requireCombine = false;
    choiceCount = 4;
  }

  return { strategy, frameSize, frameCount, requireCombine, choiceCount, makeTenSplit, splitIntoFirst };
}

function homeRouteFor(a, b) {
  for (let r = 5; r >= 1; r--) {
    if (routeFilter(r)(a, b, a + b)) return r;
  }
  return 1;
}

function decorate(a, b, routeId, rng, tripIndex, tripsCompleted) {
  const sum = a + b;
  const presentRoute = routeId === 6 ? homeRouteFor(a, b) : routeId;
  const pres = presentationFor(a, b, presentRoute);
  const pair = SPECIES_PAIRS[(tripsCompleted * 6 + tripIndex + routeId) % SPECIES_PAIRS.length];
  const speciesA = a === 0 ? null : pair[0];
  const speciesB = b === 0 ? null : pair[1];
  return {
    op: 'add',
    a,
    b,
    sum,
    answer: sum,
    factKey: factKeyOf(a, b),
    routeId,
    strategy: pres.strategy,
    speciesA,
    speciesB,
    choices: makeChoices(a, b, pres.choiceCount, rng),
    input: 'choices',
    requireCombine: pres.requireCombine,
    frameSize: pres.frameSize,
    frameCount: pres.frameCount,
    makeTenSplit: pres.makeTenSplit,
    splitIntoFirst: pres.splitIntoFirst,
  };
}

function weightOf(a, b, routeId, mastery, recentKeys) {
  const key = factKeyOf(a, b);
  const fact = (mastery.facts && mastery.facts[key]) || emptyFact();
  let w = 1;
  if (routeId === 1) {
    if (Math.min(a, b) === 1) w *= 2.2;
    if (a === b) w *= 1.8;
    if (a + b === 5) w *= 1.9;
  } else {
    w *= 1 + 2 * (1 - strength(fact));
  }
  if (routeId === 2 && a + b === 10 && a >= 1 && b >= 1) w *= 1.7;
  if (routeId === 4 && (a === 10 || b === 10)) w *= 2.6;
  if (recentKeys.includes(key)) w *= 0.15;
  return w;
}

function filterPool(pool, usedThisTrip, zerosUsedThisTrip, honorUsed) {
  return pool.filter(([a, b]) => {
    if (honorUsed && usedThisTrip.includes(factKeyOf(a, b))) return false;
    if (zerosUsedThisTrip >= 1 && (a === 0 || b === 0)) return false;
    return true;
  });
}

function devWarn(...args) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      console.warn(...args);
    }
  } catch {
    /* ignore */
  }
}

export function nextProblem(args) {
  try {
    const routeId = args.routeId;
    const mastery = args.mastery || { facts: {}, highestRouteUnlocked: 1, tripsCompleted: 0 };
    const rng = args.rng || (() => Math.random());
    const recentKeys = args.recentKeys || [];
    const usedThisTrip = args.usedThisTrip || [];
    const zerosUsedThisTrip = args.zerosUsedThisTrip || 0;
    const tripIndex = args.tripIndex || 0;
    const tripsCompleted = mastery.tripsCompleted || 0;

    let pool;
    if (routeId === 6) {
      const frontier = Math.min(mastery.highestRouteUnlocked || 1, 5);
      const union = unionPairs(frontier);
      const unionKeys = new Set(union.map(([a, b]) => factKeyOf(a, b)));
      const weakKeys = Object.entries(mastery.facts || {})
        .filter(([key, fact]) => unionKeys.has(key) && isWeak(fact))
        .map(([key]) => key);
      const useWeak = weakKeys.length > 0 && rng() < 0.3;
      pool = useWeak ? union.filter(([a, b]) => weakKeys.includes(factKeyOf(a, b))) : legalPairs(frontier);
      if (!pool.length) pool = legalPairs(frontier);
    } else {
      pool = legalPairs(routeId);
    }

    let candidates = filterPool(pool, usedThisTrip, zerosUsedThisTrip, true);
    if (!candidates.length) candidates = filterPool(pool, usedThisTrip, zerosUsedThisTrip, false);
    if (!candidates.length) {
      const fb = FALLBACK[routeId] || FALLBACK[1];
      devWarn('nextProblem fallback', routeId);
      return decorate(fb[0], fb[1], routeId, rng, tripIndex, tripsCompleted);
    }

    const weightRoute = routeId === 6 ? Math.min(mastery.highestRouteUnlocked || 1, 5) : routeId;
    const picked = pickWeighted(candidates, ([a, b]) => weightOf(a, b, weightRoute, mastery, recentKeys), rng);
    return decorate(picked[0], picked[1], routeId, rng, tripIndex, tripsCompleted);
  } catch (err) {
    devWarn('nextProblem caught', err);
    const fb = FALLBACK[args && args.routeId] || FALLBACK[1];
    const rng = (args && args.rng) || (() => 0.5);
    return decorate(fb[0], fb[1], (args && args.routeId) || 1, rng, (args && args.tripIndex) || 0, (args && args.mastery && args.mastery.tripsCompleted) || 0);
  }
}

export function generateTrip({ routeId, mastery, seed, recentKeys = [] }) {
  if (routeId >= 7) {
    const modeTrip = generateModeTrip(routeId, {
      mastery,
      seed,
      recentKeys,
      tripsCompleted: (mastery && mastery.tripsCompleted) || 0,
    });
    if (modeTrip && modeTrip.length) return modeTrip;
  }
  const rng = typeof seed === 'function' ? seed : mulberry32(seed == null ? Date.now() : seed);
  const usedThisTrip = [];
  let zerosUsedThisTrip = 0;
  const problems = [];
  const tripsCompleted = (mastery && mastery.tripsCompleted) || 0;

  for (let i = 0; i < 6; i++) {
    const p = nextProblem({
      routeId,
      mastery,
      rng,
      recentKeys,
      usedThisTrip,
      zerosUsedThisTrip,
      tripIndex: i,
    });
    problems.push(p);
    usedThisTrip.push(p.factKey);
    if (p.a === 0 || p.b === 0) zerosUsedThisTrip += 1;
  }

  if (routeId === 1 && !problems.some((p) => p.a + p.b === 5)) {
    const fives = legalPairs(1).filter(([a, b]) => a + b === 5);
    const fresh = fives.filter(([a, b]) => !usedThisTrip.includes(factKeyOf(a, b)));
    const pool = fresh.length ? fresh : fives;
    const picked = pickWeighted(pool, () => 1, rng) || [2, 3];
    problems[5] = decorate(picked[0], picked[1], routeId, rng, 5, tripsCompleted);
  }

  if (routeId === 2 && !problems.some((p) => p.a + p.b === 10 && p.a >= 1 && p.b >= 1)) {
    const makeTens = legalPairs(2).filter(([a, b]) => a + b === 10 && a >= 1 && b >= 1);
    const fresh = makeTens.filter(([a, b]) => !usedThisTrip.includes(factKeyOf(a, b)));
    const pool = fresh.length ? fresh : makeTens;
    const picked = pickWeighted(pool, () => 1, rng) || [5, 5];
    problems[5] = decorate(picked[0], picked[1], routeId, rng, 5, tripsCompleted);
  }

  if (routeId === 4 && !problems.some((p) => p.a === 10 || p.b === 10)) {
    const teens = legalPairs(4).filter(([a, b]) => a === 10 || b === 10);
    const fresh = teens.filter(([a, b]) => !usedThisTrip.includes(factKeyOf(a, b)));
    const pool = fresh.length ? fresh : teens;
    const picked = pickWeighted(pool, () => 1, rng) || [10, 3];
    problems[5] = decorate(picked[0], picked[1], routeId, rng, 5, tripsCompleted);
  }

  return problems;
}
