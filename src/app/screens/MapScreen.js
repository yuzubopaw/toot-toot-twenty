import { renderMuteButton } from '../../ui/MuteButton.js';
import { renderHomeButton } from '../../ui/HomeButton.js';
import { onActivate } from '../input/pointer.js';
import { renderJourney } from '../../ui/Journey.js';
import { sceneryMarkup } from '../../ui/Scenery.js';
import { MODE_STATIONS } from '../../game/ops/contract.js';

const ADD_LINE = [
  { id: 1, name: 'Garden Siding', emoji: '🌷' },
  { id: 2, name: 'Meadow Track', emoji: '🌼' },
  { id: 3, name: 'River Bridge', emoji: '🌉' },
  { id: 4, name: 'Ten Town', emoji: '🔟' },
  { id: 5, name: 'Summit Line', emoji: '⛰️' },
  { id: 6, name: 'Sunny Express', emoji: '☀️' },
];

/** Garden Siding, Tally Track, Date Depot — open on a fresh save, first on the map. */
export const STARTER_ROUTE_IDS = [1, 12, 13];

const STARTER_SET = new Set(STARTER_ROUTE_IDS);

export const STATIONS = [
  ADD_LINE[0],
  MODE_STATIONS.find((s) => s.id === 12),
  MODE_STATIONS.find((s) => s.id === 13),
  ...ADD_LINE.slice(1),
  ...MODE_STATIONS.filter((s) => !STARTER_SET.has(s.id)),
];

export function stationLocked(st, mastery) {
  if (mastery.adultUnlockedAll) return false;
  if (STARTER_SET.has(st.id)) return false;
  const highest = mastery.highestRouteUnlocked || 1;
  return st.id > highest;
}

function renderStation(st, mastery, recommended, onPick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  const locked = stationLocked(st, mastery);
  btn.className = `station${locked ? ' is-locked' : ''}${st.id === recommended ? ' is-recommended' : ''}`;
  btn.innerHTML = `<span style="font-size:36px">${locked ? '🔒' : st.emoji}</span><span>${st.name}</span>`;
  btn.disabled = locked;
  btn.setAttribute('aria-label', locked ? `${st.name} locked` : st.name);
  if (!locked) onActivate(btn, () => onPick(st));
  return btn;
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
  const end = document.createElement('div');
  end.className = 'chrome-end';
  end.appendChild(
    renderHomeButton({
      onGoHome: () => ctx.show('title'),
    }),
  );
  const gear = document.createElement('button');
  gear.className = 'chrome-btn';
  gear.setAttribute('aria-label', 'Settings');
  gear.textContent = '⚙️';
  onActivate(gear, () => ctx.show('settings', { from: 'map' }));
  end.appendChild(gear);
  chrome.appendChild(end);

  const highest = ctx.save.mastery.highestRouteUnlocked || 1;
  const recommended = highest;
  const grid = document.createElement('div');
  grid.className = 'map-grid';
  const pick = (st) => {
    ctx.audio.playSfx('whoosh-enter');
    ctx.show('trip', { routeId: st.id });
  };
  const starters = document.createElement('div');
  starters.className = 'map-starters';
  for (const st of STATIONS.slice(0, 3)) {
    starters.appendChild(renderStation(st, ctx.save.mastery, recommended, pick));
  }
  grid.appendChild(starters);
  for (const st of STATIONS.slice(3)) {
    grid.appendChild(renderStation(st, ctx.save.mastery, recommended, pick));
  }

  screen.append(chrome, grid, renderJourney({ progress: 0 }));
  root.appendChild(screen);
}
