import { create } from 'zustand';
import type { Reader } from '../types';

// Holds the currently selected reader so all nested screens share the context.
interface ReaderState {
  selectedReader: Reader | null;
  setSelectedReader: (reader: Reader | null) => void;
  updateBalance: (newBalance: number) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  selectedReader: null,

  setSelectedReader: (reader) => set({ selectedReader: reader }),

  // Optimistic balance update after logging a book.
  updateBalance: (newBalance) =>
    set((state) => ({
      selectedReader: state.selectedReader
        ? { ...state.selectedReader, livrux_balance: newBalance }
        : null,
    })),
}));
