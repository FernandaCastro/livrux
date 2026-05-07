import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { deleteBookRpc, updateBookRpc } from './useLivrux';
import type { RevokedBadge } from './useLivrux';
import type { Book } from '../types';

export const BOOKS_KEY = (readerId: string) => ['books', readerId] as const;

async function fetchBooks(readerId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('reader_id', readerId)
    .order('date_completed', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Book[];
}

export function useBooks(readerId: string | null) {
  const qc = useQueryClient();
  const key = readerId ? BOOKS_KEY(readerId) : null;

  const { data: books = [], isLoading, error, refetch } = useQuery({
    queryKey: key ?? ['books', null],
    queryFn: () => fetchBooks(readerId!),
    enabled: !!readerId,
  });

  const deleteMutation = useMutation({
    mutationFn: (bookId: string) => deleteBookRpc(bookId),
    onSuccess: (_, bookId) => {
      if (!key) return;
      qc.setQueryData(key, (old: Book[] = []) => old.filter((b) => b.id !== bookId));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: Parameters<typeof updateBookRpc>[0]) => updateBookRpc(params),
    onSuccess: (_, params) => {
      if (!key) return;
      qc.setQueryData(key, (old: Book[] = []) =>
        old.map((b) =>
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
                rating: params.rating,
                review: params.review,
              }
            : b
        )
      );
    },
  });

  const deleteBook = async (bookId: string): Promise<{ revokedBadges: RevokedBadge[] }> =>
    deleteMutation.mutateAsync(bookId);

  const updateBook = async (params: Parameters<typeof updateBookRpc>[0]): Promise<void> => {
    await updateMutation.mutateAsync(params);
  };

  return {
    books,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
    deleteBook,
    updateBook,
  };
}
