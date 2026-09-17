import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(new URL('../src/styles/layout.css', import.meta.url), 'utf8');
const components = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');

describe('stacking and phone overflow CSS', () => {
  it('keeps overlays and celebrate above chrome inside an isolated .screen', () => {
    expect(layout).toMatch(/\.screen\s*>\s*\.overlay[\s\S]{0,80}z-index:\s*40/);
    expect(layout).toMatch(/\.screen\s*>\s*\.celebrate-layer[\s\S]{0,80}z-index:\s*40/);
    const overlayRule = layout.slice(layout.search(/\.screen\s*>\s*\.overlay/));
    const chromeRule = layout.slice(0, layout.search(/\.screen\s*>\s*\.overlay/));
    expect(chromeRule).toMatch(/\.screen\s*>\s*\.chrome[\s\S]{0,80}z-index:\s*20/);
    expect(overlayRule.length).toBeGreaterThan(20);
  });

  it('lets a 13-station map scroll on stacked phones', () => {
    expect(components).toMatch(/\[data-layout="stacked"\]\s*\.map-grid\s*\{[^}]*flex:\s*1 1 0%/);
    expect(components).toMatch(/\[data-layout="stacked"\]\s*\.map-grid\s*\{[^}]*min-height:\s*0/);
    expect(components).toMatch(/\[data-layout="stacked"\]\s*\.map-grid\s*\{[^}]*overflow-y:\s*auto/);
  });

  it('packs 4–5 count ten-frames on stacked phones', () => {
    expect(layout).toMatch(/\.frame-row\.is-count/);
    expect(layout).toMatch(/count-frames-5/);
    expect(components).toMatch(/count-frames-5 \.cell/);
  });
});
