import { MAX_ROUTE_ID } from './ops/contract.js';

export function emptyFact() {
  return { seen: 0, correctFirst: 0, correctRetry: 0, wrong: 0, streak: 0, lastTs: 0 };
}

export function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

export function strength(fact) {
  const f = fact || emptyFact();
  const seen = Math.max(1, f.seen);
  return clamp01(
    0.45 * (f.correctFirst / seen) +
      0.25 * (f.correctRetry / seen) +
      0.3 * clamp01(f.streak / 4),
  );
}

export function isWeak(fact) {
  const f = fact || emptyFact();
  if (f.seen <= 0) return false;
  return strength(f) < 0.4 || (f.streak === 0 && f.wrong > 0);
}

export function isMastered(fact) {
  const f = fact || emptyFact();
  return f.seen >= 4 && f.streak >= 3 && f.correctFirst / f.seen >= 0.75;
}

export function isUnseen(fact) {
  return !fact || fact.seen === 0;
}

/**
 * Counters update only when the problem completes (correct tap).
 * @param {object} fact
 * @param {1|2|3|4} triesUntilCorrect
 * @param {number} wrongEvents
 * @param {number} now
 */
export function applyFactOutcome(fact, triesUntilCorrect, wrongEvents, now) {
  const next = { ...(fact || emptyFact()) };
  next.seen += 1;
  next.wrong += wrongEvents;
  next.lastTs = now;
  if (triesUntilCorrect === 1) {
    next.correctFirst += 1;
    next.streak += 1;
  } else {
    next.correctRetry += 1;
    next.streak = 0;
  }
  return next;
}

export function unlockMet(save, n) {
  if (n >= 7) {
    if (n === 7) return (save.mastery.tripsCompleted || 0) >= 1;
    return (save.mastery.tripsByRoute[String(n - 1)] || 0) >= 1;
  }
  const trips = save.mastery.tripsByRoute[String(n)] || 0;
  const recent = save.mastery.recentByRoute[String(n)] || [];
  if (trips < 3) return false;
  if (recent.length !== 12) return false;
  const good = recent.filter((e) => e.triesUntilCorrect <= 2).length;
  return good >= 10;
}

export function maybeUnlock(save) {
  if (save.mastery.adultUnlockedAll) {
    save.mastery.highestRouteUnlocked = MAX_ROUTE_ID;
    return save.mastery.highestRouteUnlocked;
  }
  let n = save.mastery.highestRouteUnlocked;
  while (n < MAX_ROUTE_ID && unlockMet(save, n)) n += 1;
  save.mastery.highestRouteUnlocked = n;
  return n;
}

export function pushRecentByRoute(save, routeId, triesUntilCorrect) {
  const key = String(routeId);
  const list = save.mastery.recentByRoute[key] ? [...save.mastery.recentByRoute[key]] : [];
  list.push({ triesUntilCorrect });
  save.mastery.recentByRoute[key] = list.slice(-12);
}

export function pushRecentKey(save, factKey) {
  const keys = save.mastery.recentKeys.filter((k) => k !== factKey);
  keys.push(factKey);
  save.mastery.recentKeys = keys.slice(-8);
}
