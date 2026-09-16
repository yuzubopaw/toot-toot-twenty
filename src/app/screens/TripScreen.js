import { frameCellCount, packAnimals, packCount } from '../../game/pack.js';
import { equationPartsFor, packSpecFor } from '../../game/ops/index.js';
import { startTrip, applyCombine, applyAnswer, advance, currentProblem, nextExpected } from '../../game/session.js';
import { recordCorrect } from '../storage/save.js';
import { useStrip, viewportSize } from '../layoutMode.js';
import { features } from '../features.js';
import { renderMuteButton } from '../../ui/MuteButton.js';
import { renderFrame, pulseCell } from '../../ui/Frame.js';
import { renderNumberChoices } from '../../ui/NumberChoices.js';
import { renderOrderLine } from '../../ui/OrderLine.js';
import { ANSWER_LOCK_MS, AUTO_COUNT_MS, AUTO_COUNT_REDUCED_MS, CELEBRATE_MS } from '../../game/hints.js';
import { onActivate } from '../input/pointer.js';
import { renderJourney, setJourneyProgress } from '../../ui/Journey.js';
import { sceneryMarkup } from '../../ui/Scenery.js';
import { burstCelebrate } from '../../ui/Celebrate.js';
import { renderStationImg, renderTrainImg } from '../../ui/Sprite.js';
import { renderCoupleLever, wiggleLever } from '../../ui/CoupleLever.js';
import { renderGroup } from '../../ui/Group.js';

const CHUG_MS = CELEBRATE_MS;
export const JOIN_MS = 500;

function isJoinAdd(problem) {
  return Boolean(problem) && (!problem.op || problem.op === 'add');
}

/** ms until auto-combine, or null if the child must tap the lever. */
export function autoCombineDelayMs(problem, session, reduceMotion, now) {
  if (!isJoinAdd(problem)) return 0;
  if (problem.requireCombine) return null;
  if (reduceMotion) return 0;
  return Math.max(0, (session.autoCombineAt || 0) - now);
}

export function renderTripScreen(root, ctx, params) {
  const routeId = params.routeId || 1;
  const session = startTrip(routeId, ctx.save.mastery, Date.now());
  let lockUntil = 0;
  let dimmed = new Set();
  let counting = false;
  let counted = new Set();
  let journeyEl = null;
  let problemHost = null;
  let answersHost = null;
  let eqEl = null;
  let muteHost = null;
  let screenEl = null;
  let roundId = 0;
  let combineTimer = 0;
  let joinTimer = 0;
  let joinRaf = 0;

  function progress() {
    if (session.tripDone) return 6;
    if (session.status === 'celebrating') return Math.min(6, session.problemIndex + 1);
    return session.problemIndex;
  }

  function persistCorrect(result) {
    recordCorrect(ctx.save, {
      routeId: session.routeId,
      factKey: currentProblem(session).factKey,
      triesUntilCorrect: result.triesUntilCorrect,
      wrongEvents: session.missesThisProblem,
      now: Date.now(),
      tripFinished: result.tripDone,
    });
  }

  function goMap() {
    ctx.show('map');
  }

  function clearCombineWait() {
    if (combineTimer) window.clearTimeout(combineTimer);
    if (joinTimer) window.clearTimeout(joinTimer);
    if (joinRaf) window.cancelAnimationFrame(joinRaf);
    combineTimer = 0;
    joinTimer = 0;
    joinRaf = 0;
  }

  function confirmHome() {
    if (session.tripDone) {
      goMap();
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const card = document.createElement('div');
    card.className = 'card';
    const stay = document.createElement('button');
    stay.className = 'play-engine confirm-stay';
    stay.setAttribute('aria-label', 'Keep playing');
    stay.appendChild(renderTrainImg('train-art'));
    onActivate(stay, () => overlay.remove());
    const leave = document.createElement('button');
    leave.className = 'parade-stations confirm-leave';
    leave.setAttribute('aria-label', 'Stations');
    leave.appendChild(renderStationImg('station-art'));
    onActivate(leave, goMap);
    card.append(stay, leave);
    overlay.appendChild(card);
    root.querySelector('.screen').appendChild(overlay);
  }

  function pulseChoice(value) {
    const btn = answersHost?.querySelector(`.choice[data-value="${value}"]`);
    if (!btn) return;
    btn.classList.add('is-pulse');
    window.setTimeout(() => btn.classList.remove('is-pulse'), 280);
  }

  async function autoCount(problem) {
    counting = true;
    const ms = ctx.reduceMotion() ? AUTO_COUNT_REDUCED_MS : AUTO_COUNT_MS;
    if (problem && problem.op === 'order' && Array.isArray(problem.sequence)) {
      const start = (session.placed || []).length;
      for (let i = start; i < problem.sequence.length; i += 1) {
        const n = problem.sequence[i];
        pulseChoice(n);
        ctx.audio.speakNumber(n, 'count');
        await new Promise((r) => window.setTimeout(r, ms));
      }
      counting = false;
      return;
    }
    const packed = packedFor(problem, false);
    for (const animal of packed) {
      pulseCell(problemHost, animal.cell);
      ctx.audio.speakNumber(animal.cell + 1, 'count');
      await new Promise((r) => window.setTimeout(r, ms));
    }
    counting = false;
  }

  function youWin() {
    ctx.show('parade', { routeId: session.routeId, toots: session.toots });
  }

  function normalizeParts(raw) {
    if (!raw || !raw.length) return null;
    return raw.map((p) => {
      if (p && typeof p === 'object' && !Array.isArray(p) && p.text != null) return p;
      if (Array.isArray(p) && p.length >= 2) return { className: String(p[0]), text: String(p[1]) };
      const text = String(p);
      const isOp = ['+', '−', '-', '=', 'vs', '?', '◀', '▶', '→', '📅', '🔢'].includes(text);
      return { className: isOp ? 'eq-op' : 'eq-num', text };
    });
  }

  function packedFor(problem, celebrating) {
    const spec = packSpecFor(problem);
    const split = frameCellCount(problem.frameSize);
    if (!spec || !problem.op || problem.op === 'add') return packAnimals(problem.a, problem.b, problem.frameSize);
    if (spec.kind === 'takeaway') {
      const out = [];
      for (let i = 0; i < spec.stay; i++) out.push({ species: 'A', cell: i, frame: i < split ? 1 : 2 });
      if (!celebrating) {
        for (let i = 0; i < spec.leave; i++) {
          const cell = spec.stay + i;
          out.push({ species: 'B', cell, frame: cell < split ? 1 : 2, leaving: true });
        }
      }
      return out;
    }
    if (spec.kind === 'missing') {
      const out = [];
      for (let i = 0; i < spec.seated; i++) out.push({ species: 'A', cell: i, frame: 1 });
      if (celebrating) {
        for (let i = 0; i < spec.missing; i++) {
          out.push({ species: 'A', cell: spec.seated + i, frame: 1 });
        }
      }
      return out;
    }
    if (spec.kind === 'compare') {
      const out = [];
      for (let i = 0; i < spec.left; i++) out.push({ species: 'A', cell: i, frame: 1 });
      for (let i = 0; i < spec.right; i++) out.push({ species: 'B', cell: split + i, frame: 2 });
      return out;
    }
    if (spec.kind === 'bond') {
      const out = [];
      for (let i = 0; i < spec.a; i++) out.push({ species: 'A', cell: i, frame: 1 });
      if (celebrating) {
        for (let i = 0; i < spec.b; i++) {
          out.push({ species: 'B', cell: spec.a + i, frame: 1 });
        }
      }
      return out;
    }
    if (spec.kind === 'count') {
      return packCount(spec.n, problem.frameSize);
    }
    if (spec.kind === 'order') return [];
    return packAnimals(problem.a, problem.b, problem.frameSize);
  }

  function paintEquation(problem) {
    const celebrating = session.status === 'celebrating';
    eqEl.classList.toggle('is-correct', celebrating);
    eqEl.replaceChildren();
    const custom = normalizeParts(equationPartsFor(problem, { celebrating, placed: session.placed || [] }));
    const parts = custom || [
      { className: 'eq-num eq-a', text: String(problem.a) },
      { className: 'eq-op', text: '+' },
      { className: 'eq-num eq-b', text: String(problem.b) },
      { className: 'eq-op', text: '=' },
      { className: celebrating ? 'eq-sum is-reveal' : 'eq-sum', text: celebrating ? String(problem.answer ?? problem.sum) : '?' },
    ];
    for (const part of parts) {
      const span = document.createElement('span');
      span.className = part.className;
      span.textContent = part.text;
      eqEl.appendChild(span);
    }
  }

  function playCorrectFx() {
    ctx.audio.playSfx('cheer');
    ctx.audio.playSfx('sparkle');
    ctx.audio.playSfx('toot-short');
    if (currentProblem(session)?.op === 'takeaway') ctx.audio.playSfx('hop');
    if (currentProblem(session)?.op === 'order') ctx.audio.playSfx('ticket-punch');
    burstCelebrate(screenEl, { reduced: ctx.reduceMotion() });
    problemHost?.querySelectorAll('.cell').forEach((cell) => {
      if (cell.querySelector('.sprite')) cell.classList.add('is-cheer');
    });
  }

  function nudgeLocked() {
    ctx.audio.playSfx('nudge');
    if (!session.combined) wiggleLever(problemHost?.querySelector('.lever'));
  }

  function speakCount(idx) {
    counted.add(idx);
    ctx.audio.speakNumber(idx, 'count');
    pulseCell(problemHost, idx - 1);
  }

  function wireCountTaps(groupEl, startCount) {
    [...groupEl.children].forEach((child, i) => {
      const n = startCount + i;
      let cell = child;
      if (!child.classList.contains('cell')) {
        cell = document.createElement('div');
        cell.className = 'cell';
        groupEl.replaceChild(cell, child);
        cell.appendChild(child);
      }
      cell.dataset.cell = String(n - 1);
      cell.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        speakCount(n);
      });
    });
  }

  function kickAutoJoin(row, problem) {
    if (!row || problem.requireCombine || ctx.reduceMotion() || session.combined) return;
    const ms = Math.max(JOIN_MS, (session.autoCombineAt || 0) - Date.now());
    row.style.setProperty('--join-ms', `${ms}ms`);
    joinRaf = window.requestAnimationFrame(() => {
      joinRaf = window.requestAnimationFrame(() => {
        if (!row.isConnected || session.combined) return;
        row.classList.add('is-joining');
      });
    });
  }

  function finishCombine({ fromLever } = {}) {
    if (session.combined) return;
    const id = roundId;
    clearCombineWait();
    applyCombine(session);
    ctx.audio.playSfx('couple-clank');
    ctx.audio.playSfx('merge');
    const row = problemHost?.querySelector('.frame-row');
    const alreadyJoining = row?.classList.contains('is-joining');
    const playJoin = row && !ctx.reduceMotion() && (fromLever || !alreadyJoining);
    if (!playJoin) {
      paintProblem();
      return;
    }
    row.classList.add('is-joining');
    row.style.setProperty('--join-ms', `${JOIN_MS}ms`);
    const lever = row.querySelector('.lever');
    if (lever) {
      lever.classList.add('is-down');
      lever.classList.remove('is-pulse');
    }
    joinTimer = window.setTimeout(() => {
      if (id !== roundId) return;
      paintProblem();
    }, JOIN_MS);
  }

  function scheduleAutoCombine(id) {
    const problem = currentProblem(session);
    const delay = autoCombineDelayMs(problem, session, ctx.reduceMotion(), Date.now());
    if (delay == null || session.combined) return;
    combineTimer = window.setTimeout(() => {
      if (id !== roundId || session.combined) return;
      finishCombine({ fromLever: false });
    }, delay);
  }

  function beginRound() {
    roundId += 1;
    clearCombineWait();
    const problem = currentProblem(session);
    const delay = autoCombineDelayMs(problem, session, ctx.reduceMotion(), Date.now());
    if (delay === 0) applyCombine(session);
    paintProblem();
    scheduleAutoCombine(roundId);
  }

  function renderWaitingRow(problem) {
    const row = document.createElement('div');
    row.className = 'frame-row is-apart';
    const left = renderGroup({ count: problem.a, species: problem.speciesA, side: 'left' });
    const right = renderGroup({ count: problem.b, species: problem.speciesB, side: 'right' });
    wireCountTaps(left, 1);
    wireCountTaps(right, (problem.a || 0) + 1);
    const hitch = document.createElement('div');
    hitch.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 auto;align-self:center;';
    const plus = document.createElement('span');
    plus.className = 'plus-sign';
    plus.textContent = '+';
    plus.setAttribute('aria-hidden', 'true');
    const lever = renderCoupleLever({
      pulse: !!problem.requireCombine,
      onCouple: () => finishCombine({ fromLever: true }),
    });
    hitch.append(plus, lever);
    row.append(left, hitch, right);
    kickAutoJoin(row, problem);
    return row;
  }

  async function onChoose(n) {
    if (Date.now() < lockUntil || counting) return;
    lockUntil = Date.now() + ANSWER_LOCK_MS;
    const result = applyAnswer(session, n);
    if (result.ignored) {
      nudgeLocked();
      return;
    }
    if (result.partial) {
      dimmed.delete(n);
      ctx.audio.playSfx('ticket-punch');
      ctx.audio.speakNumber(n, 'count');
      paintProblem();
      return;
    }
    if (!result.correct) {
      dimmed.add(n);
      ctx.audio.playSfx('nudge');
      if (result.hintLevel === 1) ctx.audio.speakTryAgain();
      paintProblem();
      if (result.hintLevel === 2) await autoCount(currentProblem(session));
      return;
    }
    dimmed.delete(n);
    persistCorrect(result);
    const spoken = currentProblem(session);
    const spokenN =
      spoken.op === 'order' && Array.isArray(spoken.sequence)
        ? spoken.sequence[spoken.sequence.length - 1]
        : spoken.answer ?? spoken.sum;
    if (typeof spokenN === 'number') {
      ctx.audio.speakNumber(spokenN, 'sum');
    }
    setJourneyProgress(journeyEl, progress());
    paintProblem();
    playCorrectFx();
    const wait = ctx.reduceMotion() ? 400 : Math.max(CHUG_MS, 700);
    window.setTimeout(() => {
      if (result.tripDone) {
        youWin();
        return;
      }
      advance(session, Date.now());
      dimmed = new Set();
      counted = new Set();
      beginRound();
    }, wait);
  }

  function ensureShell() {
    if (problemHost) return;
    const layout = document.documentElement.dataset.layout || 'wide';
    if (layout === 'unsupported') {
      root.innerHTML = `<div class="shell"><div class="unsupported-card">Turn the iPad<br/>or use full screen</div></div>`;
      return;
    }
    root.innerHTML = '';
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.innerHTML = sceneryMarkup();
    screenEl = screen;

    const chrome = document.createElement('div');
    chrome.className = 'chrome';
    muteHost = document.createElement('div');
    chrome.appendChild(muteHost);
    const spacer = document.createElement('div');
    chrome.appendChild(spacer);
    const home = document.createElement('button');
    home.className = 'chrome-btn';
    home.setAttribute('aria-label', 'Home');
    home.textContent = '⌂';
    onActivate(home, confirmHome);
    chrome.appendChild(home);

    eqEl = document.createElement('div');
    eqEl.className = 'equation';

    const stage = document.createElement('div');
    stage.className = 'trip-stage';
    problemHost = document.createElement('div');
    problemHost.className = 'trip-problem';
    answersHost = document.createElement('div');
    answersHost.className = 'answers-host';
    stage.append(problemHost, answersHost);

    journeyEl = renderJourney({ progress: 0 });

    screen.append(chrome, eqEl, stage, journeyEl);
    root.appendChild(screen);
  }

  function paintProblem() {
    ensureShell();
    if (!problemHost || !answersHost) return;
    const problem = currentProblem(session);
    muteHost.replaceChildren(
      renderMuteButton({
        muted: ctx.save.settings.muted,
        onToggle: () => {
          ctx.toggleMute();
          paintProblem();
        },
      }),
    );
    paintEquation(problem);
    eqEl.classList.toggle('is-order', problem.op === 'order');

    const box = viewportSize();
    const strip = useStrip(problem, ctx.save.mastery, features, {
      width: box.width,
      height: box.height,
      layout: document.documentElement.dataset.layout || 'wide',
    });
    const packed = packedFor(problem, session.status === 'celebrating');
    problemHost.innerHTML = '';
    const waiting = !session.combined && session.status !== 'celebrating' && isJoinAdd(problem);
    if (problem.op === 'order') {
      const placed = session.status === 'celebrating' ? problem.sequence : session.placed || [];
      problemHost.appendChild(
        renderOrderLine({
          sequence: problem.sequence,
          placed,
          speciesA: problem.speciesA,
          speciesB: problem.speciesB,
          celebrating: session.status === 'celebrating',
          onTap: (day) => ctx.audio.speakNumber(day, 'count'),
        }),
      );
    } else if (waiting) {
      problemHost.appendChild(renderWaitingRow(problem));
    } else {
      const row = document.createElement('div');
      const frameCount = Math.max(1, problem.frameCount || 1);
      row.className = frameCount > 2 ? 'frame-row is-count' : 'frame-row';
      const emptySeats = problem.op === 'missing' || problem.op === 'bond' || problem.op === 'count';
      for (let id = 1; id <= frameCount; id += 1) {
        row.appendChild(
          renderFrame({
            size: problem.frameSize,
            packed,
            frameId: id,
            speciesA: problem.speciesA,
            speciesB: problem.speciesB,
            emptySeats,
            onTapAnimal: (idx) => speakCount(idx),
          }),
        );
      }
      problemHost.appendChild(row);
    }
    const used = new Set(session.placed || []);
    if (problem.op === 'order' && session.status === 'celebrating') {
      (problem.sequence || []).forEach((n) => used.add(n));
    }
    const halo = session.hintLevel >= 3 ? nextExpected(session) : null;
    answersHost.replaceChildren(
      renderNumberChoices({
        choices: problem.choices,
        strip,
        disabled: session.status === 'celebrating' || !session.combined,
        halo,
        dimmed,
        used: problem.op === 'order' ? used : undefined,
        onChoose,
        onDisabledTap: nudgeLocked,
      }),
    );
    setJourneyProgress(journeyEl, progress());
  }

  beginRound();
  const onResize = () => {
    const step = progress();
    problemHost = null;
    answersHost = null;
    journeyEl = null;
    screenEl = null;
    clearCombineWait();
    paintProblem();
    scheduleAutoCombine(roundId);
    setJourneyProgress(journeyEl, step, { instant: true });
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('resize', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
    clearCombineWait();
  };
}
