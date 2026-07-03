import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import {
  Blur,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Paint,
} from '@shopify/react-native-skia';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const MAIN_RADIUS = 28;
const SAT_RADIUS = 22;
const FAN_DISTANCE = 84;
const MAX_ACTIONS = 4;
const ANGLES = [100, 138, 176, 214]; // degrees, y-down screen space, fanning down-left
const GOO_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 20, -8,
];

export type FabAction = {
  key: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
};

type Props = {
  actions: FabAction[]; // max 4
  center: { x: number; y: number };
  blur: SharedValue<number>;
};

// One angle + progress shared value per satellite slot, so the goo bridge
// (drawn on the Skia canvas) and the real tap target always agree on position.
function useSatellite(angleDeg: number, index: number, open: boolean) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = open
      ? withDelay(index * 45, withSpring(1, { damping: 13, stiffness: 180 }))
      : withDelay((MAX_ACTIONS - 1 - index) * 25, withTiming(0, { duration: 160 }));
  }, [open, index, progress]);

  const angle = (angleDeg * Math.PI) / 180;
  const dx = useDerivedValue(() => progress.value * FAN_DISTANCE * Math.cos(angle));
  const dy = useDerivedValue(() => progress.value * FAN_DISTANCE * Math.sin(angle));

  return { progress, dx, dy };
}

export default function GooeyFab({ actions, center, blur }: Props) {
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const anchorCx = center.x;
  const anchorCy = center.y;

  const openProgress = useSharedValue(0);
  React.useEffect(() => {
    openProgress.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [open, openProgress]);

  // Hooks must run unconditionally in a fixed order, so we always create
  // MAX_ACTIONS satellite slots and only render the ones actions[] supplies.
  const sat0 = useSatellite(ANGLES[0], 0, open);
  const sat1 = useSatellite(ANGLES[1], 1, open);
  const sat2 = useSatellite(ANGLES[2], 2, open);
  const sat3 = useSatellite(ANGLES[3], 3, open);
  const allSatellites = [sat0, sat1, sat2, sat3];
  const satellites = allSatellites.slice(0, actions.length);

  const mainCx = useDerivedValue(() => anchorCx);
  const mainCy = useDerivedValue(() => anchorCy);

  const cx0 = useDerivedValue(() => anchorCx + sat0.dx.value);
  const cy0 = useDerivedValue(() => anchorCy + sat0.dy.value);
  const cx1 = useDerivedValue(() => anchorCx + sat1.dx.value);
  const cy1 = useDerivedValue(() => anchorCy + sat1.dy.value);
  const cx2 = useDerivedValue(() => anchorCx + sat2.dx.value);
  const cy2 = useDerivedValue(() => anchorCy + sat2.dy.value);
  const cx3 = useDerivedValue(() => anchorCx + sat3.dx.value);
  const cy3 = useDerivedValue(() => anchorCy + sat3.dy.value);
  const allCircles = [
    { cx: cx0, cy: cy0 },
    { cx: cx1, cy: cy1 },
    { cx: cx2, cy: cy2 },
    { cx: cx3, cy: cy3 },
  ];
  const satCircles = allCircles.slice(0, actions.length);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(openProgress.value, [0, 1], [0, 1]),
  }));

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(openProgress.value, [0, 1], [0, 45])}deg` }],
  }));

  return (
    <>
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
      )}

      <Canvas
        style={[StyleSheet.absoluteFill, { width, height }]}
        pointerEvents="none">
        <Group layer={
          <Paint>
            <Blur blur={blur} />
            <ColorMatrix matrix={GOO_MATRIX} />
          </Paint>
        }>
          <Circle cx={mainCx} cy={mainCy} r={MAIN_RADIUS} color="#ff375f" />
          {satCircles.map((c, i) => (
            <Circle
              key={actions[i].key}
              cx={c.cx}
              cy={c.cy}
              r={SAT_RADIUS}
              color={actions[i].color}
            />
          ))}
        </Group>
      </Canvas>

      {actions.map((action, i) => (
        <SatelliteButton
          key={action.key}
          action={action}
          anchorCx={anchorCx}
          anchorCy={anchorCy}
          dx={satellites[i].dx}
          dy={satellites[i].dy}
          progress={satellites[i].progress}
          onPress={() => {
            setOpen(false);
            action.onPress();
          }}
        />
      ))}

      <Pressable
        onPress={() => setOpen(prev => !prev)}
        style={[
          styles.mainButton,
          {
            left: anchorCx - MAIN_RADIUS,
            top: anchorCy - MAIN_RADIUS,
            width: MAIN_RADIUS * 2,
            height: MAIN_RADIUS * 2,
          },
        ]}>
        <Animated.Text style={[styles.plus, plusStyle]}>+</Animated.Text>
      </Pressable>
    </>
  );
}

function SatelliteButton({
  action,
  anchorCx,
  anchorCy,
  dx,
  dy,
  progress,
  onPress,
}: {
  action: FabAction;
  anchorCx: number;
  anchorCy: number;
  dx: SharedValue<number>;
  dy: SharedValue<number>;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx.value - SAT_RADIUS },
      { translateY: dy.value - SAT_RADIUS },
      { scale: interpolate(progress.value, [0, 1], [0.3, 1]) },
    ],
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[
        styles.satellite,
        { left: anchorCx, top: anchorCy, width: SAT_RADIUS * 2, height: SAT_RADIUS * 2 },
        style,
      ]}>
      <Pressable style={styles.satellitePress} onPress={onPress}>
        <Text style={styles.satelliteIcon}>{action.icon}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mainButton: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontSize: 30,
    fontWeight: '400',
    color: '#fff',
    marginTop: -2,
  },
  satellite: {
    position: 'absolute',
    borderRadius: 999,
  },
  satellitePress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteIcon: {
    fontSize: 18,
  },
});
