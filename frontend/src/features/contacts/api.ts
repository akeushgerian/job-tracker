import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Contact } from '@/lib/types';

export interface CreateContactInput {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export type UpdateContactInput = Partial<CreateContactInput>;

export function useContacts(applicationId: string) {
  return useQuery({
    queryKey: ['contacts', applicationId],
    queryFn: () => api.get<Contact[]>(`/applications/${applicationId}/contacts`),
  });
}

export function useCreateContact(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      api.post<Contact>(`/applications/${applicationId}/contacts`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', applicationId] });
      qc.invalidateQueries({ queryKey: ['activities', applicationId] });
    },
  });
}

export function useUpdateContact(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContactInput }) =>
      api.patch<Contact>(`/contacts/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', applicationId] }),
  });
}

export function useDeleteContact(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', applicationId] }),
  });
}
