import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { StreakInfo } from '../types';

interface UseStreakResult {
  streak: StreakInfo;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_STREAK: StreakInfo = { current_streak: 0, best_streak: 0 };

export function useStreak(readerId: string | null): UseStreakResult {
  const [streak, setStreak] = useState<StreakInfo>(DEFAULT_STREAK);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!readerId) {
      setStreak(DEFAULT_STREAK);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { data } = await supabase.rpc('get_streak_info', { p_reader_id: readerId });

    if (data && data.length > 0) {
      setStreak({ current_streak: data[0].current_streak, best_streak: data[0].best_streak });
    } else {
      setStreak(DEFAULT_STREAK);
    }
    setIsLoading(false);
  }, [readerId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { streak, isLoading, refresh: fetch };
}
