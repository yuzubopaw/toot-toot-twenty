export function pointFrom(event) {
  return { x: event.clientX, y: event.clientY };
}

export function isTap(start, end, max = 24) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.hypot(dx, dy) < max;
}

const SAME_EL_MS = 400;
const GHOST_CLICK_MS = 400;
let swallowClicksUntil = 0;

/** Test helper: clear the global ghost-click gate. */
export function resetActivateGate() {
  swallowClicksUntil = 0;
}

/** Fire once for pointerup or click so iPad and desktop both work. */
export function onActivate(el, handler) {
  let last = 0;
  const go = (event) => {
    if (event && event.button != null && event.button !== 0) return;
    const now = Date.now();
    if (event && event.type === 'click' && now < swallowClicksUntil) return;
    if (now - last < SAME_EL_MS) return;
    last = now;
    if (event && event.type === 'pointerup') swallowClicksUntil = now + GHOST_CLICK_MS;
    handler(event);
  };
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
}

export function desktopCheatsEnabled() {
  try {
    return (
      matchMedia('(pointer: fine)').matches &&
      (navigator.maxTouchPoints === 0 || navigator.maxTouchPoints == null)
    );
  } catch {
    return false;
  }
}
