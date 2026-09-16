import { spriteUrl } from './assetUrl.js';

const COLORS = ['#E85D4C', '#F5C542', '#4A90D9', '#F4A6C3', '#7ED957', '#9B6BD6', '#FFE566', '#FFFFFF'];
const KINDS = ['star', 'circle', 'ticket', 'heart', 'spark'];

function starSvg(fill) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polygon points="12,1.6 15.2,8.5 22.8,9.1 16.9,14.1 18.7,21.6 12,17.7 5.3,21.6 7.1,14.1 1.2,9.1 8.8,8.5" fill="${fill}" stroke="#1a1a1a" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
}

function heartSvg(fill) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 20.4 S3.2 14.2 3.2 8.8 A4.6 4.6 0 0 1 12 7.2 A4.6 4.6 0 0 1 20.8 8.8 C20.8 14.2 12 20.4 12 20.4 Z" fill="${fill}" stroke="#1a1a1a" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
}

function ticketSvg(fill) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3.5 7.2 h17 v3.2 a2.2 2.2 0 0 0 0 3.2 v3.2 h-17 v-3.2 a2.2 2.2 0 0 0 0 -3.2 z" fill="${fill}" stroke="#1a1a1a" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 7.4 v9.2" stroke="#1a1a1a" stroke-width="1.6" stroke-dasharray="1.6 2.2"/>
  </svg>`;
}

function sparkSvg(fill) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polygon points="12,1.2 13.6,9.2 22.8,12 13.6,14.8 12,22.8 10.4,14.8 1.2,12 10.4,9.2" fill="${fill}" stroke="#1a1a1a" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
}

function stickerMarkup(kind, fill) {
  if (kind === 'star') return starSvg(fill);
  if (kind === 'heart') return heartSvg(fill);
  if (kind === 'ticket') return ticketSvg(fill);
  if (kind === 'spark') return sparkSvg(fill);
  return '';
}

export function burstCelebrate(host, { reduced = false } = {}) {
  if (!host) return;
  host.querySelectorAll('.celebrate-layer').forEach((el) => el.remove());
  const layer = document.createElement('div');
  layer.className = 'celebrate-layer';
  layer.setAttribute('aria-hidden', 'true');
  if (reduced) {
    layer.classList.add('is-reduced');
    host.appendChild(layer);
    window.setTimeout(() => layer.remove(), 900);
    return;
  }

  const stamp = document.createElement('img');
  stamp.className = 'celebrate-spark-stamp';
  stamp.src = spriteUrl('fx-spark.webp');
  stamp.alt = '';
  stamp.draggable = false;
  layer.appendChild(stamp);

  const count = 28;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    const color = COLORS[i % COLORS.length];
    const kind = KINDS[i % KINDS.length];
    bit.className = `celebrate-bit is-${kind}`;
    if (kind === 'circle') {
      bit.style.background = color;
      const size = 12 + (i % 4) * 4;
      bit.style.width = `${size}px`;
      bit.style.height = `${size}px`;
    } else {
      bit.innerHTML = stickerMarkup(kind, color);
    }
    const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.14;
    const dist = 72 + (i % 8) * 22;
    bit.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    bit.style.setProperty('--dy', `${Math.sin(angle) * dist - 36}px`);
    bit.style.setProperty('--rot', `${(i * 37) % 360}deg`);
    bit.style.setProperty('--delay', `${(i % 7) * 16}ms`);
    bit.style.setProperty('--pop', `${0.9 + (i % 5) * 0.1}`);
    layer.appendChild(bit);
  }
  host.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1400);
}
