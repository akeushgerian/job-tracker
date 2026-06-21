import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SearchResponse, FetchAndScoreResponse } from '@/lib/types';

export function useJobSearch() {
  return useMutation({
    mutationFn: (query: string) =>
      api.post<SearchResponse>('/job-scout/search', { query }),
  });
}

export function useFetchAndScore() {
  return useMutation({
    mutationFn: (url: string) =>
      api.post<FetchAndScoreResponse>('/job-scout/fetch-and-score', { url }),
  });
}
