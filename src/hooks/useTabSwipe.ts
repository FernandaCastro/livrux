import { useRef, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useReaderStore } from '../stores/readerStore';

export type TabId = 'reader' | 'rewards' | 'friends' | 'ranking';

const TAB_ORDER: TabId[] = ['reader', 'rewards', 'friends', 'ranking'];
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 400;

export function useTabSwipe(currentTab: TabId) {
  const router = useRouter();
  const { selectedReader } = useReaderStore();

  const callbackRef = useRef<(dx: number, vx: number) => void>(null!);
  callbackRef.current = (dx: number, vx: number) => {
    if (!selectedReader) return;
    const idx = TAB_ORDER.indexOf(currentTab);
    const toNext = (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && idx < TAB_ORDER.length - 1;
    const toPrev = (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && idx > 0;
    if (!toNext && !toPrev) return;

    const target = TAB_ORDER[idx + (toNext ? 1 : -1)];
    const path =
      target === 'reader'  ? '/app/reader' :
      target === 'rewards' ? '/app/rewards' :
      target === 'friends' ? '/app/friends' :
                             '/app/ranking';

    router.push(path as any);
  };

  const invoke = useMemo(() => (dx: number, vx: number) => callbackRef.current(dx, vx), []);
  const idx = TAB_ORDER.indexOf(currentTab);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .onEnd(e => {
          runOnJS(invoke)(e.translationX, e.velocityX);
        }),
    [invoke, idx],
  );

  return { gesture };
}
