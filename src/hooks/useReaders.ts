import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { deleteImage } from '../lib/storage';
import { useAuthStore } from '../stores/authStore';
import type { Reader } from '../types';

interface UseReadersResult {
  readers: Reader[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createReader: (name: string, avatarUrl?: string) => Promise<Reader>;
  updateReader: (id: string, updates: Partial<Pick<Reader, 'name' | 'avatar_url'>>) => Promise<void>;
  deleteReader: (id: string, avatarUrl?: string | null) => Promise<void>;
}

export function useReaders(): UseReadersResult {
  const { user } = useAuthStore();
  const [readers, setReaders] = useState<Reader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from('readers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (dbError) {
      setError(dbError.message);
    } else {
      setReaders((data ?? []) as Reader[]);
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const createReader = async (name: string, avatarUrl?: string): Promise<Reader> => {
    if (!user) throw new Error('Not authenticated');

    const { data, error: dbError } = await supabase
      .from('readers')
      .insert({ user_id: user.id, name, avatar_url: avatarUrl ?? null })
      .select()
      .single();

    if (dbError) throw dbError;
    const created = data as Reader;
    setReaders((prev) => [...prev, created]);
    return created;
  };

  const updateReader = async (
    id: string,
    updates: Partial<Pick<Reader, 'name' | 'avatar_url'>>
  ): Promise<void> => {
    const { error: dbError } = await supabase
      .from('readers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (dbError) throw dbError;
    setReaders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteReader = async (id: string, avatarUrl?: string | null): Promise<void> => {
    const { error: dbError } = await supabase
      .from('readers')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;
    setReaders((prev) => prev.filter((r) => r.id !== id));

    if (avatarUrl && user) {
      await deleteImage('avatars', user.id, id).catch(() => {});
    }
  };

  return { readers, isLoading, error, refresh: fetch, createReader, updateReader, deleteReader };
}
