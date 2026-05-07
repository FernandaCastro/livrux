import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { deleteBookRpc, updateBookRpc } from './useLivrux';
import type { RevokedBadge } from './useLivrux';
import type { Book } from '../types';

const PAGE_SIZE = 20;

export const BOOKS_KEY = (readerId: string) => ['books', readerId] as const;
export const BOOK_KEY = (bookId: string) => ['book', bookId] as const;
export const READING_BOOKS_KEY = (readerId: string) => ['reading_books', readerId] as const;

async function fetchBooksPage(readerId: string, page: number): Promise<Book[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('reader_id', readerId)
    .eq('status', 'completed')
    .order('date_completed', { ascending: false })
    .order('created_at',     { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data ?? []) as Book[];
}

export function useBooks(readerId: string | null) {
  const qc = useQueryClient();
  const key = readerId ? BOOKS_KEY(readerId) : null;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: key ?? ['books', null],
    queryFn: ({ pageParam }) => fetchBooksPage(readerId!, pageParam as number),
    getNextPageParam: (lastPage: Book[], allPages: Book[][]) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    initialPageParam: 0,
    enabled: !!readerId,
  });

  const books = data?.pages.flat() ?? [];

  const deleteMutation = useMutation({
    mutationFn: (bookId: string) => deleteBookRpc(bookId),
    onSuccess: (_, bookId) => {
      if (!key) return;
      qc.setQueryData<InfiniteData<Book[]>>(key, (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => page.filter((b) => b.id !== bookId)) };
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: Parameters<typeof updateBookRpc>[0]) => updateBookRpc(params),
    onSuccess: (_, params) => {
      if (!key) return;
      qc.setQueryData<InfiniteData<Book[]>>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((b) =>
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
          ),
        };
      });
    },
  });

  return {
    books,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteBook: async (bookId: string): Promise<{ revokedBadges: RevokedBadge[] }> =>
      deleteMutation.mutateAsync(bookId),
    updateBook: async (params: Parameters<typeof updateBookRpc>[0]): Promise<void> => {
      await updateMutation.mutateAsync(params);
    },
  };
}

// Single-book query for detail/edit screens — avoids depending on the paginated list.
export function useBook(bookId: string | null) {
  const qc = useQueryClient();

  const { data: book = null, isLoading, error, refetch } = useQuery({
    queryKey: bookId ? BOOK_KEY(bookId) : ['book', null],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId!)
        .single();
      if (dbError) throw dbError;
      return data as Book;
    },
    enabled: !!bookId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBookRpc(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: BOOK_KEY(id) });
      if (book?.reader_id) qc.invalidateQueries({ queryKey: BOOKS_KEY(book.reader_id) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: Parameters<typeof updateBookRpc>[0]) => updateBookRpc(params),
    onSuccess: (_, params) => {
      if (!bookId) return;
      qc.setQueryData<Book>(BOOK_KEY(bookId), (old) =>
        old
          ? {
              ...old,
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
          : old
      );
      if (book?.reader_id) qc.invalidateQueries({ queryKey: BOOKS_KEY(book.reader_id) });
    },
  });

  return {
    book,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
    deleteBook: async (id: string): Promise<{ revokedBadges: RevokedBadge[] }> =>
      deleteMutation.mutateAsync(id),
    updateBook: async (params: Parameters<typeof updateBookRpc>[0]): Promise<void> => {
      await updateMutation.mutateAsync(params);
    },
  };
}

// Lightweight non-paginated query for books currently being read.
export function useReadingBooks(readerId: string | null) {
  const key = readerId ? READING_BOOKS_KEY(readerId) : null;

  const { data: readingBooks = [], isLoading, error, refetch } = useQuery({
    queryKey: key ?? ['reading_books', null],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from('books')
        .select('*')
        .eq('reader_id', readerId!)
        .eq('status', 'reading')
        .order('created_at', { ascending: false });
      if (dbError) throw dbError;
      return (data ?? []) as Book[];
    },
    enabled: !!readerId,
  });

  return {
    readingBooks,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
  };
}
