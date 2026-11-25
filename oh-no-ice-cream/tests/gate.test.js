import { describe, expect, it } from 'vitest';
import { bundleParentHref } from '../src/app/gate.js';

describe('gate', () => {
  it('links back to the chooser only from a bundled path', () => {
    expect(bundleParentHref('/yuzubomath/oic/')).toBe('../');
    expect(bundleParentHref('/')).toBeNull();
  });
});
