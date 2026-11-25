function piece(text, { blank = false, known = false } = {}) {
  const span = document.createElement('span');
  span.className = `eq-piece${blank ? ' is-blank' : ''}${known ? ' is-known' : ''}`;
  span.textContent = text;
  return span;
}

export function renderEquation(host, problem, { visible, solved, taken = 0 }) {
  host.replaceChildren();
  host.className = 'equation';
  if (!visible) {
    host.classList.add('is-hidden');
    return host;
  }
  const unknown = problem.mode === 'oops' ? 'take' : 'left';
  const takeText = unknown === 'take' && !solved ? '?' : String(problem.take);
  const leftText = unknown === 'left' && !solved ? '?' : String(problem.left);
  host.append(
    piece(String(problem.start)),
    piece('−'),
    piece(takeText, { blank: takeText === '?' }),
    piece('='),
    piece(leftText, { blank: leftText === '?', known: solved && unknown === 'left' }),
  );
  if (problem.mode === 'tenTrick' && problem.split) {
    const row = document.createElement('div');
    row.className = 'split-row';
    const [ones, rest] = problem.split;
    const first = document.createElement('span');
    const second = document.createElement('span');
    const secondOn = taken >= ones;
    first.className = `split${secondOn ? ' is-done' : ' is-on'}`;
    second.className = `split${taken >= problem.take ? ' is-done' : secondOn ? ' is-on' : ''}`;
    first.textContent = String(ones);
    second.textContent = String(rest);
    row.append(first, second);
    host.appendChild(row);
  }
  return host;
}
