export const SCARVES = Object.freeze(['#e56b99', '#c9a0ff', '#ffb086', '#ff8fb8', '#f48cbf']);

export function bunnyMarkup(scarf = SCARVES[0]) {
  const tint = SCARVES.includes(scarf) ? scarf : SCARVES[0];
  return `<svg class="bunny-svg" viewBox="0 0 80 96" aria-hidden="true" focusable="false">
    <ellipse cx="26" cy="20" rx="9" ry="18" fill="#fff" stroke="#3a2030" stroke-width="3"/>
    <ellipse cx="54" cy="20" rx="9" ry="18" fill="#fff" stroke="#3a2030" stroke-width="3"/>
    <ellipse cx="26" cy="22" rx="4.2" ry="11" fill="#ffb7d1"/>
    <ellipse cx="54" cy="22" rx="4.2" ry="11" fill="#ffb7d1"/>
    <ellipse cx="40" cy="62" rx="28" ry="24" fill="#fff7fb" stroke="#3a2030" stroke-width="3"/>
    <ellipse cx="40" cy="70" rx="20" ry="11" fill="${tint}" stroke="#3a2030" stroke-width="2.5"/>
    <circle cx="30" cy="56" r="3.2" fill="#3a2030"/>
    <circle cx="50" cy="56" r="3.2" fill="#3a2030"/>
    <ellipse cx="22" cy="64" rx="4" ry="2.3" fill="#ffd0e4"/>
    <ellipse cx="58" cy="64" rx="4" ry="2.3" fill="#ffd0e4"/>
    <ellipse cx="40" cy="64" rx="3" ry="2.1" fill="#e56b99"/>
    <ellipse cx="28" cy="86" rx="10" ry="6" fill="#fff" stroke="#3a2030" stroke-width="3"/>
    <ellipse cx="52" cy="86" rx="10" ry="6" fill="#fff" stroke="#3a2030" stroke-width="3"/>
  </svg>`;
}
