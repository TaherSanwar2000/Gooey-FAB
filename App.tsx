/**
 * GooeyFab — a Skia-powered liquid/gooey floating action button.
 * The blur slider proves the effect is a real blur+alpha-threshold
 * technique, not a canned animation: drag it and watch the blobs
 * melt from crisp circles into a liquid gooey mass in real time.
 *
 * Built with react-native-gesture-handler, react-native-reanimated
 * and @shopify/react-native-skia.
 *
 * @format
 */

import React, { useCallback, useState } from 'react';
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

const MIN_BLUR = 0;
const MAX_BLUR = 18;

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

  const showToast = useCallback((text: string) => {
    setToast({ text, id: Date.now() });
  }, []);

  const fabActions: FabAction[] = [
    {
      key: 'camera',
      icon: '📷',
      label: 'Camera',
      color: '#0ea5e9',
      onPress: () => showToast('📷 Camera'),
    },
    {
      key: 'music',
      icon: '🎵',
      label: 'Music',
      color: '#a855f7',
      onPress: () => showToast('🎵 Music'),
    },
    {
      key: 'chat',
      icon: '💬',
      label: 'Chat',
      color: '#22c55e',
      onPress: () => showToast('💬 Chat'),
    },
    {
      key: 'share',
      icon: '📤',
      label: 'Share',
      color: '#f59e0b',
      onPress: () => showToast('📤 Share'),
    },
  ];

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
});

export default App;
