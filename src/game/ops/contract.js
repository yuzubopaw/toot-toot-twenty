/** Shared shape for every math mode. Parent wires Map/Trip/session to these ids. */

export const OP = {
  ADD: 'add',
  TAKEAWAY: 'takeaway',
  MISSING: 'missing',
  COMPARE: 'compare',
  BOND: 'bond',
  COUNT: 'count',
  ORDER: 'order',
};

export const MODE_ROUTES = {
  takeaway: 7,
  missing: 8,
  compare: 9,
  bond: 10,
  mixed: 11,
  count: 12,
  order: 13,
};

export const MAX_ROUTE_ID = 13;

export const MODE_STATIONS = [
  { id: 7, op: OP.TAKEAWAY, name: 'Hop-Off Halt', emoji: '🍃' },
  { id: 8, op: OP.MISSING, name: 'Spare Seat', emoji: '🪑' },
  { id: 9, op: OP.COMPARE, name: 'Twin Tracks', emoji: '⚖️' },
  { id: 10, op: OP.BOND, name: 'Ten Bond Bay', emoji: '🧩' },
  { id: 11, op: 'mixed', name: 'Mix-Up Main', emoji: '🎲' },
  { id: 12, op: OP.COUNT, name: 'Tally Track', emoji: '🖐️' },
  { id: 13, op: OP.ORDER, name: 'Date Depot', emoji: '📅' },
];

/**
 * Every next*() must return an object with at least:
 * - op: one of OP.*
 * - routeId: number
 * - a, b: non-negative integers (compare: two group sizes; bond: parts that sum to 10;
 *   order: first and last of a 1–31 sequence)
 * - answer: value the child must tap (number, or for compare 'left'|'right'|'same';
 *   order: the next number in the sequence, starting at sequence[0])
 * - factKey: string unique for mastery
 * - speciesA, speciesB: ids or null
 * - choices: array of tap values (same type as answer)
 * - choiceCount: choices.length
 * - input: 'choices'
 * - requireCombine: boolean
 * - frameSize: 5 | 10
 * - frameCount: 1..5 (count mode uses up to five 10-frames for 41–50)
 * - strategy: string
 * - sum: a+b when it exists; takeaway uses start count
 *
 * Also export:
 * - ROUTE_ID, STATION
 * - generateTrip(args) -> problem[] length 6
 * - isCorrect(problem, value)
 * - equationParts(problem, { celebrating })
 * - packSpec(problem) describing how to draw groups
 */
export function baseProblem(partial) {
  return {
    op: OP.ADD,
    input: 'choices',
    requireCombine: true,
    frameSize: 5,
    frameCount: 1,
    strategy: 'count-all',
    makeTenSplit: false,
    splitIntoFirst: 0,
    ...partial,
  };
}
