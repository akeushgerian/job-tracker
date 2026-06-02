import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Logo } from '@/components/logo';
import { useLogin, useRegister } from './api';

const PIPELINE_LABELS = [
  'Discovered',
  'Applied',
  'Recruiter call',
  'Technical',
  'Final',
  'Offer',
];

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'At least 8 characters'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const login = useLogin();
  const register = useRegister();
  const isRegister = mode === 'register';

  const form = useForm<RegisterValues>({
    // The form type is the register superset; in login mode the active schema
    // simply ignores `name`. The cast bridges the two schema shapes.
    resolver: zodResolver(
      isRegister ? registerSchema : loginSchema,
    ) as unknown as Resolver<RegisterValues>,
    defaultValues: { email: '', password: '', name: '' },
  });

  const pending = login.isPending || register.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isRegister) {
        await register.mutateAsync(values);
      } else {
        await login.mutateAsync({ email: values.email, password: values.password });
      }
      await navigate({ to: '/applications' });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong';
      form.setError('root', { message });
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — the premium first impression */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm">
            <Logo className="h-8 w-8" />
          </span>
          <span className="font-display text-xl font-medium">Laufbahn</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight">
            Every step of your career path, in one calm place.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-primary-foreground/70">
            Track applications from first sighting to signed offer — with a local,
            private assistant that helps you move faster.
          </p>
        </div>

        <ol className="relative flex flex-col gap-3">
          {PIPELINE_LABELS.map((label, i) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={
                  i === 0
                    ? 'h-2 w-2 rounded-full bg-brass'
                    : 'h-2 w-2 rounded-full bg-primary-foreground/25'
                }
              />
              <span
                className={
                  i === 0 ? 'text-primary-foreground' : 'text-primary-foreground/45'
                }
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo className="h-8 w-8" />
            <span className="font-display text-xl font-medium">Laufbahn</span>
          </div>

          <h2 className="font-display text-3xl font-medium tracking-tight">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRegister
              ? 'A few details and your pipeline is ready.'
              : 'Sign in to pick up where you left off.'}
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" autoComplete="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {form.formState.errors.root && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
              {pending && <Spinner />}
              {isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
