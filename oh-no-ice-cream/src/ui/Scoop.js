export const FLAVOUR_FILL = Object.freeze({
  strawberry: '#F7A1C4',
  vanilla: '#FFF1C9',
  mint: '#A8E6CF',
  chocolate: '#8B5A3C',
  blueberry: '#A9B8F5',
});

const SCOOP_PATH = 'M10 28 C10 12 54 12 54 28 C54 36 50 40 48 44 C44 52 40 56 32 56 C24 56 20 52 16 44 C14 40 10 36 10 28 Z';

function fill(flavour) {
  return FLAVOUR_FILL[flavour] || FLAVOUR_FILL.vanilla;
}

export function scoopSvg(flavour, { face = 'happy' } = {}) {
  const mouth = face === 'oh'
    ? '<ellipse class="scoop-mouth" cx="32" cy="40" rx="5" ry="6" fill="#3B2418"/>'
    : '<path class="scoop-mouth" d="M24 38 Q32 46 40 38" fill="none" stroke="#3B2418" stroke-width="2.5" stroke-linecap="round"/>';
  return `<svg class="scoop-svg" viewBox="0 0 64 64" aria-hidden="true">
    <path d="${SCOOP_PATH}" fill="${fill(flavour)}" stroke="#3B2418" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="24" cy="22" rx="8" ry="5" fill="#fff" opacity="0.85"/>
    <circle cx="26" cy="34" r="2.2" fill="#3B2418"/>
    <circle cx="38" cy="34" r="2.2" fill="#3B2418"/>
    ${mouth}
  </svg>`;
}

export function splatSvg(flavour) {
  return `<svg class="splat-svg" viewBox="0 0 64 36" aria-hidden="true">
    <ellipse cx="32" cy="22" rx="26" ry="10" fill="${fill(flavour)}" stroke="#3B2418" stroke-width="3"/>
    <circle cx="10" cy="8" r="3" fill="#fff"/>
    <circle cx="54" cy="8" r="2.4" fill="#fff"/>
    <circle cx="40" cy="5" r="2" fill="#FFF4D6"/>
  </svg>`;
}

export function ghostSvg() {
  return `<svg class="ghost-svg" viewBox="0 0 64 64" aria-hidden="true">
    <path d="${SCOOP_PATH}" fill="none" stroke="#3B2418" stroke-width="3" stroke-dasharray="5 4"/>
  </svg>`;
}

export function coneSvg() {
  return `<svg class="cone-svg" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M18 16 H46 L34 58 H30 Z" fill="#E9B872" stroke="#3B2418" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 24 H42 M24 32 H40 M26 40 H38 M28 48 H36" fill="none" stroke="#C98B3C" stroke-width="2"/>
  </svg>`;
}
