import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { LivruxTransaction, BadgeSlug } from '../types';

export interface AwardedBadge {
  slug: BadgeSlug;
  bonus_xp: number;
}

interface UseLivruxResult {
  transactions: LivruxTransaction[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Fetches the Livrux transaction history for a given reader.
export function useLivrux(readerId: string | null): UseLivruxResult {
  const [transactions, setTransactions] = useState<LivruxTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!readerId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from('livrux_transactions')
      .select('*')
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false });

    if (dbError) {
      setError(dbError.message);
    } else {
      setTransactions((data ?? []) as LivruxTransaction[]);
    }
    setIsLoading(false);
  }, [readerId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { transactions, isLoading, error, refresh: fetch };
}

export interface RevokedBadge {
  slug: BadgeSlug;
  penalty_xp: number;
}

// Calls the atomic delete_book RPC which deletes the book, its reading sessions
// (via CASCADE), records a negative transaction, subtracts the reader balance,
// and revokes any badges the reader no longer qualifies for.
export async function deleteBookRpc(bookId: string): Promise<{ revokedBadges: RevokedBadge[] }> {
  const { data, error } = await supabase.rpc('delete_book', { p_book_id: bookId });
  if (error) throw error;
  const result = data as { revoked_badges: RevokedBadge[] };
  return { revokedBadges: result?.revoked_badges ?? [] };
}

// Calls the atomic log_book RPC which inserts the book, creates a transaction,
// and updates the reader balance in a single database transaction.
// When status = 'reading', dateCompleted should be null and livruxEarned = 0.
export async function logBookRpc(params: {
  readerId: string;
  title: string;
  author: string | null;
  totalPages: number;
  coverUrl: string | null;
  livruxEarned: number;
  status: 'reading' | 'completed';
  dateStart: string;
  dateCompleted: string | null;
  notes: string | null;
  isForeignLanguage: boolean;
  rating: 'disliked' | 'liked' | 'loved' | null;
  review: string | null;
}): Promise<{ bookId: string; awardedBadges: AwardedBadge[] }> {
  const { data, error } = await supabase.rpc('log_book', {
    p_reader_id:           params.readerId,
    p_title:               params.title,
    p_author:              params.author,
    p_total_pages:         params.totalPages,
    p_cover_url:           params.coverUrl,
    p_livrux_earned:       params.livruxEarned,
    p_status:              params.status,
    p_date_start:          params.dateStart,
    p_date_completed:      params.dateCompleted,
    p_notes:               params.notes,
    p_is_foreign_language: params.isForeignLanguage,
    p_rating:              params.rating,
    p_review:              params.review,
  });

  if (error) throw error;
  const result = data as { book_id: string; awarded_badges: AwardedBadge[] };
  return { bookId: result.book_id, awardedBadges: result.awarded_badges ?? [] };
}

// Transitions a 'reading' book to 'completed', awarding Livrux atomically.
// Returns the list of badges just earned so the UI can trigger animations.
export async function completeBookRpc(params: {
  bookId: string;
  dateCompleted: string;
  livruxEarned: number;
  rating: 'disliked' | 'liked' | 'loved' | null;
  review: string | null;
}): Promise<{ awardedBadges: AwardedBadge[] }> {
  const { data, error } = await supabase.rpc('complete_book', {
    p_book_id:        params.bookId,
    p_date_completed: params.dateCompleted,
    p_livrux_earned:  params.livruxEarned,
    p_rating:         params.rating,
    p_review:         params.review,
  });
  if (error) throw error;
  const result = data as { awarded_badges: AwardedBadge[] };
  return { awardedBadges: result?.awarded_badges ?? [] };
}

// Calls the atomic update_book RPC which updates all editable book fields,
// records a 'book_updated' transaction with the Livrux delta, and adjusts the
// reader balance in a single database transaction.
export async function updateBookRpc(params: {
  bookId: string;
  title: string;
  author: string | null;
  totalPages: number;
  coverUrl: string | null;
  dateCompleted: string;
  isForeignLanguage: boolean;
  livruxEarned: number;
  rating: 'disliked' | 'liked' | 'loved' | null;
  review: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('update_book', {
    p_book_id:             params.bookId,
    p_title:               params.title,
    p_author:              params.author,
    p_total_pages:         params.totalPages,
    p_cover_url:           params.coverUrl,
    p_date_completed:      params.dateCompleted,
    p_is_foreign_language: params.isForeignLanguage,
    p_livrux_earned:       params.livruxEarned,
    p_rating:              params.rating,
    p_review:              params.review,
  });
  if (error) throw error;
}

// Calls the atomic spend_livrux RPC which records a real-life Livrux expense,
// inserts a negative transaction with the user's description, and subtracts
// the reader balance in a single database transaction.
export async function spendLivruxRpc(params: {
  readerId: string;
  amount: number;
  description: string;
}): Promise<void> {
  const { error } = await supabase.rpc('spend_livrux', {
    p_reader_id: params.readerId,
    p_amount: params.amount,
    p_description: params.description,
  });
  if (error) throw error;
}
