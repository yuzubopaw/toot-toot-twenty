import { applyFactOutcome, maybeUnlock, pushRecentByRoute, pushRecentKey } from '../../game/mastery.js';
import { awardCollectible } from '../../game/collectibles.js';
import { MAX_ROUTE_ID } from '../../game/ops/contract.js';

export const SAVE_KEY = 'tootTootTwenty.v1';

export function defaultState() {
  return {
    v: 1,
    settings: { muted: false, voice: true, motion: 'auto' },
    mastery: {
      highestRouteUnlocked: 1,
      adultUnlockedAll: false,
      tripsCompleted: 0,
      tripsByRoute: {},
      recentByRoute: {},
      facts: {},
      recentKeys: [],
    },
    collection: { unlockedIds: [], nextIndex: 0 },
    meta: { updatedAt: 0 },
  };
}

function memoryStorage() {
  const mem = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
  };
}

export function defaultStorage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return memoryStorage();
    const probe = '__ttt_probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

export function load(storage = defaultStorage()) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return defaultState();
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      mastery: { ...base.mastery, ...(parsed.mastery || {}) },
      collection: { ...base.collection, ...(parsed.collection || {}) },
      meta: { ...base.meta, ...(parsed.meta || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function persist(state, storage = defaultStorage()) {
  try {
    state.meta.updatedAt = Date.now();
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetAll(state, keepMuted = true) {
  const muted = keepMuted ? state.settings.muted : false;
  const next = defaultState();
  next.settings.muted = muted;
  next.settings.voice = state.settings.voice;
  next.settings.motion = state.settings.motion;
  Object.assign(state, next);
  return state;
}

export function unlockAllRoutes(state) {
  state.mastery.adultUnlockedAll = true;
  state.mastery.highestRouteUnlocked = MAX_ROUTE_ID;
  return state;
}

export function recordCorrect(state, { routeId, factKey, triesUntilCorrect, wrongEvents, now, tripFinished }) {
  const prev = state.mastery.facts[factKey];
  state.mastery.facts[factKey] = applyFactOutcome(prev, triesUntilCorrect, wrongEvents, now);
  pushRecentByRoute(state, routeId, triesUntilCorrect);
  pushRecentKey(state, factKey);
  if (tripFinished) {
    state.mastery.tripsCompleted += 1;
    const k = String(routeId);
    state.mastery.tripsByRoute[k] = (state.mastery.tripsByRoute[k] || 0) + 1;
    maybeUnlock(state);
    awardCollectible(state.collection);
  }
  persist(state);
  return state;
}
