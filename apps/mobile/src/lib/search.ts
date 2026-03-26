import { api } from "./api";

export interface SearchResult {
  card_id: string;
  similarity: number;
}

interface SearchResponse {
  results: SearchResult[];
}

export async function searchCards(
  query: string,
  token: string,
): Promise<SearchResult[]> {
  const { results } = await api.post<SearchResponse>(
    "/search",
    { query },
    token,
  );
  return results;
}
