import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { LivruxTransaction } from '../types';

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

// Calls the atomic delete_book RPC which deletes the book, records a negative
// transaction, and subtracts the reader balance in a single database transaction.
export async function deleteBookRpc(bookId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_book', { p_book_id: bookId });
  if (error) throw error;
}

// Calls the atomic log_book RPC which inserts the book, creates a transaction,
// and updates the reader balance in a single database transaction.
export async function logBookRpc(params: {
  readerId: string;
  title: string;
  author: string | null;
  totalPages: number;
  coverUrl: string | null;
  livruxEarned: number;
  dateCompleted: string;
  notes: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('log_book', {
    p_reader_id: params.readerId,
    p_title: params.title,
    p_author: params.author,
    p_total_pages: params.totalPages,
    p_cover_url: params.coverUrl,
    p_livrux_earned: params.livruxEarned,
    p_date_completed: params.dateCompleted,
    p_notes: params.notes,
  });

  if (error) throw error;
  return data as string;
}
