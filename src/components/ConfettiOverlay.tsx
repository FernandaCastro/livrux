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

import { Colors, Fonts, FontSizes, Spacing } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Particle data types and factories
// ---------------------------------------------------------------------------
type ParticleShape = 'square' | 'circle' | 'ribbon' | 'curl';

interface ParticleData {
  id: number;
  startX: number;
  spreadX: number;
  peakHeight: number;
  riseTime: number;
  fallTime: number;
  delay: number;
  shape: ParticleShape;
  solidColor: string;
  curlColors: [string, string];
  size: number;
  ribbonWidth: number;
  ribbonHeight: number;
  endRotation: number;
}

const SOLID_COLORS = [
  Colors.primary,
  Colors.secondary,
  Colors.accent,
  Colors.success,
  Colors.primaryLight,
  Colors.secondaryLight,
  '#FF6B9D',
  '#00BCD4',
];

const GOLD_COLORS = ['#FFD700', '#F5A623', '#FFC200', '#D4AF37', '#FFE066', '#C8980A'];

const CURL_GRADIENTS: [string, string][] = [
  ['#FF6B6B', '#FF8E53'],
  ['#7B5EA7', '#C77DFF'],
  ['#4CAF50', '#81C784'],
  ['#1E88E5', '#64B5F6'],
  ['#FF6B6B', '#7B5EA7'],
  ['#F5A623', '#FF6B6B'],
  ['#00BCD4', '#4CAF50'],
  ['#FFD700', '#FF6B6B'],
  ['#FF8E53', '#FFD700'],
  ['#B09AC8', '#FF6B9D'],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeParticleGroup(side: 'left' | 'right', startId: number): ParticleData[] {
  const isLeft = side === 'left';
  return Array.from({ length: 150 }, (_, i) => {
    // Fan from ~20° to ~160° (upper hemisphere), both spreading outward and inward.
    const angleDeg = 20 + Math.random() * 140;
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = 350 + Math.random() * 500;

    // Horizontal spread: left side fans rightward (+cos), right side fans leftward (-cos).
    const spreadX = (isLeft ? 1 : -1) * Math.cos(angleRad) * distance;
    const peakHeight = Math.sin(angleRad) * distance;

    // Origin near the respective bottom corner.
    const startX = isLeft
      ? Math.random() * 50
      : SCREEN_WIDTH - 50 + Math.random() * 50;

    const shapeRoll = Math.random();
    let shape: ParticleShape;
    if (shapeRoll < 0.20) shape = 'square';
    else if (shapeRoll < 0.40) shape = 'circle';
    else if (shapeRoll < 0.70) shape = 'ribbon';
    else shape = 'curl';

    return {
      id: startId + i,
      startX,
      spreadX,
      peakHeight,
      riseTime: 550 + Math.random() * 450,
      fallTime: 750 + Math.random() * 650,
      delay: Math.random() * 350,
      shape,
      solidColor: shape === 'ribbon' ? pick(GOLD_COLORS) : pick(SOLID_COLORS),
      curlColors: pick(CURL_GRADIENTS),
      size: 5 + Math.random() * 8,
      ribbonWidth: shape === 'ribbon' ? 2 + Math.random() * 2 : 4 + Math.random() * 4,
      ribbonHeight: shape === 'ribbon' ? 11 + Math.random() * 13 : 16 + Math.random() * 18,
      endRotation: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540),
    };
  });
}

function randomParticles(): ParticleData[] {
  return [
    ...makeParticleGroup('left', 0),
    ...makeParticleGroup('right', 150),
  ];
}

// ---------------------------------------------------------------------------
// Shape renderer (inside the Animated.View wrapper)
// ---------------------------------------------------------------------------
function ParticleShape({ data }: { data: ParticleData }) {
  if (data.shape === 'square') {
    return (
      <View
        style={{
          width: data.size,
          height: data.size,
          backgroundColor: data.solidColor,
          borderRadius: 2,
        }}
      />
    );
  }
  if (data.shape === 'circle') {
    return (
      <View
        style={{
          width: data.size,
          height: data.size,
          backgroundColor: data.solidColor,
          borderRadius: data.size / 2,
        }}
      />
    );
  }
  if (data.shape === 'ribbon') {
    // Thin golden streamer
    return (
      <View
        style={{
          width: data.ribbonWidth,
          height: data.ribbonHeight,
          backgroundColor: data.solidColor,
          borderRadius: 3,
        }}
      />
    );
  }
  // curl — two-tone pill that simulates a gradient ribbon
  return (
    <View
      style={{
        width: data.ribbonWidth,
        height: data.ribbonHeight,
        borderRadius: data.ribbonHeight / 2,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '55%',
          backgroundColor: data.curlColors[0],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          backgroundColor: data.curlColors[1],
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Single confetti particle — explodes from the bottom, arcs upward then falls
// ---------------------------------------------------------------------------
function ConfettiParticle({ data }: { data: ParticleData }) {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  const totalDuration = data.riseTime + data.fallTime;

  useEffect(() => {
    // Arc: rise quickly, then fall with gravity.
    y.value = withDelay(
      data.delay,
      withSequence(
        withTiming(-data.peakHeight, {
          duration: data.riseTime,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(120, {
          duration: data.fallTime,
          easing: Easing.in(Easing.quad),
        }),
      ),
    );
    // Horizontal spread decelerates as the particle slows at the arc peak.
    x.value = withDelay(
      data.delay,
      withTiming(data.spreadX, {
        duration: totalDuration,
        easing: Easing.out(Easing.quad),
      }),
    );
    rotate.value = withDelay(
      data.delay,
      withTiming(data.endRotation, { duration: totalDuration }),
    );
    opacity.value = withDelay(
      data.delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: totalDuration - 420 }),
        withTiming(0, { duration: 300 }),
      ),
    );
  // Run once on mount — deps intentionally empty.
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
          // Anchored near the bottom of the screen.
          top: SCREEN_HEIGHT - 20,
          left: data.startX,
        },
      ]}
    >
      <ParticleShape data={data} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Animated book-count counter: old number slides up/out, new slides up/in
// ---------------------------------------------------------------------------
function AnimatedCounter({ prevCount, newCount, animKey }: { prevCount: number; newCount: number; animKey: number }) {
  const oldY = useSharedValue(0);
  const oldOpacity = useSharedValue(1);
  const newY = useSharedValue(52);
  const newOpacity = useSharedValue(0);

  useEffect(() => {
    oldY.value = withTiming(-52, { duration: 360, easing: Easing.in(Easing.quad) });
    oldOpacity.value = withTiming(0, { duration: 360 });
    newY.value = withDelay(260, withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.5)) }));
    newOpacity.value = withDelay(260, withTiming(1, { duration: 360 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

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
    const timer = setTimeout(onDone, 4000);
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
        {/* 300 confetti particles — 150 from each bottom corner */}
        {particlesRef.current.map(p => (
          <ConfettiParticle key={`${renderKey}-${p.id}`} data={p} />
        ))}

        {/* Transparent celebration area — only text is visible */}
        <View style={styles.celebration}>
          <Text style={styles.bookEmoji}>📚</Text>
          <AnimatedCounter
            key={renderKey}
            animKey={renderKey}
            prevCount={prevCount}
            newCount={newCount}
          />
          <Text style={styles.booksLabel}>{t('reader.books')}</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No background, border, or shadow — text floats over the confetti.
  celebration: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
  },
  bookEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xs,
  },
  counterContainer: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  counterText: {
    fontFamily: Fonts.heading,
    fontSize: 64,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  booksLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
