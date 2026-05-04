import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ReadingSession } from '../types';

interface UseReadingSessionResult {
  sessions: ReadingSession[];
  isLoading: boolean;
  loggedToday: boolean;
  lastPageRead: number;
  logSession: (lastPage: number) => Promise<void>;
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

  const logSession = useCallback(async (lastPage: number) => {
    if (!readerId || !bookId) return;

    await supabase.rpc('log_reading_session', {
      p_reader_id: readerId,
      p_book_id:   bookId,
      p_last_page: lastPage,
      p_date:      today,
    });

    // Refresh sessions to reflect the upserted row
    await fetch();
  }, [readerId, bookId, today, fetch]);

  const loggedToday = sessions.some((s) => s.session_date === today);
  const lastPageRead = sessions[0]?.last_page ?? 0;

  return { sessions, isLoading, loggedToday, lastPageRead, logSession, refresh: fetch };
}
