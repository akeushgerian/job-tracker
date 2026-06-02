import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Laufbahn"
      draggable={false}
      className={cn('h-8 w-8 select-none', className)}
    />
  );
}
