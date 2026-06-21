import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EmailMatch, EmailMatchAction } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const ACTION_LABELS: Record<EmailMatchAction, string> = {
  rejection: 'Rejection',
  offer: 'Offer',
  interview_invite: 'Interview invite',
  follow_up: 'Follow-up request',
  status_change: 'Status update',
  none: 'General',
};

interface Props {
  match: EmailMatch;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
  confirmPending?: boolean;
  dismissPending?: boolean;
}

export function EmailMatchCard({ match, onConfirm, onDismiss, confirmPending, dismissPending }: Props) {
  const confidencePct = Math.round(match.confidence * 100);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{match.subject}</p>
          <p className="truncate text-xs text-muted-foreground">{match.sender}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">{formatDateTime(match.receivedAt)}</span>
          {match.status === 'applied' && (
            <Badge variant="outline" className="text-green-600 border-green-400 text-xs">Applied</Badge>
          )}
          {match.status === 'pending_review' && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Pending review</Badge>
          )}
          {match.status === 'ignored' && (
            <Badge variant="outline" className="text-muted-foreground text-xs">Ignored</Badge>
          )}
        </div>
      </div>

      {match.snippet && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{match.snippet}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{ACTION_LABELS[match.action]}</span>
        <span>{confidencePct}% confidence</span>
        {match.classificationError && (
          <span className="text-destructive" title={match.classificationError}>Classification error</span>
        )}
      </div>

      {match.status === 'pending_review' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConfirm?.(match.id)}
            disabled={confirmPending || dismissPending}
          >
            {confirmPending ? 'Confirming…' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss?.(match.id)}
            disabled={confirmPending || dismissPending}
          >
            {dismissPending ? 'Dismissing…' : 'Dismiss'}
          </Button>
        </div>
      )}
    </div>
  );
}
