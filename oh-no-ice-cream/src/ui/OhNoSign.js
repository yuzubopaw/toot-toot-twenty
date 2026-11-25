function dots(value) {
  const n = Math.max(0, Math.min(10, value));
  const wrap = document.createElement('div');
  wrap.className = n === 10 ? 'sign-dots is-ten' : 'sign-dots';
  for (let i = 0; i < (n === 10 ? 10 : Math.max(n, 0)); i += 1) {
    const dot = document.createElement('span');
    if (n < 10 && i >= n) break;
    wrap.appendChild(dot);
  }
  return wrap;
}

export function renderOhNoSign(host, value) {
  host.replaceChildren();
  host.className = 'ohno-sign';
  const numeral = document.createElement('div');
  numeral.className = 'ohno-num';
  numeral.textContent = value === '?' ? '?' : String(value);
  host.appendChild(numeral);
  if (value === '?') {
    const mark = document.createElement('div');
    mark.className = 'sign-dots';
    mark.textContent = '?';
    host.appendChild(mark);
    return host;
  }
  host.appendChild(dots(Number(value)));
  return host;
}
