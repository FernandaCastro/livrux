import { createClient } from '@supabase/supabase-js';
import { secureStoreAdapter } from './secureStoreAdapter';

// These env vars are injected by Expo at build time.
// Never commit real credentials — use a .env file (git-ignored).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. ' +
      'Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file ' +
      'and that you ran: export $(grep -v "^#" .env | xargs) before building.'
  );
}

// Single Supabase client instance shared across the entire app.
// SecureStore (iOS Keychain / Android Keystore) keeps the session encrypted at rest.
// A chunking adapter is used because SecureStore has a ~2 KB per-key limit.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
