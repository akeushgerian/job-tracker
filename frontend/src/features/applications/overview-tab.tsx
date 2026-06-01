import { useNavigate } from '@tanstack/react-router';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import type { Application } from '@/lib/types';
import { STATUS_LABELS, type ApplicationStatus } from '@/lib/types';
import { formatDate, formatSalaryRange } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApplicationFormDialog } from './application-form';
import { StatusBadge } from './status-badge';
import { allowedTransitions } from './transitions';
import { useChangeStatus, useDeleteApplication } from './api';

export function OverviewTab({ application }: { application: Application }) {
  const navigate = useNavigate();
  const changeStatus = useChangeStatus();
  const remove = useDeleteApplication();

  const statusOptions: ApplicationStatus[] = [
    application.status,
    ...allowedTransitions(application.status),
  ];

  const onDelete = async () => {
    if (!confirm('Delete this application? This cannot be undone.')) return;
    await remove.mutateAsync(application.id);
    await navigate({ to: '/applications' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={application.status} />
          <Select
            value={application.status}
            onValueChange={(value) =>
              changeStatus.mutate({
                id: application.id,
                status: value as ApplicationStatus,
              })
            }
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <ApplicationFormDialog
            application={application}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 p-5 sm:grid-cols-3">
          <Detail label="Location" value={application.location} />
          <Detail
            label="Remote"
            value={application.remoteType}
            className="capitalize"
          />
          <Detail
            label="Salary"
            value={formatSalaryRange(application.salaryMin, application.salaryMax)}
          />
          <Detail label="Source" value={application.source} className="capitalize" />
          <Detail label="Applied on" value={formatDate(application.appliedAt)} />
          <Detail label="Recruiter" value={application.recruiterName} />
          <Detail label="Recruiter email" value={application.recruiterEmail} />
          {application.jobUrl && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Job posting
              </span>
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {application.notes && (
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Notes
            </span>
            <p className="mt-1 whitespace-pre-wrap text-sm">{application.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className={`text-sm ${className ?? ''}`}>{value || '—'}</span>
    </div>
  );
}
