import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { Sparkles, Send, X, Check, Wrench, Ban } from 'lucide-react';
import { assistantOpenAtom } from '@/stores/assistant';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useAssistantChat,
  useExecuteAction,
  type AssistantStep,
  type ProposedAction,
} from './api';

type ActionStatus = 'pending' | 'done' | 'rejected' | 'error';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AssistantStep[];
  actions?: ProposedAction[];
}

const SUGGESTIONS = [
  'What should I follow up on this week?',
  'Summarize my pipeline',
  'Add this job: Staff Engineer at Stripe, remote, 180k–220k',
];

let idCounter = 0;
const nextId = () => `m${idCounter++}`;

export function AssistantPanel() {
  const [open, setOpen] = useAtom(assistantOpenAtom);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [actionStatus, setActionStatus] = useState<Record<string, ActionStatus>>({});
  const chat = useAssistantChat();
  const execute = useExecuteAction();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

  if (!open) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chat.isPending) return;
    const userMsg: UiMessage = { id: nextId(), role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');

    try {
      const res = await chat.mutateAsync(
        history.map((m) => ({ role: m.role, content: m.content })),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: res.reply,
          steps: res.steps,
          actions: res.proposedActions,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'The assistant is unavailable.';
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: `⚠️ ${message}` },
      ]);
    }
  };

  const approve = async (action: ProposedAction) => {
    setActionStatus((s) => ({ ...s, [action.id]: 'pending' }));
    try {
      await execute.mutateAsync({ tool: action.tool, args: action.args });
      setActionStatus((s) => ({ ...s, [action.id]: 'done' }));
    } catch {
      setActionStatus((s) => ({ ...s, [action.id]: 'error' }));
    }
  };

  const reject = (action: ProposedAction) =>
    setActionStatus((s) => ({ ...s, [action.id]: 'rejected' }));

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[hsl(30_20%_14%/0.35)] backdrop-blur-[2px] animate-fade"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border/70 bg-background shadow-lg animate-fade">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-4 w-4 text-brass" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-medium">Assistant</p>
              <p className="text-[0.7rem] text-muted-foreground">Private · runs locally</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask about your pipeline, or paste a job posting to add it. I'll ask before
                changing anything.
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' && 'justify-end')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {m.steps && m.steps.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {m.steps.map((step, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        <Wrench className="h-3 w-3" />
                        {step.summary}
                      </span>
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.content}</p>

                {m.actions?.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    status={actionStatus[action.id] ?? 'idle'}
                    onApprove={() => approve(action)}
                    onReject={() => reject(action)}
                  />
                ))}
              </div>
            </div>
          ))}

          {chat.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Thinking…
            </div>
          )}
        </div>

        <footer className="border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or paste a job posting…"
              disabled={chat.isPending}
            />
            <Button type="submit" size="icon" disabled={chat.isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </footer>
      </aside>
    </>
  );
}

function ActionCard({
  action,
  status,
  onApprove,
  onReject,
}: {
  action: ProposedAction;
  status: ActionStatus | 'idle';
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mt-2 rounded-md border border-border bg-background p-2.5">
      <p className="text-sm font-medium text-foreground">{action.description}</p>
      {status === 'idle' && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <Ban className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      )}
      {status === 'pending' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Spinner /> Applying…
        </p>
      )}
      {status === 'done' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-success)]">
          <Check className="h-3.5 w-3.5" /> Applied
        </p>
      )}
      {status === 'rejected' && (
        <p className="mt-2 text-xs text-muted-foreground">Dismissed</p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-xs text-destructive">Couldn't apply this action.</p>
      )}
    </div>
  );
}
