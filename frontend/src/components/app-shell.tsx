import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { LayoutDashboard, KanbanSquare, LogOut, Sparkles, User, PenLine, Mail, Brain, Telescope } from 'lucide-react';
import { useLogout, useMe } from '@/features/auth/api';
import { assistantOpenAtom } from '@/stores/assistant';
import { AssistantPanel } from '@/features/assistant/assistant-panel';
import { CoverLetterDialog } from '@/features/cover-letters/cover-letter-dialog';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/applications', label: 'Pipeline', icon: KanbanSquare },
  { to: '/scout', label: 'Scout', icon: Telescope },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings/gmail', label: 'Gmail', icon: Mail },
  { to: '/settings/ai', label: 'AI Model', icon: Brain },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const openAssistant = useSetAtom(assistantOpenAtom);

  const onLogout = async () => {
    await logout.mutateAsync();
    await navigate({ to: '/login' });
  };

  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5">
          <Link to="/applications" className="group flex items-center gap-2.5">
            <Logo className="h-8 w-8 transition-transform group-hover:scale-105" />
            <span className="font-display text-xl font-medium tracking-tight">
              Laufbahn
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  '[&.active]:bg-accent [&.active]:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <CoverLetterDialog
              trigger={
                <Button variant="outline" size="sm">
                  <PenLine className="h-4 w-4 text-brass" />
                  <span className="hidden sm:inline">Apply to a job</span>
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={() => openAssistant(true)}>
              <Sparkles className="h-4 w-4 text-brass" />
              <span className="hidden sm:inline">Assistant</span>
            </Button>
            {user && (
              <div className="flex items-center gap-2.5 border-l border-border/70 pl-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                  title={user.name}
                >
                  {initials}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  disabled={logout.isPending}
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full flex-1">{children}</main>

      <AssistantPanel />
    </div>
  );
}
