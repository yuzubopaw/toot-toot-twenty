import { onActivate } from '../app/input/pointer.js';

export function renderCoupleLever({ onCouple, pulse }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `lever${pulse ? ' is-pulse' : ''}`;
  btn.setAttribute('aria-label', 'Couple trains');
  btn.innerHTML = `
    <span class="lever-switch" aria-hidden="true">
      <span class="lever-well"></span>
      <span class="handle">
        <span class="lever-knob"></span>
      </span>
    </span>
    <span class="lever-cars" aria-hidden="true">
      <span class="lever-car lever-car-a"></span>
      <span class="lever-hitch-dot"></span>
      <span class="lever-car lever-car-b"></span>
    </span>
  `;
  onActivate(btn, () => {
    if (btn.classList.contains('is-down')) return;
    btn.classList.add('is-down');
    btn.classList.remove('is-pulse');
    onCouple?.();
  });
  return btn;
}

export function wiggleLever(btn) {
  if (!btn) return;
  btn.classList.remove('is-wiggle');
  void btn.offsetWidth;
  btn.classList.add('is-wiggle');
  window.setTimeout(() => btn.classList.remove('is-wiggle'), 400);
}
