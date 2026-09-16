import { spriteUrl } from './assetUrl.js';

const PALETTES = {
  duck: { body: '#F5C542', accent: '#E85D4C', eye: '#2B2B2B', belly: '#FFF6E5' },
  bunny: { body: '#F4A6C3', accent: '#E85D4C', eye: '#2B2B2B', belly: '#FFF6E5' },
  puppy: { body: '#C9844A', accent: '#8B5A2B', eye: '#2B2B2B', belly: '#F3D5B0' },
  kitten: { body: '#F4A06A', accent: '#E85D4C', eye: '#2B2B2B', belly: '#FFF6E5' },
  pig: { body: '#F4A6C3', accent: '#E85D4C', eye: '#2B2B2B', belly: '#FFD6E8' },
  chick: { body: '#FFE566', accent: '#E67A3A', eye: '#2B2B2B', belly: '#FFF6E5' },
  bear: { body: '#8B5A2B', accent: '#5C3A1A', eye: '#2B2B2B', belly: '#D4A574' },
  frog: { body: '#6FBF73', accent: '#2E8B57', eye: '#2B2B2B', belly: '#C8F0B4' },
  fox: { body: '#E67A3A', accent: '#2B2B2B', eye: '#2B2B2B', belly: '#FFF6E5' },
  panda: { body: '#FFF6E5', accent: '#2B2B2B', eye: '#2B2B2B', belly: '#FFFFFF' },
  hedgehog: { body: '#C9844A', accent: '#5C3A1A', eye: '#2B2B2B', belly: '#F3D5B0' },
  owl: { body: '#8B5A2B', accent: '#F5C542', eye: '#2B2B2B', belly: '#F3D5B0' },
  mouse: { body: '#C5C5C5', accent: '#F4A6C3', eye: '#2B2B2B', belly: '#FFF6E5' },
  squirrel: { body: '#E67A3A', accent: '#8B5A2B', eye: '#2B2B2B', belly: '#FFF6E5' },
  penguin: { body: '#2B2B2B', accent: '#E67A3A', eye: '#2B2B2B', belly: '#FFF6E5' },
  sheep: { body: '#FFF6E5', accent: '#2B2B2B', eye: '#2B2B2B', belly: '#FFFFFF' },
  cow: { body: '#FFF6E5', accent: '#8B5A2B', eye: '#2B2B2B', belly: '#FFFFFF' },
  elephant: { body: '#A7C4D9', accent: '#F4A6C3', eye: '#2B2B2B', belly: '#D7E7F3' },
  giraffe: { body: '#F5C542', accent: '#8B5A2B', eye: '#2B2B2B', belly: '#FFF6E5' },
  raccoon: { body: '#8A8A8A', accent: '#2B2B2B', eye: '#2B2B2B', belly: '#FFF6E5' },
};

const SPRITE_FILES = {
  duck: 'animal-duck.webp',
  bunny: 'animal-bunny.webp',
  puppy: 'animal-puppy.webp',
  kitten: 'animal-kitten.webp',
  pig: 'animal-pig.webp',
  chick: 'animal-chick.webp',
  bear: 'animal-bear.webp',
  frog: 'animal-frog.webp',
  fox: 'animal-fox.webp',
  panda: 'animal-panda.webp',
  hedgehog: 'animal-hedgehog.webp',
  owl: 'animal-owl.webp',
  mouse: 'animal-mouse.webp',
  squirrel: 'animal-squirrel.webp',
  penguin: 'animal-penguin.webp',
  sheep: 'animal-sheep.webp',
  cow: 'animal-cow.webp',
  elephant: 'animal-elephant.webp',
  giraffe: 'animal-giraffe.webp',
  raccoon: 'animal-raccoon.webp',
};

function animalSvg(species) {
  const p = PALETTES[species] || PALETTES.duck;
  const extra =
    species === 'bunny'
      ? `<ellipse cx="22" cy="10" rx="6" ry="14" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/>
         <ellipse cx="42" cy="10" rx="6" ry="14" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/>`
      : species === 'hedgehog'
        ? `<path d="M12 36 L20 18 L32 12 L44 18 L52 36" fill="${p.accent}" stroke="#2B2B2B" stroke-width="3" stroke-linejoin="round"/>`
        : species === 'owl'
          ? `<circle cx="24" cy="28" r="10" fill="${p.belly}" stroke="#2B2B2B" stroke-width="3"/>
             <circle cx="40" cy="28" r="10" fill="${p.belly}" stroke="#2B2B2B" stroke-width="3"/>`
          : '';
  const snout =
    species === 'duck' || species === 'chick'
      ? `<ellipse cx="48" cy="36" rx="10" ry="6" fill="${p.accent}" stroke="#2B2B2B" stroke-width="3"/>`
      : species === 'frog'
        ? `<ellipse cx="22" cy="18" rx="7" ry="6" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/><ellipse cx="42" cy="18" rx="7" ry="6" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/>`
        : species === 'pig'
          ? `<ellipse cx="32" cy="40" rx="8" ry="6" fill="${p.accent}" stroke="#2B2B2B" stroke-width="3"/>`
          : '';
  const patches =
    species === 'panda'
      ? `<ellipse cx="22" cy="30" rx="8" ry="7" fill="${p.accent}"/><ellipse cx="42" cy="30" rx="8" ry="7" fill="${p.accent}"/>`
      : species === 'fox'
        ? `<polygon points="14,22 22,8 28,22" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/>
           <polygon points="36,22 42,8 50,22" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/>`
        : '';
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    ${extra}
    <ellipse cx="32" cy="38" rx="20" ry="18" fill="${p.body}" stroke="#2B2B2B" stroke-width="3"/>
    <ellipse cx="32" cy="44" rx="12" ry="9" fill="${p.belly}"/>
    ${patches}
    ${snout}
    <circle cx="24" cy="34" r="3.2" fill="${p.eye}"/>
    <circle cx="40" cy="34" r="3.2" fill="${p.eye}"/>
    <circle cx="25" cy="33" r="1" fill="#fff"/>
    <circle cx="41" cy="33" r="1" fill="#fff"/>
  </svg>`;
}

export function renderSprite(species, className = '') {
  const el = document.createElement('span');
  el.className = `sprite ${className}`.trim();
  el.dataset.species = species || '';
  if (!species) return el;
  const file = SPRITE_FILES[species];
  if (file) {
    const img = document.createElement('img');
    img.src = spriteUrl(file);
    img.alt = '';
    img.draggable = false;
    img.addEventListener('error', () => {
      el.innerHTML = animalSvg(species);
    });
    el.appendChild(img);
    return el;
  }
  el.innerHTML = animalSvg(species);
  return el;
}

export function engineSvg(color = '#E85D4C') {
  return `<svg viewBox="0 0 96 62" aria-hidden="true">
    <polygon points="4,44 16,38 16,48" fill="#2B2B2B" stroke="#1A1A1A" stroke-width="3" stroke-linejoin="round"/>
    <rect x="12" y="24" width="46" height="22" rx="9" fill="${color}" stroke="#1A1A1A" stroke-width="3.5"/>
    <rect x="48" y="12" width="30" height="34" rx="7" fill="${color}" stroke="#1A1A1A" stroke-width="3.5"/>
    <rect x="54" y="17" width="18" height="14" rx="4" fill="#FFF8E7" stroke="#1A1A1A" stroke-width="3"/>
    <rect x="57" y="20" width="12" height="8" rx="2" fill="#4A90D9" stroke="#1A1A1A" stroke-width="2"/>
    <rect x="16" y="8" width="11" height="18" rx="3" fill="#2B2B2B" stroke="#1A1A1A" stroke-width="3"/>
    <rect x="13" y="6" width="17" height="7" rx="3" fill="#2B2B2B" stroke="#1A1A1A" stroke-width="3"/>
    <circle cx="38" cy="22" r="5" fill="#F5C542" stroke="#1A1A1A" stroke-width="3"/>
    <rect x="78" y="28" width="8" height="14" rx="3" fill="#2B2B2B" stroke="#1A1A1A" stroke-width="3"/>
    <circle cx="24" cy="50" r="9" fill="#1A1A1A"/>
    <circle cx="54" cy="50" r="9" fill="#1A1A1A"/>
    <circle cx="24" cy="50" r="4" fill="#F5C542"/>
    <circle cx="54" cy="50" r="4" fill="#F5C542"/>
  </svg>`;
}

export function renderTrainImg(className = 'train-art') {
  const img = document.createElement('img');
  img.className = className;
  img.src = spriteUrl('train.webp');
  img.alt = '';
  img.draggable = false;
  return img;
}

export function renderStationImg(className = 'station-art') {
  const img = document.createElement('img');
  img.className = className;
  img.src = spriteUrl('station.webp');
  img.alt = '';
  img.draggable = false;
  return img;
}
