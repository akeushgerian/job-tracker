import { STATUS_LABELS, type ApplicationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

// Muted, harmonized tints — a quiet progression from neutral to pine to gold.
const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  discovered: 'bg-[hsl(40_18%_90%)] text-[hsl(33_10%_38%)]',
  applied: 'bg-[hsl(205_32%_90%)] text-[hsl(208_38%_32%)]',
  recruiter_call: 'bg-[hsl(190_30%_88%)] text-[hsl(192_40%_28%)]',
  technical_interview: 'bg-[hsl(170_28%_88%)] text-[hsl(168_40%_26%)]',
  final_interview: 'bg-[hsl(158_30%_87%)] text-[hsl(160_42%_24%)]',
  offer: 'bg-[hsl(36_46%_88%)] text-[hsl(34_55%_30%)]',
  accepted: 'bg-[hsl(154_42%_86%)] text-[hsl(154_48%_24%)]',
  rejected: 'bg-[hsl(8_40%_91%)] text-[hsl(8_50%_42%)]',
  withdrawn: 'bg-[hsl(40_8%_90%)] text-[hsl(33_6%_46%)]',
};

export const STATUS_DOT_CLASSES: Record<ApplicationStatus, string> = {
  discovered: 'bg-[hsl(33_10%_55%)]',
  applied: 'bg-[hsl(208_45%_45%)]',
  recruiter_call: 'bg-[hsl(192_45%_40%)]',
  technical_interview: 'bg-[hsl(168_45%_36%)]',
  final_interview: 'bg-[hsl(160_46%_32%)]',
  offer: 'bg-[hsl(34_60%_46%)]',
  accepted: 'bg-[hsl(154_50%_34%)]',
  rejected: 'bg-[hsl(8_55%_50%)]',
  withdrawn: 'bg-[hsl(33_8%_60%)]',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-tight',
        STATUS_CLASSES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASSES[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}
