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

export async function searchBooks(query: string): Promise<GoogleBookResult[]> {
  if (!query.trim()) return [];

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items ?? []).map(mapVolume);
  } catch {
    return [];
  }
}

export async function fetchByIsbn(isbn: string): Promise<GoogleBookResult | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.items?.length) return null;
    return mapVolume(data.items[0]);
  } catch {
    return null;
  }
}
