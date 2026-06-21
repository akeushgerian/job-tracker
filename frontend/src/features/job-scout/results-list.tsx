import { useState } from 'react';
import { JobCard } from './job-card';
import type { JobResult } from '@/lib/types';

interface ResultsListProps {
  results: JobResult[];
  message?: string;
}

export function ResultsList({ results, message }: ResultsListProps) {
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  const handleAdded = (url: string) => {
    setAddedUrls((prev) => new Set(prev).add(url));
  };

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {message ?? 'No jobs found — try broadening your search terms or location.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{results.length} results</p>
      {results.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isAdded={addedUrls.has(job.url)}
          onAdded={handleAdded}
        />
      ))}
    </div>
  );
}
