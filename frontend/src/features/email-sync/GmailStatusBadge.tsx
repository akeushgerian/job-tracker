import { Link } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import { useGmailStatus } from './api';

export function GmailStatusBadge() {
  const { data: status, isLoading } = useGmailStatus();

  if (isLoading || !status) return null;

  if (!status.connected) {
    return (
      <Link
        to="/settings/gmail"
        className="flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Mail className="h-3.5 w-3.5" />
        Connect Gmail
      </Link>
    );
  }

  if (status.needsReauth) {
    return (
      <Link
        to="/settings/gmail"
        className="flex items-center gap-1.5 rounded-md border border-amber-400 px-2.5 py-1 text-xs text-amber-600 transition-colors hover:text-amber-700"
      >
        <Mail className="h-3.5 w-3.5" />
        Re-connect Gmail
      </Link>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5 rounded-md border border-green-400 px-2.5 py-1 text-xs text-green-600"
      title={status.lastSyncedAt ? `Last synced: ${new Date(status.lastSyncedAt).toLocaleString()}` : 'Gmail connected'}
    >
      <Mail className="h-3.5 w-3.5" />
      Gmail
    </span>
  );
}
