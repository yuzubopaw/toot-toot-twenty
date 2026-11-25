import { onActivate } from '../input/pointer.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { renderCustomer } from '../../ui/Customer.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

export function renderParadeScreen(root, ctx, params = {}) {
  const people = params.customers?.length ? params.customers : [];
  let done = false;
  let timer = 0;
  root.replaceChildren();
  const screen = document.createElement('div');
  screen.className = 'screen parade-screen';
  screen.innerHTML = sceneryMarkup();
  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  chrome.appendChild(renderMuteButton({
    muted: ctx.save.settings.muted,
    onToggle: () => ctx.toggleMute(),
  }));
  const main = document.createElement('div');
  main.className = 'parade-main';
  const track = document.createElement('div');
  track.className = 'parade-track';
  track.setAttribute('aria-label', 'Ice cream parade');
  people.forEach((person) => {
    const fig = document.createElement('div');
    fig.className = 'parade-customer';
    renderCustomer(fig, { ...person, leaving: false });
    track.appendChild(fig);
  });
  const note = document.createElement('div');
  note.className = 'sparkle-note';
  note.textContent = '✦ ✦ ✦';
  main.append(note, track);
  screen.append(chrome, main);
  root.appendChild(screen);

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    ctx.go('map', { bounce: params.bounce || null });
  }

  timer = setTimeout(finish, ctx.reduceMotion() ? 700 : 4000);
  onActivate(screen, finish);
  return () => {
    done = true;
    clearTimeout(timer);
  };
}
