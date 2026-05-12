import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FriendData, FriendRequest, FriendSearchResult } from '../types';

interface UseFriendsResult {
  friends: FriendData[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  friendCode: string | null;
  friendsAutonomy: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  searchByCode: (code: string) => Promise<FriendSearchResult | null>;
  sendRequest: (addresseeId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  rejectRequest: (friendshipId: string) => Promise<void>;
  unfriend: (friendshipId: string) => Promise<void>;
}

interface FriendsData {
  friends: FriendData[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  friendCode: string | null;
  friendsAutonomy: boolean;
}

export const FRIENDS_KEY = (readerId: string) => ['friends', readerId] as const;

async function fetchFriendsData(readerId: string): Promise<FriendsData> {
  const [readerResult, acceptedResult, pendingResult, sentResult] = await Promise.all([
    supabase
      .from('readers')
      .select('friend_code, friends_autonomy')
      .eq('id', readerId)
      .single(),
    supabase
      .from('reader_friendships')
      .select(`
        id, requester_id, addressee_id,
        requester:requester_id(id, name, avatar_seed, xp, book_count),
        addressee:addressee_id(id, name, avatar_seed, xp, book_count)
      `)
      .or(`requester_id.eq.${readerId},addressee_id.eq.${readerId}`)
      .eq('status', 'accepted'),
    supabase
      .from('reader_friendships')
      .select(`
        id, requester_id,
        requester:requester_id(id, name, avatar_seed, xp, book_count)
      `)
      .eq('addressee_id', readerId)
      .eq('status', 'pending'),
    supabase
      .from('reader_friendships')
      .select(`
        id, addressee_id,
        addressee:addressee_id(id, name, avatar_seed, xp, book_count)
      `)
      .eq('requester_id', readerId)
      .eq('status', 'pending'),
  ]);

  const friends: FriendData[] = (acceptedResult.data ?? [] as any[])
    .filter((rf) => {
      const friend = rf.requester_id === readerId ? rf.addressee : rf.requester;
      return friend != null;
    })
    .map((rf) => {
      const iAmRequester = rf.requester_id === readerId;
      const friend = iAmRequester ? rf.addressee : rf.requester;
      return {
        friendshipId: rf.id,
        reader: {
          id: friend.id,
          name: friend.name,
          avatar_seed: friend.avatar_seed ?? null,
          book_count: (friend.book_count ?? 0) as number,
          xp: (friend.xp ?? 0) as number,
        },
      } satisfies FriendData;
    });

  const pendingRequests: FriendRequest[] = (pendingResult.data ?? [] as any[])
    .filter((rf) => rf.requester != null)
    .map((rf) => ({
      friendshipId: rf.id,
      reader: {
        id: rf.requester.id,
        name: rf.requester.name,
        avatar_seed: rf.requester.avatar_seed ?? null,
        book_count: (rf.requester.book_count ?? 0) as number,
        xp: (rf.requester.xp ?? 0) as number,
      },
    } satisfies FriendRequest));

  const sentRequests: FriendRequest[] = (sentResult.data ?? [] as any[])
    .filter((rf) => rf.addressee != null)
    .map((rf) => ({
      friendshipId: rf.id,
      reader: {
        id: rf.addressee.id,
        name: rf.addressee.name,
        avatar_seed: rf.addressee.avatar_seed ?? null,
        book_count: (rf.addressee.book_count ?? 0) as number,
        xp: (rf.addressee.xp ?? 0) as number,
      },
    } satisfies FriendRequest));

  return {
    friends,
    pendingRequests,
    sentRequests,
    friendCode: readerResult.data?.friend_code ?? null,
    friendsAutonomy: readerResult.data?.friends_autonomy ?? false,
  };
}

export function useFriends(readerId: string | null): UseFriendsResult {
  const qc = useQueryClient();
  const key = readerId ? FRIENDS_KEY(readerId) : null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: key ?? ['friends', null],
    queryFn: () => fetchFriendsData(readerId!),
    enabled: !!readerId,
  });

  const invalidate = () => { if (key) qc.invalidateQueries({ queryKey: key }); };

  const sendMutation = useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase
        .from('reader_friendships')
        .insert({ requester_id: readerId!, addressee_id: addresseeId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const acceptMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('reader_friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('reader_friendships')
        .delete()
        .eq('id', friendshipId);
      if (error) throw error;
      return friendshipId;
    },
    onSuccess: (friendshipId) => {
      if (!key) return;
      qc.setQueryData(key, (old: FriendsData | undefined) =>
        old
          ? { ...old, pendingRequests: old.pendingRequests.filter((r) => r.friendshipId !== friendshipId) }
          : old
      );
    },
  });

  const unfriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('reader_friendships')
        .delete()
        .eq('id', friendshipId);
      if (error) throw error;
      return friendshipId;
    },
    onSuccess: (friendshipId) => {
      if (!key) return;
      qc.setQueryData(key, (old: FriendsData | undefined) =>
        old
          ? { ...old, friends: old.friends.filter((f) => f.friendshipId !== friendshipId) }
          : old
      );
    },
  });

  const searchByCode = async (code: string): Promise<FriendSearchResult | null> => {
    const { data: rpcData, error } = await supabase.rpc('search_reader_by_code', {
      p_code: code.trim().toUpperCase(),
    });
    if (error || !rpcData || rpcData.length === 0) return null;
    const r = rpcData[0];
    return {
      id: r.id,
      name: r.name,
      avatar_seed: r.avatar_seed ?? null,
      book_count: Number(r.book_count ?? 0),
      xp: Number(r.xp ?? 0),
    };
  };

  return {
    friends: data?.friends ?? [],
    pendingRequests: data?.pendingRequests ?? [],
    sentRequests: data?.sentRequests ?? [],
    friendCode: data?.friendCode ?? null,
    friendsAutonomy: data?.friendsAutonomy ?? false,
    isLoading,
    refresh: async () => { await refetch(); },
    searchByCode,
    sendRequest: (addresseeId) => sendMutation.mutateAsync(addresseeId),
    acceptRequest: (friendshipId) => acceptMutation.mutateAsync(friendshipId),
    rejectRequest: (friendshipId) => rejectMutation.mutateAsync(friendshipId),
    unfriend: (friendshipId) => unfriendMutation.mutateAsync(friendshipId),
  };
}
