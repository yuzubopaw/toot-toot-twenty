import { frameCellCount, frameCellStart } from '../game/pack.js';
import { renderSprite } from './Sprite.js';

const ROOF = ['a', 'b', 'c', 'd', 'e'];

export function renderFrame({ size, packed, frameId = 1, speciesA, speciesB, onTapAnimal, emptySeats = false }) {
  const frame = document.createElement('div');
  const roof = ROOF[(Math.max(1, frameId) - 1) % ROOF.length];
  frame.className = `frame size-${size} frame-${roof}`;
  frame.setAttribute('role', 'group');
  const cells = frameCellCount(size);
  const start = frameCellStart(frameId, size);

  for (let i = 0; i < cells; i++) {
    const cellIndex = start + i;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.cell = String(cellIndex);
    const animal = packed.find((p) => p.cell === cellIndex);
    if (animal) {
      const species = animal.species === 'A' ? speciesA : speciesB;
      const sprite = renderSprite(species);
      sprite.dataset.countIndex = String(cellIndex + 1);
      cell.appendChild(sprite);
      if (animal.leaving) cell.classList.add('is-leaving');
      cell.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        onTapAnimal?.(cellIndex + 1, species);
      });
    } else if (emptySeats) {
      cell.classList.add('is-empty-seat');
    }
    frame.appendChild(cell);
  }
  return frame;
}

export function pulseCell(root, cellIndex) {
  const cell = root.querySelector(`[data-cell="${cellIndex}"]`);
  if (!cell) return;
  cell.classList.add('is-pulse');
  window.setTimeout(() => cell.classList.remove('is-pulse'), 280);
}
