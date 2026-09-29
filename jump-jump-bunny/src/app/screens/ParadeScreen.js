import { onActivate } from '../input/pointer.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { bunnyMarkup, SCARVES } from '../../ui/Bunny.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

export function renderParadeScreen(root, ctx, params) {
  const mode = params.mode || 'howMany';
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
  const main = document.createElement('div');
  main.className = 'parade-main';
  if (params.sparkle) {
    const stars = document.createElement('div');
    stars.className = 'sparkle-note';
    stars.textContent = '✦ ✦ ✦';
    stars.setAttribute('aria-hidden', 'true');
    main.appendChild(stars);
  }
  const track = document.createElement('div');
  track.className = 'parade-track';
  track.setAttribute('aria-label', 'Bunny parade');
  SCARVES.forEach((scarf) => {
    const bunny = document.createElement('div');
    bunny.className = 'parade-bunny';
    bunny.innerHTML = bunnyMarkup(scarf);
    track.appendChild(bunny);
  });
  const actions = document.createElement('div');
  actions.className = 'answer-bar';
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'parade-again';
  again.setAttribute('aria-label', 'Play again');
  again.innerHTML = bunnyMarkup('#e56b99');
  const againLabel = document.createElement('span');
  againLabel.textContent = 'Again';
  again.appendChild(againLabel);
  onActivate(again, () => {
    ctx.audio.playSfx('hop');
    ctx.go('play', { mode });
  });
  const meadows = document.createElement('button');
  meadows.type = 'button';
  meadows.className = 'parade-map';
  meadows.setAttribute('aria-label', 'Pick a meadow');
  meadows.textContent = '🌷';
  const meadowLabel = document.createElement('span');
  meadowLabel.textContent = 'Meadows';
  meadows.appendChild(meadowLabel);
  onActivate(meadows, () => ctx.go('map'));
  actions.append(again, meadows);
  main.append(track, actions);
  screen.append(chrome, main);
  root.appendChild(screen);
}
