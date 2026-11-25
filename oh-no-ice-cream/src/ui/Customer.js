import { spriteUrl } from './assetUrl.js';
import { coneSvg, scoopSvg } from './Scoop.js';

export function renderCustomer(host, { id, flavour, scoops = 0, leaving = false }) {
  host.replaceChildren();
  host.className = `customer${leaving ? ' is-leaving' : ''}`;
  const img = document.createElement('img');
  img.src = spriteUrl(id);
  img.alt = '';
  img.className = 'customer-animal';
  host.appendChild(img);
  if (scoops > 0) {
    const cone = document.createElement('div');
    cone.className = 'customer-cone';
    const stack = Math.min(3, scoops);
    for (let i = 0; i < stack; i += 1) {
      cone.insertAdjacentHTML('afterbegin', scoopSvg(flavour));
    }
    cone.insertAdjacentHTML('beforeend', coneSvg());
    host.appendChild(cone);
  }
  return host;
}
