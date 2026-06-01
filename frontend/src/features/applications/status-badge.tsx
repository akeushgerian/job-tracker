import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type ApplicationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  discovered: 'bg-slate-100 text-slate-700',
  applied: 'bg-blue-100 text-blue-700',
  recruiter_call: 'bg-indigo-100 text-indigo-700',
  technical_interview: 'bg-violet-100 text-violet-700',
  final_interview: 'bg-purple-100 text-purple-700',
  offer: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', STATUS_CLASSES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
