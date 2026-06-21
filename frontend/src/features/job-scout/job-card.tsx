import { useState } from 'react';
import { MapPin, Building2, Banknote, Calendar, ExternalLink, CheckCircle, Plus, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JobResult } from '@/lib/types';

interface JobCardProps {
  job: JobResult;
  isAdded: boolean;
  onAdded: (url: string) => void;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `ab ${fmt(min)}`;
  return `bis ${fmt(max!)}`;
}

function formatDate(created: string): string {
  // Serper returns relative strings like "3 days ago" — pass them through directly.
  const d = new Date(created);
  if (isNaN(d.getTime())) return created;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
    );
  }
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
    score >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
    score >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', color)}>
      {score}% match
    </span>
  );
}

export function JobCard({ job, isAdded, onAdded }: JobCardProps) {
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  const handleAdd = async () => {
    setAdding(true);
    setAddError('');
    try {
      await api.post('/applications', {
        companyName: job.company,
        positionTitle: job.title,
        jobUrl: job.url,
        status: 'discovered',
      });
      onAdded(job.url);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{job.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            {salary && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                {salary}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(job.created)}
            </span>
          </div>
        </div>
        <ScoreBadge score={job.score} />
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{job.snippet}</p>

      {job.fitNote && (
        <p className="mt-2 text-sm text-foreground/80 italic">{job.fitNote}</p>
      )}

      {job.gaps.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.gaps.map((gap) => (
            <span
              key={gap}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {gap}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {isAdded ? (
          <Button variant="outline" size="sm" disabled>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Added ✓
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add to Pipeline
          </Button>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View full posting
        </a>
        {addError && <span className="text-sm text-destructive">{addError}</span>}
      </div>
    </div>
  );
}
