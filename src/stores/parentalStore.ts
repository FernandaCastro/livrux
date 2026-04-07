import { create } from 'zustand';

// Tracks parental lock state entirely in memory (no persistence).
// State resets when the app restarts or goes to the background.
interface ParentalState {
  // --- Parent unlock ---
  isParentUnlocked: boolean;
  parentUnlockedUntil: number | null; // epoch ms; null = session-long

  // --- Per-reader unlock (child's own PIN) ---
  unlockedReaders: Set<string>; // reader IDs whose PIN was entered this session

  // --- Actions ---
  unlockParent: (durationMinutes: number) => void;
  unlockReader: (readerId: string) => void;
  lock: () => void; // call on AppState → background
  checkExpiry: () => void; // call on AppState → active / useFocusEffect

  // --- Helpers ---
  canEditReader: () => boolean;
  canAccessReader: (readerId: string) => boolean;
  getReaderAccessMode: (readerId: string) => 'parent' | 'child' | 'none';
}

export const useParentalStore = create<ParentalState>((set, get) => ({
  isParentUnlocked: false,
  parentUnlockedUntil: null,
  unlockedReaders: new Set(),

  unlockParent: (durationMinutes) => {
    const until = durationMinutes === 0
      ? null // 0 = session-long (no expiry)
      : Date.now() + durationMinutes * 60 * 1000;
    set({ isParentUnlocked: true, parentUnlockedUntil: until });
  },

  unlockReader: (readerId) => {
    set((state) => ({
      unlockedReaders: new Set([...state.unlockedReaders, readerId]),
    }));
  },

  lock: () => {
    set({ isParentUnlocked: false, parentUnlockedUntil: null, unlockedReaders: new Set() });
  },

  checkExpiry: () => {
    const { parentUnlockedUntil } = get();
    if (parentUnlockedUntil !== null && Date.now() > parentUnlockedUntil) {
      set({ isParentUnlocked: false, parentUnlockedUntil: null });
    }
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
