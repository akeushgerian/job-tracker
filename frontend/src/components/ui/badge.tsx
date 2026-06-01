import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-border/60 bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success:
          'border-transparent bg-[hsl(154_40%_92%)] text-[hsl(154_45%_26%)]',
        warning:
          'border-transparent bg-[hsl(34_72%_90%)] text-[hsl(28_70%_34%)]',
        brass: 'border-transparent bg-[hsl(36_46%_90%)] text-[hsl(36_55%_28%)]',
        destructive:
          'border-transparent bg-[hsl(8_58%_93%)] text-[hsl(8_55%_42%)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
