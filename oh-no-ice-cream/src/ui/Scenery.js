export function sceneryMarkup() {
  return `<div class="scenery" aria-hidden="true">
    <div class="sky"></div>
    <div class="sun"></div>
    <div class="cloud cloud-a"></div>
    <div class="cloud cloud-b"></div>
    <div class="boardwalk"></div>
  </div>`;
}

export const HOUSE = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 30 L32 12 L56 30" fill="#F48FB1" stroke="#3B2418" stroke-width="3.5" stroke-linejoin="round"/><rect x="16" y="30" width="32" height="24" rx="4" fill="#FFF8EA" stroke="#3B2418" stroke-width="3.5"/><rect x="27" y="38" width="10" height="16" rx="2" fill="#E9B872" stroke="#3B2418" stroke-width="3"/></svg>`;

export function sunButtonMarkup() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="14" fill="#FFF4D6" stroke="#3B2418" stroke-width="3"/>
    <circle cx="27" cy="30" r="2" fill="#3B2418"/>
    <circle cx="37" cy="30" r="2" fill="#3B2418"/>
    <path d="M27 36 Q32 41 37 36" fill="none" stroke="#3B2418" stroke-width="2" stroke-linecap="round"/>
    <g stroke="#E6A23A" stroke-width="3" stroke-linecap="round">
      <path d="M32 8 V14"/><path d="M32 50 V56"/><path d="M8 32 H14"/><path d="M50 32 H56"/>
      <path d="M14 14 L18 18"/><path d="M46 46 L50 50"/><path d="M50 14 L46 18"/><path d="M18 46 L14 50"/>
    </g>
  </svg>`;
}
