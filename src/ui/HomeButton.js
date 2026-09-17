import { onActivate } from '../app/input/pointer.js';

const HOUSE = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" pointer-events="none">
  <path d="M6 30 L32 10 L58 30" fill="#E85D4C" stroke="#1A1A1A" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="16" y="28" width="32" height="26" rx="4" fill="#FFF8E7" stroke="#1A1A1A" stroke-width="3.5"/>
  <rect x="26" y="38" width="12" height="16" rx="2" fill="#4A90D9" stroke="#1A1A1A" stroke-width="3"/>
</svg>`;

export function renderHomeButton({ onGoHome, label = 'Home' } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chrome-btn chrome-home';
  btn.setAttribute('aria-label', label);
  btn.innerHTML = HOUSE;
  onActivate(btn, () => onGoHome?.());
  return btn;
}
