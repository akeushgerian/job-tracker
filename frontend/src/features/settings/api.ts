import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AiSettings } from '@/lib/types';

const AI_SETTINGS_KEY = ['ai-settings'] as const;

export interface UpdateAiSettingsInput {
  provider: 'local' | 'claude';
  claudeApiKey?: string;
  claudeModel: string;
}

export function useAiSettings() {
  return useQuery<AiSettings | null>({
    queryKey: AI_SETTINGS_KEY,
    queryFn: () => api.get<AiSettings | null>('/settings/ai'),
  });
}

export function useUpdateAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAiSettingsInput) =>
      api.put<AiSettings>('/settings/ai', input),
    onSuccess: (settings) => qc.setQueryData(AI_SETTINGS_KEY, settings),
  });
}
