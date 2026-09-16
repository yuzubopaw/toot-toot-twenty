import { renderMuteButton } from '../../ui/MuteButton.js';
import { onActivate } from '../input/pointer.js';
import { renderJourney } from '../../ui/Journey.js';
import { sceneryMarkup } from '../../ui/Scenery.js';
import { MODE_STATIONS } from '../../game/ops/contract.js';

const STATIONS = [
  { id: 1, name: 'Garden Siding', emoji: '🌷' },
  { id: 2, name: 'Meadow Track', emoji: '🌼' },
  { id: 3, name: 'River Bridge', emoji: '🌉' },
  { id: 4, name: 'Ten Town', emoji: '🔟' },
  { id: 5, name: 'Summit Line', emoji: '⛰️' },
  { id: 6, name: 'Sunny Express', emoji: '☀️' },
  ...MODE_STATIONS,
];

function stationLocked(st, mastery) {
  if (mastery.adultUnlockedAll) return false;
  const highest = mastery.highestRouteUnlocked || 1;
  return st.id > highest;
}

export function renderMapScreen(root, ctx) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup({ sun: false });

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
  title.textContent = 'Pick a station';
  chrome.appendChild(title);
  const gear = document.createElement('button');
  gear.className = 'chrome-btn';
  gear.setAttribute('aria-label', 'Settings');
  gear.textContent = '⚙️';
  onActivate(gear, () => ctx.show('settings', { from: 'map' }));
  chrome.appendChild(gear);

  const highest = ctx.save.mastery.highestRouteUnlocked || 1;
  const recommended = highest;
  const grid = document.createElement('div');
  grid.className = 'map-grid';
  for (const st of STATIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const locked = stationLocked(st, ctx.save.mastery);
    btn.className = `station${locked ? ' is-locked' : ''}${st.id === recommended ? ' is-recommended' : ''}`;
    btn.innerHTML = `<span style="font-size:36px">${locked ? '🔒' : st.emoji}</span><span>${st.name}</span>`;
    btn.disabled = locked;
    btn.setAttribute('aria-label', locked ? `${st.name} locked` : st.name);
    if (!locked) {
      onActivate(btn, () => {
        ctx.audio.playSfx('whoosh-enter');
        ctx.show('trip', { routeId: st.id });
      });
    }
    grid.appendChild(btn);
  }

  screen.append(chrome, grid, renderJourney({ progress: 0 }));
  root.appendChild(screen);
}
