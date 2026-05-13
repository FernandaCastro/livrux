import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reader } from '../types';
import { type ThemeId } from '../constants/theme';

const THEME_KEY = (readerId: string) => `livrux_reader_theme_${readerId}`;

// Holds the currently selected reader so all nested screens share the context.
interface ReaderState {
  selectedReader: Reader | null;
  setSelectedReader: (reader: Reader | null) => void;
  currentThemeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
  loadThemeForReader: (readerId: string) => Promise<void>;
  saveThemeForReader: (readerId: string, themeId: ThemeId) => Promise<void>;
  updateBalance: (newBalance: number) => void;
  // Set by the Add Book screen on success so the app layout can display the
  // confetti celebration while the navigation transition back is playing.
  confettiTrigger: { prev: number; next: number } | null;
  triggerConfetti: (prev: number, next: number) => void;
  clearConfetti: () => void;
  // Incremented each time a book is successfully persisted to the DB so that
  // screens holding a readers list can react and refresh stale data.
  bookPersistedCount: number;
  notifyBookPersisted: () => void;
  // Reader selector sheet visibility — controlled via store so the sheet can
  // be rendered at the root layout level (avoids Android Modal double-tap bug).
  readerSelectorVisible: boolean;
  openReaderSelector: () => void;
  closeReaderSelector: () => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  selectedReader: null,
  confettiTrigger: null,
  bookPersistedCount: 0,
  readerSelectorVisible: false,
  currentThemeId: 'classic',

  setSelectedReader: (reader) => set({
    selectedReader: reader,
    // Reset to classic when reader is deselected (parent view)
    ...(reader === null ? { currentThemeId: 'classic' } : {}),
  }),

  setThemeId: (themeId) => set({ currentThemeId: themeId }),

  loadThemeForReader: async (readerId) => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY(readerId));
      const themeId: ThemeId = (stored as ThemeId) ?? 'classic';
      set({ currentThemeId: themeId });
    } catch {
      set({ currentThemeId: 'classic' });
    }
  },

  saveThemeForReader: async (readerId, themeId) => {
    set({ currentThemeId: themeId });
    try {
      await AsyncStorage.setItem(THEME_KEY(readerId), themeId);
    } catch {
      // Non-fatal — preference simply won't persist
    }
  },

  // Optimistic balance update after logging a book.
  updateBalance: (newBalance) =>
    set((state) => ({
      selectedReader: state.selectedReader
        ? { ...state.selectedReader, livrux_balance: newBalance }
        : null,
    })),

  triggerConfetti: (prev, next) => set({ confettiTrigger: { prev, next } }),
  clearConfetti: () => set({ confettiTrigger: null }),
  notifyBookPersisted: () =>
    set((state) => ({ bookPersistedCount: state.bookPersistedCount + 1 })),

  openReaderSelector: () => set({ readerSelectorVisible: true }),
  closeReaderSelector: () => set({ readerSelectorVisible: false }),
}));
