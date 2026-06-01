import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Briefcase, LayoutDashboard, KanbanSquare, LogOut } from 'lucide-react';
import { useLogout, useMe } from '@/features/auth/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/applications', label: 'Pipeline', icon: KanbanSquare },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout.mutateAsync();
    await navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link to="/applications" className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-5 w-5 text-primary" />
            <span>Job Tracker</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  '[&.active]:bg-accent [&.active]:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              disabled={logout.isPending}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
