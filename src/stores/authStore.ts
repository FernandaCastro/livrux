import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, RewardFormula } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  formula: RewardFormula | null;
  // ID of the root family owner. Equals user.id for owners; equals the
  // owner's ID for co-guardians. Used to scope all shared-data queries.
  ownerId: string | null;
  isLoading: boolean;
  pendingEmailConfirmation: boolean;
  confirmationEmail: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  fetchCoGuardianStatus: () => Promise<void>;
  fetchFormula: () => Promise<void>;
  signOut: () => Promise<void>;
  setPendingEmailConfirmation: (value: boolean) => void;
  setConfirmationEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  formula: null,
  ownerId: null,
  isLoading: true,
  pendingEmailConfirmation: false,
  confirmationEmail: null,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, isLoading: false });
  },

  setPendingEmailConfirmation: (value) => {
    set({ pendingEmailConfirmation: value });
  },

  setConfirmationEmail: (email) => {
    set({ confirmationEmail: email });
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

  // Checks if the current user is a co-guardian and sets ownerId accordingly.
  // Must be called before fetchFormula so the formula is fetched for the right owner.
  fetchCoGuardianStatus: async () => {
    const { user } = get();
    if (!user) return;

    const { data } = await supabase
      .from('co_guardians')
      .select('owner_id')
      .eq('guardian_id', user.id)
      .maybeSingle();

    set({ ownerId: data?.owner_id ?? user.id });
  },

  fetchFormula: async () => {
    const { user, ownerId } = get();
    if (!user) return;

    const targetId = ownerId ?? user.id;
    const { data, error } = await supabase
      .from('reward_formulas')
      .select('*')
      .eq('user_id', targetId)
      .single();

    if (!error && data) set({ formula: data as RewardFormula });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, formula: null, ownerId: null });
  },
}));
