import { Link } from '@tanstack/react-router';
import { MapPin, ExternalLink, GripVertical } from 'lucide-react';
import type { Application } from '@/lib/types';
import { formatSalaryRange, cn } from '@/lib/utils';
import { STATUS_DOT_CLASSES } from './status-badge';

export function ApplicationCard({
  application,
  onDragStart,
}: {
  application: Application;
  onDragStart: (id: string) => void;
}) {
  return (
    <Link
      to="/applications/$id"
      params={{ id: application.id }}
      draggable
      onDragStart={() => onDragStart(application.id)}
      className="group relative block cursor-grab overflow-hidden rounded-lg border border-border/70 bg-card p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md active:cursor-grabbing"
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1 opacity-80',
          STATUS_DOT_CLASSES[application.status],
        )}
      />
      <div className="flex items-start justify-between gap-2 pl-1">
        <p className="font-medium leading-tight tracking-tight">
          {application.companyName}
        </p>
        {application.jobUrl ? (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        ) : (
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40" />
        )}
      </div>
      <p className="mt-0.5 pl-1 text-sm text-muted-foreground">
        {application.positionTitle}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-muted-foreground">
        {application.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {application.location}
          </span>
        )}
        {(application.salaryMin != null || application.salaryMax != null) && (
          <span className="tnum">
            {formatSalaryRange(application.salaryMin, application.salaryMax)}
          </span>
        )}
        {application.remoteType && (
          <span className="capitalize">{application.remoteType}</span>
        )}
      </div>
    </Link>
  );
}
