import { create } from 'zustand';

// Tracks parental lock state entirely in memory (no persistence).
// State resets when the app restarts or goes to the background.
interface ParentalState {
  // --- Parent unlock ---
  isParentUnlocked: boolean;

  // --- Per-reader unlock (child's own PIN) ---
  unlockedReaders: Set<string>; // reader IDs whose PIN was entered this session

  // --- Actions ---
  unlockParent: () => void;
  lockParent: () => void; // lock only parent mode, keep reader unlocks intact
  unlockReader: (readerId: string) => void;
  lockReaders: () => void; // clear reader unlocks (called on home focus)
  lock: () => void; // call on AppState → background (clears everything)

  // --- Helpers ---
  canEditReader: () => boolean;
  canAccessReader: (readerId: string) => boolean;
  getReaderAccessMode: (readerId: string) => 'parent' | 'child' | 'none';
}

export const useParentalStore = create<ParentalState>((set, get) => ({
  isParentUnlocked: false,
  unlockedReaders: new Set(),

  unlockParent: () => {
    set({ isParentUnlocked: true });
  },

  lockParent: () => {
    set({ isParentUnlocked: false });
  },

  unlockReader: (readerId) => {
    set((state) => ({
      unlockedReaders: new Set([...state.unlockedReaders, readerId]),
    }));
  },

  lockReaders: () => {
    set({ unlockedReaders: new Set() });
  },

  lock: () => {
    set({ isParentUnlocked: false, unlockedReaders: new Set() });
  },

  canEditReader: () => get().isParentUnlocked,

  canAccessReader: (readerId) => {
    const { isParentUnlocked, unlockedReaders } = get();
    return isParentUnlocked || unlockedReaders.has(readerId);
  },

  getReaderAccessMode: (readerId) => {
    const { isParentUnlocked, unlockedReaders } = get();
    if (isParentUnlocked) return 'parent';
    if (unlockedReaders.has(readerId)) return 'child';
    return 'none';
  },
}));
