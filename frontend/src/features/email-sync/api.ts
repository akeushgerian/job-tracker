import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EmailMatch, GmailStatus, SyncResult } from '@/lib/types';

export function useGmailStatus() {
  return useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => api.get<GmailStatus>('/email-sync/status'),
    retry: false,
  });
}

export function useGmailOAuthUrl() {
  return useQuery({
    queryKey: ['gmail-oauth-url'],
    queryFn: () => api.get<{ url: string }>('/email-sync/oauth/url'),
    enabled: false,
  });
}

export function useDisconnectGmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/email-sync/connection'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmail-status'] }),
  });
}

function useSyncMutation(days?: number) {
  const qc = useQueryClient();
  const url = days ? `/email-sync/sync?days=${days}` : '/email-sync/sync';
  return useMutation({
    mutationFn: () => api.post<SyncResult>(url, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmail-status'] });
      qc.invalidateQueries({ queryKey: ['email-matches'] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useTriggerSync() {
  return useSyncMutation();
}

export function useRescanDays(days: number) {
  return useSyncMutation(days);
}

export function useEmailMatches(applicationId?: string) {
  return useQuery({
    queryKey: ['email-matches', applicationId ?? 'all'],
    queryFn: () =>
      api.get<EmailMatch[]>(
        applicationId
          ? `/email-sync/matches?applicationId=${applicationId}`
          : '/email-sync/matches',
      ),
  });
}

export function useConfirmEmailMatch(applicationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<EmailMatch>(`/email-sync/matches/${id}/confirm`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-matches'] });
      qc.invalidateQueries({ queryKey: ['activities', applicationId] });
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useDismissEmailMatch(applicationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<EmailMatch>(`/email-sync/matches/${id}/dismiss`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-matches'] });
      if (applicationId) qc.invalidateQueries({ queryKey: ['activities', applicationId] });
    },
  });
}
