import { MODE_ROUTES } from './contract.js';
import * as takeAway from './takeAway.js';
import * as missingAddend from './missingAddend.js';
import * as compare from './compare.js';
import * as bonds from './bonds.js';
import * as mixed from './mixed.js';
import * as count from './count.js';
import * as order from './order.js';

const BY_ROUTE = {
  [MODE_ROUTES.takeaway]: takeAway,
  [MODE_ROUTES.missing]: missingAddend,
  [MODE_ROUTES.compare]: compare,
  [MODE_ROUTES.bond]: bonds,
  [MODE_ROUTES.mixed]: mixed,
  [MODE_ROUTES.count]: count,
  [MODE_ROUTES.order]: order,
};

const BY_OP = {
  takeaway: takeAway,
  missing: missingAddend,
  compare: compare,
  bond: bonds,
  count,
  order,
};

export function modeFor(routeId) {
  return BY_ROUTE[routeId] || null;
}

export function generateModeTrip(routeId, args) {
  const mode = BY_ROUTE[routeId];
  if (mode && typeof mode.generateTrip === 'function') return mode.generateTrip(args);
  return null;
}

export function equationPartsFor(problem, ctx) {
  if (!problem) return null;
  const mode = BY_OP[problem.op] || BY_ROUTE[problem.routeId];
  if (mode && typeof mode.equationParts === 'function') return mode.equationParts(problem, ctx);
  return null;
}

export function packSpecFor(problem) {
  if (!problem) return null;
  const mode = BY_OP[problem.op] || BY_ROUTE[problem.routeId];
  if (mode && typeof mode.packSpec === 'function') return mode.packSpec(problem);
  return null;
}

export { takeAway, missingAddend, compare, bonds, mixed, count, order };
