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
import { STATUS_DOT_CLASSES } from './status-badge';

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

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
      {COLUMNS.map((col) => {
        const items = grouped.get(col.status) ?? [];
        const droppable =
          dragged != null && isValidTransition(dragged.status, col.status);
        return (
          <Column
            key={col.status}
            label={col.label}
            dotClass={STATUS_DOT_CLASSES[col.status]}
            count={items.length}
            highlight={dragOver === col.status && droppable}
            droppableHint={dragged != null && droppable}
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
  dotClass,
  count,
  highlight,
  droppableHint,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  dotClass: string;
  count: number;
  highlight: boolean;
  droppableHint: boolean;
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
        'flex w-[19rem] shrink-0 flex-col rounded-xl border border-transparent bg-muted/40 p-2.5 transition-all duration-200',
        droppableHint && 'border-dashed border-primary/30',
        highlight && 'border-solid border-primary/50 bg-primary/[0.06]',
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
        <span className={cn('h-2 w-2 rounded-full', dotClass)} />
        <span className="text-sm font-medium tracking-tight">{label}</span>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-card px-1.5 text-xs font-medium text-muted-foreground tnum shadow-xs">
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
    <div className="flex w-[19rem] shrink-0 flex-col rounded-xl border border-transparent bg-muted/40 p-2.5">
      <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
        <span className="h-2 w-2 rounded-full bg-[hsl(33_8%_60%)]" />
        <span className="text-sm font-medium tracking-tight">Closed</span>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-card px-1.5 text-xs font-medium text-muted-foreground tnum shadow-xs">
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
