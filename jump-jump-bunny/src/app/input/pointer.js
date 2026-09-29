const SAME_EL_MS = 400;
const GHOST_CLICK_MS = 400;
let swallowClicksUntil = 0;

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

export function onHold(el, ms, onFire) {
  let timer = 0;
  const down = (event) => {
    if (event.button != null && event.button !== 0) return;
    el.classList.add('is-holding');
    timer = setTimeout(() => {
      el.classList.remove('is-holding');
      onFire();
    }, ms);
  };
  const up = () => {
    clearTimeout(timer);
    el.classList.remove('is-holding');
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
  return () => {
    clearTimeout(timer);
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointerleave', up);
    el.removeEventListener('pointercancel', up);
  };
}
