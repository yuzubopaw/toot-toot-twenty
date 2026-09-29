import { onActivate, onHold } from '../input/pointer.js';
import { persist, resetProgress } from '../storage/save.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

export function renderSettingsScreen(root, ctx) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = sceneryMarkup();
  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  chrome.appendChild(
    renderMuteButton({
      muted: ctx.save.settings.muted,
      onToggle: () => ctx.toggleMute(),
    }),
  );
  const title = document.createElement('div');
  title.className = 'hint-line';
  title.textContent = 'Settings';
  chrome.appendChild(title);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'chrome-btn';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '✕';
  onActivate(close, () => ctx.close());
  chrome.appendChild(close);

  const list = document.createElement('div');
  list.className = 'settings-list';

  const voice = document.createElement('button');
  voice.type = 'button';
  voice.className = 'choice';
  const voiceOn = ctx.save.settings.voice !== false;
  voice.textContent = voiceOn ? 'Numbers on' : 'Numbers off';
  voice.setAttribute('aria-label', voiceOn ? 'Number sounds on' : 'Number sounds off');
  onActivate(voice, () => {
    ctx.save.settings.voice = !ctx.save.settings.voice;
    persist(ctx.save);
    renderSettingsScreen(root, ctx);
  });

  const motionRow = document.createElement('div');
  motionRow.className = 'settings-row';
  for (const [id, label] of [
    ['auto', 'Motion auto'],
    ['reduce', 'Motion calm'],
    ['full', 'Motion hop'],
  ]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    if (ctx.save.settings.motion === id) btn.classList.add('is-reveal');
    btn.textContent = label;
    btn.setAttribute('aria-label', label);
    onActivate(btn, () => {
      ctx.save.settings.motion = id;
      persist(ctx.save);
      renderSettingsScreen(root, ctx);
    });
    motionRow.appendChild(btn);
  }

  const flower = document.createElement('button');
  flower.type = 'button';
  flower.className = 'hold-flower';
  flower.setAttribute('aria-label', 'Grown-ups: hold to reset');
  onHold(flower, 3000, () => openReset(screen, ctx));

  const note = document.createElement('div');
  note.className = 'hint-line';
  note.textContent = 'Hold the flower to reset';

  list.append(voice, motionRow, flower, note);
  screen.append(chrome, list);
  root.appendChild(screen);
}

function openReset(screen, ctx) {
  if (screen.querySelector('.overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const card = document.createElement('div');
  card.className = 'card';
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.className = 'confirm-leave';
  yes.textContent = 'Reset';
  yes.setAttribute('aria-label', 'Reset progress');
  const no = document.createElement('button');
  no.type = 'button';
  no.className = 'confirm-stay';
  no.textContent = 'Keep';
  no.setAttribute('aria-label', 'Keep progress');
  onActivate(no, () => overlay.remove());
  onActivate(yes, () => {
    if (screen.querySelector('[data-reset-confirm]')) return;
    const ask = document.createElement('div');
    ask.className = 'overlay';
    ask.dataset.resetConfirm = '1';
    const again = document.createElement('div');
    again.className = 'card';
    const really = document.createElement('button');
    really.type = 'button';
    really.className = 'confirm-leave';
    really.textContent = 'Reset now';
    really.setAttribute('aria-label', 'Reset now');
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'confirm-stay';
    back.textContent = 'Keep';
    back.setAttribute('aria-label', 'Keep progress');
    onActivate(back, () => ask.remove());
    onActivate(really, () => {
      resetProgress(ctx.save);
      persist(ctx.save);
      ctx.go('title');
    });
    again.append(really, back);
    ask.appendChild(again);
    screen.appendChild(ask);
  });
  card.append(yes, no);
  overlay.appendChild(card);
  screen.appendChild(overlay);
}
