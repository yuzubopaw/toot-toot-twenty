export function renderNumberPath(host, { start, taken }) {
  const lo = Math.max(0, start - 10);
  const current = start - taken;
  host.replaceChildren();
  host.className = 'number-path';
  for (let n = lo; n <= start; n += 1) {
    const tile = document.createElement('div');
    tile.className = `path-tile${n === current ? ' is-marker' : ''}`;
    tile.textContent = String(n);
    host.appendChild(tile);
  }
  return host;
}
