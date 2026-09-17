import { persist, resetAll, unlockAllRoutes } from '../storage/save.js';
import { onActivate } from '../input/pointer.js';
import { sceneryMarkup } from '../../ui/Scenery.js';
import { renderHomeButton } from '../../ui/HomeButton.js';

export const HOLD_SUN_MS = 3000;

export function holdSunReady(downAt, upAt, ms = HOLD_SUN_MS) {
  return Boolean(downAt) && upAt - downAt >= ms;
}

export function renderSettingsScreen(root, ctx) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup({ flowers: false });

  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  const spacer = document.createElement('div');
  chrome.appendChild(spacer);
  const end = document.createElement('div');
  end.className = 'chrome-end';
  end.appendChild(
    renderHomeButton({
      onGoHome: () => ctx.show('title'),
    }),
  );
  const close = document.createElement('button');
  close.className = 'chrome-btn';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '✓';
  onActivate(close, () => ctx.close());
  end.appendChild(close);
  chrome.appendChild(end);

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
  let holdTimer = 0;
  let holdPointer = 0;
  let downAt = 0;

  function stopHold() {
    sun.classList.remove('is-holding');
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = 0;
    }
  }

  sun.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    try {
      sun.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom / older Safari */
    }
    holdPointer = e.pointerId;
    downAt = Date.now();
    stopHold();
    sun.classList.add('is-holding');
    holdTimer = window.setTimeout(() => {
      holdTimer = 0;
    }, HOLD_SUN_MS);
  });
  sun.addEventListener('pointerup', () => {
    const ready = holdSunReady(downAt, Date.now());
    downAt = 0;
    stopHold();
    try {
      if (holdPointer) sun.releasePointerCapture(holdPointer);
    } catch {
      /* already released */
    }
    holdPointer = 0;
    if (ready) showAdult();
  });
  sun.addEventListener('pointercancel', () => {
    downAt = 0;
    holdPointer = 0;
    stopHold();
  });
  sun.addEventListener('pointerleave', () => {
    if (holdPointer && typeof sun.hasPointerCapture === 'function' && sun.hasPointerCapture(holdPointer)) {
      return;
    }
    downAt = 0;
    stopHold();
  });
  sun.addEventListener('contextmenu', (e) => e.preventDefault());
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
