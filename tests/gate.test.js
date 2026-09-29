import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bundleParentHref } from '../src/app/gate.js';

describe('garden gate', () => {
  it('links the first page to both games', () => {
    const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
    expect(html).toContain('href="./ttt/"');
    expect(html).toContain('href="./jjb/"');
    expect(html).toContain('Toot-Toot Twenty');
    expect(html).toContain('Jump-Jump Bunny');
  });

  it('offers a way back only from a bundled game path', () => {
    expect(bundleParentHref('/toot-toot-twenty/ttt/')).toBe('../');
    expect(bundleParentHref('/toot-toot-twenty/jjb/index.html')).toBe('../');
    expect(bundleParentHref('/')).toBeNull();
    expect(bundleParentHref('/index.html')).toBeNull();
  });
});
