import { Link } from '@tanstack/react-router';
import { MapPin, ExternalLink } from 'lucide-react';
import type { Application } from '@/lib/types';
import { formatSalaryRange } from '@/lib/utils';

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
      className="block cursor-grab rounded-md border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight">{application.companyName}</p>
        {application.jobUrl && (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{application.positionTitle}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {application.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {application.location}
          </span>
        )}
        {(application.salaryMin != null || application.salaryMax != null) && (
          <span>{formatSalaryRange(application.salaryMin, application.salaryMax)}</span>
        )}
        {application.remoteType && (
          <span className="capitalize">{application.remoteType}</span>
        )}
      </div>
    </Link>
  );
}
