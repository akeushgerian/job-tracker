import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export const meQueryKey = ['auth', 'me'] as const;

export const meQueryOptions = queryOptions<User | null>({
  queryKey: meQueryKey,
  queryFn: async () => {
    try {
      return await api.get<User>('/auth/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },
  staleTime: 60_000,
  retry: false,
});

export function useMe() {
  return useQuery(meQueryOptions);
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ user: User }>('/auth/login', input),
    onSuccess: (data) => qc.setQueryData(meQueryKey, data.user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<{ user: User }>('/auth/register', input),
    onSuccess: (data) => qc.setQueryData(meQueryKey, data.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(meQueryKey, null);
      qc.clear();
    },
  });
}
