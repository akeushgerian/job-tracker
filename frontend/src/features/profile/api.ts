import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile } from '@/lib/types';

export interface SaveProfileInput {
  headline?: string | null;
  targetRole?: string | null;
  branch?: string | null;
  seniority?: string | null;
  location?: string | null;
  remotePref?: Profile['remotePref'];
  skills: string[];
  links: Profile['links'];
  summary?: string | null;
}

export const profileQueryKey = ['profile'] as const;

export const profileQueryOptions = queryOptions<Profile | null>({
  queryKey: profileQueryKey,
  queryFn: () => api.get<Profile | null>('/profile'),
});

export function useProfile() {
  return useQuery(profileQueryOptions);
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveProfileInput) => api.put<Profile>('/profile', input),
    onSuccess: (profile) => qc.setQueryData(profileQueryKey, profile),
  });
}
