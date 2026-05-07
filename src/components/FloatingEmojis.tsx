import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const EMOJIS = ['📚', '📖', '🪙', '⭐', '🌟', '✨', '🎉', '🎈', '🦋', '🌈'];
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TRAVEL = SCREEN_HEIGHT + 180; // total pixels travelled per cycle

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface FloaterProps {
  emoji: string;
  left: number;
  size: number;
  duration: number;
  // initialY < SCREEN_HEIGHT  → emoji starts already on screen (fills screen immediately)
  // initialY >= SCREEN_HEIGHT → emoji starts below screen, appears after (initialY - SCREEN_HEIGHT) ms delay
  initialY: number;
}

function FloatingEmoji({ emoji, left, size, duration, initialY }: FloaterProps) {
  const translateY = useRef(new Animated.Value(initialY)).current;
  const opacity = useRef(new Animated.Value(initialY < SCREEN_HEIGHT ? 0.15 : 0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation;

    const startLoop = () => {
      translateY.setValue(SCREEN_HEIGHT + 60);
      opacity.setValue(0);
      loop = Animated.loop(
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.18, duration: duration * 0.12, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.18, duration: duration * 0.76, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.12, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
    };

    if (initialY < SCREEN_HEIGHT) {
      // Already on screen — animate to top first, then hand off to the loop
      const remaining = (initialY + 120) / TRAVEL; // fraction of the full trip left
      const firstDuration = Math.round(duration * remaining);
      const first = Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: firstDuration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.18, duration: Math.min(400, firstDuration * 0.2), useNativeDriver: true }),
      ]);
      first.start(({ finished }) => { if (finished) startLoop(); });
      return () => { first.stop(); loop?.stop(); };
    } else {
      // Below screen — wait (initialY - SCREEN_HEIGHT) ms then start looping
      const delay = initialY - SCREEN_HEIGHT;
      const timer = setTimeout(startLoop, delay);
      return () => { clearTimeout(timer); loop?.stop(); };
    }
  }, []);

  return (
    <Animated.Text
      style={[styles.floater, { left, fontSize: size, opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      {emoji}
    </Animated.Text>
  );
}

// Build floater configs once (stable across re-renders)
const FLOATERS: FloaterProps[] = [
  // 9 emojis pre-spread across the visible screen (fills screen at startup)
  ...Array.from({ length: 9 }, () => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: rnd(0, SCREEN_WIDTH - 40),
    size: rnd(14, 30),
    duration: rnd(9000, 20000),
    initialY: rnd(0, SCREEN_HEIGHT),
  })),
  // 9 more emojis starting below screen, staggered up to 12 s
  ...Array.from({ length: 9 }, (_, i) => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: rnd(0, SCREEN_WIDTH - 40),
    size: rnd(14, 30),
    duration: rnd(9000, 20000),
    initialY: SCREEN_HEIGHT + rnd(i * 1200, i * 1400 + 1200), // encodes delay in the value
  })),
];

export function FloatingEmojis() {
  return (
    <View style={styles.container} pointerEvents="none">
      {FLOATERS.map((config, i) => (
        <FloatingEmoji key={i} {...config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  floater: {
    position: 'absolute',
  },
});
