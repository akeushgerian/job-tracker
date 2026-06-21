import { createFileRoute, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GmailConnect } from '@/features/email-sync/GmailConnect';
import { useEmailMatches, useConfirmEmailMatch, useDismissEmailMatch } from '@/features/email-sync/api';
import { EmailMatchCard } from '@/features/email-sync/EmailMatchCard';

const searchSchema = z.object({
  connected: z.boolean().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute('/_authed/settings/gmail')({
  validateSearch: searchSchema,
  component: GmailSettingsPage,
});

function AllEmailMatches() {
  const { data: matches, isLoading } = useEmailMatches();
  const confirm = useConfirmEmailMatch();
  const dismiss = useDismissEmailMatch();

  const jobRelated = matches?.filter((m) => m.status !== 'ignored') ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (jobRelated.length === 0)
    return <p className="text-sm text-muted-foreground">No job-related emails found yet. Try syncing.</p>;

  return (
    <div className="flex flex-col gap-3">
      {jobRelated.map((match) => (
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

function GmailSettingsPage() {
  const { connected, error } = useSearch({ from: '/_authed/settings/gmail' });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gmail Integration</h1>
        <p className="text-sm text-muted-foreground">
          Connect Gmail to automatically detect job application emails and update your pipeline.
        </p>
      </div>

      {connected && (
        <p className="text-sm text-green-600 font-medium">Gmail connected successfully.</p>
      )}
      {error && (
        <p className="text-sm text-destructive">Connection failed: {error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gmail account</CardTitle>
          <CardDescription>
            Laufbahn will scan incoming emails every 10 minutes using read-only access and
            use the local AI to match them to your tracked applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GmailConnect />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matched emails</CardTitle>
          <CardDescription>
            All job-related emails found across your inbox. Pending items need your review before any action is taken.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AllEmailMatches />
        </CardContent>
      </Card>
    </div>
  );
}
