import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantStep {
  tool: string;
  summary: string;
}

export interface ProposedAction {
  id: string;
  tool: string;
  description: string;
  args: unknown;
}

export interface ChatResponse {
  reply: string;
  steps: AssistantStep[];
  proposedActions: ProposedAction[];
}

export function useAssistantChat() {
  return useMutation({
    mutationFn: (messages: ChatTurn[]) =>
      api.post<ChatResponse>('/assistant/chat', { messages }),
  });
}

export function useExecuteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: { tool: string; args: unknown }) =>
      api.post<{ ok: boolean; result: unknown }>('/assistant/execute', action),
    onSuccess: () => {
      // A confirmed write can touch any view — refresh the data-backed queries.
      for (const key of [
        'applications',
        'dashboard',
        'interviews',
        'contacts',
        'follow-ups',
        'activities',
      ]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
