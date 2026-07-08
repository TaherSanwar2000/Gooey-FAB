import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { FabAction, FabConfig } from './schema';

const DEFAULT_ACTIONS: FabAction[] = [
  { key: 'camera', icon: '📷', label: 'Camera', color: '#0ea5e9', enabled: true },
  { key: 'music', icon: '🎵', label: 'Music', color: '#a855f7', enabled: true },
  { key: 'chat', icon: '💬', label: 'Chat', color: '#22c55e', enabled: true },
  { key: 'share', icon: '📤', label: 'Share', color: '#f59e0b', enabled: true },
];

// File-backed persistence (stand-in for a real database): the version must
// keep climbing across server restarts, because clients cache the config and
// reject anything older than what they already have.
const DATA_FILE = join(__dirname, '..', 'data', 'config.json');

function loadPersisted(): FabConfig | null {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

class ConfigStore extends EventEmitter {
  private config: FabConfig = loadPersisted() ?? {
    version: 1,
    updatedAt: Date.now(),
    actions: DEFAULT_ACTIONS,
  };

  get(): FabConfig {
    return this.config;
  }

  // Strong ETag derived from content, so clients revalidate for free via
  // If-None-Match instead of re-downloading an unchanged config.
  etag(): string {
    const hash = createHash('sha1')
      .update(JSON.stringify(this.config.actions))
      .digest('hex')
      .slice(0, 16);
    return `"${this.config.version}-${hash}"`;
  }

  replaceActions(actions: FabAction[]): FabConfig {
    this.config = {
      version: this.config.version + 1,
      updatedAt: Date.now(),
      actions,
    };
    try {
      mkdirSync(dirname(DATA_FILE), { recursive: true });
      writeFileSync(DATA_FILE, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('failed to persist config:', err);
    }
    this.emit('change', this.config);
    return this.config;
  }

  toggleAction(key: string): FabConfig | null {
    const action = this.config.actions.find(a => a.key === key);
    if (!action) {
      return null;
    }
    return this.replaceActions(
      this.config.actions.map(a =>
        a.key === key ? { ...a, enabled: !a.enabled } : a,
      ),
    );
  }
}

export const configStore = new ConfigStore();
