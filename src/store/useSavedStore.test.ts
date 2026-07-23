import { describe, it, expect } from 'vitest';
import { applyToggle } from './useSavedStore';

describe('applyToggle', () => {
  it('adds an id that is not saved and reports nowSaved', () => {
    const r = applyToggle(['a'], 'b');
    expect(r.ids).toContain('b');
    expect(r.nowSaved).toBe(true);
  });

  it('removes an id that is already saved and reports not saved', () => {
    const r = applyToggle(['a', 'b'], 'b');
    expect(r.ids).not.toContain('b');
    expect(r.nowSaved).toBe(false);
  });

  it('never duplicates ids', () => {
    const r = applyToggle(['a'], 'a'); // toggling an existing removes it
    expect(r.ids).toEqual([]);
    const r2 = applyToggle(['a', 'b'], 'c');
    expect(new Set(r2.ids).size).toBe(r2.ids.length);
  });

  it('is reversible — toggling twice returns to the start', () => {
    const once = applyToggle(['a'], 'b');
    const twice = applyToggle(once.ids, 'b');
    expect(twice.ids.sort()).toEqual(['a']);
  });
});
