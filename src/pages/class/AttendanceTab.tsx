import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { upsertAttendance, getAttendanceForDate } from '../../db/entries';
import type { AttendanceStatus } from '../../db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import RecentActivityList from './RecentActivityList';

const STATUSES: AttendanceStatus[] = ['출석', '결석', '지각', '조퇴'];
const today = () => new Date().toISOString().slice(0, 10);

export default function AttendanceTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [date, setDate] = useState(today());
  const [showHistory, setShowHistory] = useState(false);
  const attendanceByStudent = useLiveQuery(() => getAttendanceForDate(classId, date), [classId, date]) ?? new Map();

  const handleCheckAll = async () => {
    await Promise.all(students.map((s) => upsertAttendance(classId, s.id!, date, '출석')));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">명렬표 &amp; 출결확인</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? '출결 체크로 돌아가기' : '출결 이력 보기'}
          </Button>
        </CardHeader>
        {!showHistory && (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label="출결 확인 날짜"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto"
              />
              <Button variant="outline" size="sm" onClick={handleCheckAll} disabled={students.length === 0}>
                전체 출석
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">번호</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-64">출결</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const current = attendanceByStudent.get(s.id!);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.number}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {STATUSES.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={current === status ? 'default' : 'outline'}
                              onClick={() => upsertAttendance(classId, s.id!, date, status)}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      아직 등록된 학생이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        )}
        {showHistory && (
          <CardContent className="space-y-4">
            <Input
              type="date"
              aria-label="이력 조회 날짜"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            <RecentActivityList classId={classId} filters={{ kind: 'attendance', date }} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
