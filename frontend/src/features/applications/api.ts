import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus, Paginated } from '@/lib/types';

export interface ApplicationFilters {
  status?: ApplicationStatus;
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'companyName' | 'appliedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export type CreateApplicationInput = {
  companyName: string;
  positionTitle: string;
  jobUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  remoteType?: Application['remoteType'];
  status?: ApplicationStatus;
  source?: Application['source'];
  recruiterName?: string;
  recruiterEmail?: string;
  notes?: string;
  appliedAt?: string;
};

export type UpdateApplicationInput = Partial<
  Omit<CreateApplicationInput, 'status'>
>;

const applicationKeys = {
  all: ['applications'] as const,
  list: (filters: ApplicationFilters) => ['applications', 'list', filters] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
};

export { applicationKeys };

function toQueryString(filters: ApplicationFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useApplications(filters: ApplicationFilters = {}) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () =>
      api.get<Paginated<Application>>(`/applications${toQueryString(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => api.get<Application>(`/applications/${id}`),
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      api.post<Application>('/applications', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateApplicationInput) =>
      api.patch<Application>(`/applications/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.patch<Application>(`/applications/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}
