import { BAND_LADDER, MODES, RECENT_CAP } from './modes.js';

export function emptyProgress() {
  return {
    band: { plop: 'A', dripDrop: 'A', oops: 'A', tenTrick: 'D' },
    recent: { plop: [], dripDrop: [], oops: [], tenTrick: [] },
    visits: { plop: 0, dripDrop: 0, oops: 0, tenTrick: 0, sampler: 0 },
    bandVisits: { plop: { C: 0 } },
    stars: { plop: 0, dripDrop: 0, oops: 0, tenTrick: 0, sampler: 0 },
    unlocked: { tenTrick: false, sampler: false },
  };
}

export function recordSolve(progress, mode, tries) {
  if (!Object.prototype.hasOwnProperty.call(progress.recent, mode)) return progress;
  const recent = [...(progress.recent[mode] || []), tries].slice(-RECENT_CAP);
  return { ...progress, recent: { ...progress.recent, [mode]: recent } };
}

function moveUp(recent) {
  const last = (recent || []).slice(-6);
  return last.length >= 6 && last.filter((n) => n <= 2).length >= 5;
}

function moveDown(recent) {
  const last = (recent || []).slice(-4);
  return last.length >= 4 && last.filter((n) => n >= 4).length >= 2;
}

export function endVisit(progress, mode) {
  const visits = { ...progress.visits, [mode]: (progress.visits[mode] || 0) + 1 };
  const band = { ...progress.band };
  const recent = {
    plop: [...progress.recent.plop],
    dripDrop: [...progress.recent.dripDrop],
    oops: [...progress.recent.oops],
    tenTrick: [...progress.recent.tenTrick],
  };
  const stars = { ...progress.stars, [mode]: Math.min(3, (progress.stars[mode] || 0) + 1) };
  const unlocked = { ...progress.unlocked };
  const bandVisits = { plop: { C: progress.bandVisits?.plop?.C || 0 } };
  const changes = { up: [], down: [], unlocked: [] };
  const playedPlopBand = band.plop;
  const checking = mode === 'sampler' ? ['plop', 'dripDrop', 'oops', 'tenTrick'] : [mode];

  for (const name of checking) {
    const ladder = BAND_LADDER[name];
    if (!ladder || ladder.length < 2) continue;
    let index = ladder.indexOf(band[name]);
    if (index < 0) index = 0;
    if (moveUp(recent[name]) && index < ladder.length - 1) {
      band[name] = ladder[index + 1];
      recent[name] = [];
      changes.up.push(name);
    } else if (moveDown(recent[name]) && index > 0) {
      band[name] = ladder[index - 1];
      recent[name] = [];
      changes.down.push(name);
    }
  }

  if (mode === 'plop' && playedPlopBand === 'C') bandVisits.plop.C += 1;

  if ((band.plop === 'C' || band.plop === 'D' || bandVisits.plop.C >= 3) && !unlocked.tenTrick) {
    unlocked.tenTrick = true;
    changes.unlocked.push('tenTrick');
  }
  if (visits.tenTrick >= 1 && !unlocked.sampler) {
    unlocked.sampler = true;
    changes.unlocked.push('sampler');
  }

  return {
    progress: { ...progress, visits, band, recent, stars, unlocked, bandVisits },
    changes,
  };
}

export function isUnlocked(progress, mode, settings) {
  if (settings?.unlockAll) return true;
  if (mode === 'plop' || mode === 'dripDrop' || mode === 'oops') return true;
  if (mode === 'tenTrick') {
    return Boolean(progress.unlocked?.tenTrick)
      || progress.band?.plop === 'C'
      || progress.band?.plop === 'D'
      || (progress.bandVisits?.plop?.C || 0) >= 3;
  }
  if (mode === 'sampler') {
    return Boolean(progress.unlocked?.sampler) || (progress.visits?.tenTrick || 0) >= 1;
  }
  return false;
}

export function recommendedMode(progress, settings) {
  const open = MODES.filter((mode) => isUnlocked(progress, mode, settings));
  open.sort((a, b) => (progress.visits[a] || 0) - (progress.visits[b] || 0));
  return open[0] || 'plop';
}
