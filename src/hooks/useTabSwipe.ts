import { useRef, useMemo, useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useReaderStore } from '../stores/readerStore';
import { Easing } from 'react-native';
import { LinearEasing } from 'react-native-reanimated/lib/typescript/css/easing';

export type TabId = 'reader' | 'rewards' | 'friends' | 'ranking';

const TAB_ORDER: TabId[] = ['reader', 'rewards', 'friends', 'ranking'];
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 400;
const MAX_DRAG = 60;       // max visual offset while dragging
const EXIT_MS = 50;       // exit animation duration

export function useTabSwipe(currentTab: TabId) {
  const router = useRouter();
  const { selectedReader } = useReaderStore();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Fade in on mount — masks the LinearGradient render delay on the incoming screen.
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  // Callback updated every render; stable wrapper used by runOnJS.
  const callbackRef = useRef<(dx: number, vx: number) => void>(null!);
  callbackRef.current = (dx: number, vx: number) => {
    if (!selectedReader) return;
    const idx = TAB_ORDER.indexOf(currentTab);
    const toNext = (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && idx < TAB_ORDER.length - 1;
    const toPrev = (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && idx > 0;
    if (!toNext && !toPrev) return;

    const target = TAB_ORDER[idx + (toNext ? 1 : -1)];
    const path =
      target === 'reader'  ? `/app/reader/${selectedReader.id}` :
      target === 'rewards' ? `/app/rewards?readerId=${selectedReader.id}` :
      target === 'friends' ? `/app/friends/${selectedReader.id}` :
                             '/app/ranking';

    if (currentTab === 'reader') router.push(path as any);
    else router.replace(path as any);
  };

  const invoke = useMemo(() => (dx: number, vx: number) => callbackRef.current(dx, vx), []);

  // Constant for this screen's lifetime — safe to capture in worklet closure.
  const idx = TAB_ORDER.indexOf(currentTab);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .onUpdate(e => {
          translateX.value = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, e.translationX));
        })
        .onEnd(e => {
          const { translationX: dx, velocityX: vx } = e;
          const toNext = (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && idx < TAB_ORDER.length - 1;
          const toPrev = (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && idx > 0;

          if (toNext || toPrev) {
            // Animate current screen out, then navigate once done.
            opacity.value = withTiming(0, { duration: EXIT_MS });
            translateX.value = withTiming(
              toNext ? -MAX_DRAG * 2 : MAX_DRAG * 2,
              { duration: EXIT_MS },
              (finished) => { if (finished) runOnJS(invoke)(dx, vx); },
            );
          } else {
            // Gesture cancelled — snap back.
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
          }
        }),
    [invoke, translateX, opacity, idx],
  );

  return { gesture, animatedStyle };
}
