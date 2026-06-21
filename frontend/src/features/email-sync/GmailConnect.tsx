import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGmailStatus, useDisconnectGmail, useTriggerSync, useRescanDays } from './api';
import type { SyncAction } from '@/lib/types';

const ACTION_LABELS: Record<SyncAction['action'], string> = {
  rejection: 'Rejection',
  offer: 'Offer',
  interview_invite: 'Interview',
  follow_up: 'Follow-up',
  status_change: 'Status change',
  none: 'No action',
};

const ACTION_COLORS: Record<SyncAction['action'], string> = {
  rejection: 'bg-red-100 text-red-700',
  offer: 'bg-green-100 text-green-700',
  interview_invite: 'bg-blue-100 text-blue-700',
  follow_up: 'bg-yellow-100 text-yellow-700',
  status_change: 'bg-purple-100 text-purple-700',
  none: 'bg-gray-100 text-gray-500',
};

function SyncLog({ actions, processed }: { actions: SyncAction[]; processed: number }) {
  if (processed === 0) {
    return <p className="text-sm text-muted-foreground">No new emails found.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Scanned {processed} email{processed !== 1 ? 's' : ''} — {actions.length} job-related.
      </p>
      {actions.length > 0 && (
        <div className="rounded-md border divide-y text-sm">
          {actions.map((a, i) => (
            <div key={i} className="px-3 py-2 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[a.action]}`}
                >
                  {ACTION_LABELS[a.action]}
                </span>
                {a.status === 'pending_review' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    Needs review
                  </span>
                )}
                {a.status === 'applied' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                    Auto-applied
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.round(a.confidence * 100)}% confidence
                </span>
              </div>
              <p className="font-medium truncate">{a.subject}</p>
              {a.company && (
                <p className="text-xs text-muted-foreground">{a.company}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GmailConnect() {
  const { data: status, isLoading } = useGmailStatus();
  const disconnect = useDisconnectGmail();
  const triggerSync = useTriggerSync();
  const rescanWeek = useRescanDays(7);
  const activeSync = triggerSync.isPending || rescanWeek.isPending;
  const syncData = triggerSync.data ?? rescanWeek.data;

  async function handleConnectRedirect() {
    const res = await fetch('/api/email-sync/oauth/url', { credentials: 'include' });
    if (res.ok) {
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading Gmail status…</p>;

  if (!status?.connected) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Connect your Gmail account to automatically detect job-related emails and update your pipeline.
        </p>
        <Button onClick={handleConnectRedirect}>Connect Gmail</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {status.needsReauth ? (
          <Badge variant="outline" className="text-amber-600 border-amber-400">Needs re-authorization</Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-400">Connected</Badge>
        )}
        <span className="text-sm text-muted-foreground">{status.connectedEmail}</span>
      </div>

      {status.lastSyncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status.needsReauth ? (
          <Button onClick={handleConnectRedirect}>Re-connect Gmail</Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync.mutate()}
              disabled={activeSync}
            >
              {triggerSync.isPending ? 'Syncing…' : 'Sync now'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rescanWeek.mutate()}
              disabled={activeSync}
            >
              {rescanWeek.isPending ? 'Scanning…' : 'Scan last 7 days'}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          className="text-destructive"
        >
          Disconnect
        </Button>
      </div>

      {syncData && (
        <SyncLog actions={syncData.actions} processed={syncData.processed} />
      )}
    </div>
  );
}
