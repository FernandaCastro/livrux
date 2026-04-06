export interface GoogleBookResult {
  title: string;
  author: string | null;
  totalPages: number | null;
  coverUrl: string | null;
  isbn: string | null;
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

function buildUrl(params: Record<string, string>): string {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const search = new URLSearchParams(params);
  if (apiKey) search.set('key', apiKey);
  return `${BASE_URL}?${search.toString()}`;
}

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  if (!query.trim()) return [];

  const url = buildUrl({ q: query, maxResults: '5' });
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Books API error ${response.status}: ${body}`);
  }
  const data = await response.json();
  return (data.items ?? []).map(mapVolume);
}

export async function fetchByIsbn(isbn: string): Promise<GoogleBookResult | null> {
  const url = buildUrl({ q: `isbn:${isbn}` });
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Books API error ${response.status}: ${body}`);
  }
  const data = await response.json();
  if (!data.items?.length) return null;
  return mapVolume(data.items[0]);
}
