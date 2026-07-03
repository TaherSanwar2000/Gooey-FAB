# Gooey FAB

A liquid, gooey floating action button built with the **React Native CLI** (New Architecture) — a real blur + alpha-threshold shader effect via `@shopify/react-native-skia`, not a canned animation, driven end to end by `react-native-reanimated` worklets on the UI thread.

![platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-informational)
![react--native](https://img.shields.io/badge/react--native-0.86-61dafb)
![skia](https://img.shields.io/badge/react--native--skia-2-000000)
![reanimated](https://img.shields.io/badge/reanimated-4-ff4785)

## Features

- **Real gooey shader effect** — a Skia `Group` layer with `Blur` + `ColorMatrix` alpha-thresholding, the same "goo filter" trick used for liquid UI on the web, ported to native canvas.
- **Live blur slider** — drag it and watch the blobs melt from crisp, separate circles into a liquid gooey mass in real time. Proves the effect is understood and tunable, not hardcoded.
- **Staggered spring fan-out** — tap the FAB and four satellite actions spring out with a per-item delay, goo bridges visibly stretching and snapping as they separate.
- **Real hit targets** — every satellite bubble is an actual `Pressable` tracking the same shared values driving the canvas, so the visual and the tap target never drift apart.
- **Fully typed, gesture-driven** — both the FAB and the custom slider are built on `react-native-gesture-handler` primitives, no third-party slider dependency.

## Stack

- React Native 0.86 (New Architecture)
- `@shopify/react-native-skia` — canvas, blur, and color-matrix rendering
- `react-native-reanimated` 4 + `react-native-worklets` — UI-thread shared values driving both the canvas and the gesture-handler-based slider
- `react-native-gesture-handler`
- `react-native-safe-area-context`

## Project layout

```
src/
  components/
    GooeyFab.tsx    # Skia goo canvas + satellite fan-out + imperative open/close
    GooSlider.tsx    # custom gesture-driven slider controlling live blur radius
    Toast.tsx         # lightweight feedback toast for satellite actions
App.tsx                # hero showcase screen
```

## Getting started

```sh
npm install
npm run android   # or: npm run ios
```

Start Metro separately if it doesn't launch automatically:

```sh
npm start
```

## Why this exists

A small, self-contained showcase of canvas + gesture + animation fundamentals in React Native CLI — no Expo, no pre-built liquid-button library, just Skia's paint pipeline and Reanimated shared values.
