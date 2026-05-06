import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { FriendData, FriendRequest, FriendSearchResult } from '../types';

interface UseFriendsResult {
  friends: FriendData[];
  pendingRequests: FriendRequest[];
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

export function useFriends(readerId: string | null): UseFriendsResult {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [friendsAutonomy, setFriendsAutonomy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!readerId) return;
    setIsLoading(true);

    // Fetch reader's own code + autonomy setting
    const { data: readerData } = await supabase
      .from('readers')
      .select('friend_code, friends_autonomy')
      .eq('id', readerId)
      .single();

    if (readerData) {
      setFriendCode(readerData.friend_code ?? null);
      setFriendsAutonomy(readerData.friends_autonomy ?? false);
    }

    // Fetch accepted friendships with friend reader info + book count
    const { data: acceptedData } = await supabase
      .from('reader_friendships')
      .select(`
        id, requester_id, addressee_id,
        requester:requester_id(id, name, avatar_seed, xp, books(count)),
        addressee:addressee_id(id, name, avatar_seed, xp, books(count))
      `)
      .or(`requester_id.eq.${readerId},addressee_id.eq.${readerId}`)
      .eq('status', 'accepted');

    if (acceptedData) {
      setFriends(
        (acceptedData as any[])
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
                book_count: (friend.books?.[0]?.count ?? 0) as number,
                xp: (friend.xp ?? 0) as number,
              },
            } satisfies FriendData;
          })
      );
    }

    // Fetch pending incoming requests
    const { data: pendingData } = await supabase
      .from('reader_friendships')
      .select(`
        id, requester_id,
        requester:requester_id(id, name, avatar_seed, xp, books(count))
      `)
      .eq('addressee_id', readerId)
      .eq('status', 'pending');

    if (pendingData) {
      setPendingRequests(
        (pendingData as any[])
          .filter((rf) => rf.requester != null)
          .map((rf) => ({
            friendshipId: rf.id,
            reader: {
              id: rf.requester.id,
              name: rf.requester.name,
              avatar_seed: rf.requester.avatar_seed ?? null,
              book_count: (rf.requester.books?.[0]?.count ?? 0) as number,
              xp: (rf.requester.xp ?? 0) as number,
            },
          } satisfies FriendRequest))
      );
    }

    setIsLoading(false);
  }, [readerId]);

  useEffect(() => { fetch(); }, [fetch]);

  const searchByCode = async (code: string): Promise<FriendSearchResult | null> => {
    const { data, error } = await supabase.rpc('search_reader_by_code', {
      p_code: code.trim().toUpperCase(),
    });
    if (error || !data || data.length === 0) return null;
    const r = data[0];
    return {
      id: r.id,
      name: r.name,
      avatar_seed: r.avatar_seed ?? null,
      book_count: Number(r.book_count ?? 0),
      xp: Number(r.xp ?? 0),
    };
  };

  const sendRequest = async (addresseeId: string): Promise<void> => {
    const { error } = await supabase
      .from('reader_friendships')
      .insert({ requester_id: readerId!, addressee_id: addresseeId });
    if (error) throw error;
  };

  const acceptRequest = async (friendshipId: string): Promise<void> => {
    const { error } = await supabase
      .from('reader_friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);
    if (error) throw error;
    await fetch();
  };

  const rejectRequest = async (friendshipId: string): Promise<void> => {
    const { error } = await supabase
      .from('reader_friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw error;
    setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
  };

  const unfriend = async (friendshipId: string): Promise<void> => {
    const { error } = await supabase
      .from('reader_friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw error;
    setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
  };

  return {
    friends,
    pendingRequests,
    friendCode,
    friendsAutonomy,
    isLoading,
    refresh: fetch,
    searchByCode,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
  };
}
