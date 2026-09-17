import { describe, expect, it } from 'vitest';
import { muteButtonView } from '../src/ui/MuteButton.js';

describe('mute button view', () => {
  it('flips icon and label with muted state', () => {
    expect(muteButtonView(false)).toEqual({ label: 'Mute sound', text: '🔊' });
    expect(muteButtonView(true)).toEqual({ label: 'Unmute sound', text: '🔇' });
  });
});
