import { create } from 'zustand';
import type { Reader } from '../types';

// Holds the currently selected reader so all nested screens share the context.
interface ReaderState {
  selectedReader: Reader | null;
  setSelectedReader: (reader: Reader | null) => void;
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
}

export const useReaderStore = create<ReaderState>((set) => ({
  selectedReader: null,
  confettiTrigger: null,
  bookPersistedCount: 0,

  setSelectedReader: (reader) => set({ selectedReader: reader }),

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
}));
