import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Activity } from '@/lib/types';

export interface CreateActivityInput {
  type: 'note' | 'email_sent' | 'email_received' | 'follow_up';
  description: string;
}

export function useActivities(applicationId: string) {
  return useQuery({
    queryKey: ['activities', applicationId],
    queryFn: () => api.get<Activity[]>(`/applications/${applicationId}/activities`),
  });
}

export function useCreateActivity(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateActivityInput) =>
      api.post<Activity>(`/applications/${applicationId}/activities`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', applicationId] }),
  });
}
