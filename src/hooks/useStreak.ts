import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StreakInfo } from '../types';

interface UseStreakResult {
  streak: StreakInfo;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_STREAK: StreakInfo = { current_streak: 0, best_streak: 0 };

export const STREAK_KEY = (readerId: string) => ['streak', readerId] as const;

async function fetchStreak(readerId: string): Promise<StreakInfo> {
  const { data } = await supabase.rpc('get_streak_info', { p_reader_id: readerId });
  if (data && data.length > 0) {
    return { current_streak: data[0].current_streak, best_streak: data[0].best_streak };
  }
  return DEFAULT_STREAK;
}

export function useStreak(readerId: string | null): UseStreakResult {
  const { data: streak = DEFAULT_STREAK, isLoading, refetch } = useQuery({
    queryKey: readerId ? STREAK_KEY(readerId) : ['streak', null],
    queryFn: () => fetchStreak(readerId!),
    enabled: !!readerId,
  });

  return { streak, isLoading, refresh: async () => { await refetch(); } };
}
