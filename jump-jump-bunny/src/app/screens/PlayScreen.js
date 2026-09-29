import { onActivate } from '../input/pointer.js';
import { mulberry32 } from '../../game/rng.js';
import {
  TRIP_LENGTH,
  answer,
  freshRound,
  generateTrip,
  hopOnce,
  recordCorrect,
  recordTrip,
  submitCountOut,
} from '../../game/session.js';
import { persist } from '../storage/save.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { bunnyMarkup, SCARVES } from '../../ui/Bunny.js';
import { sceneryMarkup } from '../../ui/Scenery.js';

const CELEBRATE_MS = 1100;
const COUNT_MS = 420;
const COUNT_FAST_MS = 280;

const HOUSE = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 30 L32 12 L56 30" fill="#E56B99" stroke="#3A2030" stroke-width="3.5" stroke-linejoin="round"/><rect x="16" y="30" width="32" height="24" rx="4" fill="#FFF7FB" stroke="#3A2030" stroke-width="3.5"/><rect x="27" y="38" width="10" height="16" rx="2" fill="#F7A8C9" stroke="#3A2030" stroke-width="3"/></svg>`;

export function renderPlayScreen(root, ctx, params) {
  const mode = params.mode || 'howMany';
  const recent = ctx.save.progress.recent[mode] || [];
  const rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const problems = generateTrip(mode, recent, rng);
  let round = freshRound(problems[0], 0);
  let alive = true;
  let inputLocked = false;
  let confirming = false;
  let pending = null;
  const timers = [];
  const firstTries = [];

  function later(fn, ms) {
    const id = setTimeout(() => {
      if (alive) fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
    pending = null;
  }

  function gap() {
    return ctx.reduceMotion() ? COUNT_FAST_MS : COUNT_MS;
  }

  function nudge(button) {
    ctx.audio.playSfx('nudge');
    const el = button || root.querySelector('.hop-btn');
    if (!el) return;
    el.classList.remove('is-wiggle');
    void el.offsetWidth;
    el.classList.add('is-wiggle');
  }

  function paint(view = round) {
    root.innerHTML = '';
    if (document.documentElement.dataset.layout === 'unsupported') {
      const screen = document.createElement('div');
      screen.className = 'screen';
      screen.innerHTML = sceneryMarkup();
      const card = document.createElement('div');
      card.className = 'unsupported-card';
      card.textContent = 'Make the window bigger';
      screen.appendChild(card);
      root.appendChild(screen);
      return;
    }
    const screen = document.createElement('div');
    screen.className = `screen${inputLocked ? ' is-locked' : ''}`;
    screen.innerHTML = sceneryMarkup();
    screen.append(chrome(), stage(view), answerBar(view));
    if (confirming) screen.appendChild(confirmCard());
    root.appendChild(screen);
  }

  function chrome() {
    const bar = document.createElement('div');
    bar.className = 'chrome';
    bar.appendChild(
      renderMuteButton({
        muted: ctx.save.settings.muted,
        onToggle: () => ctx.toggleMute(),
      }),
    );
    const tickets = document.createElement('div');
    tickets.className = 'tickets';
    tickets.setAttribute('aria-label', `Hop ${round.index + 1} of ${TRIP_LENGTH}`);
    for (let i = 0; i < TRIP_LENGTH; i += 1) {
      const dot = document.createElement('span');
      dot.className = `ticket${i < round.index || (i === round.index && round.solved) ? ' is-on' : ''}`;
      tickets.appendChild(dot);
    }
    bar.appendChild(tickets);
    const home = document.createElement('button');
    home.type = 'button';
    home.className = 'chrome-btn';
    home.setAttribute('aria-label', 'Home');
    home.innerHTML = HOUSE;
    onActivate(home, openConfirm);
    bar.appendChild(home);
    return bar;
  }

  function stage(view) {
    const box = document.createElement('div');
    box.className = `stage${view.problem.mode === 'countOut' ? ' is-count' : ''}`;
    if (view.problem.mode === 'countOut') {
      const num = document.createElement('div');
      num.className = 'target-num';
      num.textContent = String(view.problem.target);
      num.setAttribute('aria-label', `Hop to ${view.problem.target}`);
      box.appendChild(num);
    }
    box.appendChild(view.problem.mode === 'next' ? stones(view) : meadow(view));
    return box;
  }

  function meadow(view) {
    const grid = document.createElement('div');
    grid.className = 'meadow';
    const pads = view.problem.padCount;
    const bunnies = view.problem.bunnyCount;
    for (let i = 0; i < pads; i += 1) {
      const pad = document.createElement('div');
      pad.className = 'pad';
      const lily = document.createElement('span');
      lily.className = 'lily';
      pad.appendChild(lily);
      if (i >= bunnies) {
        pad.classList.add('is-empty');
        grid.appendChild(pad);
        continue;
      }
      if (i < view.hopped) {
        pad.classList.add('is-up');
        if (i === view.hopped - 1) pad.classList.add('is-jumping');
        const badge = document.createElement('span');
        badge.className = 'hop-num';
        badge.textContent = String(i + 1);
        pad.appendChild(badge);
      }
      if (i === view.hopped && !view.ready && view.hintLevel < 2) pad.classList.add('is-next');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bunny';
      btn.dataset.bunny = String(i);
      btn.setAttribute('aria-label', i < view.hopped ? 'Hopped bunny' : 'Bunny');
      btn.innerHTML = bunnyMarkup(SCARVES[i % SCARVES.length]);
      if (i === view.hopped && !view.ready && view.hintLevel < 2 && !view.solved) {
        onActivate(btn, () => doHop());
      } else {
        btn.disabled = true;
      }
      pad.appendChild(btn);
      grid.appendChild(pad);
    }
    return grid;
  }

  function stones(view) {
    const grid = document.createElement('div');
    grid.className = 'stone-line';
    const shown = view.problem.shown;
    shown.forEach((n, i) => {
      grid.appendChild(stone({ n, scarf: SCARVES[i % SCARVES.length], saying: view.saying === n }));
    });
    const landed = view.hopped >= 1;
    grid.appendChild(
      stone({
        n: landed && (view.solved || view.saying === view.problem.target) ? view.problem.target : null,
        scarf: SCARVES[shown.length % SCARVES.length],
        empty: !landed,
        bunny: landed,
        jump: landed && !view.solved,
        saying: view.saying === view.problem.target,
      }),
    );
    return grid;
  }

  function stone({ n, scarf, empty = false, bunny = true, saying = false, jump = false }) {
    const cell = document.createElement('div');
    cell.className = `stone${empty ? ' is-empty' : ' is-filled'}${saying ? ' is-saying' : ''}${jump ? ' is-jumping' : ''}`;
    if (bunny && !empty) cell.innerHTML = bunnyMarkup(scarf);
    if (n != null) {
      const num = document.createElement('span');
      num.className = 'stone-num';
      num.textContent = String(n);
      cell.appendChild(num);
    }
    return cell;
  }

  function answerBar(view) {
    const bar = document.createElement('div');
    bar.className = 'answer-bar';
    if (view.problem.mode === 'countOut') {
      bar.append(hopButton(view), doneButton(view));
      return bar;
    }
    bar.appendChild(hopButton(view));
    const picks = document.createElement('div');
    picks.className = 'picks';
    for (const n of view.problem.choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.dataset.value = String(n);
      btn.textContent = String(n);
      btn.setAttribute('aria-label', String(n));
      const waiting = !view.ready;
      const used = (view.wrongPicks || []).includes(n);
      const hidden = view.revealed && n !== view.problem.target;
      if (waiting || used || hidden) btn.classList.add('is-dim');
      if (view.revealed && n === view.problem.target) btn.classList.add('is-reveal');
      if (view.solved && n === view.problem.target) btn.classList.add('is-yes');
      onActivate(btn, () => onChoice(n));
      picks.appendChild(btn);
    }
    bar.appendChild(picks);
    return bar;
  }

  function hopButton(view) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hop-btn';
    btn.textContent = 'Hop';
    btn.setAttribute('aria-label', 'Hop');
    const doneHopping =
      view.hintLevel >= 2 ||
      view.solved ||
      (view.problem.mode === 'howMany' && view.ready) ||
      (view.problem.mode === 'next' && view.ready) ||
      (view.problem.mode === 'countOut' && view.hopped >= view.problem.bunnyCount);
    if (!doneHopping && !view.ready) btn.classList.add('is-waiting');
    if (doneHopping) btn.classList.add('is-dim');
    onActivate(btn, () => doHop());
    return btn;
  }

  function doneButton(view) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'done-btn';
    btn.textContent = 'Done';
    btn.setAttribute('aria-label', 'Done');
    if (view.hopped < 1) btn.classList.add('is-dim');
    if (view.revealed || (view.hintLevel >= 2 && view.hopped === view.problem.target)) {
      btn.classList.add('is-reveal');
    }
    if (view.solved) btn.classList.add('is-yes');
    onActivate(btn, () => doDone());
    return btn;
  }

  function doHop() {
    if (!alive || inputLocked || confirming || round.solved) return;
    const result = hopOnce(round);
    if (!result.hoppedNow) {
      nudge();
      return;
    }
    round = result.round;
    ctx.audio.playSfx('hop');
    if (result.count != null) ctx.audio.speakNumber(result.count, gap());
    paint();
  }

  function onChoice(value) {
    if (!alive || inputLocked || confirming || round.solved) return;
    const result = answer(round, value);
    if (result.ignored) {
      nudge();
      return;
    }
    take(result);
  }

  function doDone() {
    if (!alive || inputLocked || confirming || round.solved) return;
    const result = submitCountOut(round);
    if (result.ignored) {
      nudge();
      return;
    }
    take(result);
  }

  function take(result) {
    if (result.ignored) return;
    if (!result.correct) {
      ctx.audio.clearCaption();
      ctx.audio.playSfx('nudge');
      if (result.hintLevel >= 2) runAuto(result.round);
      else {
        round = result.round;
        paint();
        nudge();
      }
      return;
    }
    round = result.round;
    inputLocked = true;
    ctx.audio.playSfx('cheer');
    ctx.audio.speakNumber(round.problem.target, ctx.reduceMotion() ? 320 : CELEBRATE_MS);
    firstTries.push(result.triesUntilCorrect);
    ctx.save.progress = recordCorrect(ctx.save.progress, mode, result.triesUntilCorrect);
    if (result.tripDone) ctx.save.progress = recordTrip(ctx.save.progress, mode);
    persist(ctx.save);
    paint();
    pending = () => advance(result.tripDone);
    later(() => {
      if (pending) {
        const fn = pending;
        pending = null;
        fn();
      }
    }, ctx.reduceMotion() ? 320 : CELEBRATE_MS);
  }

  function advance(tripDone) {
    ctx.audio.clearCaption();
    if (tripDone) {
      ctx.go('parade', { mode, sparkle: firstTries.every((t) => t === 1) });
      return;
    }
    inputLocked = false;
    round = freshRound(problems[round.index + 1], round.index + 1);
    paint();
  }

  function runAuto(finalRound) {
    round = finalRound;
    inputLocked = true;
    const problem = finalRound.problem;
    if (problem.mode === 'next') {
      const seq = [...problem.shown, problem.target];
      let i = 0;
      const tick = () => {
        const n = seq[i];
        ctx.audio.speakNumber(n, gap());
        ctx.audio.playSfx('hop');
        const last = n === problem.target;
        paint({ ...finalRound, hopped: last ? 1 : 0, ready: false, revealed: false, saying: n });
        i += 1;
        if (i >= seq.length) {
          later(finishAuto, 220);
          return;
        }
        later(tick, gap());
      };
      paint({ ...finalRound, hopped: 0, ready: false, revealed: false });
      later(tick, 160);
      return;
    }
    let n = 0;
    const tick = () => {
      n += 1;
      ctx.audio.speakNumber(n, gap());
      ctx.audio.playSfx('hop');
      paint({ ...finalRound, hopped: n, ready: false, revealed: false });
      if (n >= problem.target) {
        later(finishAuto, 220);
        return;
      }
      later(tick, gap());
    };
    paint({ ...finalRound, hopped: 0, ready: false, revealed: false });
    later(tick, 160);
  }

  function finishAuto() {
    inputLocked = false;
    paint();
  }

  function openConfirm() {
    clearTimers();
    inputLocked = false;
    confirming = true;
    paint();
  }

  function confirmCard() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const card = document.createElement('div');
    card.className = 'card';
    const stay = document.createElement('button');
    stay.type = 'button';
    stay.className = 'confirm-stay';
    stay.setAttribute('aria-label', 'Keep playing');
    stay.innerHTML = bunnyMarkup('#e56b99');
    const stayLabel = document.createElement('span');
    stayLabel.textContent = 'Keep playing';
    stay.appendChild(stayLabel);
    onActivate(stay, () => {
      confirming = false;
      if (round.solved) advance(round.tripDone);
      else paint();
    });
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'confirm-leave';
    leave.setAttribute('aria-label', 'Home');
    leave.innerHTML = HOUSE;
    const leaveLabel = document.createElement('span');
    leaveLabel.textContent = 'Home';
    leave.appendChild(leaveLabel);
    onActivate(leave, () => ctx.go('title'));
    card.append(stay, leave);
    overlay.appendChild(card);
    return overlay;
  }

  paint();
  return () => {
    alive = false;
    clearTimers();
  };
}
