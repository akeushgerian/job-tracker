import { Mail } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { EmailMatchCard } from './EmailMatchCard';
import { useEmailMatches, useConfirmEmailMatch, useDismissEmailMatch } from './api';

export function EmailMatchList({ applicationId }: { applicationId: string }) {
  const { data: matches, isLoading } = useEmailMatches(applicationId);
  const confirm = useConfirmEmailMatch(applicationId);
  const dismiss = useDismissEmailMatch(applicationId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading emails…</p>;

  if (!matches?.length) {
    return (
      <EmptyState
        icon={Mail}
        title="No emails matched"
        description="Email matches appear here once Gmail is connected and a sync runs."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((match) => (
        <EmailMatchCard
          key={match.id}
          match={match}
          onConfirm={(id) => confirm.mutate(id)}
          onDismiss={(id) => dismiss.mutate(id)}
          confirmPending={confirm.isPending}
          dismissPending={dismiss.isPending}
        />
      ))}
    </div>
  );
}
