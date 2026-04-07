import { Stack } from 'expo-router';

import { useReaderStore } from '../../src/stores/readerStore';
import { ConfettiOverlay } from '../../src/components/ConfettiOverlay';

export default function AppLayout() {
  const { confettiTrigger, clearConfetti } = useReaderStore();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ConfettiOverlay
        visible={!!confettiTrigger}
        prevCount={confettiTrigger?.prev ?? 0}
        newCount={confettiTrigger?.next ?? 0}
        onDone={clearConfetti}
      />
    </>
  );
}
