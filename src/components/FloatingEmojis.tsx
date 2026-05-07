import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const EMOJIS = ['📚', '📖', '🪙', '⭐', '🌟', '✨', '🎉', '🎈', '🦋', '🌈'];
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface FloaterConfig {
  emoji: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

function FloatingEmoji({ emoji, left, size, duration, delay }: FloaterConfig) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT + 60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.18,
              duration: duration * 0.12,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.18,
              duration: duration * 0.76,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.12,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floater,
        { left, fontSize: size, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      {emoji}
    </Animated.Text>
  );
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const FLOATERS: FloaterConfig[] = Array.from({ length: 18 }, () => ({
  emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
  left: randomBetween(0, SCREEN_WIDTH - 40),
  size: randomBetween(14, 30),
  duration: randomBetween(8000, 22000),
  delay: randomBetween(0, 10000),
}));

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
