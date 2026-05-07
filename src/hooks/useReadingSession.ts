import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const READING_SESSION_KEY = (readerId: string, bookId: string) =>
  ['reading_sessions', readerId, bookId] as const;

async function fetchReadingSessions(readerId: string, bookId: string): Promise<ReadingSession[]> {
  const { data } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('reader_id', readerId)
    .eq('book_id', bookId)
    .order('session_date', { ascending: false });
  return (data ?? []) as ReadingSession[];
}

export function useReadingSession(readerId: string | null, bookId: string | null): UseReadingSessionResult {
  const qc = useQueryClient();
  const enabled = !!(readerId && bookId);
  const key = enabled ? READING_SESSION_KEY(readerId!, bookId!) : null;
  const today = new Date().toISOString().split('T')[0];

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: key ?? ['reading_sessions', null, null],
    queryFn: () => fetchReadingSessions(readerId!, bookId!),
    enabled,
  });

  const logSessionMutation = useMutation({
    mutationFn: async (lastPage: number) => {
      await supabase.rpc('log_reading_session', {
        p_reader_id: readerId!,
        p_book_id:   bookId!,
        p_last_page: lastPage,
        p_date:      today,
      });
    },
    onSuccess: () => {
      if (key) qc.invalidateQueries({ queryKey: key });
    },
  });

  const logSession = async (lastPage: number): Promise<void> => {
    await logSessionMutation.mutateAsync(lastPage);
  };

  const loggedToday = sessions.some((s) => s.session_date === today);
  const lastPageRead = sessions[0]?.last_page ?? 0;

  return { sessions, isLoading, loggedToday, lastPageRead, logSession, refresh: async () => { await refetch(); } };
}
