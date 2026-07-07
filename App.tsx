/**
 * GooeyFab — a Skia-powered liquid/gooey floating action button,
 * now server-driven end to end:
 *
 *  - The satellite actions come from a Node backend (GET /fab-config with
 *    ETag revalidation), and config changes are pushed live over WebSocket —
 *    toggle an action on the server and watch the FAB morph on device.
 *  - Taps are delivered through an offline-first queue: optimistic toast,
 *    persisted across restarts, exponential-backoff retries, and an
 *    Idempotency-Key per entry so retries never double-fire server-side.
 *
 * Built with react-native-gesture-handler, react-native-reanimated
 * and @shopify/react-native-skia.
 *
 * @format
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import GooeyFab, { FabAction } from './src/components/GooeyFab';
import GooSlider from './src/components/GooSlider';
import Toast from './src/components/Toast';
import { useFabConfig } from './src/hooks/useFabConfig';
import { enqueue, initQueue, subscribe } from './src/lib/actionQueue';

const MIN_BLUR = 0;
const MAX_BLUR = 18;

const STATUS_COLORS = {
  live: '#22c55e',
  connecting: '#f59e0b',
  offline: '#ef4444',
} as const;

function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const blur = useSharedValue(12);
  const [toast, setToast] = useState({ text: '', id: 0 });
  const { config, status } = useFabConfig();

  const showToast = useCallback((text: string) => {
    setToast({ text, id: Date.now() });
  }, []);

  useEffect(() => {
    initQueue();
    return subscribe(({ action, status: deliveryStatus }) => {
      switch (deliveryStatus) {
        case 'confirmed':
          showToast(`✓ ${action.label} synced`);
          break;
        case 'retrying':
          showToast(`⏳ ${action.label} queued — will retry`);
          break;
        case 'rejected':
          showToast(`✕ ${action.label} rejected by server`);
          break;
      }
    });
  }, [showToast]);

  const fabActions: FabAction[] = useMemo(
    () =>
      config.actions
        .filter(action => action.enabled)
        .slice(0, 4)
        .map(action => ({
          key: action.key,
          icon: action.icon,
          label: action.label,
          color: action.color,
          onPress: () => {
            showToast(`${action.icon} ${action.label}`);
            enqueue(action.key, action.label);
          },
        })),
    [config, showToast],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>Gooey FAB</Text>
        <Text style={styles.subtitle}>
          Tap the button to explode it into actions. Drag the slider to melt it.
        </Text>
      </View>

      <GooeyFab
        actions={fabActions}
        center={{ x: width / 2, y: height / 2 - 40 }}
        blur={blur}
      />

      <Toast text={toast.text} id={toast.id} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]}
          />
          <Text style={styles.statusText}>
            config v{config.version} · {status}
          </Text>
        </View>
        <GooSlider value={blur} min={MIN_BLUR} max={MAX_BLUR} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0d0d0f',
  },
  header: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: '#8a8a8e',
  },
  footer: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8a8a8e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default App;
