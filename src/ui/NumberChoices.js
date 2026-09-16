import { isTap, onActivate, pointFrom } from '../app/input/pointer.js';

export function renderNumberChoices({ choices, strip, disabled, halo, dimmed, used, onChoose, onDisabledTap }) {
  const wrap = document.createElement('div');
  wrap.className = strip ? 'answers strip' : 'answers';
  const nums = strip ? [...Array(21).keys()] : choices;
  for (const n of nums) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    const stacked = document.documentElement.dataset.layout === 'stacked';
    const label =
      n === 'left' ? (stacked ? '▲' : '◀') : n === 'right' ? (stacked ? '▼' : '▶') : n === 'same' ? '=' : String(n);
    btn.textContent = label;
    if (typeof n === 'string') btn.classList.add('is-icon');
    const aria =
      n === 'left'
        ? stacked
          ? 'Top group'
          : 'Left group'
        : n === 'right'
          ? stacked
            ? 'Bottom group'
            : 'Right group'
          : n === 'same'
            ? 'Same number'
            : String(n);
    btn.setAttribute('aria-label', aria);
    btn.dataset.value = String(n);
    const taken = Boolean(used && used.has(n));
    const locked = disabled || taken || (halo != null && n !== halo);
    if (locked) {
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.add('is-locked-choice');
    }
    if (taken) btn.classList.add('is-placed');
    if (halo === n) btn.classList.add('is-halo');
    if (dimmed && dimmed.has(n)) btn.classList.add('is-wrong');
    let start = null;
    btn.addEventListener('pointerdown', (e) => {
      start = pointFrom(e);
    });
    onActivate(btn, (e) => {
      if (start && e && e.clientX != null && !isTap(start, pointFrom(e))) return;
      if (btn.getAttribute('aria-disabled') === 'true') {
        onDisabledTap?.(n);
        return;
      }
      onChoose?.(n, btn);
    });
    wrap.appendChild(btn);
  }
  return wrap;
}
