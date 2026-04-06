import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { deleteBookRpc, updateBookRpc } from './useLivrux';
import type { Book } from '../types';

interface UseBooksResult {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  updateBook: (params: Parameters<typeof updateBookRpc>[0]) => Promise<void>;
}

// Fetches all books for a given reader, ordered newest first.
export function useBooks(readerId: string | null): UseBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!readerId) {
      setBooks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from('books')
      .select('*')
      .eq('reader_id', readerId)
      .order('date_completed', { ascending: false });

    if (dbError) {
      setError(dbError.message);
    } else {
      setBooks((data ?? []) as Book[]);
    }
    setIsLoading(false);
  }, [readerId]);

  useEffect(() => { fetch(); }, [fetch]);

  const deleteBook = async (bookId: string): Promise<void> => {
    await deleteBookRpc(bookId);
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  const updateBook = async (params: Parameters<typeof updateBookRpc>[0]): Promise<void> => {
    await updateBookRpc(params);
    setBooks((prev) =>
      prev.map((b) =>
        b.id === params.bookId
          ? {
              ...b,
              title: params.title,
              author: params.author,
              total_pages: params.totalPages,
              cover_url: params.coverUrl,
              date_completed: params.dateCompleted,
              is_foreign_language: params.isForeignLanguage,
              livrux_earned: params.livruxEarned,
            }
          : b
      )
    );
  };

  return { books, isLoading, error, refresh: fetch, deleteBook, updateBook };
}
