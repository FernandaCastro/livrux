import { useRef, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useReaderStore } from '../stores/readerStore';

export type TabId = 'reader' | 'rewards' | 'friends' | 'ranking';

const TAB_ORDER: TabId[] = ['reader', 'rewards', 'friends', 'ranking'];
const SWIPE_THRESHOLD = 60;   // px translation
const VELOCITY_THRESHOLD = 400; // px/s

export function useTabSwipe(currentTab: TabId) {
  const router = useRouter();
  const { selectedReader } = useReaderStore();

  // Updated every render so the worklet always reads current values via the ref.
  const callbackRef = useRef<(dx: number, vx: number) => void>(null!);
  callbackRef.current = (dx: number, vx: number) => {
    if (!selectedReader) return;

    const idx = TAB_ORDER.indexOf(currentTab);
    const toNext = (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && idx < TAB_ORDER.length - 1;
    const toPrev = (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && idx > 0;
    if (!toNext && !toPrev) return;

    const target = TAB_ORDER[idx + (toNext ? 1 : -1)];
    const path =
      target === 'reader'  ? `/app/reader/${selectedReader.id}` :
      target === 'rewards' ? `/app/rewards?readerId=${selectedReader.id}` :
      target === 'friends' ? `/app/friends/${selectedReader.id}` :
                             '/app/ranking';

    // Keep the reader in the back-stack when leaving it for the first time.
    if (currentTab === 'reader') router.push(path as any);
    else router.replace(path as any);
  };

  // Stable wrapper — runOnJS requires a consistent function reference.
  const invoke = useMemo(() => (dx: number, vx: number) => callbackRef.current(dx, vx), []);

  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])   // activate only after 15 px horizontal
        .failOffsetY([-20, 20])     // yield to ScrollView if vertical > 20 px
        .onEnd(e => { runOnJS(invoke)(e.translationX, e.velocityX); }),
    [invoke],
  );
}
