import { isMastered, emptyFact } from '../game/mastery.js';

export const STRIP_COLS = 7;
export const STRIP_ROWS = 3;
export const STRIP_CELL = 64;
export const STRIP_GAP = 12;
export const STRIP_MIN_WIDTH = 7 * 64 + 6 * 12;
export const STRIP_MIN_HEIGHT = 3 * 64 + 2 * 12;
export const CHROME_BAND = 64;
export const FRAME_BAND = (frameCount) => (frameCount === 2 ? 180 : 140);

export function computeLayout(width, height) {
  if (width < 360) return 'unsupported';
  if (width < 700 || height > width) return 'stacked';
  return 'wide';
}

/** Visible CSS pixels. Page zoom / Safari toolbar / desktop-site spoof innerWidth. */
export function viewportSize(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return { width: 1024, height: 768 };
  const vv = win.visualViewport;
  return {
    width: Math.round(vv?.width ?? win.innerWidth),
    height: Math.round(vv?.height ?? win.innerHeight),
  };
}

export function useStrip(problem, mastery, features, box) {
  if (!features.route6Strip) return false;
  if (!problem || problem.routeId !== 6) return false;
  const fact = (mastery.facts && mastery.facts[problem.factKey]) || emptyFact();
  if (!isMastered(fact)) return false;
  if (box.layout === 'unsupported') return false;
  const remainingW = box.width - 24;
  const remainingH = box.height - CHROME_BAND - FRAME_BAND(problem.frameCount);
  return remainingW >= STRIP_MIN_WIDTH && remainingH >= STRIP_MIN_HEIGHT;
}
