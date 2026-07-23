import { describe, it, expect, beforeEach } from 'vitest';
import { readRecent, addRecent, clearRecent, RECENT_SEARCHES_KEY, MAX_RECENT } from './recent-searches';

/** Minimal in-memory Storage stand-in (vitest runs in node — no real localStorage). */
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe('recent-searches', () => {
  let storage: Storage;
  beforeEach(() => {
    storage = makeStorage();
  });

  it('returns an empty list when nothing is stored', () => {
    expect(readRecent(storage)).toEqual([]);
  });

  it('adds a term to the front', () => {
    addRecent('dolo', storage);
    addRecent('paracetamol', storage);
    expect(readRecent(storage)).toEqual(['paracetamol', 'dolo']);
  });

  it('deduplicates case-insensitively and moves the repeat to the front', () => {
    addRecent('Dolo', storage);
    addRecent('paracetamol', storage);
    addRecent('DOLO', storage);
    expect(readRecent(storage)).toEqual(['DOLO', 'paracetamol']);
  });

  it('caps the list at MAX_RECENT', () => {
    for (let i = 0; i < MAX_RECENT + 5; i++) addRecent(`term-${i}`, storage);
    expect(readRecent(storage)).toHaveLength(MAX_RECENT);
  });

  it('ignores empty or whitespace-only terms', () => {
    addRecent('   ', storage);
    addRecent('', storage);
    expect(readRecent(storage)).toEqual([]);
  });

  it('clears the list', () => {
    addRecent('dolo', storage);
    clearRecent(storage);
    expect(readRecent(storage)).toEqual([]);
  });

  it('recovers from corrupt stored JSON', () => {
    storage.setItem(RECENT_SEARCHES_KEY, '{not json');
    expect(readRecent(storage)).toEqual([]);
  });

  it('no-ops safely when no storage is available (SSR)', () => {
    expect(readRecent(undefined)).toEqual([]);
    expect(() => addRecent('dolo', undefined)).not.toThrow();
  });
});
