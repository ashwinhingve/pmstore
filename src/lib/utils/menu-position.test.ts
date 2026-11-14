import { describe, expect, it } from 'vitest';
import { menuPosition } from './menu-position';
describe('account menu viewport boundaries', () => {
  it.each([320, 360, 390, 768, 1024, 1440])('stays in a %spx viewport for either alignment', width => {
    for (const align of ['left', 'right'] as const) {
      const result = menuPosition({ left: width - 100, right: width - 56, top: 80, bottom: 124 }, { width, height: 740 }, 450, align);
      expect(result.left).toBeGreaterThanOrEqual(12);
      expect(result.left + result.width).toBeLessThanOrEqual(width - 12);
      expect(result.top + result.maxHeight).toBeLessThanOrEqual(728);
    }
  });
  it('flips above a low trigger and supports zoomed visual viewports', () => {
    const result = menuPosition({ left: 200, right: 244, top: 600, bottom: 644 }, { width: 320, height: 700, top: 0 }, 350, 'right');
    expect(result.top).toBeLessThan(600);
    const zoom = menuPosition({ left: 200, right: 244, top: 600, bottom: 644 }, { width: 220, height: 400, left: 100, top: 400 }, 350, 'right');
    expect(zoom.left).toBeGreaterThanOrEqual(112);
    expect(zoom.left + zoom.width).toBeLessThanOrEqual(308);
  });
});
