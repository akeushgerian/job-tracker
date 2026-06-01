import { randomUUID } from 'node:crypto';
import { config } from '../../config/index.js';
import { ValidationError } from '../../lib/errors.js';
import type { AssistantDeps } from './assistant.deps.js';
import { chatCompletion, type ChatMessage } from './assistant.llm.js';
import { ASSISTANT_TOOLS, findTool, toolDefinitions } from './assistant.tools.js';

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

export interface AssistantReply {
  reply: string;
  steps: AssistantStep[];
  proposedActions: ProposedAction[];
}

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    'You are the assistant inside Laufbahn, a personal job-application tracker.',
    `Today is ${today}.`,
    'Use the read tools (search_applications, get_application_details, get_dashboard_stats) to ground every answer in the user\'s real data — never invent applications, interviews, or numbers.',
    'Write tools (create_application, change_status, add_follow_up, add_interview, add_note) do NOT execute immediately: they are shown to the user for confirmation. When you call one, briefly tell the user what you are proposing and why.',
    'When the user pastes or describes a job posting, extract as many fields as you can and call create_application.',
    'Resolve relative dates (e.g. "next Friday") to ISO 8601 using today\'s date.',
    'Be concise and friendly. Prefer taking action via tools over asking the user to do it manually.',
  ].join('\n');
}

export class AssistantService {
  constructor(private readonly deps: AssistantDeps) {}

  async chat(userId: string, history: ChatTurn[]): Promise<AssistantReply> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt() },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const steps: AssistantStep[] = [];
    const proposedActions: ProposedAction[] = [];
    const seenProposals = new Set<string>();
    const tools = toolDefinitions();
    let reply = '';

    for (let step = 0; step < config.LLM_MAX_STEPS; step += 1) {
      const result = await chatCompletion(messages, tools);

      if (result.toolCalls.length === 0) {
        reply = result.content;
        break;
      }

      messages.push({
        role: 'assistant',
        content: result.content,
        tool_calls: result.toolCalls,
      });

      for (const call of result.toolCalls) {
        const tool = findTool(call.function.name);
        let args: unknown;
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: 'Error: arguments were not valid JSON.',
          });
          continue;
        }

        if (!tool) {
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: `Error: unknown tool "${call.function.name}".`,
          });
          continue;
        }

        if (tool.kind === 'read') {
          try {
            const data = await tool.run(userId, args, this.deps);
            steps.push({ tool: tool.name, summary: tool.describe(args) });
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(data),
            });
          } catch (error) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: `Error: ${error instanceof Error ? error.message : 'failed'}`,
            });
          }
        } else {
          // Write tool: validate args, queue as a proposal, do not execute.
          try {
            tool.schema.parse(args);
            const key = `${tool.name}:${JSON.stringify(args)}`;
            if (!seenProposals.has(key)) {
              seenProposals.add(key);
              proposedActions.push({
                id: randomUUID(),
                tool: tool.name,
                description: tool.describe(args),
                args,
              });
            }
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content:
                'Proposed to the user and awaiting their confirmation. Do not call this tool again; summarize what you proposed.',
            });
          } catch {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: 'Error: the arguments did not match the required shape.',
            });
          }
        }
      }
    }

    if (!reply) {
      reply =
        proposedActions.length > 0
          ? 'I\'ve prepared the action(s) below — review and confirm to apply them.'
          : 'Sorry, I could not complete that request.';
    }

    return { reply, steps, proposedActions };
  }

  async execute(userId: string, toolName: string, args: unknown): Promise<unknown> {
    const tool = findTool(toolName);
    if (!tool || tool.kind !== 'write') {
      throw new ValidationError(`"${toolName}" is not an executable action`);
    }
    return tool.run(userId, args, this.deps);
  }
}

export const ASSISTANT_TOOL_NAMES = ASSISTANT_TOOLS.map((t) => t.name);
