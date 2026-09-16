export function assetUrl(path) {
  const base = import.meta.env.BASE_URL || './';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${path.replace(/^\//, '')}`;
}

export function spriteUrl(file) {
  return assetUrl(`images/sprites/${file}`);
}
