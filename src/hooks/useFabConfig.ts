import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  WS_URL,
  type ServerFabConfig,
} from '../api/client';

const CACHE_KEY = 'fab-config-cache-v1';
const ETAG_KEY = 'fab-config-etag-v1';
const MAX_RECONNECT_DELAY_MS = 15000;

// Baked-in fallback so the showcase still runs with no server at all.
const DEFAULT_CONFIG: ServerFabConfig = {
  version: 0,
  updatedAt: 0,
  actions: [
    { key: 'camera', icon: '📷', label: 'Camera', color: '#0ea5e9', enabled: true },
    { key: 'music', icon: '🎵', label: 'Music', color: '#a855f7', enabled: true },
    { key: 'chat', icon: '💬', label: 'Chat', color: '#22c55e', enabled: true },
    { key: 'share', icon: '📤', label: 'Share', color: '#f59e0b', enabled: true },
  ],
};

export type ConfigStatus = 'connecting' | 'live' | 'offline';

// Config resolution order: cached copy (instant, survives offline launch)
// → REST revalidate with If-None-Match (304 = free) → WebSocket for live
// pushes while the app is foregrounded.
export function useFabConfig(): { config: ServerFabConfig; status: ConfigStatus } {
  const [config, setConfig] = useState<ServerFabConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<ConfigStatus>('connecting');
  const versionRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;

    const apply = (next: ServerFabConfig, persist: boolean) => {
      if (disposed || next.version < versionRef.current) {
        return;
      }
      versionRef.current = next.version;
      setConfig(next);
      if (persist) {
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      }
    };

    const hydrateFromCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          apply(JSON.parse(raw), false);
        }
      } catch {
        // Corrupt cache is not worth crashing the FAB over.
      }
    };

    const revalidate = async () => {
      try {
        const etag = await AsyncStorage.getItem(ETAG_KEY);
        const res = await fetch(`${API_BASE_URL}/fab-config`, {
          headers: etag ? { 'If-None-Match': etag } : undefined,
        });
        if (res.status === 304) {
          return;
        }
        if (res.ok) {
          const nextEtag = res.headers.get('etag');
          if (nextEtag) {
            AsyncStorage.setItem(ETAG_KEY, nextEtag).catch(() => {});
          }
          apply(await res.json(), true);
        }
      } catch {
        // Server unreachable — cached/default config keeps the FAB alive.
      }
    };

    const connect = () => {
      if (disposed) {
        return;
      }
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        reconnectDelay = 1000;
        setStatus('live');
      };

      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'config') {
            apply(message.payload, true);
          }
        } catch {
          // Ignore malformed frames.
        }
      };

      socket.onclose = () => {
        if (disposed) {
          return;
        }
        setStatus('offline');
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    hydrateFromCache().then(revalidate);
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  return { config, status };
}
