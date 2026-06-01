import { createFileRoute, redirect } from '@tanstack/react-router';
import { meQueryOptions } from '@/features/auth/api';
import { AuthForm } from '@/features/auth/auth-form';

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (user) throw redirect({ to: '/applications' });
  },
  component: () => <AuthForm mode="login" />,
});
