import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

const TRACK_WIDTH = 260;
const THUMB_SIZE = 26;

type Props = {
  value: SharedValue<number>;
  min: number;
  max: number;
};

export default function GooSlider({ value, min, max }: Props) {
  const thumbX = useDerivedValue(() =>
    interpolate(value.value, [min, max], [0, TRACK_WIDTH], Extrapolation.CLAMP),
  );

  const pan = Gesture.Pan()
    .hitSlop(16)
    .onBegin(event => {
      const clamped = Math.min(TRACK_WIDTH, Math.max(0, event.x));
      value.value = interpolate(clamped, [0, TRACK_WIDTH], [min, max], Extrapolation.CLAMP);
    })
    .onChange(event => {
      const clamped = Math.min(TRACK_WIDTH, Math.max(0, event.x));
      value.value = interpolate(clamped, [0, TRACK_WIDTH], [min, max], Extrapolation.CLAMP);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Sharp</Text>
        <Text style={styles.label}>Liquid</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: TRACK_WIDTH,
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: TRACK_WIDTH,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a8e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  track: {
    width: TRACK_WIDTH,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#242426',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff375f',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
