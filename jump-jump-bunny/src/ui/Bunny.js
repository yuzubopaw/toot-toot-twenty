export const SCARVES = Object.freeze(['#e56b99', '#c9a0ff', '#ffb086', '#ff8fb8', '#f48cbf']);

// One hop cycle (stand, crouch, airborne, land). Scarf tints stay in the
// sheet, so the argument is kept for callers that still pass a color.
export function bunnyMarkup(_scarf = SCARVES[0]) {
  return `<span class="bunny-hop" aria-hidden="true"></span>`;
}
