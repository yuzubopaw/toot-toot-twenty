import { onActivate } from '../input/pointer.js';
import { renderCustomer } from '../../ui/Customer.js';
import { renderEquation } from '../../ui/Equation.js';
import { renderNumberPath } from '../../ui/NumberPath.js';
import { renderOhNoSign } from '../../ui/OhNoSign.js';
import { scoopSvg } from '../../ui/Scoop.js';
import { renderTray } from '../../ui/Tray.js';

const NEXT_FLAVOUR = Object.freeze({
  strawberry: 'vanilla',
  vanilla: 'mint',
  mint: 'chocolate',
  chocolate: 'blueberry',
  blueberry: 'strawberry',
});

export function mountStage(stage, round, api) {
  const problem = round.problem;
  const solved = round.phase === 'solved';
  const oops = problem.mode === 'oops';
  const fallen = oops ? (api.looking ? 0 : problem.take) : (api.displayTaken ?? round.taken);
  stage.replaceChildren();

  const layout = document.createElement('div');
  layout.className = `play-layout mode-${problem.mode}`;

  const customer = document.createElement('div');
  renderCustomer(customer, {
    id: problem.customer,
    flavour: problem.flavour,
    scoops: solved ? (oops ? problem.start : problem.left) : 0,
    leaving: solved,
  });

  const mid = document.createElement('div');
  mid.className = 'play-mid';
  if (problem.mode === 'dripDrop') {
    const path = document.createElement('div');
    renderNumberPath(path, { start: problem.start, taken: fallen });
    mid.appendChild(path);
  }

  const trays = document.createElement('div');
  renderTray(trays, {
    start: problem.start,
    fallen,
    flavour: problem.flavour,
    topFlavour: problem.mode === 'tenTrick' ? NEXT_FLAVOUR[problem.flavour] : null,
    ghosts: oops && !api.looking,
    wobble: round.phase === 'acting' && !api.reduceMotion,
    splatIndex: api.splat && problem.mode !== 'dripDrop' ? problem.start - fallen : -1,
    cue: api.cue || 0,
    cueGhosts: oops,
    onTray: round.phase === 'acting' ? api.onAct : null,
    onGhost: oops && !api.looking ? api.onGhost : null,
  });
  if (solved) trays.classList.add('is-sprinkle');
  if (oops && api.looking) {
    const badge = document.createElement('div');
    badge.className = 'start-badge';
    badge.textContent = String(problem.start);
    trays.appendChild(badge);
  }
  mid.appendChild(trays);

  const equation = document.createElement('div');
  const showEquation = !api.looking && (round.phase !== 'acting' || problem.band !== 'A');
  renderEquation(equation, problem, { visible: showEquation, solved, taken: fallen });
  mid.appendChild(equation);

  if (problem.mode === 'tenTrick' && api.showTen) {
    const ten = document.createElement('div');
    ten.className = 'ten-badge';
    ten.textContent = 'Ten!';
    mid.appendChild(ten);
  }

  if (round.phase === 'acting') {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'action-btn';
    action.setAttribute('aria-label', 'Oh no');
    action.innerHTML = scoopSvg(problem.flavour);
    const count = document.createElement('span');
    count.className = 'action-count';
    count.textContent = String(problem.take - fallen);
    action.appendChild(count);
    onActivate(action, () => api.onAct());
    mid.appendChild(action);
  }

  const sign = document.createElement('div');
  renderOhNoSign(sign, oops ? '?' : problem.take - fallen);

  layout.append(customer, mid, sign);
  stage.appendChild(layout);
}
