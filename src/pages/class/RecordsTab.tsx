import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import QuickRecordForm from './QuickRecordForm';
import RecentActivityList from './RecentActivityList';

export default function RecordsTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [showHistory, setShowHistory] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [historyStudentId, setHistoryStudentId] = useState<number | ''>('');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? '기록 추가로 돌아가기' : '누가기록 이력보기'}
        </Button>
      </div>

      {!showHistory ? (
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
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">누가기록 이력보기</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="학생별 조회"
                value={historyStudentId}
                onChange={(e) => setHistoryStudentId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-auto"
              >
                <option value="">전체 학생</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number} {s.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="정렬 기준"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                className="w-auto"
              >
                <option value="date">날짜순</option>
                <option value="name">학생이름순</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivityList
              classId={classId}
              filters={{ kind: 'note', studentId: historyStudentId === '' ? undefined : historyStudentId }}
              sortBy={sortBy}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
