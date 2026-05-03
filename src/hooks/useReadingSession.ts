import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ReadingSession } from '../types';

interface UseReadingSessionResult {
  sessions: ReadingSession[];
  isLoading: boolean;
  loggedToday: boolean;
  logSession: (pagesRead: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReadingSession(readerId: string | null, bookId: string | null): UseReadingSessionResult {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetch = useCallback(async () => {
    if (!readerId || !bookId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { data } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('reader_id', readerId)
      .eq('book_id', bookId)
      .order('session_date', { ascending: false });

    setSessions((data ?? []) as ReadingSession[]);
    setIsLoading(false);
  }, [readerId, bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  const logSession = useCallback(async (pagesRead: number) => {
    if (!readerId || !bookId) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('reading_sessions')
      .upsert(
        { reader_id: readerId, book_id: bookId, user_id: userId, session_date: today, pages_read: pagesRead },
        { onConflict: 'reader_id,book_id,session_date' }
      )
      .select()
      .single();

    if (!error && data) {
      setSessions((prev) => {
        const without = prev.filter((s) => s.session_date !== today);
        return [data as ReadingSession, ...without];
      });
    }
  }, [readerId, bookId, today]);

  const loggedToday = sessions.some((s) => s.session_date === today);

  return { sessions, isLoading, loggedToday, logSession, refresh: fetch };
}
