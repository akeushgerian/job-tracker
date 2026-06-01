import { useState } from 'react';
import {
  Activity as ActivityIcon,
  ArrowRightLeft,
  CalendarClock,
  Mail,
  MailOpen,
  BellRing,
  StickyNote,
} from 'lucide-react';
import type { ActivityType } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/empty-state';
import { useActivities, useCreateActivity } from './api';

const ICONS: Record<ActivityType, typeof ActivityIcon> = {
  status_change: ArrowRightLeft,
  note: StickyNote,
  email_sent: Mail,
  email_received: MailOpen,
  follow_up: BellRing,
  interview_scheduled: CalendarClock,
};

export function ActivityTab({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useActivities(applicationId);
  const create = useCreateActivity(applicationId);
  const [note, setNote] = useState('');

  const addNote = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    await create.mutateAsync({ type: 'note', description: trimmed });
    setNote('');
  };

  if (isLoading) return <Spinner className="text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add a note to the timeline…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addNote();
            }
          }}
        />
        <Button onClick={addNote} disabled={create.isPending || !note.trim()}>
          {create.isPending && <Spinner />}
          Add note
        </Button>
      </div>

      {(data?.length ?? 0) === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet" />
      ) : (
        <ol className="relative ml-2 border-l border-border">
          {data!.map((activity) => {
            const Icon = ICONS[activity.type];
            return (
              <li key={activity.id} className="mb-5 ml-6">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </span>
                <p className="text-sm">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(activity.createdAt)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
