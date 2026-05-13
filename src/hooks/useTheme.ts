import { useReaderStore } from '../stores/readerStore';
import { themes, type ColorPalette } from '../constants/theme';

export function useTheme(): ColorPalette {
  const themeId = useReaderStore(s => s.currentThemeId);
  return themes[themeId];
}
