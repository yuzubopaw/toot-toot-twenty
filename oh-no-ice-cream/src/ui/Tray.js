import { onActivate } from '../app/input/pointer.js';
import { ghostSvg, scoopSvg, splatSvg } from './Scoop.js';

function cellCount(start) {
  return start > 10 ? 20 : 10;
}

export function renderTray(host, options) {
  const {
    start,
    fallen,
    flavour,
    topFlavour = null,
    ghosts = false,
    wobble = false,
    splatIndex = -1,
    cue = 0,
    cueGhosts = false,
    onTray,
    onGhost,
  } = options;
  const remaining = Math.max(0, start - fallen);
  const trays = start > 10 ? 2 : 1;
  host.replaceChildren();
  host.className = `trays trays-${trays}`;
  let cued = 0;
  for (let tray = 0; tray < trays; tray += 1) {
    const board = document.createElement('div');
    board.className = 'tray';
    const offset = tray * 10;
    for (let slot = 0; slot < 10; slot += 1) {
      const index = offset + slot;
      if (index >= cellCount(start)) break;
      const cell = document.createElement('div');
      cell.className = 'cell';
      const occupied = index < remaining;
      const wasFull = index < start;
      const flavourHere = topFlavour && index < 10 ? topFlavour : flavour;
      if (occupied) {
        cell.classList.add('is-full');
        const face = wobble && index === remaining - 1 ? 'oh' : 'happy';
        cell.innerHTML = scoopSvg(flavourHere, { face });
        cell.classList.add('is-here');
        if (wobble && index === remaining - 1) cell.classList.add('is-wobble');
        if (!cueGhosts && cued < cue) {
          cell.classList.add('is-cued');
          cued += 1;
        }
      } else if (ghosts && wasFull) {
        cell.classList.add('is-ghost');
        cell.innerHTML = ghostSvg();
        const ghostOrder = index - remaining;
        if (cueGhosts && ghostOrder < cue) cell.classList.add('is-cued');
        if (onGhost) {
          const hit = document.createElement('button');
          hit.type = 'button';
          hit.className = 'ghost-hit';
          hit.setAttribute('aria-label', 'Count a fallen scoop');
          onActivate(hit, () => onGhost(index));
          cell.appendChild(hit);
        }
      }
      if (index === splatIndex) {
        cell.classList.add('is-splat');
        cell.insertAdjacentHTML('beforeend', splatSvg(flavourHere));
      }
      board.appendChild(cell);
    }
    if (onTray) onActivate(board, () => onTray());
    host.appendChild(board);
  }
  return host;
}
