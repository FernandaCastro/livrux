import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Badge, ReaderBadge, BadgeSlug } from '../types';

interface BadgeWithStatus extends Badge {
  earned: boolean;
  earned_at?: string;
  bonus_xp?: number;
  bonus_livrux?: number;
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

interface BadgesData {
  allBadges: Badge[];
  readerBadges: ReaderBadge[];
}

export const BADGES_KEY = (readerId: string) => ['badges', readerId] as const;

async function fetchBadgesData(readerId: string): Promise<BadgesData> {
  const [
    { data: catalogData, error: catalogError },
    { data: earnedData, error: earnedError },
  ] = await Promise.all([
    supabase.from('badges').select('*').order('sort_order'),
    supabase.from('reader_badges').select('*').eq('reader_id', readerId),
  ]);

  if (catalogError) throw catalogError;
  if (earnedError) throw earnedError;

  return {
    allBadges: (catalogData ?? []) as Badge[],
    readerBadges: (earnedData ?? []) as ReaderBadge[],
  };
}

export function useBadges(readerId: string | null): UseBadgesResult {
  const qc = useQueryClient();
  const key = readerId ? BADGES_KEY(readerId) : null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: key ?? ['badges', null],
    queryFn: () => fetchBadgesData(readerId!),
    enabled: !!readerId,
  });

  const checkAndAwardMutation = useMutation({
    mutationFn: async () => {
      if (!readerId) return [] as { awarded_slug: BadgeSlug; bonus_livrux: number }[];
      const { data: rpcData } = await supabase.rpc('check_and_award_badges', { p_reader_id: readerId });
      return (rpcData ?? []) as { awarded_slug: BadgeSlug; bonus_livrux: number }[];
    },
    onSuccess: (awarded) => {
      if (awarded.length > 0 && key) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });

  const checkAndAward = async (): Promise<BadgeSlug[]> => {
    const awarded = await checkAndAwardMutation.mutateAsync();
    return awarded.map((a) => a.awarded_slug);
  };

  const allBadges = data?.allBadges ?? [];
  const readerBadges = data?.readerBadges ?? [];
  const earnedSet = new Set(readerBadges.map((rb) => rb.badge_slug));

  const badges: BadgeWithStatus[] = allBadges.map((b) => {
    const rb = readerBadges.find((r) => r.badge_slug === b.slug);
    return {
      ...b,
      earned: earnedSet.has(b.slug as BadgeSlug),
      earned_at: rb?.earned_at,
      bonus_xp: rb?.bonus_xp,
      bonus_livrux: (rb as ReaderBadge & { bonus_livrux?: number })?.bonus_livrux,
    };
  });

  const earnedBadges = badges.filter((b) => b.earned);
  const pendingBadges = badges.filter((b) => !b.earned);

  return {
    badges,
    earnedBadges,
    pendingBadges,
    isLoading,
    error: error ? (error as Error).message : null,
    checkAndAward,
    refresh: async () => { await refetch(); },
  };
}
