import { createServer } from 'node:http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { configStore } from './configStore';
import { getReplay, remember } from './idempotency';
import { actionEventSchema, fabConfigUpdateSchema } from './schema';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(express.json());

type ActionLogEntry = {
  key: string;
  firedAt: number;
  receivedAt: number;
  idempotencyKey: string;
};
const actionLog: ActionLogEntry[] = [];

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/fab-config', (req, res) => {
  const etag = configStore.etag();
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'no-cache');
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.json(configStore.get());
});

app.put('/fab-config', (req, res) => {
  const parsed = fabConfigUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_config', details: parsed.error.flatten() });
    return;
  }
  const keys = parsed.data.actions.map(a => a.key);
  if (new Set(keys).size !== keys.length) {
    res.status(400).json({ error: 'invalid_config', details: 'duplicate action keys' });
    return;
  }
  res.json(configStore.replaceActions(parsed.data.actions));
});

// Demo convenience: flip one action on/off from curl and watch the FAB morph.
app.post('/fab-config/actions/:key/toggle', (req, res) => {
  const updated = configStore.toggleAction(req.params.key);
  if (!updated) {
    res.status(404).json({ error: 'unknown_action', key: req.params.key });
    return;
  }
  res.json(updated);
});

app.post('/actions', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
    res.status(400).json({ error: 'missing_idempotency_key' });
    return;
  }

  const replay = getReplay(idempotencyKey);
  if (replay) {
    res.setHeader('Idempotency-Replayed', 'true');
    res.status(replay.status).json(replay.body);
    return;
  }

  const parsed = actionEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_action', details: parsed.error.flatten() });
    return;
  }

  const action = configStore
    .get()
    .actions.find(a => a.key === parsed.data.key);
  if (!action || !action.enabled) {
    // Remembered too: a retry of a rejected action stays rejected.
    const body = { error: 'action_not_available', key: parsed.data.key };
    remember(idempotencyKey, 422, body);
    res.status(422).json(body);
    return;
  }

  const entry: ActionLogEntry = {
    key: parsed.data.key,
    firedAt: parsed.data.firedAt,
    receivedAt: Date.now(),
    idempotencyKey,
  };
  actionLog.push(entry);
  if (actionLog.length > 200) {
    actionLog.shift();
  }

  const body = { ok: true, key: entry.key, receivedAt: entry.receivedAt };
  remember(idempotencyKey, 201, body);
  res.status(201).json(body);
});

app.get('/actions', (_req, res) => {
  res.json({ count: actionLog.length, actions: actionLog.slice(-50) });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', socket => {
  socket.send(JSON.stringify({ type: 'config', payload: configStore.get() }));
});

configStore.on('change', config => {
  const message = JSON.stringify({ type: 'config', payload: config });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`gooey-fab-server listening on http://localhost:${PORT}`);
  console.log(`  GET  /fab-config                     — versioned config (ETag/304)`);
  console.log(`  PUT  /fab-config                     — replace actions, broadcasts over WS`);
  console.log(`  POST /fab-config/actions/:key/toggle — flip an action live`);
  console.log(`  POST /actions                        — idempotent action ingestion`);
  console.log(`  WS   /ws                             — config push channel`);
});
