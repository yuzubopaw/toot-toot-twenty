import { beforeEach, describe, expect, it } from 'vitest';
import { isTap, onActivate, resetActivateGate } from '../src/app/input/pointer.js';

function fakeEl() {
  const handlers = {};
  return {
    addEventListener(type, fn) {
      (handlers[type] ||= []).push(fn);
    },
    emit(type, extra = {}) {
      const event = { type, button: 0, ...extra };
      for (const fn of handlers[type] || []) fn(event);
    },
  };
}

describe('isTap', () => {
  it('treats a small move as a tap', () => {
    expect(isTap({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(true);
    expect(isTap({ x: 0, y: 0 }, { x: 40, y: 0 })).toBe(false);
  });
});

describe('onActivate', () => {
  beforeEach(() => resetActivateGate());

  it('fires once for pointerup then click on the same button', () => {
    const el = fakeEl();
    let n = 0;
    onActivate(el, () => {
      n += 1;
    });
    el.emit('pointerup');
    el.emit('click');
    expect(n).toBe(1);
  });

  it('swallows a click on a replacement button after pointerup (mute/settings re-render)', () => {
    const first = fakeEl();
    const second = fakeEl();
    const hits = [];
    onActivate(first, () => hits.push('a'));
    onActivate(second, () => hits.push('b'));
    first.emit('pointerup');
    second.emit('click');
    expect(hits).toEqual(['a']);
  });

  it('still allows a new pointerup on a different button (order sequence)', () => {
    const first = fakeEl();
    const second = fakeEl();
    const hits = [];
    onActivate(first, () => hits.push('4'));
    onActivate(second, () => hits.push('5'));
    first.emit('pointerup');
    second.emit('pointerup');
    expect(hits).toEqual(['4', '5']);
  });

  it('click-only devices still activate', () => {
    const el = fakeEl();
    let n = 0;
    onActivate(el, () => {
      n += 1;
    });
    el.emit('click');
    expect(n).toBe(1);
  });
});
