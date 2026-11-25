import { describe, expect, it } from 'vitest';
import { emptyProgress, endVisit, isUnlocked, recommendedMode, recordSolve } from '../src/game/progress.js';

function withRecent(progress, mode, tries) {
  let next = progress;
  for (const value of tries) next = recordSolve(next, mode, value);
  return next;
}

describe('band moves', () => {
  it('moves up after five of the last six were fast, and only at the end of a visit', () => {
    let progress = withRecent(emptyProgress(), 'plop', [1, 1, 1, 1, 2, 1]);
    expect(progress.band.plop).toBe('A');
    const ended = endVisit(progress, 'plop');
    expect(ended.changes.up).toEqual(['plop']);
    expect(ended.progress.band.plop).toBe('B');
    expect(ended.progress.recent.plop).toEqual([]);
    expect(ended.progress.visits.plop).toBe(1);
  });

  it('moves down after two reveals in the last four', () => {
    let progress = emptyProgress();
    progress.band.plop = 'B';
    progress = withRecent(progress, 'plop', [4, 1, 4, 1]);
    const ended = endVisit(progress, 'plop');
    expect(ended.changes.down).toEqual(['plop']);
    expect(ended.progress.band.plop).toBe('A');
  });

  it('stops at the top and bottom of each mode', () => {
    let progress = emptyProgress();
    progress.band.plop = 'D';
    progress.band.dripDrop = 'C';
    progress = withRecent(withRecent(progress, 'plop', [1, 1, 1, 1, 1, 1]), 'dripDrop', [1, 1, 1, 1, 1, 1]);
    expect(endVisit(progress, 'plop').progress.band.plop).toBe('D');
    expect(endVisit(progress, 'dripDrop').progress.band.dripDrop).toBe('C');
    progress.band.oops = 'A';
    progress = withRecent(progress, 'oops', [4, 4, 4, 4]);
    expect(endVisit(progress, 'oops').progress.band.oops).toBe('A');
    expect(endVisit(withRecent(emptyProgress(), 'tenTrick', [1, 1, 1, 1, 1, 1]), 'tenTrick').progress.band.tenTrick).toBe('D');
  });
});

describe('unlocks', () => {
  it('opens Ten Trick when Plop reaches band C, and Sampler after one Ten Trick visit', () => {
    let progress = withRecent(emptyProgress(), 'plop', [1, 1, 1, 1, 1, 1]);
    progress.band.plop = 'B';
    const reached = endVisit(progress, 'plop');
    expect(reached.progress.band.plop).toBe('C');
    expect(reached.progress.unlocked.tenTrick).toBe(true);
    expect(isUnlocked(reached.progress, 'tenTrick', {})).toBe(true);
    expect(isUnlocked(reached.progress, 'sampler', {})).toBe(false);
    const afterTen = endVisit(reached.progress, 'tenTrick');
    expect(afterTen.progress.unlocked.sampler).toBe(true);
    expect(afterTen.changes.unlocked).toContain('sampler');
  });

  it('opens Ten Trick after three Plop visits played at band C', () => {
    let progress = emptyProgress();
    progress.band.plop = 'C';
    progress.unlocked.tenTrick = false;
    for (let i = 0; i < 2; i += 1) {
      progress = endVisit(progress, 'plop').progress;
      progress.unlocked.tenTrick = false;
      progress.band.plop = 'C';
    }
    expect(isUnlocked(progress, 'tenTrick', {})).toBe(true);
    const third = endVisit(progress, 'plop');
    expect(third.progress.bandVisits.plop.C).toBe(3);
  });

  it('unlocks every stand for a grown-up and recommends the least visited open stand', () => {
    const progress = emptyProgress();
    expect(isUnlocked(progress, 'tenTrick', {})).toBe(false);
    expect(isUnlocked(progress, 'tenTrick', { unlockAll: true })).toBe(true);
    expect(isUnlocked(progress, 'sampler', { unlockAll: true })).toBe(true);
    progress.visits.plop = 2;
    progress.visits.dripDrop = 0;
    progress.visits.oops = 1;
    expect(recommendedMode(progress, {})).toBe('dripDrop');
  });
});
