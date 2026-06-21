import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Telescope } from 'lucide-react';
import { useJobSearch } from '@/features/job-scout/api';
import { SearchForm } from '@/features/job-scout/search-form';
import { ResultsList } from '@/features/job-scout/results-list';
import { NoProfileBanner } from '@/features/job-scout/no-profile-banner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import type { SearchResponse } from '@/lib/types';

export const Route = createFileRoute('/_authed/scout')({
  component: ScoutPage,
});

function ScoutPage() {
  const search = useJobSearch();
  const [lastQuery, setLastQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);

  const handleSearch = (query: string) => {
    setLastQuery(query);
    search.mutate(query, {
      onSuccess: (data) => setResults(data),
    });
  };

  const errorMessage = search.error
    ? search.error instanceof ApiError && search.error.status === 503
      ? 'Job search is not configured. Add SERPER_API_KEY to the server environment (free at serper.dev).'
      : (search.error instanceof ApiError ? search.error.message : 'Search failed. Please try again.')
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-8">
      <div className="flex items-center gap-3">
        <Telescope className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Scout</h1>
          <p className="text-sm text-muted-foreground">
            Search for positions and add the ones you like to your pipeline.
          </p>
        </div>
      </div>

      <SearchForm onSearch={handleSearch} isPending={search.isPending} />

      {results?.scoringSkipped?.reason === 'no_profile' && <NoProfileBanner />}

      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{errorMessage}</p>
          {lastQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => handleSearch(lastQuery)}
              disabled={search.isPending}
            >
              Try again
            </Button>
          )}
        </div>
      )}

      {results && !errorMessage && (
        <ResultsList results={results.results} message={results.message} />
      )}
    </div>
  );
}
