import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Colors, Fonts, FontSizes, Radius, Shadows, Spacing } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COLORS = [
  Colors.primary,
  Colors.secondary,
  Colors.accent,
  Colors.success,
  Colors.primaryLight,
  Colors.secondaryLight,
];
const PARTICLE_COUNT = 55;

interface ParticleData {
  id: number;
  x: number;
  color: string;
  size: number;
  isCircle: boolean;
  delay: number;
  duration: number;
  drift: number;
  endRotation: number;
}

function randomParticles(): ParticleData[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: 6 + Math.random() * 8,
    isCircle: Math.random() > 0.5,
    delay: Math.random() * 600,
    duration: 2200 + Math.random() * 900,
    drift: (Math.random() - 0.5) * 120,
    endRotation: 180 + Math.random() * 360,
  }));
}

// ---------------------------------------------------------------------------
// Single confetti particle
// ---------------------------------------------------------------------------
interface ParticleProps {
  data: ParticleData;
}

function ConfettiParticle({ data }: ParticleProps) {
  const y = useSharedValue(-20);
  const x = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      data.delay,
      withTiming(SCREEN_HEIGHT + 60, {
        duration: data.duration,
        easing: Easing.in(Easing.quad),
      }),
    );
    x.value = withDelay(
      data.delay,
      withTiming(data.drift, { duration: data.duration }),
    );
    rotate.value = withDelay(
      data.delay,
      withTiming(data.endRotation, { duration: data.duration }),
    );
    opacity.value = withDelay(
      data.delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: data.duration - 450 }),
        withTiming(0, { duration: 300 }),
      ),
    );
  // Intentionally empty: run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          top: 0,
          left: data.x,
          width: data.size,
          height: data.size,
          backgroundColor: data.color,
          borderRadius: data.isCircle ? data.size / 2 : 2,
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Book-count counter that flips from prevCount to newCount
// ---------------------------------------------------------------------------
interface CounterProps {
  prevCount: number;
  newCount: number;
}

function AnimatedCounter({ prevCount, newCount }: CounterProps) {
  const oldY = useSharedValue(0);
  const oldOpacity = useSharedValue(1);
  const newY = useSharedValue(50);
  const newOpacity = useSharedValue(0);

  useEffect(() => {
    oldY.value = withTiming(-50, {
      duration: 350,
      easing: Easing.in(Easing.quad),
    });
    oldOpacity.value = withTiming(0, { duration: 350 });

    newY.value = withDelay(
      250,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
      }),
    );
    newOpacity.value = withDelay(250, withTiming(1, { duration: 350 }));
  // Intentionally empty: run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const oldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: oldY.value }],
    opacity: oldOpacity.value,
    position: 'absolute',
  }));

  const newStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: newY.value }],
    opacity: newOpacity.value,
    position: 'absolute',
  }));

  return (
    <View style={styles.counterContainer}>
      <Animated.Text style={[styles.counterText, oldStyle]}>{prevCount}</Animated.Text>
      <Animated.Text style={[styles.counterText, newStyle]}>{newCount}</Animated.Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public overlay component
// ---------------------------------------------------------------------------
export interface ConfettiOverlayProps {
  visible: boolean;
  prevCount: number;
  newCount: number;
  onDone: () => void;
}

export function ConfettiOverlay({ visible, prevCount, newCount, onDone }: ConfettiOverlayProps) {
  const { t } = useTranslation();
  const [renderKey, setRenderKey] = useState(0);
  const particlesRef = useRef<ParticleData[]>([]);

  useEffect(() => {
    if (!visible) return;

    particlesRef.current = randomParticles();
    setRenderKey(k => k + 1);

    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [visible, onDone]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDone}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDone}>
        {/* Confetti particles */}
        {particlesRef.current.map(p => (
          <ConfettiParticle key={`${renderKey}-${p.id}`} data={p} />
        ))}

        {/* Central celebration card */}
        <View style={styles.card}>
          <Text style={styles.bookEmoji}>📚</Text>
          <AnimatedCounter key={renderKey} prevCount={prevCount} newCount={newCount} />
          <Text style={styles.booksLabel}>{t('reader.books')}</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
    minWidth: 190,
  },
  bookEmoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  counterContainer: {
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  counterText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['4xl'],
    color: Colors.secondary,
  },
  booksLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
