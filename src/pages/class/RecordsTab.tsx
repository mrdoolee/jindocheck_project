import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuickRecordForm from './QuickRecordForm';
import RecentActivityList from './RecentActivityList';

export default function RecordsTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');

  const filters = useMemo(
    () => ({ kind: 'note' as const, studentId: selectedStudentId === '' ? undefined : selectedStudentId }),
    [selectedStudentId]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">학생</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id!)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selectedStudentId === s.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-white hover:bg-secondary'
              )}
            >
              {s.number} {s.name}
            </button>
          ))}
          {students.length === 0 && <p className="text-sm text-muted-foreground">학생이 없습니다.</p>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">새 기록 추가</CardTitle>
          {selectedStudentId !== '' && (
            <Button variant="outline" size="sm" onClick={() => setSelectedStudentId('')}>
              전체 학생 보기
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <QuickRecordForm
            classId={classId}
            presetStudentId={selectedStudentId === '' ? undefined : selectedStudentId}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">누가기록 전체</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList classId={classId} filters={filters} />
        </CardContent>
      </Card>
    </div>
  );
}
