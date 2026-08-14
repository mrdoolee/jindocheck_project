import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { listEntries, type EntryFilters } from '../../db/entries';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';

function badgeProps(kind: string, label: string): { variant: BadgeProps['variant']; className: string } {
  if (kind === 'sticker') return { variant: 'default', className: 'border-transparent bg-emerald-100 text-emerald-800' };
  if (label === '결석') return { variant: 'destructive', className: '' };
  if (label === '지각' || label === '조퇴') return { variant: 'outline', className: 'border-transparent bg-amber-100 text-amber-800' };
  if (kind === 'note') return { variant: 'outline', className: 'border-transparent bg-orange-100 text-orange-800' };
  return { variant: 'secondary', className: '' };
}

export default function RecentActivityList({
  classId,
  filters,
  limit,
}: {
  classId: number;
  filters?: EntryFilters;
  limit?: number;
}) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).toArray(), [classId]) ?? [];
  const studentById = new Map(students.map((s) => [s.id, s]));
  const entries = useLiveQuery(() => listEntries(classId, filters ?? {}), [classId, filters]) ?? [];
  const shown = limit ? entries.slice(0, limit) : entries;

  return (
    <ul className="divide-y divide-border">
      {shown.length === 0 && <li className="py-4 text-sm text-muted-foreground">기록이 없습니다.</li>}
      {shown.map((e) => {
        const student = studentById.get(e.studentId);
        const { variant, className } = badgeProps(e.kind, e.label);
        return (
          <li key={`${e.kind}-${e.id}`} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {student ? `${student.name} (${student.number})` : `학생#${e.studentId}`}
              </span>
              <Badge variant={variant} className={className}>
                {e.label}
              </Badge>
            </div>
            {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
          </li>
        );
      })}
    </ul>
  );
}
