import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Badge, ReaderBadge, BadgeSlug } from '../types';

interface BadgeWithStatus extends Badge {
  earned: boolean;
  earned_at?: string;
  bonus_xp?: number;
}

interface UseBadgesResult {
  badges: BadgeWithStatus[];
  earnedBadges: BadgeWithStatus[];
  pendingBadges: BadgeWithStatus[];
  isLoading: boolean;
  error: string | null;
  checkAndAward: () => Promise<BadgeSlug[]>;
  refresh: () => Promise<void>;
}

export function useBadges(readerId: string | null): UseBadgesResult {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [readerBadges, setReaderBadges] = useState<ReaderBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!readerId) {
      setAllBadges([]);
      setReaderBadges([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const [
      { data: catalogData, error: catalogError },
      { data: earnedData, error: earnedError },
    ] = await Promise.all([
      supabase.from('badges').select('*').order('sort_order'),
      supabase.from('reader_badges').select('*').eq('reader_id', readerId),
    ]);

    if (catalogError) {
      console.error('[useBadges] catalog error:', catalogError.message);
      setError(catalogError.message);
    }
    if (earnedError) {
      console.error('[useBadges] reader_badges error:', earnedError.message);
      setError(earnedError.message);
    }

    setAllBadges((catalogData ?? []) as Badge[]);
    setReaderBadges((earnedData ?? []) as ReaderBadge[]);
    setIsLoading(false);
  }, [readerId]);

  useEffect(() => { fetch(); }, [fetch]);

  const checkAndAward = useCallback(async (): Promise<BadgeSlug[]> => {
    if (!readerId) return [];

    const { data } = await supabase.rpc('check_and_award_badges', { p_reader_id: readerId });
    const awarded = (data ?? []) as { awarded_slug: BadgeSlug; bonus_livrux: number }[];

    if (awarded.length > 0) {
      await fetch();
    }

    return awarded.map((a) => a.awarded_slug);
  }, [readerId, fetch]);

  const earnedSet = new Set(readerBadges.map((rb) => rb.badge_slug));

  const badges: BadgeWithStatus[] = allBadges.map((b) => {
    const rb = readerBadges.find((r) => r.badge_slug === b.slug);
    return {
      ...b,
      earned: earnedSet.has(b.slug as BadgeSlug),
      earned_at: rb?.earned_at,
      bonus_xp: rb?.bonus_xp,
    };
  });

  const earnedBadges = badges.filter((b) => b.earned);
  const pendingBadges = badges.filter((b) => !b.earned);

  return { badges, earnedBadges, pendingBadges, isLoading, error, checkAndAward, refresh: fetch };
}
