import { describe, expect, it } from 'vitest';
import { HOLD_SUN_MS, holdSunReady } from '../src/app/screens/SettingsScreen.js';

describe('hold-sun adult gate', () => {
  it('needs a full 3s press before overlay', () => {
    expect(HOLD_SUN_MS).toBe(3000);
    expect(holdSunReady(1000, 3999)).toBe(false);
    expect(holdSunReady(1000, 4000)).toBe(true);
    expect(holdSunReady(0, 5000)).toBe(false);
    expect(holdSunReady(1000, 2000)).toBe(false);
  });
});
