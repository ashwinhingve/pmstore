/**
 * Recent-searches persistence for the SearchBar.
 *
 * Storage is injectable so the logic is unit-testable in node; in the browser
 * it defaults to localStorage. Auth tokens never go here (see CLAUDE.md) — this
 * is only a convenience list of past query strings.
 */
export const RECENT_SEARCHES_KEY = 'pmstore-recent-searches';
export const MAX_RECENT = 8;

function defaultStorage(): Storage | undefined {
  return typeof window !== 'undefined' ? window.localStorage : undefined;
}

export function readRecent(storage: Storage | undefined = defaultStorage()): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecent(term: string, storage: Storage | undefined = defaultStorage()): string[] {
  if (!storage) return [];
  const trimmed = term.trim();
  if (!trimmed) return readRecent(storage);

  const existing = readRecent(storage).filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  try {
    storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — a missing recent list is not worth throwing over */
  }
  return next;
}

export function clearRecent(storage: Storage | undefined = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    /* ignore */
  }
}
