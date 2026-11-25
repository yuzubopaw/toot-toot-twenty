export function computeLayout(width, height) {
  if (width < 360) return 'unsupported';
  if (width < 700 || height > width) return 'stacked';
  return 'wide';
}

export function viewportSize(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return { width: 1024, height: 768 };
  const vv = win.visualViewport;
  return {
    width: Math.round(vv?.width ?? win.innerWidth),
    height: Math.round(vv?.height ?? win.innerHeight),
  };
}
