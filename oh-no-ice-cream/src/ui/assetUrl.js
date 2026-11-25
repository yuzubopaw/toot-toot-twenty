export function assetUrl(path) {
  const base = import.meta.env.BASE_URL || './';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${String(path).replace(/^\//, '')}`;
}

export function spriteUrl(id) {
  return assetUrl(`images/sprites/animal-${id}.webp`);
}
