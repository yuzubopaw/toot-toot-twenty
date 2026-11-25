const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle cx="32" cy="16" r="8" fill="#F7A1C4" stroke="#3B2418" stroke-width="3"/>
  <circle cx="18" cy="30" r="8" fill="#A8E6CF" stroke="#3B2418" stroke-width="3"/>
  <circle cx="46" cy="30" r="8" fill="#FFF1C9" stroke="#3B2418" stroke-width="3"/>
  <path d="M24 40 H40 L34 58 H30 Z" fill="#E9B872" stroke="#3B2418" stroke-width="3"/>
</svg>`;

export function renderGateButton(href) {
  const link = document.createElement('a');
  link.className = 'chrome-btn gate-btn';
  link.href = href;
  link.setAttribute('aria-label', 'All games');
  link.innerHTML = MARK;
  return link;
}
