import { formatCop } from '@/lib/money';
import { cn } from './cn';

export function Money({ value, className, strike = false }: { value: number; className?: string; strike?: boolean }) {
  return <span className={cn('tabular whitespace-nowrap', strike && 'line-through', className)}>{formatCop(value)}</span>;
}
