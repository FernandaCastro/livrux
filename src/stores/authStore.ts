import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, RewardFormula } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  formula: RewardFormula | null;
  isLoading: boolean;
  pendingEmailConfirmation: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  fetchFormula: () => Promise<void>;
  signOut: () => Promise<void>;
  setPendingEmailConfirmation: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  formula: null,
  isLoading: true,
  pendingEmailConfirmation: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, isLoading: false });
  },

  setPendingEmailConfirmation: (value) => {
    set({ pendingEmailConfirmation: value });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, parental_pin, parental_unlock_duration, created_at')
      .eq('id', user.id)
      .single();

    if (!error && data) set({ profile: data as UserProfile });
  },

  fetchFormula: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('reward_formulas')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) set({ formula: data as RewardFormula });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, formula: null });
  },
}));
