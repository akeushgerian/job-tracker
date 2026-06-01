import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Interview, InterviewOutcome, InterviewType } from '@/lib/types';

export interface CreateInterviewInput {
  type: InterviewType;
  scheduledAt?: string;
  durationMinutes?: number;
  notes?: string;
  interviewerName?: string;
  interviewerRole?: string;
  completed?: boolean;
  outcome?: InterviewOutcome;
}

export type UpdateInterviewInput = Partial<CreateInterviewInput>;

export function useInterviews(applicationId: string) {
  return useQuery({
    queryKey: ['interviews', applicationId],
    queryFn: () =>
      api.get<Interview[]>(`/applications/${applicationId}/interviews`),
  });
}

export function useCreateInterview(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInterviewInput) =>
      api.post<Interview>(`/applications/${applicationId}/interviews`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews', applicationId] });
      qc.invalidateQueries({ queryKey: ['activities', applicationId] });
    },
  });
}

export function useUpdateInterview(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInterviewInput }) =>
      api.patch<Interview>(`/interviews/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interviews', applicationId] }),
  });
}

export function useDeleteInterview(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/interviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interviews', applicationId] }),
  });
}
