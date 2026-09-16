import { renderSprite } from './Sprite.js';

export function renderGroup({ count, species, side }) {
  const el = document.createElement('div');
  el.className = `group group-${side}${count === 0 ? ' is-empty' : ''}`;
  el.dataset.side = side;
  if (count === 0) {
    el.setAttribute('aria-label', 'Nobody waiting');
    const seat = document.createElement('div');
    seat.className = 'cell is-empty-seat';
    el.appendChild(seat);
    return el;
  }
  for (let i = 0; i < count; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.appendChild(renderSprite(species));
    el.appendChild(cell);
  }
  return el;
}
