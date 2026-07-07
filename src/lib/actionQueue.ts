import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/client';

// Offline-first action delivery: taps enqueue instantly, a drain loop pushes
// them to the server with exponential backoff, and every request carries the
// queue entry's id as an Idempotency-Key so a retry after an ambiguous
// failure (request sent, response lost) can never double-fire server-side.

const STORAGE_KEY = 'fab-action-queue-v1';
const REQUEST_TIMEOUT_MS = 5000;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

export type QueuedAction = {
  id: string;
  key: string;
  label: string;
  firedAt: number;
  attempts: number;
};

export type QueueEvent = {
  action: QueuedAction;
  status: 'queued' | 'confirmed' | 'rejected' | 'retrying';
};

type Listener = (event: QueueEvent) => void;

let queue: QueuedAction[] = [];
let listeners: Listener[] = [];
let draining = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emit(event: QueueEvent) {
  listeners.forEach(listener => listener(event));
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue)).catch(() => {});
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function pendingCount(): number {
  return queue.length;
}

// Restore whatever a previous session failed to deliver, then try again.
export async function initQueue(): Promise<void> {
  if (loaded) {
    return;
  }
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      queue = JSON.parse(raw);
    }
  } catch {
    queue = [];
  }
  drain();
}

export function enqueue(key: string, label: string): QueuedAction {
  const action: QueuedAction = {
    id: newId(),
    key,
    label,
    firedAt: Date.now(),
    attempts: 0,
  };
  queue.push(action);
  persist();
  emit({ action, status: 'queued' });
  drain();
  return action;
}

async function deliver(action: QueuedAction): Promise<'confirmed' | 'rejected' | 'retry'> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/actions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': action.id,
      },
      body: JSON.stringify({ key: action.key, firedAt: action.firedAt }),
    });
    if (res.ok) {
      return 'confirmed';
    }
    // 4xx is a server verdict, not a transient fault — retrying won't help.
    return res.status >= 400 && res.status < 500 ? 'rejected' : 'retry';
  } catch {
    return 'retry';
  } finally {
    clearTimeout(timeout);
  }
}

async function drain(): Promise<void> {
  if (draining || queue.length === 0) {
    return;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  draining = true;

  while (queue.length > 0) {
    const action = queue[0];
    const outcome = await deliver(action);

    if (outcome === 'retry') {
      action.attempts += 1;
      persist();
      emit({ action, status: 'retrying' });
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** (action.attempts - 1),
        MAX_RETRY_DELAY_MS,
      );
      retryTimer = setTimeout(drain, delay);
      break;
    }

    queue.shift();
    persist();
    emit({ action, status: outcome });
  }

  draining = false;
}
