import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { EntryKind } from '../../db/types';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuickRecordForm from './QuickRecordForm';
import RecentActivityList from './RecentActivityList';

export default function RecordsTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [filterStudent, setFilterStudent] = useState<number | ''>('');
  const [filterKind, setFilterKind] = useState<EntryKind | ''>('');

  const filters = useMemo(
    () => ({
      studentId: filterStudent === '' ? undefined : filterStudent,
      kind: filterKind === '' ? undefined : filterKind,
    }),
    [filterStudent, filterKind]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">새 기록 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickRecordForm classId={classId} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">전체 기록</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="학생 필터"
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-auto"
            >
              <option value="">전체 학생</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="유형 필터"
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value as EntryKind | '')}
              className="w-auto"
            >
              <option value="">전체 유형</option>
              <option value="attendance">출결</option>
              <option value="note">누가기록</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <RecentActivityList classId={classId} filters={filters} />
        </CardContent>
      </Card>
    </div>
  );
}
