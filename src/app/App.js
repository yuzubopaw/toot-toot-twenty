import { load, persist } from './storage/save.js';
import { computeLayout, viewportSize } from './layoutMode.js';
import { createAudioManager } from './audio/AudioManager.js';
import { desktopCheatsEnabled } from './input/pointer.js';
import { renderTitleScreen } from './screens/TitleScreen.js';
import { renderMapScreen } from './screens/MapScreen.js';
import { renderSettingsScreen } from './screens/SettingsScreen.js';
import { renderTripScreen } from './screens/TripScreen.js';
import { renderParadeScreen } from './screens/ParadeScreen.js';
import { renderShedScreen } from './screens/ShedScreen.js';

export function boot(appEl) {
  const save = load();
  const stack = [{ name: 'title', params: {} }];
  let cleanup = null;
  const captionEl = document.createElement('div');
  captionEl.className = 'caption';
  captionEl.setAttribute('aria-hidden', 'true');

  const ctx = {
    save,
    audio: null,
    features: null,
    show,
    close,
    render,
    toggleMute,
    reduceMotion,
  };

  ctx.audio = createAudioManager({
    getSettings: () => save.settings,
    getReduceMotion: reduceMotion,
    captionEl,
  });

  function reduceMotion() {
    if (save.settings.motion === 'on') return true;
    if (save.settings.motion === 'off') return false;
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  function toggleMute() {
    save.settings.muted = !save.settings.muted;
    persist(save);
    ctx.audio.setMuted?.();
    ctx.audio.stopBed?.();
    const top = stack[stack.length - 1];
    if (top.name !== 'trip') render();
  }

  function show(name, params = {}) {
    if (name === 'title') stack.splice(0, stack.length, { name, params });
    else stack.push({ name, params });
    render();
  }

  function close() {
    if (stack.length > 1) stack.pop();
    render();
  }

  function applyLayout() {
    const { width, height } = viewportSize();
    const layout = computeLayout(width, height);
    document.documentElement.dataset.layout = layout;
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
    inner.style.cssText = 'position:relative;width:100%;height:100%;';
    shell.appendChild(inner);

    ctx.audio.stopBed?.();
    if (top.name === 'title') renderTitleScreen(inner, ctx);
    else if (top.name === 'map') renderMapScreen(inner, ctx);
    else if (top.name === 'settings') renderSettingsScreen(inner, ctx);
    else if (top.name === 'trip') cleanup = renderTripScreen(inner, ctx, top.params) || null;
    else if (top.name === 'parade') cleanup = renderParadeScreen(inner, ctx, top.params) || null;
    else if (top.name === 'shed') renderShedScreen(inner, ctx);
  }

  function onViewportChange() {
    applyLayout();
    const top = stack[stack.length - 1];
    if (top.name !== 'trip') render();
  }
  window.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);

  if (desktopCheatsEnabled()) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    });
  }

  render();
  return ctx;
}
