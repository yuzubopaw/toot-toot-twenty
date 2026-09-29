/** Parent chooser when this game is served from /ttt/ or /jjb/. */
export function bundleParentHref(pathname = '') {
  return /\/(ttt|jjb)(\/|$)/.test(pathname) ? '../' : null;
}
