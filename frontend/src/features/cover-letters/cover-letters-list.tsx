import { useState } from 'react';
import { FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/empty-state';
import { formatDate } from '@/lib/utils';
import type { CoverLetter } from '@/lib/types';
import { useCoverLetters, useDeleteCoverLetter } from './api';

export function CoverLettersList({ applicationId }: { applicationId?: string }) {
  const { data, isLoading } = useCoverLetters(applicationId);
  const remove = useDeleteCoverLetter();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <Spinner />;
  const letters = data ?? [];

  if (letters.length === 0) {
    return <EmptyState icon={FileText} title="No cover letters yet" />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {letters.map((letter) => (
        <li key={letter.id} className="rounded-lg border border-border/70 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {letter.jobTitle ?? 'Cover letter'}
                {letter.jobCompany ? ` · ${letter.jobCompany}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(letter.createdAt)}
                {!applicationId && letter.applicationId && (
                  <>
                    {' · '}
                    <Link
                      to="/applications/$id"
                      params={{ id: letter.applicationId }}
                      className="text-primary hover:underline"
                    >
                      linked application
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(expanded === letter.id ? null : letter.id)}
              >
                {expanded === letter.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove.mutate(letter.id)}
                disabled={remove.isPending}
                title="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          {expanded === letter.id && (
            <pre className="mt-3 whitespace-pre-wrap border-t border-border/60 pt-3 text-sm leading-relaxed">
              {letter.content}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
}

export type { CoverLetter };
