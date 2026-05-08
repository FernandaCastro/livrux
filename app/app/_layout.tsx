import { Stack } from 'expo-router';

import { useReaderStore } from '../../src/stores/readerStore';
import { ConfettiOverlay } from '../../src/components/ConfettiOverlay';
import { ReaderSelectorSheet } from '../../src/components/ReaderSelectorSheet';

export default function AppLayout() {
  const { confettiTrigger, clearConfetti, readerSelectorVisible, closeReaderSelector } = useReaderStore();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ConfettiOverlay
        visible={!!confettiTrigger}
        prevCount={confettiTrigger?.prev ?? 0}
        newCount={confettiTrigger?.next ?? 0}
        onDone={clearConfetti}
        bookImageSource={require('../../assets/livrux-clean.png')}
      />
      <ReaderSelectorSheet visible={readerSelectorVisible} onClose={closeReaderSelector} />
    </>
  );
}
