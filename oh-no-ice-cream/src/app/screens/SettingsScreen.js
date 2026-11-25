import { onActivate, onHold } from '../input/pointer.js';
import { persist, resetProgress } from '../storage/save.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { sceneryMarkup, sunButtonMarkup } from '../../ui/Scenery.js';

export function renderSettingsScreen(root, ctx) {
  draw();

  function draw() {
    root.replaceChildren();
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.innerHTML = sceneryMarkup();
    const chrome = document.createElement('div');
    chrome.className = 'chrome';
    chrome.appendChild(renderMuteButton({
      muted: ctx.save.settings.muted,
      onToggle: () => ctx.toggleMute(),
    }));
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
    const sun = document.createElement('button');
    sun.type = 'button';
    sun.className = 'hold-sun';
    sun.setAttribute('aria-label', 'Grown-ups: hold the sun');
    sun.innerHTML = sunButtonMarkup();
    onHold(sun, 3000, () => {
      ctx.grownUps = true;
      draw();
    });
    const note = document.createElement('div');
    note.className = 'hint-line';
    note.textContent = ctx.grownUps ? 'Grown-up settings' : 'Hold the sun';
    list.append(sun, note);

    if (ctx.grownUps) {
      const voice = document.createElement('button');
      voice.type = 'button';
      voice.className = 'choice';
      const voiceOn = ctx.save.settings.voice !== false;
      voice.textContent = voiceOn ? 'Numbers on' : 'Numbers off';
      voice.setAttribute('aria-label', voiceOn ? 'Number sounds on' : 'Number sounds off');
      onActivate(voice, () => {
        ctx.save.settings.voice = !ctx.save.settings.voice;
        persist(ctx.save);
        draw();
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
          document.documentElement.classList.toggle('reduce-motion', ctx.reduceMotion());
          draw();
        });
        motionRow.appendChild(btn);
      }

      const unlock = document.createElement('button');
      unlock.type = 'button';
      unlock.className = 'choice';
      const open = Boolean(ctx.save.settings.unlockAll);
      unlock.textContent = open ? 'All stands open' : 'Unlock all stands';
      unlock.setAttribute('aria-label', open ? 'All stands open' : 'Unlock all stands');
      onActivate(unlock, () => {
        ctx.save.settings.unlockAll = !ctx.save.settings.unlockAll;
        persist(ctx.save);
        draw();
      });

      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'hold-sun hold-reset';
      reset.setAttribute('aria-label', 'Hold to reset progress');
      reset.textContent = 'Reset';
      onHold(reset, 3000, () => {
        resetProgress(ctx.save);
        persist(ctx.save);
        ctx.go('title');
      });
      list.append(voice, motionRow, unlock, reset);
    }

    screen.append(chrome, list);
    root.appendChild(screen);
  }
}
