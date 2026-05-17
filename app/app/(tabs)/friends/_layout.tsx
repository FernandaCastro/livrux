import { Stack } from 'expo-router';

import { useReaderStore } from '../../../../src/stores/readerStore';
import { themes } from '../../../../src/constants/theme';

export default function FriendsTabLayout() {
  const { currentThemeId } = useReaderStore();
  const background = themes[currentThemeId].flashFrameBackground;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: background } }} />;
}
