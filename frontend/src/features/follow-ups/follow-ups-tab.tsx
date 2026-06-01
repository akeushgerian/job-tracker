import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { formatDate } from '@/lib/utils';
import {
  useCreateFollowUp,
  useDeleteFollowUp,
  useFollowUps,
  useUpdateFollowUp,
} from './api';

function isOverdue(dueDate: string, completed: boolean): boolean {
  return !completed && new Date(dueDate).getTime() < Date.now();
}

export function FollowUpsTab({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useFollowUps(applicationId);
  const update = useUpdateFollowUp(applicationId);
  const remove = useDeleteFollowUp(applicationId);

  if (isLoading) return <Spinner className="text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AddFollowUpDialog applicationId={applicationId} />
      </div>

      {(data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No follow-ups"
          description="Set reminders so you never miss a nudge."
        />
      ) : (
        data!.map((followUp) => (
          <div
            key={followUp.id}
            className="flex items-center gap-3 rounded-lg border border-border p-4"
          >
            <input
              type="checkbox"
              checked={followUp.completed}
              onChange={(e) =>
                update.mutate({
                  id: followUp.id,
                  input: { completed: e.target.checked },
                })
              }
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            <div className="flex-1">
              <p
                className={
                  followUp.completed ? 'text-muted-foreground line-through' : 'font-medium'
                }
              >
                {followUp.description}
              </p>
              <p className="text-sm text-muted-foreground">
                Due {formatDate(followUp.dueDate)}
              </p>
            </div>
            {isOverdue(followUp.dueDate, followUp.completed) && (
              <Badge variant="destructive">Overdue</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => remove.mutate(followUp.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

interface AddForm {
  dueDate: string;
  description: string;
}

function AddFollowUpDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateFollowUp(applicationId);
  const { register, handleSubmit, reset } = useForm<AddForm>();

  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync({
      dueDate: new Date(values.dueDate).toISOString(),
      description: values.description,
    });
    reset();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add follow-up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add follow-up</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input required {...register('description')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Due date</Label>
            <Input type="date" required {...register('dueDate')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
