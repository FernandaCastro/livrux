export interface GoogleBookResult {
  title: string;
  author: string | null;
  totalPages: number | null;
  coverUrl: string | null;
  isbn: string | null;
}

export class GoogleBooksError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'GoogleBooksError';
  }
}

function mapVolume(item: any): GoogleBookResult {
  const info = item.volumeInfo ?? {};

  const isbn =
    info.industryIdentifiers?.find(
      (id: any) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier ?? null;

  // Google Books returns http thumbnails — force https to avoid mixed-content issues.
  const coverUrl = info.imageLinks?.thumbnail
    ? (info.imageLinks.thumbnail as string).replace('http://', 'https://')
    : null;

  return {
    title: info.title ?? '',
    author: info.authors?.[0] ?? null,
    totalPages: info.pageCount ?? null,
    coverUrl,
    isbn,
  };
}

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

// Statuses that warrant a retry (transient server-side errors).
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 600; // 600 ms → 1.2 s → 2.4 s

function buildUrl(params: Record<string, string>): string {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const search = new URLSearchParams(params);
  if (apiKey) search.set('key', apiKey);
  return `${BASE_URL}?${search.toString()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
    const response = await fetch(url);
    if (response.ok) return response;
    lastStatus = response.status;
    if (!RETRYABLE_STATUSES.has(lastStatus)) {
      // Non-retryable error (e.g. 400, 401) — fail immediately.
      const body = await response.text().catch(() => '');
      throw new GoogleBooksError(lastStatus, body);
    }
    // Retryable — loop again unless we've exhausted attempts.
  }
  throw new GoogleBooksError(lastStatus, 'Service temporarily unavailable.');
}

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  if (!query.trim()) return [];

  const url = buildUrl({ q: query, maxResults: '5' });
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return (data.items ?? []).map(mapVolume);
}

export async function fetchByIsbn(isbn: string): Promise<GoogleBookResult | null> {
  const url = buildUrl({ q: `isbn:${isbn}` });
  const response = await fetchWithRetry(url);
  const data = await response.json();
  if (!data.items?.length) return null;
  return mapVolume(data.items[0]);
}
