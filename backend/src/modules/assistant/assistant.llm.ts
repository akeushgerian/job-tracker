import { config } from '../../config/index.js';
import { AppError } from '../../lib/errors.js';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResult {
  content: string;
  toolCalls: ToolCall[];
}

export class LlmError extends AppError {
  readonly statusCode = 502;
  readonly code = 'LLM_UNAVAILABLE';
}

/**
 * One round-trip to the local model's OpenAI-compatible chat endpoint.
 * Non-streaming; the agent loop drives multiple rounds.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<ChatResult> {
  let response: Response;
  try {
    response = await fetch(`${config.LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.2,
        stream: false,
      }),
    });
  } catch {
    throw new LlmError(
      `Could not reach the local model at ${config.LLM_BASE_URL}. Is Ollama running?`,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new LlmError(`Local model returned ${response.status}: ${body.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
  };
  const message = data.choices?.[0]?.message;
  return {
    content: message?.content ?? '',
    toolCalls: message?.tool_calls ?? [],
  };
}
