import { describe, expect, it } from 'vitest';
import { paradeParams } from '../src/app/screens/ParadeScreen.js';

describe('parade play-again params', () => {
  it('keeps the station id so Play again does not drop back to Garden', () => {
    expect(paradeParams(12, 8)).toEqual({ routeId: 12, toots: 8 });
    expect(paradeParams(13, 4)).toEqual({ routeId: 13, toots: 4 });
  });
});
