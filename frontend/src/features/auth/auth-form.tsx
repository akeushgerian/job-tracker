import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLogin, useRegister } from './api';

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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? 'Start tracking your job applications.'
              : 'Sign in to your job tracker.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button type="submit" disabled={pending} className="mt-2">
              {pending && <Spinner />}
              {isRegister ? 'Sign up' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
