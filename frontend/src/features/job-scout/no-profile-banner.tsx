import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertCircle, X } from 'lucide-react';

export function NoProfileBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Complete your{' '}
        <Link to="/profile" className="font-medium underline underline-offset-2">
          profile
        </Link>{' '}
        to get AI match scores for each job.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
