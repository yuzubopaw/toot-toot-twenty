import { createAudioManager } from './audio/AudioManager.js';
import { computeLayout, viewportSize } from './layoutMode.js';
import { renderMapScreen } from './screens/MapScreen.js';
import { renderParadeScreen } from './screens/ParadeScreen.js';
import { renderPlayScreen } from './screens/PlayScreen.js';
import { renderSettingsScreen } from './screens/SettingsScreen.js';
import { renderTitleScreen } from './screens/TitleScreen.js';
import { load, persist } from './storage/save.js';
import { applyMuteButtonState } from '../ui/MuteButton.js';

export function boot(appEl) {
  const save = load();
  let stack = [{ name: 'title', params: {} }];
  let cleanup = null;
  const captionEl = document.createElement('div');
  captionEl.className = 'caption';
  captionEl.setAttribute('aria-live', 'polite');

  const ctx = {
    save,
    audio: null,
    go,
    close,
    toggleMute,
    reduceMotion,
  };

  ctx.audio = createAudioManager({
    getSettings: () => save.settings,
    captionEl,
  });

  function reduceMotion() {
    if (save.settings.motion === 'reduce') return true;
    if (save.settings.motion === 'full') return false;
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  function syncMuteButtons() {
    const muted = Boolean(save.settings.muted);
    appEl.querySelectorAll('[data-mute-btn]').forEach((btn) => applyMuteButtonState(btn, muted));
  }

  function toggleMute() {
    save.settings.muted = !save.settings.muted;
    persist(save);
    const top = stack[stack.length - 1];
    if (top.name === 'play' || top.name === 'parade') syncMuteButtons();
    else render();
  }

  function go(name, params = {}) {
    ctx.audio.unlock();
    if (name === 'settings') stack.push({ name, params });
    else if (name === 'title') stack = [{ name: 'title', params: {} }];
    else if (name === 'map') stack = [{ name: 'title', params: {} }, { name: 'map', params }];
    else if (name === 'play' || name === 'parade') {
      stack = [
        { name: 'title', params: {} },
        { name: 'map', params: {} },
        { name, params },
      ];
    }
    render();
  }

  function close() {
    if (stack.length > 1 && stack[stack.length - 1].name === 'settings') stack.pop();
    render();
  }

  function applyLayout() {
    const { width, height } = viewportSize();
    document.documentElement.dataset.layout = computeLayout(width, height);
    document.documentElement.classList.toggle('reduce-motion', reduceMotion());
  }

  function render() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    applyLayout();
    const top = stack[stack.length - 1];
    const shell = document.createElement('div');
    shell.className = 'shell';
    appEl.innerHTML = '';
    appEl.appendChild(shell);
    shell.appendChild(captionEl);
    const inner = document.createElement('div');
    inner.className = 'screen-root';
    shell.appendChild(inner);
    if (top.name === 'title') renderTitleScreen(inner, ctx);
    else if (top.name === 'map') renderMapScreen(inner, ctx);
    else if (top.name === 'settings') renderSettingsScreen(inner, ctx);
    else if (top.name === 'play') cleanup = renderPlayScreen(inner, ctx, top.params) || null;
    else if (top.name === 'parade') renderParadeScreen(inner, ctx, top.params);
  }

  function onViewportChange() {
    applyLayout();
    const top = stack[stack.length - 1];
    if (top.name !== 'play') render();
  }

  window.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  appEl.addEventListener('pointerdown', () => ctx.audio.unlock());
  render();
  return ctx;
}
