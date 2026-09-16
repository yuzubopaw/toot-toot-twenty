export function frameCellCount(frameSize) {
  return frameSize === 5 ? 5 : 10;
}

export function frameCellStart(frameId, frameSize) {
  return (Math.max(1, frameId) - 1) * frameCellCount(frameSize);
}

/**
 * Species A occupies cells 0..a-1; species B occupies a..a+b-1.
 * Frame 1 is 0..size-1; frame 2 continues at `size`.
 */
export function packAnimals(a, b, frameSize = 10) {
  const split = frameCellCount(frameSize);
  const out = [];
  for (let i = 0; i < a; i++) out.push({ species: 'A', cell: i, frame: i < split ? 1 : 2 });
  for (let i = 0; i < b; i++) {
    const cell = a + i;
    out.push({ species: 'B', cell, frame: cell < split ? 1 : 2 });
  }
  return out;
}

/** Make-ten is an animation on top of packing, not a second placement rule. */
export function makeTenFields(a, b) {
  const makeTenSplit = a < 10 && a + b > 10;
  return { makeTenSplit, splitIntoFirst: makeTenSplit ? 10 - a : 0 };
}

/**
 * Counting pack: 1–50 friends in 5- or 10-frames.
 * Full tens are species A; leftover ones are species B. n≤10 is all A.
 */
export function packCount(n, frameSize = 10) {
  const total = Math.max(0, Math.min(50, Math.floor(Number(n)) || 0));
  const split = frameCellCount(frameSize);
  const tensEnd = Math.floor(total / 10) * 10;
  const out = [];
  for (let i = 0; i < total; i += 1) {
    out.push({
      species: tensEnd > 0 && i >= tensEnd ? 'B' : 'A',
      cell: i,
      frame: Math.floor(i / split) + 1,
    });
  }
  return out;
}
