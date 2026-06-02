import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
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
import type { Profile } from '@/lib/types';
import { useSaveProfile, type SaveProfileInput } from './api';

const optionalUrl = z
  .union([z.literal(''), z.url('Enter a valid URL')])
  .optional()
  .transform((v) => (v ? v : undefined));

const formSchema = z.object({
  headline: z.string().trim().max(200).optional(),
  targetRole: z.string().trim().max(200).optional(),
  branch: z.string().trim().max(200).optional(),
  seniority: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  remotePref: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  linkedin: optionalUrl,
  github: optionalUrl,
  portfolio: optionalUrl,
  website: optionalUrl,
  summary: z.string().max(20000).optional(),
});

type FormValues = z.input<typeof formSchema>;

const REMOTE_OPTIONS = ['onsite', 'hybrid', 'remote'] as const;

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const save = useSaveProfile();
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillDraft, setSkillDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headline: profile?.headline ?? '',
      targetRole: profile?.targetRole ?? '',
      branch: profile?.branch ?? '',
      seniority: profile?.seniority ?? '',
      location: profile?.location ?? '',
      remotePref: profile?.remotePref ?? undefined,
      linkedin: profile?.links.linkedin ?? '',
      github: profile?.links.github ?? '',
      portfolio: profile?.links.portfolio ?? '',
      website: profile?.links.website ?? '',
      summary: profile?.summary ?? '',
    },
  });

  const addSkill = () => {
    const value = skillDraft.trim();
    if (value && !skills.includes(value)) {
      setSkills([...skills, value]);
    }
    setSkillDraft('');
  };

  const onSubmit = form.handleSubmit(async (raw) => {
    const values = formSchema.parse(raw);
    const payload: SaveProfileInput = {
      headline: values.headline || null,
      targetRole: values.targetRole || null,
      branch: values.branch || null,
      seniority: values.seniority || null,
      location: values.location || null,
      remotePref: values.remotePref ?? null,
      skills,
      links: {
        linkedin: values.linkedin,
        github: values.github,
        portfolio: values.portfolio,
        website: values.website,
      },
      summary: values.summary || null,
    };
    try {
      await save.mutateAsync(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'Failed to save profile',
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Headline" className="col-span-full" error={form.formState.errors.headline?.message}>
          <Input placeholder="Senior Backend Engineer" {...form.register('headline')} />
        </Field>
        <Field label="Target role">
          <Input placeholder="Staff Engineer" {...form.register('targetRole')} />
        </Field>
        <Field label="Branch / industry">
          <Input placeholder="Fintech" {...form.register('branch')} />
        </Field>
        <Field label="Seniority">
          <Input placeholder="Senior" {...form.register('seniority')} />
        </Field>
        <Field label="Location">
          <Input placeholder="Berlin, Germany" {...form.register('location')} />
        </Field>
        <Field label="Remote preference">
          <Controller
            control={form.control}
            name="remotePref"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="No preference" />
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
      </div>

      <Field label="Key skills">
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
            >
              {skill}
              <button
                type="button"
                onClick={() => setSkills(skills.filter((s) => s !== skill))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Add a skill and press Enter"
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            Add
          </Button>
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="LinkedIn" error={form.formState.errors.linkedin?.message}>
          <Input placeholder="https://linkedin.com/in/…" {...form.register('linkedin')} />
        </Field>
        <Field label="GitHub" error={form.formState.errors.github?.message}>
          <Input placeholder="https://github.com/…" {...form.register('github')} />
        </Field>
        <Field label="Portfolio" error={form.formState.errors.portfolio?.message}>
          <Input placeholder="https://…" {...form.register('portfolio')} />
        </Field>
        <Field label="Website" error={form.formState.errors.website?.message}>
          <Input placeholder="https://…" {...form.register('website')} />
        </Field>
      </div>

      <Field label="About / CV summary (markdown)">
        <Textarea
          rows={10}
          placeholder="A summary of your experience, achievements, and what you're looking for…"
          {...form.register('summary')}
        />
      </Field>

      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Spinner />}
          Save profile
        </Button>
      </div>
    </form>
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
