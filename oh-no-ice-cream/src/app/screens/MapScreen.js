import { onActivate } from '../input/pointer.js';
import { MODES, MODE_COPY } from '../../game/modes.js';
import { isUnlocked, recommendedMode } from '../../game/progress.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { HOUSE, sceneryMarkup } from '../../ui/Scenery.js';

const LOCK = `<svg class="padlock" viewBox="0 0 64 64" aria-hidden="true"><rect x="16" y="28" width="32" height="24" rx="4" fill="#8A8A8A" stroke="#3B2418" stroke-width="3"/><path d="M22 28 V20 a10 10 0 0 1 20 0 V28" fill="none" stroke="#3B2418" stroke-width="3"/></svg>`;

function stampsFor(progress, mode) {
  if (mode === 'sampler') return Math.min(3, progress.stars.sampler || 0);
  const band = progress.band[mode];
  if (band === 'B') return 2;
  if (band === 'C' || band === 'D') return 3;
  return 1;
}

const ARTS = {
  plop: `<svg viewBox="0 0 72 56" aria-hidden="true"><path d="M24 34 h24 l-8 18 h-8 z" fill="#E9B872" stroke="#3B2418" stroke-width="3"/><circle cx="36" cy="24" r="12" fill="#F7A1C4" stroke="#3B2418" stroke-width="3"/><circle cx="54" cy="16" r="8" fill="#A8E6CF" stroke="#3B2418" stroke-width="3"/></svg>`,
  dripDrop: `<svg viewBox="0 0 72 56" aria-hidden="true"><path d="M8 40 h56" stroke="#3B2418" stroke-width="3"/><circle cx="16" cy="40" r="5" fill="#E9B872" stroke="#3B2418" stroke-width="2"/><circle cx="32" cy="40" r="5" fill="#E9B872" stroke="#3B2418" stroke-width="2"/><circle cx="48" cy="28" r="6" fill="#FFF8EA" stroke="#3B2418" stroke-width="3"/><path d="M48 14 v8 M44 18 h8" stroke="#3B2418" stroke-width="3" stroke-linecap="round"/></svg>`,
  oops: `<svg viewBox="0 0 72 56" aria-hidden="true"><circle cx="36" cy="28" r="16" fill="none" stroke="#3B2418" stroke-width="3" stroke-dasharray="5 4"/><text x="36" y="34" text-anchor="middle" font-size="18" fill="#3B2418" font-family="Fredoka, sans-serif">?</text></svg>`,
  tenTrick: `<svg viewBox="0 0 72 56" aria-hidden="true"><rect x="8" y="6" width="56" height="18" rx="4" fill="#A8E6CF" stroke="#3B2418" stroke-width="3"/><rect x="8" y="30" width="56" height="18" rx="4" fill="#FFF1C9" stroke="#3B2418" stroke-width="3"/></svg>`,
  sampler: `<svg viewBox="0 0 72 56" aria-hidden="true"><path d="M28 28 h16 l-4 22 h-8 z" fill="#E9B872" stroke="#3B2418" stroke-width="3"/><circle cx="36" cy="24" r="8" fill="#F7A1C4" stroke="#3B2418" stroke-width="3"/><circle cx="28" cy="18" r="7" fill="#A8E6CF" stroke="#3B2418" stroke-width="3"/><circle cx="44" cy="18" r="7" fill="#FFF1C9" stroke="#3B2418" stroke-width="3"/></svg>`,
};

function cardArt(mode) {
  const art = document.createElement('div');
  art.className = 'stand-art';
  art.innerHTML = ARTS[mode];
  return art;
}

export function renderMapScreen(root, ctx, params = {}) {
  root.replaceChildren();
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup();
  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'chrome-btn';
  home.setAttribute('aria-label', 'Home');
  home.innerHTML = HOUSE;
  onActivate(home, () => ctx.go('title'));
  chrome.appendChild(home);
  const title = document.createElement('div');
  title.className = 'hint-line';
  title.textContent = 'Boardwalk';
  chrome.appendChild(title);
  chrome.appendChild(renderMuteButton({
    muted: ctx.save.settings.muted,
    onToggle: () => ctx.toggleMute(),
  }));

  if (document.documentElement.dataset.layout === 'unsupported') {
    const card = document.createElement('div');
    card.className = 'unsupported-card';
    card.textContent = 'Make the window bigger';
    screen.append(chrome, card);
    root.appendChild(screen);
    return;
  }

  const recommended = recommendedMode(ctx.save.progress, ctx.save.settings);
  const grid = document.createElement('div');
  grid.className = 'map-grid';
  for (const mode of MODES) {
    const open = isUnlocked(ctx.save.progress, mode, ctx.save.settings);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-card';
    btn.dataset.mode = mode;
    if (!open) btn.classList.add('is-locked');
    if (open && mode === recommended) btn.classList.add('is-recommended');
    if (params.bounce === mode) btn.classList.add('is-bounce');
    btn.setAttribute('aria-label', open ? MODE_COPY[mode].label : `${MODE_COPY[mode].label} locked`);
    btn.appendChild(cardArt(mode));
    const name = document.createElement('span');
    name.className = 'stand-name';
    name.textContent = MODE_COPY[mode].name;
    btn.appendChild(name);
    const stars = document.createElement('span');
    stars.className = 'stars';
    const filled = open ? stampsFor(ctx.save.progress, mode) : 0;
    for (let i = 0; i < 3; i += 1) {
      const star = document.createElement('span');
      star.className = i < filled ? 'is-on' : '';
      star.textContent = '★';
      stars.appendChild(star);
    }
    btn.appendChild(stars);
    if (!open) btn.insertAdjacentHTML('beforeend', LOCK);
    onActivate(btn, () => {
      if (!open) {
        ctx.audio.playSfx('nudge');
        btn.classList.remove('is-wiggle');
        void btn.offsetWidth;
        btn.classList.add('is-wiggle');
        return;
      }
      ctx.audio.playSfx('hop');
      ctx.go('play', { mode });
    });
    grid.appendChild(btn);
  }
  screen.append(chrome, grid);
  root.appendChild(screen);
}
