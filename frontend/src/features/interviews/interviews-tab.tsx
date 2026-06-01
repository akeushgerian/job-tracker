import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import type { InterviewOutcome, InterviewType } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useCreateInterview,
  useDeleteInterview,
  useInterviews,
  useUpdateInterview,
} from './api';
import { EmptyState } from '@/components/empty-state';

const TYPE_LABELS: Record<InterviewType, string> = {
  recruiter_call: 'Recruiter Call',
  technical: 'Technical',
  final: 'Final',
  culture: 'Culture',
};

const OUTCOME_VARIANT: Record<InterviewOutcome, 'secondary' | 'success' | 'destructive'> = {
  pending: 'secondary',
  passed: 'success',
  failed: 'destructive',
};

export function InterviewsTab({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useInterviews(applicationId);
  const update = useUpdateInterview(applicationId);
  const remove = useDeleteInterview(applicationId);

  if (isLoading) return <Spinner className="text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AddInterviewDialog applicationId={applicationId} />
      </div>

      {(data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews yet"
          description="Add the interviews scheduled for this application."
        />
      ) : (
        data!.map((interview) => (
          <div
            key={interview.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4"
          >
            <div className="min-w-40 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{TYPE_LABELS[interview.type]}</span>
                {interview.completed && (
                  <Badge variant="outline" className="text-xs">
                    Completed
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(interview.scheduledAt)}
                {interview.durationMinutes ? ` · ${interview.durationMinutes} min` : ''}
              </p>
              {interview.interviewerName && (
                <p className="text-sm text-muted-foreground">
                  {interview.interviewerName}
                  {interview.interviewerRole ? ` — ${interview.interviewerRole}` : ''}
                </p>
              )}
              {interview.notes && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{interview.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={OUTCOME_VARIANT[interview.outcome]} className="capitalize">
                {interview.outcome}
              </Badge>
              <Select
                value={interview.outcome}
                onValueChange={(value) =>
                  update.mutate({
                    id: interview.id,
                    input: {
                      outcome: value as InterviewOutcome,
                      completed: value !== 'pending' ? true : interview.completed,
                    },
                  })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => remove.mutate(interview.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface AddForm {
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: string;
  interviewerName: string;
  interviewerRole: string;
  notes: string;
}

function AddInterviewDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateInterview(applicationId);
  const { register, handleSubmit, reset, watch, setValue } = useForm<AddForm>({
    defaultValues: { type: 'technical' },
  });
  const type = watch('type');

  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync({
      type: values.type,
      scheduledAt: values.scheduledAt
        ? new Date(values.scheduledAt).toISOString()
        : undefined,
      durationMinutes: values.durationMinutes
        ? Number(values.durationMinutes)
        : undefined,
      interviewerName: values.interviewerName || undefined,
      interviewerRole: values.interviewerRole || undefined,
      notes: values.notes || undefined,
    });
    reset({ type: 'technical' });
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add interview</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setValue('type', v as InterviewType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as InterviewType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Scheduled</Label>
            <Input type="datetime-local" {...register('scheduledAt')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Duration (min)</Label>
            <Input type="number" {...register('durationMinutes')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Interviewer</Label>
            <Input {...register('interviewerName')} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Interviewer role</Label>
            <Input {...register('interviewerRole')} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} {...register('notes')} />
          </div>
          <div className="col-span-2 flex justify-end">
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
