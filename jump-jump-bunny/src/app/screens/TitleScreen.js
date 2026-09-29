import { bundleParentHref } from '../gate.js';
import { onActivate } from '../input/pointer.js';
import { renderGateButton } from '../../ui/GateButton.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { bunnyMarkup } from '../../ui/Bunny.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

export function renderTitleScreen(root, ctx) {
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
  const end = document.createElement('div');
  end.className = 'chrome-end';
  const gate = bundleParentHref(location.pathname);
  if (gate) end.appendChild(renderGateButton(gate));
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
  h1.textContent = 'Jump-Jump Bunny';
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'play-bunny';
  play.setAttribute('aria-label', 'Tap to play');
  const hero = document.createElement('div');
  hero.className = 'hero-bunny';
  hero.innerHTML = bunnyMarkup('#e56b99');
  const label = document.createElement('span');
  label.className = 'play-label';
  label.textContent = 'Tap to play';
  play.append(hero, label);
  onActivate(play, () => {
    ctx.audio.unlock();
    ctx.audio.playSfx('hop');
    ctx.go('map');
  });
  main.append(h1, play);
  screen.append(chrome, main);
  root.appendChild(screen);
}
