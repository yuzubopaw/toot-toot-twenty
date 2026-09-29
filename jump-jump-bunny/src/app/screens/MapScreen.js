import { bundleParentHref } from '../gate.js';
import { onActivate } from '../input/pointer.js';
import { MODES, MODE_COPY, recommendedMode } from '../../game/session.js';
import { renderGateButton } from '../../ui/GateButton.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { bunnyMarkup, SCARVES } from '../../ui/Bunny.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

const HOUSE = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 30 L32 12 L56 30" fill="#E56B99" stroke="#3A2030" stroke-width="3.5" stroke-linejoin="round"/><rect x="16" y="30" width="32" height="24" rx="4" fill="#FFF7FB" stroke="#3A2030" stroke-width="3.5"/><rect x="27" y="38" width="10" height="16" rx="2" fill="#F7A8C9" stroke="#3A2030" stroke-width="3"/></svg>`;

function homeButton(onGoHome) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chrome-btn';
  btn.setAttribute('aria-label', 'Home');
  btn.innerHTML = HOUSE;
  onActivate(btn, () => onGoHome());
  return btn;
}

function cardArt(mode) {
  const wrap = document.createElement('div');
  if (mode === 'howMany') {
    wrap.className = 'mini-row';
    SCARVES.slice(0, 3).forEach((scarf) => {
      wrap.insertAdjacentHTML('beforeend', bunnyMarkup(scarf));
    });
    return wrap;
  }
  if (mode === 'countOut') {
    wrap.className = 'mini-row';
    const num = document.createElement('span');
    num.className = 'stone-pip';
    num.textContent = '4';
    wrap.appendChild(num);
    wrap.insertAdjacentHTML('beforeend', bunnyMarkup(SCARVES[1]));
    return wrap;
  }
  wrap.className = 'stone-row';
  for (const n of [1, 2, 3]) {
    const pip = document.createElement('span');
    pip.className = 'stone-pip';
    pip.textContent = String(n);
    wrap.appendChild(pip);
  }
  const empty = document.createElement('span');
  empty.className = 'stone-pip is-empty';
  wrap.appendChild(empty);
  return wrap;
}

export function renderMapScreen(root, ctx) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup();
  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  chrome.appendChild(
    renderMuteButton({
      muted: ctx.save.settings.muted,
      onToggle: () => ctx.toggleMute(),
    }),
  );
  const title = document.createElement('div');
  title.className = 'hint-line';
  title.textContent = 'Pick a meadow';
  chrome.appendChild(title);
  const end = document.createElement('div');
  end.className = 'chrome-end';
  const gate = bundleParentHref(location.pathname);
  if (gate) end.appendChild(renderGateButton(gate));
  end.appendChild(homeButton(() => ctx.go('title')));
  const gear = document.createElement('button');
  gear.type = 'button';
  gear.className = 'chrome-btn';
  gear.setAttribute('aria-label', 'Settings');
  gear.textContent = '⚙️';
  onActivate(gear, () => ctx.go('settings'));
  end.appendChild(gear);
  chrome.appendChild(end);

  const recommended = recommendedMode(ctx.save.progress);
  const grid = document.createElement('div');
  grid.className = 'map-grid';
  if (document.documentElement.dataset.layout === 'unsupported') {
    const card = document.createElement('div');
    card.className = 'unsupported-card';
    card.textContent = 'Make the window bigger';
    screen.append(chrome, card);
    root.appendChild(screen);
    return;
  }
  for (const mode of MODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `map-card${mode === recommended ? ' is-recommended' : ''}`;
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', MODE_COPY[mode].label);
    btn.appendChild(cardArt(mode));
    const name = document.createElement('span');
    name.textContent = MODE_COPY[mode].name;
    btn.appendChild(name);
    onActivate(btn, () => {
      ctx.audio.playSfx('hop');
      ctx.go('play', { mode });
    });
    grid.appendChild(btn);
  }
  screen.append(chrome, grid);
  root.appendChild(screen);
}
