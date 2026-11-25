/** Parent chooser when this game is served from /ttt/, /jjb/, or /oic/. */
export function bundleParentHref(pathname = '') {
  return /\/(ttt|jjb|oic)(\/|$)/.test(pathname) ? '../' : null;
}
