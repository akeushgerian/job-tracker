import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CoverLetter, CoverLetterReference } from '@/lib/types';

export interface GenerateCoverLetterInput {
  applicationId?: string;
  jobText?: string;
  jobUrl?: string;
  jobTitle?: string;
  jobCompany?: string;
  referenceId?: string;
  referenceText?: string;
  tone?: string;
  customInstructions?: string;
}

export interface SaveCoverLetterInput {
  content: string;
  applicationId?: string;
  jobTitle?: string;
  jobCompany?: string;
}

export function useCoverLetters(applicationId?: string) {
  return useQuery({
    queryKey: ['cover-letters', applicationId ?? 'all'],
    queryFn: () =>
      api.get<CoverLetter[]>(
        applicationId ? `/cover-letters?applicationId=${applicationId}` : '/cover-letters',
      ),
  });
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateCoverLetterInput) =>
      api.post<CoverLetter>('/cover-letters/generate', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters'] }),
  });
}

export function useSaveCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCoverLetterInput) =>
      api.post<CoverLetter>('/cover-letters', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters'] }),
  });
}

export function useUpdateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.patch<CoverLetter>(`/cover-letters/${id}`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters'] }),
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/cover-letters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters'] }),
  });
}

export function useCoverLetterReferences() {
  return useQuery({
    queryKey: ['cover-letter-references'],
    queryFn: () => api.get<CoverLetterReference[]>('/cover-letters/references'),
  });
}

export function useCreateReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; content: string }) =>
      api.post<CoverLetterReference>('/cover-letters/references', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letter-references'] }),
  });
}

export function useDeleteReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/cover-letters/references/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letter-references'] }),
  });
}
