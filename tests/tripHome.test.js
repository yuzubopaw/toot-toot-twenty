import { describe, expect, it } from 'vitest';
import { tripHomePlan } from '../src/app/screens/TripScreen.js';

describe('tripHomePlan', () => {
  it('confirms leave and sends the child to title while a trip is in progress', () => {
    expect(tripHomePlan({ tripDone: false })).toEqual({ confirm: true, screen: 'title' });
  });

  it('skips the overlay and goes to title when the trip is already done', () => {
    expect(tripHomePlan({ tripDone: true })).toEqual({ confirm: false, screen: 'title' });
  });
});
