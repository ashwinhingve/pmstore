import { describe, it, expect, beforeEach } from 'vitest';
import { applyPick, useCompareStore } from './useCompareStore';

const dolo = { id: 'p1', name: 'Dolo 650' };
const calpol = { id: 'p2', name: 'Calpol 650' };
const crocin = { id: 'p3', name: 'Crocin 650' };

describe('applyPick', () => {
  it('adds a product that is not picked yet', () => {
    expect(applyPick([], dolo)).toEqual([dolo]);
  });

  it('removes a product that is already picked (toggle)', () => {
    expect(applyPick([dolo, calpol], dolo)).toEqual([calpol]);
  });

  it('keeps at most two picks, dropping the oldest', () => {
    expect(applyPick([dolo, calpol], crocin)).toEqual([calpol, crocin]);
  });
});

describe('useCompareStore', () => {
  beforeEach(() => {
    useCompareStore.setState({ picks: [] });
  });

  it('pick() updates state and returns the new picks', () => {
    const first = useCompareStore.getState().pick(dolo);
    expect(first).toEqual([dolo]);
    const second = useCompareStore.getState().pick(calpol);
    expect(second).toEqual([dolo, calpol]);
    expect(useCompareStore.getState().picks).toEqual([dolo, calpol]);
  });

  it('clear() empties the picks', () => {
    useCompareStore.getState().pick(dolo);
    useCompareStore.getState().clear();
    expect(useCompareStore.getState().picks).toEqual([]);
  });
});
