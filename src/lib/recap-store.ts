// Client-side anchor for the "return moment": which settled picks a fan has already
// seen, and their rank at that point. Stored in localStorage (zero-DDL, per-device).
// Exposed as a useSyncExternalStore-compatible source so components derive from it
// during render instead of setting state inside an effect.

export type RecapStore = { seenIds: string[]; lastRank: number | null };

const KEY = 'fanbrain:recap';
const EMPTY: RecapStore = { seenIds: [], lastRank: null };

// Cache by raw string so getSnapshot returns a stable reference when unchanged
// (required by useSyncExternalStore to avoid render loops).
let cachedRaw: string | null = null;
let cached: RecapStore = EMPTY;

function parse(raw: string | null): RecapStore {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<RecapStore>;
    return {
      seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [],
      lastRank: typeof parsed.lastRank === 'number' ? parsed.lastRank : null,
    };
  } catch {
    return EMPTY;
  }
}

export function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function getSnapshot(): RecapStore {
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = parse(raw);
  return cached;
}

export function getServerSnapshot(): RecapStore {
  return EMPTY;
}

export function persist(next: RecapStore): void {
  try {
    cachedRaw = JSON.stringify(next);
    cached = next;
    window.localStorage.setItem(KEY, cachedRaw);
  } catch {
    /* best-effort: quota / unavailable storage */
  }
}
