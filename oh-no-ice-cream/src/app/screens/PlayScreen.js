import { mount as mountDrip } from '../play/dripDropView.js';
import { mount as mountOops } from '../play/oopsView.js';
import { mount as mountPlop } from '../play/plopView.js';
import { mount as mountTen } from '../play/tenTrickView.js';
import { onActivate } from '../input/pointer.js';
import { mulberry32 } from '../../game/rng.js';
import { TRIP_LENGTH } from '../../game/modes.js';
import { generateTrip } from '../../game/facts.js';
import { act, answer, freshRound } from '../../game/session.js';
import { endVisit, recordSolve } from '../../game/progress.js';
import { persist } from '../storage/save.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { HOUSE, sceneryMarkup } from '../../ui/Scenery.js';
import { coneSvg } from '../../ui/Scoop.js';

const CELEBRATE_MS = 1100;
const COUNT_MS = 420;
const COUNT_FAST_MS = 280;
const VIEWS = { plop: mountPlop, dripDrop: mountDrip, oops: mountOops, tenTrick: mountTen };

function tripProgress(save) {
  if (!save.settings.unlockAll) return save.progress;
  return { ...save.progress, unlocked: { tenTrick: true, sampler: true } };
}

export function renderPlayScreen(root, ctx, params) {
  const visitMode = params.mode || 'plop';
  const rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const problems = generateTrip(visitMode, tripProgress(ctx.save), rng);
  let round = freshRound(problems[0], 0);
  let alive = true;
  let inputLocked = false;
  let confirming = false;
  let looking = false;
  let showTen = false;
  let ghostTaps = 0;
  let displayTaken = null;
  let cue = null;
  let pending = null;
  let bounce = null;
  const customers = [];
  const timers = [];

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

  function answersOpen() {
    if (looking) return false;
    return round.phase !== 'acting';
  }

  function paint(options = {}) {
    if (options.displayTaken !== undefined) displayTaken = options.displayTaken;
    if (options.cue !== undefined) cue = options.cue;
    root.replaceChildren();
    if (document.documentElement.dataset.layout === 'unsupported') {
      const blocked = document.createElement('div');
      blocked.className = 'screen';
      blocked.innerHTML = sceneryMarkup();
      const card = document.createElement('div');
      card.className = 'unsupported-card';
      card.textContent = 'Make the window bigger';
      blocked.appendChild(card);
      root.appendChild(blocked);
      return;
    }
    const screen = document.createElement('div');
    screen.className = `screen${inputLocked ? ' is-locked' : ''}`;
    screen.innerHTML = sceneryMarkup();
    screen.append(chrome(), stage(options));
    if (answersOpen()) screen.appendChild(answerBar());
    if (confirming) screen.appendChild(confirmCard());
    root.appendChild(screen);
  }

  function chrome() {
    const bar = document.createElement('div');
    bar.className = 'chrome';
    const home = document.createElement('button');
    home.type = 'button';
    home.className = 'chrome-btn';
    home.setAttribute('aria-label', 'Home');
    home.innerHTML = HOUSE;
    onActivate(home, openConfirm);
    bar.appendChild(home);
    const tickets = document.createElement('div');
    tickets.className = 'tickets';
    tickets.setAttribute('aria-label', `Scoop ${round.index + 1} of ${TRIP_LENGTH}`);
    for (let i = 0; i < TRIP_LENGTH; i += 1) {
      const slot = document.createElement('span');
      const filled = i < round.index || (i === round.index && round.phase === 'solved');
      slot.className = `ticket${filled ? ' is-on' : ''}`;
      slot.innerHTML = coneSvg();
      if (visitMode === 'sampler') slot.dataset.mode = problems[i].mode;
      tickets.appendChild(slot);
    }
    bar.appendChild(tickets);
    bar.appendChild(renderMuteButton({
      muted: ctx.save.settings.muted,
      onToggle: () => ctx.toggleMute(),
    }));
    return bar;
  }

  function stage(options) {
    const box = document.createElement('div');
    box.className = 'stage';
    const mount = VIEWS[round.problem.mode] || mountPlop;
    mount(box, round, {
      reduceMotion: ctx.reduceMotion(),
      looking,
      showTen,
      splat: Boolean(options.splat),
      displayTaken,
      cue: cue || 0,
      onAct,
      onGhost,
    });
    return box;
  }

  function answerBar() {
    const bar = document.createElement('div');
    bar.className = 'answer-bar';
    const picks = document.createElement('div');
    picks.className = 'picks';
    const answerValue = round.problem.answer;
    for (const n of round.problem.choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.dataset.answer = String(n);
      btn.setAttribute('aria-label', String(n));
      const used = (round.wrongPicks || []).includes(n);
      const reveal = round.hintLevel >= 3;
      const text = document.createElement('span');
      text.textContent = String(n);
      btn.appendChild(text);
      if (used) {
        btn.classList.add('is-retry');
        const icon = document.createElement('span');
        icon.className = 'rewind';
        icon.textContent = '↩';
        btn.appendChild(icon);
      }
      if (reveal && n !== answerValue) btn.classList.add('is-dim');
      if (reveal && n === answerValue) btn.classList.add('is-reveal');
      if (round.phase === 'solved' && n === answerValue) {
        btn.classList.add('is-yes');
        const mark = document.createElement('span');
        mark.className = 'yes-mark';
        mark.textContent = '✓ ★';
        btn.appendChild(mark);
      }
      const tappable = round.phase === 'answering' && !used && (!reveal || n === answerValue);
      if (tappable) onActivate(btn, () => onChoice(n, btn));
      picks.appendChild(btn);
    }
    bar.appendChild(picks);
    return bar;
  }

  function onAct() {
    if (!alive || inputLocked || confirming || round.phase !== 'acting') return;
    const result = act(round);
    if (!result.acted) return;
    round = result.round;
    displayTaken = null;
    const problem = round.problem;
    if (problem.mode === 'dripDrop') {
      ctx.audio.playSfx('drip');
      ctx.audio.playSfx('hop');
      ctx.audio.speakNumber(problem.start - round.taken, gap());
    } else {
      ctx.audio.playSfx('ohno');
      ctx.audio.playSfx('plop');
      ctx.audio.speakNumber(result.count, gap());
    }
    if (result.reachedTen) {
      showTen = true;
      inputLocked = true;
      ctx.audio.playSfx('ten');
      paint({ splat: true });
      later(() => {
        showTen = false;
        inputLocked = false;
        paint();
      }, 600);
      return;
    }
    paint({ splat: true });
  }

  function onGhost() {
    if (!alive || inputLocked || confirming || round.problem.mode !== 'oops' || looking) return;
    ghostTaps = Math.min(round.problem.take, ghostTaps + 1);
    ctx.audio.speakNumber(ghostTaps, gap());
    cue = ghostTaps;
    paint();
  }

  function onChoice(value, button) {
    if (!alive || inputLocked || confirming || round.phase !== 'answering') return;
    const result = answer(round, value);
    if (result.ignored) {
      ctx.audio.playSfx('nudge');
      wiggle(button);
      return;
    }
    round = result.round;
    if (!result.correct) {
      ctx.audio.clearCaption();
      ctx.audio.playSfx('nudge');
      if (result.hintLevel === 2) runAuto();
      else paint();
      return;
    }
    celebrate(result);
  }

  function wiggle(button) {
    if (!button) return;
    button.classList.remove('is-wiggle');
    void button.offsetWidth;
    button.classList.add('is-wiggle');
  }

  function celebrate(result) {
    inputLocked = true;
    const problem = round.problem;
    customers.push({
      id: problem.customer,
      flavour: problem.flavour,
      scoops: problem.mode === 'oops' ? problem.start : problem.left,
    });
    ctx.audio.playSfx('cheer');
    ctx.audio.speakNumber(problem.answer, ctx.reduceMotion() ? 320 : CELEBRATE_MS);
    ctx.save.progress = recordSolve(ctx.save.progress, problem.mode, result.round.triesUntilCorrect);
    if (result.round.tripDone) {
      const ended = endVisit(ctx.save.progress, visitMode);
      ctx.save.progress = ended.progress;
      bounce = ended.changes.unlocked[0] || null;
    }
    persist(ctx.save);
    paint();
    pending = () => advance(result.round.tripDone);
    later(() => {
      if (!pending) return;
      const fn = pending;
      pending = null;
      fn();
    }, ctx.reduceMotion() ? 320 : CELEBRATE_MS);
  }

  function advance(tripDone) {
    ctx.audio.clearCaption();
    if (tripDone) {
      ctx.go('parade', { mode: visitMode, customers, bounce });
      return;
    }
    inputLocked = false;
    ghostTaps = 0;
    cue = null;
    displayTaken = null;
    showTen = false;
    round = freshRound(problems[round.index + 1], round.index + 1);
    startRound();
  }

  function runAuto() {
    inputLocked = true;
    const problem = round.problem;
    if (problem.mode === 'dripDrop') {
      let step = 0;
      const tick = () => {
        step += 1;
        displayTaken = step;
        ctx.audio.speakNumber(problem.start - step, gap());
        ctx.audio.playSfx('hop');
        paint();
        if (step >= problem.take) later(finishAuto, 220);
        else later(tick, gap());
      };
      displayTaken = 0;
      paint();
      later(tick, 160);
      return;
    }
    const total = problem.mode === 'oops' ? problem.take : problem.left;
    let n = 0;
    const tick = () => {
      n += 1;
      cue = n;
      ctx.audio.speakNumber(n, gap());
      paint();
      if (n >= total) later(finishAuto, 220);
      else later(tick, gap());
    };
    cue = 0;
    paint();
    later(tick, 160);
  }

  function finishAuto() {
    inputLocked = false;
    displayTaken = null;
    cue = null;
    paint();
  }

  function startRound() {
    looking = round.problem.mode === 'oops';
    if (looking) {
      inputLocked = true;
      paint();
      later(() => {
        looking = false;
        inputLocked = false;
        ctx.audio.playSfx('ohno');
        ctx.audio.playSfx('plop');
        paint({ splat: true });
      }, ctx.reduceMotion() ? 150 : 1200);
      return;
    }
    if (round.phase === 'acting') ctx.audio.playSfx('gust');
    paint();
  }

  function openConfirm() {
    clearTimers();
    inputLocked = false;
    showTen = false;
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
    stay.textContent = 'Keep playing';
    onActivate(stay, () => {
      confirming = false;
      if (round.phase === 'solved') advance(round.tripDone);
      else startRound();
    });
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'confirm-leave';
    leave.setAttribute('aria-label', 'Home');
    leave.innerHTML = HOUSE;
    onActivate(leave, () => ctx.go('title'));
    card.append(stay, leave);
    overlay.appendChild(card);
    return overlay;
  }

  startRound();
  return () => {
    alive = false;
    clearTimers();
  };
}
