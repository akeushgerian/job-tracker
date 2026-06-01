import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FollowUp } from '@/lib/types';

export interface CreateFollowUpInput {
  dueDate: string;
  description: string;
  completed?: boolean;
}

export type UpdateFollowUpInput = Partial<CreateFollowUpInput>;

export function useFollowUps(applicationId: string) {
  return useQuery({
    queryKey: ['follow-ups', applicationId],
    queryFn: () => api.get<FollowUp[]>(`/applications/${applicationId}/follow-ups`),
  });
}

export function useCreateFollowUp(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFollowUpInput) =>
      api.post<FollowUp>(`/applications/${applicationId}/follow-ups`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-ups', applicationId] });
      qc.invalidateQueries({ queryKey: ['activities', applicationId] });
    },
  });
}

export function useUpdateFollowUp(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFollowUpInput }) =>
      api.patch<FollowUp>(`/follow-ups/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follow-ups', applicationId] }),
  });
}

export function useDeleteFollowUp(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/follow-ups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follow-ups', applicationId] }),
  });
}
