import { describe, expect, it } from 'vitest';
import { computeLayout, FRAME_BAND, STRIP_MIN_WIDTH, useStrip, viewportSize } from '../src/app/layoutMode.js';

describe('computeLayout', () => {
  it('iPad portrait is stacked', () => {
    expect(computeLayout(834, 1112)).toBe('stacked');
  });
  it('landscape full-screen is wide', () => {
    expect(computeLayout(1024, 768)).toBe('wide');
  });
  it('1/3 split is unsupported', () => {
    expect(computeLayout(320, 768)).toBe('unsupported');
  });
});

describe('viewportSize', () => {
  it('prefers visualViewport over innerWidth (page zoom / spoofed desktop width)', () => {
    expect(
      viewportSize({
        innerWidth: 980,
        innerHeight: 1200,
        visualViewport: { width: 390.4, height: 660.2 },
      }),
    ).toEqual({ width: 390, height: 660 });
  });

  it('falls back to innerWidth when visualViewport is missing', () => {
    expect(viewportSize({ innerWidth: 1024, innerHeight: 768 })).toEqual({ width: 1024, height: 768 });
  });
});

describe('useStrip', () => {
  const mastered = {
    facts: {
      '8+8': { seen: 4, correctFirst: 4, correctRetry: 0, wrong: 0, streak: 4, lastTs: 1 },
    },
  };
  const problem = { routeId: 6, factKey: '8+8', frameCount: 2 };
  const features = { route6Strip: true };

  it('false when remaining width is 519', () => {
    expect(
      useStrip(problem, mastered, features, {
        width: 519 + 24,
        height: 800,
        layout: 'wide',
      }),
    ).toBe(false);
    expect(STRIP_MIN_WIDTH).toBe(520);
  });

  it('true on 1024×744 mastered Route 6', () => {
    expect(
      useStrip(problem, mastered, features, {
        width: 1024,
        height: 744,
        layout: 'wide',
      }),
    ).toBe(true);
    expect(FRAME_BAND(2)).toBe(180);
  });
});
