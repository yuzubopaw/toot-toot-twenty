import { describe, expect, it } from 'vitest';
import { packAnimals, packCount, makeTenFields, frameCellCount, frameCellStart } from '../src/game/pack.js';

describe('packAnimals', () => {
  const fixtures = [
    [5, 8],
    [8, 5],
    [1, 14],
    [14, 1],
    [16, 4],
    [11, 9],
    [10, 5],
    [3, 2],
  ];

  for (const [a, b] of fixtures) {
    it(`packs ${a}+${b} without overflowing a tray`, () => {
      const packed = packAnimals(a, b);
      expect(packed).toHaveLength(a + b);
      const cells = packed.map((p) => p.cell);
      expect(new Set(cells).size).toBe(a + b);
      expect(Math.max(...cells, -1)).toBeLessThan(a + b);
      expect(packed.filter((p) => p.species === 'A').every((p, i) => p.cell === i)).toBe(true);
      packed.filter((p) => p.species === 'B').forEach((p, i) => {
        expect(p.cell).toBe(a + i);
      });
      for (const p of packed) {
        expect(p.frame).toBe(p.cell < 10 ? 1 : 2);
      }
      const f1 = packed.filter((p) => p.frame === 1).length;
      const f2 = packed.filter((p) => p.frame === 2).length;
      expect(f1).toBeLessThanOrEqual(10);
      expect(f2).toBeLessThanOrEqual(10);
    });
  }
});

describe('frame cell locations', () => {
  it('size-5 frame 2 starts at 5, size-10 frame 2 starts at 10', () => {
    expect(frameCellCount(5)).toBe(5);
    expect(frameCellCount(10)).toBe(10);
    expect(frameCellStart(1, 5)).toBe(0);
    expect(frameCellStart(2, 5)).toBe(5);
    expect(frameCellStart(1, 10)).toBe(0);
    expect(frameCellStart(2, 10)).toBe(10);
  });

  it('packs a 5-seat tray so every animal sits in a rendered cell', () => {
    const packed = packAnimals(3, 2, 5);
    const visible = new Set();
    for (const id of [1]) {
      const start = frameCellStart(id, 5);
      for (let i = 0; i < 5; i++) visible.add(start + i);
    }
    packed.forEach((p) => expect(visible.has(p.cell)).toBe(true));
  });
});

describe('packCount', () => {
  it('packs 1–50 without overflowing a ten-frame', () => {
    for (const n of [1, 5, 7, 10, 11, 20, 23, 30, 41, 50]) {
      const frameSize = n <= 5 ? 5 : 10;
      const packed = packCount(n, frameSize);
      expect(packed).toHaveLength(n);
      const cells = packed.map((p) => p.cell);
      expect(new Set(cells).size).toBe(n);
      expect(Math.max(...cells)).toBe(n - 1);
      const split = frameSize === 5 ? 5 : 10;
      for (const p of packed) {
        expect(p.frame).toBe(Math.floor(p.cell / split) + 1);
      }
      const byFrame = {};
      for (const p of packed) {
        byFrame[p.frame] = (byFrame[p.frame] || 0) + 1;
      }
      Object.values(byFrame).forEach((c) => expect(c).toBeLessThanOrEqual(split));
    }
  });

  it('uses one species within 10 and tens-vs-ones after that', () => {
    expect(packCount(7, 10).every((p) => p.species === 'A')).toBe(true);
    expect(packCount(20, 10).every((p) => p.species === 'A')).toBe(true);
    const packed = packCount(23, 10);
    expect(packed.filter((p) => p.species === 'A')).toHaveLength(20);
    expect(packed.filter((p) => p.species === 'B')).toHaveLength(3);
    expect(packed[19].species).toBe('A');
    expect(packed[20].species).toBe('B');
    expect(Math.max(...packed.map((p) => p.frame))).toBe(3);
  });
});

describe('makeTenFields', () => {
  it('splits only when a < 10 and sum > 10', () => {
    expect(makeTenFields(5, 8)).toEqual({ makeTenSplit: true, splitIntoFirst: 5 });
    expect(makeTenFields(8, 5)).toEqual({ makeTenSplit: true, splitIntoFirst: 2 });
    expect(makeTenFields(1, 14)).toEqual({ makeTenSplit: true, splitIntoFirst: 9 });
    expect(makeTenFields(14, 1)).toEqual({ makeTenSplit: false, splitIntoFirst: 0 });
    expect(makeTenFields(11, 9)).toEqual({ makeTenSplit: false, splitIntoFirst: 0 });
    expect(makeTenFields(10, 5)).toEqual({ makeTenSplit: false, splitIntoFirst: 0 });
    expect(makeTenFields(3, 2)).toEqual({ makeTenSplit: false, splitIntoFirst: 0 });
  });
});
