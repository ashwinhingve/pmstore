import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore, toast } from './useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast and returns its id', () => {
    const id = useToastStore.getState().add({ message: 'Added to cart', variant: 'success' });
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].message).toBe('Added to cart');
    expect(toasts[0].variant).toBe('success');
  });

  it('removes a toast by id', () => {
    const id = useToastStore.getState().add({ message: 'Saved', variant: 'success' });
    useToastStore.getState().remove(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('ignores removing an id that is already gone', () => {
    const id = useToastStore.getState().add({ message: 'Saved', variant: 'success' });
    useToastStore.getState().remove(id);
    useToastStore.getState().remove(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('auto-dismisses after the default duration', () => {
    useToastStore.getState().add({ message: 'Added to cart', variant: 'success' });
    vi.advanceTimersByTime(3999);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('gives errors a longer default duration than successes', () => {
    useToastStore.getState().add({ message: "Couldn't save changes. Try again.", variant: 'error' });
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('honours an explicit duration', () => {
    useToastStore.getState().add({ message: 'Order placed', variant: 'info', duration: 1000 });
    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('shows at most three toasts, dropping the oldest first', () => {
    const { add } = useToastStore.getState();
    const first = add({ message: 'one', variant: 'info' });
    add({ message: 'two', variant: 'info' });
    add({ message: 'three', variant: 'info' });
    add({ message: 'four', variant: 'info' });
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(3);
    expect(toasts.map((t) => t.message)).toEqual(['two', 'three', 'four']);
    expect(toasts.some((t) => t.id === first)).toBe(false);
  });

  it('exposes toast.success/error/info helpers usable outside React', () => {
    toast.success('Added to cart');
    toast.error("Couldn't save changes. Try again.");
    toast.info('Order placed');
    const variants = useToastStore.getState().toasts.map((t) => t.variant);
    expect(variants).toEqual(['success', 'error', 'info']);
  });

  it('assigns unique ids to every toast', () => {
    const { add } = useToastStore.getState();
    const ids = [
      add({ message: 'a', variant: 'info' }),
      add({ message: 'b', variant: 'info' }),
      add({ message: 'c', variant: 'info' }),
    ];
    expect(new Set(ids).size).toBe(3);
  });
});
