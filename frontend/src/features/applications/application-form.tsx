import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Application } from '@/lib/types';
import {
  useCreateApplication,
  useUpdateApplication,
  type CreateApplicationInput,
} from './api';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

// Empty number inputs arrive as "" — coerce only real values, else undefined.
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().nonnegative().optional(),
);

const formSchema = z.object({
  companyName: z.string().trim().min(1, 'Company is required'),
  positionTitle: z.string().trim().min(1, 'Position is required'),
  jobUrl: z
    .union([z.literal(''), z.url('Enter a valid URL')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,
  location: optionalString,
  remoteType: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  source: z
    .enum(['linkedin', 'indeed', 'instaffo', 'direct', 'referral', 'recruiter'])
    .optional(),
  recruiterName: optionalString,
  recruiterEmail: z
    .union([z.literal(''), z.email('Enter a valid email')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  notes: optionalString,
  appliedAt: optionalString,
});

type FormValues = z.input<typeof formSchema>;

const REMOTE_OPTIONS = ['onsite', 'hybrid', 'remote'] as const;
const SOURCE_OPTIONS = [
  'linkedin',
  'indeed',
  'instaffo',
  'direct',
  'referral',
  'recruiter',
] as const;

interface Props {
  trigger: React.ReactNode;
  application?: Application;
}

export function ApplicationFormDialog({ trigger, application }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(application);
  const create = useCreateApplication();
  const update = useUpdateApplication(application?.id ?? '');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: application
      ? {
          companyName: application.companyName,
          positionTitle: application.positionTitle,
          jobUrl: application.jobUrl ?? '',
          salaryMin: application.salaryMin ?? undefined,
          salaryMax: application.salaryMax ?? undefined,
          location: application.location ?? '',
          remoteType: application.remoteType ?? undefined,
          source: application.source ?? undefined,
          recruiterName: application.recruiterName ?? '',
          recruiterEmail: application.recruiterEmail ?? '',
          notes: application.notes ?? '',
          appliedAt: application.appliedAt ? application.appliedAt.slice(0, 10) : '',
        }
      : { companyName: '', positionTitle: '' },
  });

  const pending = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit(async (raw) => {
    const values = formSchema.parse(raw);
    const payload: CreateApplicationInput = {
      ...values,
      appliedAt: values.appliedAt
        ? new Date(values.appliedAt).toISOString()
        : undefined,
    };
    try {
      if (isEdit && application) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload);
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'Failed to save',
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit application' : 'New application'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4" noValidate>
          <Field label="Company" error={form.formState.errors.companyName?.message}>
            <Input {...form.register('companyName')} />
          </Field>
          <Field label="Position" error={form.formState.errors.positionTitle?.message}>
            <Input {...form.register('positionTitle')} />
          </Field>
          <Field label="Job URL" className="col-span-2" error={form.formState.errors.jobUrl?.message}>
            <Input placeholder="https://…" {...form.register('jobUrl')} />
          </Field>
          <Field label="Salary min (€)">
            <Input type="number" {...form.register('salaryMin')} />
          </Field>
          <Field label="Salary max (€)" error={form.formState.errors.salaryMax?.message}>
            <Input type="number" {...form.register('salaryMax')} />
          </Field>
          <Field label="Location">
            <Input {...form.register('location')} />
          </Field>
          <Field label="Remote">
            <Controller
              control={form.control}
              name="remoteType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMOTE_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Source">
            <Controller
              control={form.control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Applied on">
            <Input type="date" {...form.register('appliedAt')} />
          </Field>
          <Field label="Recruiter name">
            <Input {...form.register('recruiterName')} />
          </Field>
          <Field label="Recruiter email" error={form.formState.errors.recruiterEmail?.message}>
            <Input {...form.register('recruiterEmail')} />
          </Field>
          <Field label="Notes" className="col-span-2">
            <Textarea rows={3} {...form.register('notes')} />
          </Field>

          {form.formState.errors.root && (
            <p className="col-span-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {isEdit ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
