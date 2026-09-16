import { COLLECTIBLES, overlayStamp } from '../../game/collectibles.js';
import { starsFor } from '../../game/scoring.js';
import { engineSvg, renderSprite, renderStationImg, renderTrainImg } from '../../ui/Sprite.js';
import { onActivate } from '../input/pointer.js';
import { sceneryMarkup } from '../../ui/Scenery.js';
import { burstCelebrate } from '../../ui/Celebrate.js';

const SKIP_MS = 1500;
const PARADE_MS = 5500;
const RIDERS = ['duck', 'bunny', 'puppy', 'kitten'];

/** Parent: ctx.show('parade', { routeId, toots: session.toots }) */
export const paradeParams = (routeId, toots) => ({ routeId, toots });

function latestCollectible(collection) {
  const ids = collection?.unlockedIds || [];
  if (!ids.length) return null;
  return COLLECTIBLES.find((c) => c.id === ids[ids.length - 1]) || null;
}

function riderIds(item) {
  if (item?.kind === 'animal' && item.id) {
    return [item.id, ...RIDERS.filter((id) => id !== item.id)].slice(0, 4);
  }
  return RIDERS.slice();
}

function renderPrize(item, stamp) {
  if (!item && !stamp) return null;
  const prize = document.createElement('div');
  prize.className = 'parade-prize';
  prize.setAttribute('aria-hidden', 'true');
  if (item?.kind === 'animal') {
    prize.appendChild(renderSprite(item.id, 'parade-prize-art'));
  } else if (item?.kind === 'engine') {
    prize.innerHTML = engineSvg(item.color || '#E85D4C');
  } else if (item) {
    const car = document.createElement('div');
    car.className = 'parade-car is-prize';
    car.style.background = item.color || '#F4A6C3';
    prize.appendChild(car);
  }
  if (stamp) {
    const badge = document.createElement('span');
    badge.className = 'parade-stamp';
    badge.textContent = '⭐';
    prize.appendChild(badge);
  }
  return prize;
}

export function renderParadeScreen(root, ctx, params = {}) {
  const routeId = params.routeId || 1;
  const toots = params.toots || 0;
  const stars = starsFor(toots);
  const collection = ctx.save.collection;
  const item = latestCollectible(collection);
  const stamp = overlayStamp(collection);
  const reduced = ctx.reduceMotion();
  const timers = [];

  const later = (ms, fn) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const stop = () => {
    while (timers.length) window.clearTimeout(timers.pop());
  };
  const go = (name, next = {}) => {
    stop();
    ctx.show(name, next);
  };
  const finish = () => go('map');

  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen parade-screen';
  screen.innerHTML = sceneryMarkup();

  const chrome = document.createElement('div');
  chrome.className = 'chrome';
  const spacer = document.createElement('div');
  chrome.appendChild(spacer);

  const banner = document.createElement('div');
  banner.className = 'parade-banner';
  const starsRow = document.createElement('div');
  starsRow.className = 'parade-stars';
  starsRow.setAttribute('aria-label', `${stars} of 3 stars`);
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = `parade-star${i < stars ? ' is-on' : ''}`;
    star.style.setProperty('--parade-delay', `${i * 140}ms`);
    star.textContent = i < stars ? '★' : '☆';
    starsRow.appendChild(star);
  }
  banner.appendChild(starsRow);
  const prize = renderPrize(item, stamp);
  if (prize) banner.appendChild(prize);

  const track = document.createElement('div');
  track.className = 'parade-track';
  const rail = document.createElement('div');
  rail.className = 'parade-rail';
  rail.setAttribute('aria-hidden', 'true');
  const train = document.createElement('div');
  train.className = 'parade-train';
  train.style.animationDuration = `${PARADE_MS}ms`;
  const steam = document.createElement('span');
  steam.className = 'parade-steam';
  steam.setAttribute('aria-hidden', 'true');
  train.appendChild(steam);
  train.appendChild(renderTrainImg('train-art parade-engine'));

  const featuredColor = item?.color || '#F5C542';
  const cars = [featuredColor, '#4A90D9', '#F4A6C3'];
  cars.forEach((color, i) => {
    const car = document.createElement('div');
    car.className = `parade-car${i === 0 && item && item.kind !== 'animal' ? ' is-new' : ''}`;
    car.style.background = color;
    if (i === 0 && item?.kind === 'engine') {
      car.innerHTML = engineSvg(item.color || color);
    }
    train.appendChild(car);
  });

  const riders = document.createElement('div');
  riders.className = 'parade-animals';
  riderIds(item).forEach((id, i) => {
    const wrap = document.createElement('span');
    wrap.className = 'parade-animal';
    wrap.style.setProperty('--parade-delay', `${i * 120}ms`);
    wrap.appendChild(renderSprite(id));
    riders.appendChild(wrap);
  });
  train.appendChild(riders);
  track.append(rail, train);

  const actions = document.createElement('div');
  actions.className = 'parade-actions';
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'play-engine parade-again is-pulse';
  more.setAttribute('aria-label', 'Play again');
  more.appendChild(renderTrainImg('train-art'));
  later(SKIP_MS, () => more.classList.add('is-ready'));
  onActivate(more, () => go('trip', { routeId }));
  const mapBtn = document.createElement('button');
  mapBtn.type = 'button';
  mapBtn.className = 'parade-stations';
  mapBtn.setAttribute('aria-label', 'Stations');
  mapBtn.appendChild(renderStationImg('station-art'));
  onActivate(mapBtn, finish);
  actions.append(more, mapBtn);

  screen.append(chrome, banner, track, actions);
  root.appendChild(screen);

  ctx.audio.playSfx('toot-long');
  ctx.audio.playSfx('cheer');
  burstCelebrate(screen, { reduced });
  if (!reduced) {
    later(Math.min(2200, PARADE_MS - 400), () => burstCelebrate(screen, { reduced: false }));
  }

  return stop;
}
