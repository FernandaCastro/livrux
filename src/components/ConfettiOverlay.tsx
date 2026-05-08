import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
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
  withRepeat,
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
  wobbleAmp: number;
  wobbleFreq: number;
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
  // 50 per side = 100 total — fewer components, smoother initial frame
  return Array.from({ length: 50 }, (_, i) => {
    const angleDeg = 20 + Math.random() * 140;
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = 350 + Math.random() * 500;

    const spreadX = (isLeft ? 1 : -1) * Math.cos(angleRad) * distance;
    const peakHeight = Math.sin(angleRad) * distance;

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
      riseTime: 850 + Math.random() * 600,
      fallTime: 2200 + Math.random() * 2000,
      // Wider stagger range distributes the initial render burst across more frames
      delay: Math.random() * 700,
      shape,
      solidColor: shape === 'ribbon' ? pick(GOLD_COLORS) : pick(SOLID_COLORS),
      curlColors: pick(CURL_GRADIENTS),
      size: 7 + Math.random() * 8,
      ribbonWidth: shape === 'ribbon' ? 2 + Math.random() * 2 : 4 + Math.random() * 4,
      ribbonHeight: shape === 'ribbon' ? 11 + Math.random() * 13 : 16 + Math.random() * 18,
      endRotation: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540),
      // Lateral wobble during fall — simulates a paper piece drifting in air
      wobbleAmp: 6 + Math.random() * 10,
      wobbleFreq: 350 + Math.random() * 450,
    };
  });
}

function randomParticles(): ParticleData[] {
  return [
    ...makeParticleGroup('left', 0),
    ...makeParticleGroup('right', 50),
  ];
}

// ---------------------------------------------------------------------------
// Shape renderer
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
  // curl — two-tone pill
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
          top: 0, left: 0, right: 0,
          height: '55%',
          backgroundColor: data.curlColors[0],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '55%',
          backgroundColor: data.curlColors[1],
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Single confetti particle
// ---------------------------------------------------------------------------
function ConfettiParticle({ data }: { data: ParticleData }) {
  const y       = useSharedValue(0);
  const x       = useSharedValue(0);
  const wobbleX = useSharedValue(0);
  const rotate  = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0);

  const totalDuration = data.riseTime + data.fallTime;

  useEffect(() => {
    // Vertical arc: rise then fall with gravity
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

    // Horizontal spread (arc direction)
    x.value = withDelay(
      data.delay,
      withTiming(data.spreadX, {
        duration: totalDuration,
        easing: Easing.out(Easing.quad),
      }),
    );

    // Lateral wobble — starts at the arc peak, simulates air drag
    wobbleX.value = withDelay(
      data.delay + data.riseTime,
      withRepeat(
        withSequence(
          withTiming( data.wobbleAmp, { duration: data.wobbleFreq / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-data.wobbleAmp, { duration: data.wobbleFreq / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    // Rotation
    rotate.value = withDelay(
      data.delay,
      withTiming(data.endRotation, { duration: totalDuration, easing: Easing.linear }),
    );

    // Opacity: quick fade-in, hold, fade-out near the end
    opacity.value = withDelay(
      data.delay,
      withSequence(
        withTiming(1,  { duration: 120 }),
        withTiming(1,  { duration: totalDuration - 420 }),
        withTiming(0,  { duration: 300 }),
      ),
    );

    // Scale: pop in, hold, shrink away
    scale.value = withDelay(
      data.delay,
      withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(1,   { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1,   { duration: totalDuration - 650 }),
        withTiming(0.4, { duration: 300 }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value + wobbleX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          top: SCREEN_HEIGHT - 20,
          left: data.startX,
        },
      ]}
      renderToHardwareTextureAndroid
    >
      <ParticleShape data={data} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------
function AnimatedCounter({ prevCount, newCount, animKey }: { prevCount: number; newCount: number; animKey: number }) {
  const oldY        = useSharedValue(0);
  const oldOpacity  = useSharedValue(1);
  const newY        = useSharedValue(100);
  const newOpacity  = useSharedValue(0);
  const pulseScale  = useSharedValue(1);

  useEffect(() => {
    oldY.value       = withTiming(-100, { duration: 700, easing: Easing.in(Easing.quad) });
    oldOpacity.value = withTiming(0,    { duration: 700 });
    newY.value       = withDelay(550, withTiming(0, { duration: 800, easing: Easing.out(Easing.back(2)) }));
    newOpacity.value = withDelay(550, withTiming(1, { duration: 700 }));
    // Pulse after the new number settles
    pulseScale.value = withDelay(
      1420,
      withSequence(
        withTiming(1.22, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1,    { duration: 240, easing: Easing.in(Easing.quad) }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  const oldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: oldY.value }],
    opacity: oldOpacity.value,
  }));
  const newStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: newY.value }, { scale: pulseScale.value }],
    opacity: newOpacity.value,
  }));

  return (
    <View style={styles.counterContainer}>
      <Animated.Text style={[styles.counterAbsolute, styles.counterText, oldStyle]}>
        {prevCount}
      </Animated.Text>
      <Animated.Text style={[styles.counterAbsolute, styles.counterText, newStyle]}>
        {newCount}
      </Animated.Text>
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
  /** Optional PNG to replace the default 📚 emoji */
  bookImageSource?: ImageSourcePropType;
}

const FADE_IN_MS = 250;
const FADE_OUT_MS = 400;
const AUTO_CLOSE_MS = 6500;

export function ConfettiOverlay({ visible, prevCount, newCount, onDone, bookImageSource }: ConfettiOverlayProps) {
  const { t } = useTranslation();
  const [particles, setParticles] = useState<ParticleData[]>(() => randomParticles());
  const [modalVisible, setModalVisible] = useState(false);
  const fadeOpacity = useSharedValue(0);
  const fadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frozenCounts = useRef({ prev: 0, next: 0 });

  useEffect(() => {
    if (visible) {
      frozenCounts.current = { prev: prevCount, next: newCount };
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
      setModalVisible(true);
      fadeOpacity.value = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });

      const autoClose = setTimeout(onDone, AUTO_CLOSE_MS);
      const task = setTimeout(() => setParticles(randomParticles()), 0);
      return () => {
        clearTimeout(autoClose);
        clearTimeout(task);
      };
    } else {
      fadeOpacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) });
      fadeOutTimer.current = setTimeout(() => setModalVisible(false), FADE_OUT_MS);
      return () => {
        if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, onDone]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onDone}
      statusBarTranslucent
    >
      <Animated.View style={[styles.animatedWrapper, fadeStyle]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDone}>
          {modalVisible && particles.map(p => (
            <ConfettiParticle key={p.id} data={p} />
          ))}

          <View style={styles.card}>
            {bookImageSource ? (
              <Image source={bookImageSource} style={styles.bookImage} resizeMode="contain" />
            ) : (
              <Text style={styles.bookEmoji}>📚</Text>
            )}
            {modalVisible && (
              <AnimatedCounter
                animKey={0}
                prevCount={frozenCounts.current.prev}
                newCount={frozenCounts.current.next}
              />
            )}
            <Text style={styles.booksLabel}>{t('reader.books')}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  animatedWrapper: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(20,16,60,0.72)',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: Spacing.xs,
  },
  bookEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xs,
  },
  bookImage: {
    width: 150,
    height: 150,
    marginBottom: Spacing.xs,
  },
  counterContainer: {
    height: 100,
    width: 240,
    overflow: 'hidden',
  },
  counterAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  counterText: {
    fontFamily: Fonts.heading,
    fontSize: 80,
    color: '#FFFFFF',
    textShadowColor: 'rgba(124,58,237,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
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
