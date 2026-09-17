import { onActivate } from '../app/input/pointer.js';

export function muteButtonView(muted) {
  return {
    label: muted ? 'Unmute sound' : 'Mute sound',
    text: muted ? '🔇' : '🔊',
  };
}

export function applyMuteButtonState(btn, muted) {
  if (!btn) return btn;
  const view = muteButtonView(muted);
  btn.setAttribute('aria-label', view.label);
  btn.textContent = view.text;
  return btn;
}

export function renderMuteButton({ muted, onToggle }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chrome-btn';
  btn.dataset.muteBtn = '1';
  applyMuteButtonState(btn, muted);
  onActivate(btn, () => onToggle?.());
  return btn;
}
