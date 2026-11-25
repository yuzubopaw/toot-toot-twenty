import { bundleParentHref } from '../gate.js';
import { onActivate } from '../input/pointer.js';
import { renderGateButton } from '../../ui/GateButton.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { scoopSvg } from '../../ui/Scoop.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

const BELL = `<svg class="bell" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M32 8 C20 8 14 22 14 32 V40 H50 V32 C50 22 44 8 32 8 Z" fill="#E9B872" stroke="#3B2418" stroke-width="3"/>
  <rect x="22" y="40" width="20" height="6" rx="2" fill="#C98B3C" stroke="#3B2418" stroke-width="3"/>
  <circle cx="32" cy="52" r="4" fill="#3B2418"/>
</svg>`;

export function renderTitleScreen(root, ctx) {
  root.replaceChildren();
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup();

  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  const start = document.createElement('div');
  start.className = 'chrome-end';
  const gate = bundleParentHref(location.pathname);
  if (gate) start.appendChild(renderGateButton(gate));
  chrome.appendChild(start);
  const end = document.createElement('div');
  end.className = 'chrome-end';
  end.appendChild(renderMuteButton({
    muted: ctx.save.settings.muted,
    onToggle: () => ctx.toggleMute(),
  }));
  const gear = document.createElement('button');
  gear.type = 'button';
  gear.className = 'chrome-btn';
  gear.setAttribute('aria-label', 'Settings');
  gear.textContent = '⚙️';
  onActivate(gear, () => ctx.go('settings'));
  end.appendChild(gear);
  chrome.appendChild(end);

  const main = document.createElement('div');
  main.className = 'title-main';
  const h1 = document.createElement('h1');
  h1.className = 'wordmark';
  h1.textContent = 'Oh-No Ice Cream';
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'play-bell';
  play.setAttribute('aria-label', 'Tap to play');
  const scoop = document.createElement('div');
  scoop.className = 'bell-scoop';
  scoop.innerHTML = scoopSvg('strawberry');
  const bell = document.createElement('div');
  bell.innerHTML = BELL;
  play.append(scoop, bell);
  const label = document.createElement('span');
  label.className = 'play-label';
  label.textContent = 'Tap to play';
  play.appendChild(label);
  onActivate(play, () => {
    ctx.audio.unlock();
    ctx.audio.playSfx('hop');
    ctx.go('map');
  });
  main.append(h1, play);
  screen.append(chrome, main);
  root.appendChild(screen);
}
