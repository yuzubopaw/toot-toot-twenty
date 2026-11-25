export const MODES = Object.freeze(['plop', 'dripDrop', 'oops', 'tenTrick', 'sampler']);
export const PLAYABLE = Object.freeze(['plop', 'dripDrop', 'oops', 'tenTrick']);
export const TRIP_LENGTH = 5;
export const RECENT_CAP = 8;

export const BAND_LADDER = Object.freeze({
  plop: Object.freeze(['A', 'B', 'C', 'D']),
  dripDrop: Object.freeze(['A', 'B', 'C']),
  oops: Object.freeze(['A', 'B', 'C']),
  tenTrick: Object.freeze(['D']),
});

export const MODE_COPY = Object.freeze({
  plop: { name: 'Plop!', label: 'Plop' },
  dripDrop: { name: 'Drip Drop', label: 'Drip Drop' },
  oops: { name: 'Oops!', label: 'Oops' },
  tenTrick: { name: 'Ten Trick', label: 'Ten Trick' },
  sampler: { name: 'Sundae Sampler', label: 'Sundae Sampler' },
});

export const FLAVOURS = Object.freeze(['strawberry', 'vanilla', 'mint', 'chocolate', 'blueberry']);

export const CUSTOMERS = Object.freeze([
  'duck',
  'bunny',
  'puppy',
  'kitten',
  'pig',
  'chick',
  'bear',
  'frog',
  'fox',
  'panda',
]);

export function defaultBand(mode) {
  return mode === 'tenTrick' ? 'D' : 'A';
}
