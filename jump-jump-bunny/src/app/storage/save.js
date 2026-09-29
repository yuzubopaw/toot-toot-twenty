export const SAVE_KEY = 'jumpJumpBunny.v1';

export function defaultState() {
  return {
    v: 1,
    settings: { muted: false, voice: true, motion: 'auto' },
    progress: {
      visits: { howMany: 0, countOut: 0, next: 0 },
      recent: { howMany: [], countOut: [], next: [] },
    },
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
    const probe = '__jjb_probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

function asCountList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((n) => Number.isFinite(n)).slice(-8);
}

export function load(storage = defaultStorage()) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return defaultState();
    const base = defaultState();
    const recent = parsed.progress?.recent || {};
    return {
      ...base,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      progress: {
        visits: { ...base.progress.visits, ...(parsed.progress?.visits || {}) },
        recent: {
          howMany: asCountList(recent.howMany),
          countOut: asCountList(recent.countOut),
          next: asCountList(recent.next),
        },
      },
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

export function resetProgress(state) {
  const fresh = defaultState();
  state.progress = fresh.progress;
  return state;
}
