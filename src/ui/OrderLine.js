import { renderSprite } from './Sprite.js';

export function renderOrderLine({ sequence, placed, speciesA, speciesB, celebrating, onTap }) {
  const row = document.createElement('div');
  row.className = `order-line${celebrating ? ' is-done' : ''}`;
  row.setAttribute('role', 'list');
  const filledCount = celebrating ? (sequence || []).length : (placed || []).length;

  (sequence || []).forEach((n, i) => {
    const on = i < filledCount;
    const slot = document.createElement('div');
    slot.className = `order-day${on ? ' is-on' : ' is-empty'}${celebrating ? ' is-cheer' : ''}`;
    slot.setAttribute('role', 'listitem');
    slot.setAttribute('aria-label', on ? String(n) : 'empty day');
    const num = document.createElement('span');
    num.className = 'order-num';
    num.textContent = on ? String(n) : '?';
    slot.appendChild(num);
    if (on) {
      const species = i % 2 === 0 ? speciesA : speciesB;
      if (species) slot.appendChild(renderSprite(species, 'order-critter'));
      slot.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        onTap?.(n);
      });
    }
    row.appendChild(slot);
  });
  return row;
}
