import { ReactNode } from 'react';
import { styleFor } from '@/lib/statusStyles';

interface BadgeProps {
  /** Label text to display. */
  children: ReactNode;
  /** Optional leading icon. */
  icon?: ReactNode;
  /**
   * Either pass a full className via `className`, or a status map + key to
   * resolve the colour automatically (e.g. map={USER_STATUS_STYLES} statusKey={user.status}).
   */
  map?: Record<string, string>;
  statusKey?: string | null;
  className?: string;
}

/**
 * Consistent pill/badge. Replaces the ad-hoc
 * `<span className="px-2.5 py-1 rounded-full text-xs font-bold ...">` markup
 * duplicated across admin tables.
 */
export function Badge({ children, icon, map, statusKey, className }: BadgeProps) {
  const colour = className ?? (map ? styleFor(map, statusKey) : 'bg-gray-100 text-gray-700');
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${colour}`}>
      {icon}
      {children}
    </span>
  );
}
