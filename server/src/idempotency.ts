// Idempotency-Key store: remembers the response for each key so client
// retries (flaky mobile networks re-send the same POST) replay the original
// outcome instead of double-firing the action.

type StoredResponse = {
  status: number;
  body: unknown;
  expiresAt: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

const store = new Map<string, StoredResponse>();

export function getReplay(key: string): StoredResponse | undefined {
  const entry = store.get(key);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

export function remember(key: string, status: number, body: unknown): void {
  store.set(key, { status, body, expiresAt: Date.now() + TTL_MS });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(key);
    }
  }
}, SWEEP_INTERVAL_MS).unref();
