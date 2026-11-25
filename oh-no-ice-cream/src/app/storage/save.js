import { emptyProgress } from '../../game/progress.js';

export const SAVE_KEY = 'ohNoIceCream.v1';

const BANDS = {
  plop: ['A', 'B', 'C', 'D'],
  dripDrop: ['A', 'B', 'C'],
  oops: ['A', 'B', 'C'],
  tenTrick: ['D'],
};
const MOTIONS = new Set(['auto', 'reduce', 'full']);

export function defaultState() {
  return {
    v: 1,
    settings: { muted: false, voice: true, motion: 'auto', unlockAll: false },
    progress: emptyProgress(),
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
    const probe = '__oic_probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

function countList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((n) => Number.isFinite(n)).slice(-8);
}

function count(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function starCount(value) {
  return Math.max(0, Math.min(3, Math.round(count(value, 0))));
}

export function load(storage = defaultStorage()) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return defaultState();
    const base = defaultState();
    const incoming = parsed.progress || {};
    const band = { ...base.progress.band };
    for (const mode of Object.keys(BANDS)) {
      const value = incoming.band?.[mode];
      band[mode] = BANDS[mode].includes(value) ? value : base.progress.band[mode];
    }
    const recent = {};
    for (const mode of Object.keys(base.progress.recent)) recent[mode] = countList(incoming.recent?.[mode]);
    const visits = {};
    for (const mode of Object.keys(base.progress.visits)) visits[mode] = count(incoming.visits?.[mode]);
    const stars = {};
    for (const mode of Object.keys(base.progress.stars)) stars[mode] = starCount(incoming.stars?.[mode]);
    const motion = MOTIONS.has(parsed.settings?.motion) ? parsed.settings.motion : 'auto';
    return {
      v: 1,
      settings: {
        muted: Boolean(parsed.settings?.muted),
        voice: parsed.settings?.voice !== false,
        motion,
        unlockAll: Boolean(parsed.settings?.unlockAll),
      },
      progress: {
        band,
        recent,
        visits,
        bandVisits: { plop: { C: count(incoming.bandVisits?.plop?.C) } },
        stars,
        unlocked: {
          tenTrick: Boolean(incoming.unlocked?.tenTrick),
          sampler: Boolean(incoming.unlocked?.sampler),
        },
      },
      meta: { updatedAt: count(parsed.meta?.updatedAt) },
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

export function resetProgress(state) {
  const fresh = defaultState();
  state.progress = fresh.progress;
  state.settings.unlockAll = false;
  return state;
}
