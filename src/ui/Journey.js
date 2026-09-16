import { renderStationImg, renderTrainImg } from './Sprite.js';

const STOPS = 6;

export function renderJourney({ progress = 0 } = {}) {
  const el = document.createElement('div');
  el.className = 'journey';
  el.setAttribute('aria-label', 'Train to the station');
  const rail = document.createElement('div');
  rail.className = 'journey-rail';
  const sleepers = document.createElement('div');
  sleepers.className = 'journey-sleepers';
  rail.appendChild(sleepers);
  const stops = document.createElement('div');
  stops.className = 'journey-stops';
  for (let i = 0; i < STOPS; i++) {
    const d = document.createElement('span');
    d.className = 'journey-stop';
    stops.appendChild(d);
  }
  const station = document.createElement('div');
  station.className = 'journey-station';
  station.setAttribute('aria-hidden', 'true');
  station.appendChild(renderStationImg('journey-station-img'));
  const train = document.createElement('div');
  train.className = 'journey-train';
  train.appendChild(renderTrainImg('journey-train-img'));
  el.append(rail, stops, station, train);

  function setProgress(n, { instant = false } = {}) {
    const step = Math.max(0, Math.min(STOPS, n));
    el.dataset.progress = String(step);
    const reduce = document.documentElement.classList.contains('reduce-motion');
    train.style.transition = instant || reduce ? 'none' : 'left 0.85s ease-in-out';
    const trainW = train.getBoundingClientRect().width || train.offsetWidth || 280;
    const stationW = station.getBoundingClientRect().width || station.offsetWidth || 110;
    const gap = 12;
    train.style.left = `calc(${step / STOPS} * (100% - ${Math.round(trainW + stationW + gap)}px))`;
    [...stops.children].forEach((d, i) => {
      d.classList.toggle('is-lit', i < step);
    });
    el.classList.toggle('is-arrived', step >= STOPS);
    el.classList.toggle('is-chugging', !instant && !reduce && step > 0 && step < STOPS);
    if (!reduce && step > 0) {
      train.classList.add('is-tooting');
      window.setTimeout(() => train.classList.remove('is-tooting'), 900);
    }
  }

  el._setProgress = setProgress;
  window.requestAnimationFrame(() => setProgress(progress, { instant: true }));
  return el;
}

export function setJourneyProgress(el, n, opts) {
  el?._setProgress?.(n, opts);
}
