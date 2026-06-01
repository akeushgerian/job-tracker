import { useMemo, useState } from 'react';
import { useApplications, useChangeStatus } from './api';
import { ApplicationCard } from './application-card';
import { isValidTransition } from './transitions';
import {
  PIPELINE_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  type Application,
  type ApplicationStatus,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

// Closed states share a single column at the end of the board.
const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  ...PIPELINE_STATUSES.filter((s) => s !== 'accepted').map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
  })),
  { status: 'accepted', label: STATUS_LABELS.accepted },
];

const CLOSED: ApplicationStatus[] = TERMINAL_STATUSES.filter((s) => s !== 'accepted');

export function Board({ search }: { search: string }) {
  const { data, isLoading } = useApplications({ pageSize: 100, q: search || undefined });
  const changeStatus = useChangeStatus();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const app of data?.data ?? []) {
      const list = map.get(app.status) ?? [];
      list.push(app);
      map.set(app.status, list);
    }
    return map;
  }, [data]);

  const dragged = data?.data.find((a) => a.id === draggingId);

  const onDrop = (status: ApplicationStatus) => {
    setDragOver(null);
    if (!dragged) return;
    if (isValidTransition(dragged.status, status)) {
      changeStatus.mutate({ id: dragged.id, status });
    }
    setDraggingId(null);
  };

  if (isLoading) return <Spinner className="h-6 w-6 text-muted-foreground" />;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = grouped.get(col.status) ?? [];
        const droppable =
          dragged != null && isValidTransition(dragged.status, col.status);
        return (
          <Column
            key={col.status}
            label={col.label}
            count={items.length}
            highlight={dragOver === col.status && droppable}
            onDragOver={(e) => {
              if (droppable) {
                e.preventDefault();
                setDragOver(col.status);
              }
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDrop(col.status)}
          >
            {items.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onDragStart={setDraggingId}
              />
            ))}
          </Column>
        );
      })}

      <ClosedColumn grouped={grouped} statuses={CLOSED} />
    </div>
  );
}

function Column({
  label,
  count,
  highlight,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  count: number;
  highlight: boolean;
  children: React.ReactNode;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-2 transition-colors',
        highlight && 'bg-primary/10 ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-center justify-between px-1 py-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function ClosedColumn({
  grouped,
  statuses,
}: {
  grouped: Map<ApplicationStatus, Application[]>;
  statuses: ApplicationStatus[];
}) {
  const items = statuses.flatMap((s) => grouped.get(s) ?? []);
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-2">
      <div className="flex items-center justify-between px-1 py-1.5">
        <span className="text-sm font-medium">Closed</span>
        <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {items.map((app) => (
          <ApplicationCard key={app.id} application={app} onDragStart={() => {}} />
        ))}
      </div>
    </div>
  );
}
