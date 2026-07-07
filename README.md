# Gooey FAB

A liquid, gooey floating action button built with the **React Native CLI** (New Architecture) — a real blur + alpha-threshold shader effect via `@shopify/react-native-skia`, not a canned animation, driven end to end by `react-native-reanimated` worklets on the UI thread.

**Now server-driven end to end**: the FAB's actions come from a Node.js backend and morph live on device when the config changes, and every tap is delivered through an offline-first queue with idempotent retries.

![platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-informational)
![react--native](https://img.shields.io/badge/react--native-0.86-61dafb)
![skia](https://img.shields.io/badge/react--native--skia-2-000000)
![reanimated](https://img.shields.io/badge/reanimated-4-ff4785)
![node](https://img.shields.io/badge/backend-node%20%2B%20express%20%2B%20ws-339933)

## Features

### Frontend

- **Real gooey shader effect** — a Skia `Group` layer with `Blur` + `ColorMatrix` alpha-thresholding, the same "goo filter" trick used for liquid UI on the web, ported to native canvas.
- **Live blur slider** — drag it and watch the blobs melt from crisp, separate circles into a liquid gooey mass in real time. Proves the effect is understood and tunable, not hardcoded.
- **Staggered spring fan-out** — tap the FAB and the satellite actions spring out with a per-item delay, goo bridges visibly stretching and snapping as they separate.
- **Real hit targets** — every satellite bubble is an actual `Pressable` tracking the same shared values driving the canvas, so the visual and the tap target never drift apart.
- **Fully typed, gesture-driven** — both the FAB and the custom slider are built on `react-native-gesture-handler` primitives, no third-party slider dependency.

### Backend (server-driven UI + offline-first delivery)

- **Server-driven config** — the satellite actions (icons, colors, count) live on the server, not in the bundle. `GET /fab-config` is versioned and served with a content-derived **ETag**, so clients revalidate with `If-None-Match` and get a free `304` when nothing changed.
- **Live config push over WebSocket** — toggle an action on the server and watch the bubble goo in/out on the device in real time. The client resolves config as: persisted cache → ETag revalidation → WebSocket pushes, with exponential-backoff reconnect.
- **Offline-first action queue** — taps enqueue instantly (optimistic toast), persist across app restarts via AsyncStorage, and drain with exponential-backoff retries when the server is unreachable.
- **Idempotent delivery** — every queue entry carries an `Idempotency-Key`; the server remembers each key's response and replays it on retry (`Idempotency-Replayed: true`), so an ambiguous failure (request sent, response lost) can never double-fire an action.
- **Validated writes** — config updates are `zod`-validated; firing a disabled/unknown action is rejected with `422`, which the client surfaces as a distinct "rejected" state instead of retrying forever.

## Stack

- React Native 0.86 (New Architecture)
- `@shopify/react-native-skia` — canvas, blur, and color-matrix rendering
- `react-native-reanimated` 4 + `react-native-worklets` — UI-thread shared values driving both the canvas and the gesture-handler-based slider
- `react-native-gesture-handler`
- `react-native-safe-area-context`
- `@react-native-async-storage/async-storage` — config cache + persisted action queue
- **Server:** Node.js + Express + `ws` + `zod` (TypeScript)

## Project layout

```
src/
  api/
    client.ts          # base URLs (handles Android emulator's 10.0.2.2) + shared types
  hooks/
    useFabConfig.ts    # cache → ETag revalidate → WebSocket live updates
  lib/
    actionQueue.ts     # persisted offline queue, backoff drain, idempotency keys
  components/
    GooeyFab.tsx       # Skia goo canvas + satellite fan-out + imperative open/close
    GooSlider.tsx      # custom gesture-driven slider controlling live blur radius
    Toast.tsx          # feedback toast for queued/synced/rejected action states
App.tsx                # hero showcase screen, wired to server-driven config
server/
  src/
    index.ts           # Express routes + WebSocket broadcast
    configStore.ts     # versioned config, content-derived ETags
    idempotency.ts     # Idempotency-Key response store with TTL
    schema.ts          # zod schemas shared by all endpoints
```

## Getting started

App:

```sh
npm install
cd ios && pod install && cd ..   # iOS only
npm run android                  # or: npm run ios
```

Server (separate terminal):

```sh
cd server
npm install
npm run dev   # listens on http://localhost:4000
```

The app runs fine without the server too — it falls back to a baked-in default config and queues taps until a server appears.

## Demo it live

With the app open and the server running:

```sh
# Watch a bubble melt out of the FAB in real time:
curl -X POST localhost:4000/fab-config/actions/music/toggle

# ...and goo back in:
curl -X POST localhost:4000/fab-config/actions/music/toggle

# See the delivered action log (each entry arrived exactly once):
curl localhost:4000/actions
```

Kill the server, tap a few satellites (toasts show "queued — will retry"), restart the server, and watch the queue drain with "✓ synced" toasts — no action lost, none double-fired.

## Why this exists

A small, self-contained showcase of two things at once: canvas + gesture + animation fundamentals in React Native CLI (no Expo, no pre-built liquid-button library), and the backend patterns real mobile apps need — server-driven UI, HTTP caching semantics, WebSocket fan-out, and idempotent offline-first delivery.
