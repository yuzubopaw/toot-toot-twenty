const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <rect x="4" y="16" width="24" height="18" rx="4" fill="#E85D4C" stroke="#1A1A1A" stroke-width="3"/>
  <circle cx="12" cy="38" r="5" fill="#1A1A1A"/>
  <circle cx="22" cy="38" r="5" fill="#1A1A1A"/>
  <ellipse cx="46" cy="40" rx="10" ry="9" fill="#fff" stroke="#1A1A1A" stroke-width="3"/>
  <ellipse cx="40" cy="22" rx="3" ry="8" fill="#fff" stroke="#1A1A1A" stroke-width="2"/>
  <ellipse cx="52" cy="22" rx="3" ry="8" fill="#fff" stroke="#1A1A1A" stroke-width="2"/>
</svg>`;

export function renderGateButton(href) {
  const link = document.createElement('a');
  link.className = 'chrome-btn gate-btn';
  link.href = href;
  link.setAttribute('aria-label', 'All games');
  link.innerHTML = MARK;
  return link;
}
