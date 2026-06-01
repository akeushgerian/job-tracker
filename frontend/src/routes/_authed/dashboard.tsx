import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Briefcase,
  TrendingUp,
  Timer,
  Activity,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { useDashboardStats } from '@/features/dashboard/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageSpinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/empty-state';
import { PIPELINE_STATUSES, STATUS_LABELS, type ApplicationStatus } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useDashboardStats();
  if (isLoading || !data) return <FullPageSpinner />;

  const maxCount = Math.max(1, ...PIPELINE_STATUSES.map((s) => data.byStatus[s]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your job search at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Briefcase}
          label="Total applications"
          value={String(data.totals.total)}
        />
        <StatCard icon={Activity} label="Active" value={String(data.totals.active)} />
        <StatCard
          icon={TrendingUp}
          label="Response rate"
          value={`${Math.round(data.responseRate * 100)}%`}
        />
        <StatCard
          icon={Timer}
          label="Avg. time to response"
          value={
            data.averageTimeToResponseDays == null
              ? '—'
              : `${data.averageTimeToResponseDays}d`
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {PIPELINE_STATUSES.map((status) => (
            <StatusBar
              key={status}
              status={status}
              count={data.byStatus[status]}
              max={maxCount}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Upcoming interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingInterviews.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nothing scheduled" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.upcomingInterviews.map((i) => (
                  <li key={i.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link
                      to="/applications/$id"
                      params={{ id: i.applicationId }}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="font-medium">{i.companyName}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(i.scheduledAt)}
                      </span>
                    </Link>
                    <p className="text-sm capitalize text-muted-foreground">
                      {i.type.replace('_', ' ')} · {i.positionTitle}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
              Overdue follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdueFollowUps.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="All caught up" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.overdueFollowUps.map((f) => (
                  <li key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link
                      to="/applications/$id"
                      params={{ id: f.applicationId }}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="font-medium">{f.description}</span>
                      <Badge variant="destructive">{formatDate(f.dueDate)}</Badge>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {f.companyName} · {f.positionTitle}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBar({
  status,
  count,
  max,
}: {
  status: ApplicationStatus;
  count: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-muted-foreground">
        {STATUS_LABELS[status]}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(count / max) * 100}%` }}
        />
      </div>
      <span className="w-6 text-right text-sm font-medium">{count}</span>
    </div>
  );
}
