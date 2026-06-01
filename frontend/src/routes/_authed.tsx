import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQueryOptions } from '@/features/auth/api';
import { AppShell } from '@/components/app-shell';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
