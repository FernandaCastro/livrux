import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Reader } from '../types';

export const READERS_KEY = (ownerId: string) => ['readers', ownerId] as const;

function useReadersKey() {
  const { ownerId } = useAuthStore();
  return ownerId ? READERS_KEY(ownerId) : null;
}

async function fetchReaders(ownerId: string): Promise<Reader[]> {
  const { data, error } = await supabase
    .from('readers')
    .select('id, user_id, name, avatar_seed, old_avatar_seed, pin, livrux_balance, xp, book_count, friend_code, friends_autonomy, created_at, updated_at, reader_badges(count)')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    badge_count: (r.reader_badges?.[0]?.count ?? 0) as number,
    reader_badges: undefined,
  })) as Reader[];
}

export function useReaders() {
  const { user, ownerId } = useAuthStore();
  const qc = useQueryClient();
  const key = useReadersKey();

  const { data: readers = [], isLoading, error, refetch } = useQuery({
    queryKey: key ?? ['readers', null],
    queryFn: () => fetchReaders(ownerId!),
    enabled: !!ownerId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, avatarSeed }: { name: string; avatarSeed?: string | null }) => {
      if (!user || !ownerId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('readers')
        .insert({ user_id: ownerId, name, avatar_seed: avatarSeed ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as Reader;
    },
    onSuccess: (created) => {
      if (!key) return;
      qc.setQueryData(key, (old: Reader[] = []) => [...old, created]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<Reader, 'name' | 'avatar_seed' | 'old_avatar_seed'>>;
    }) => {
      const { error } = await supabase
        .from('readers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, updates };
    },
    onSuccess: ({ id, updates }) => {
      if (!key) return;
      qc.setQueryData(key, (old: Reader[] = []) =>
        old.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('readers').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      if (!key) return;
      qc.setQueryData(key, (old: Reader[] = []) => old.filter((r) => r.id !== id));
    },
  });

  const createReader = async (name: string, avatarSeed?: string | null): Promise<Reader> =>
    createMutation.mutateAsync({ name, avatarSeed });

  const updateReader = async (
    id: string,
    updates: Partial<Pick<Reader, 'name' | 'avatar_seed' | 'old_avatar_seed'>>
  ): Promise<void> => {
    await updateMutation.mutateAsync({ id, updates });
  };

  const deleteReader = async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    readers,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
    createReader,
    updateReader,
    deleteReader,
  };
}
