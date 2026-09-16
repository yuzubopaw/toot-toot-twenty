import { persist, resetAll, unlockAllRoutes } from '../storage/save.js';
import { onActivate } from '../input/pointer.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

export function renderSettingsScreen(root, ctx) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup({ flowers: false });

  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  const spacer = document.createElement('div');
  chrome.appendChild(spacer);
  const close = document.createElement('button');
  close.className = 'chrome-btn';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '✓';
  onActivate(close, () => ctx.close());
  chrome.appendChild(close);

  const list = document.createElement('div');
  list.className = 'settings-list';

  function row(label, value, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle-row';
    btn.innerHTML = `<span>${label}</span><span>${value}</span>`;
    onActivate(btn, onClick);
    return btn;
  }

  const s = ctx.save.settings;
  list.appendChild(
    row(s.muted ? 'Sound off' : 'Sound on', s.muted ? '🔇' : '🔊', () => ctx.toggleMute()),
  );
  list.appendChild(
    row(s.voice ? 'Numbers speak' : 'Numbers quiet', s.voice ? '🗣️' : '🤫', () => {
      s.voice = !s.voice;
      persist(ctx.save);
      ctx.render();
    }),
  );
  const motionLabel = s.motion === 'auto' ? 'Motion: auto' : s.motion === 'on' ? 'Motion: calm' : 'Motion: full';
  list.appendChild(
    row(motionLabel, '🎬', () => {
      s.motion = s.motion === 'auto' ? 'on' : s.motion === 'on' ? 'off' : 'auto';
      persist(ctx.save);
      ctx.render();
    }),
  );

  const sun = document.createElement('button');
  sun.type = 'button';
  sun.className = 'sun-hold';
  sun.setAttribute('aria-label', 'Adult options');
  sun.innerHTML = `<span class="ring"></span>`;
  let holdTimer = null;
  sun.addEventListener('pointerdown', () => {
    sun.classList.add('is-holding');
    holdTimer = window.setTimeout(() => {
      sun.classList.remove('is-holding');
      showAdult();
    }, 3000);
  });
  const cancel = () => {
    sun.classList.remove('is-holding');
    if (holdTimer) window.clearTimeout(holdTimer);
  };
  sun.addEventListener('pointerup', cancel);
  sun.addEventListener('pointercancel', cancel);
  sun.addEventListener('pointerleave', cancel);
  list.appendChild(sun);

  function showAdult() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="card">
      <div>Grown-ups</div>
    </div>`;
    const card = overlay.querySelector('.card');
    const unlock = document.createElement('button');
    unlock.className = 'big-btn';
    unlock.textContent = '🔓 Unlock all stations';
    onActivate(unlock, () => {
      unlockAllRoutes(ctx.save);
      persist(ctx.save);
      overlay.remove();
    });
    const reset = document.createElement('button');
    reset.className = 'big-btn amber';
    reset.textContent = '🧹 Reset station';
    onActivate(reset, () => {
      resetAll(ctx.save, true);
      persist(ctx.save);
      overlay.remove();
      ctx.render();
    });
    const back = document.createElement('button');
    back.className = 'big-btn green';
    back.textContent = 'Keep playing';
    onActivate(back, () => overlay.remove());
    card.append(unlock, reset, back);
    screen.appendChild(overlay);
  }

  screen.append(chrome, list);
  root.appendChild(screen);
}
