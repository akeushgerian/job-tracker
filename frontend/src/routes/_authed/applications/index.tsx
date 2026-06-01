import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';
import { Board } from '@/features/applications/board';
import { ApplicationFormDialog } from '@/features/applications/application-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/_authed/applications/')({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Drag applications across stages to update their status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-8"
            />
          </div>
          <ApplicationFormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                New application
              </Button>
            }
          />
        </div>
      </div>

      <Board search={search} />
    </div>
  );
}
