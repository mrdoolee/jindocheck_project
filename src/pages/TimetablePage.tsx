import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTimetableSettings } from '@/db/timetableSettings';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['월', '화', '수', '목', '금'];

interface TimetableCell {
  subject: string;
  person: string;
  changed: boolean;
}
type TimetableGrid = (TimetableCell | null)[][];

interface TimetableResponse {
  error?: string;
  schoolName?: string;
  periods?: string[];
  gradeClassCounts?: number[];
  teacherTimetable?: TimetableGrid;
  classTimetable?: TimetableGrid;
}

async function fetchTimetable(params: Record<string, string>): Promise<TimetableResponse> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/timetable?${query}`);
  const body = (await res.json()) as TimetableResponse;
  if (!res.ok) throw new Error(body.error ?? `컴시간 서버 오류 (${res.status})`);
  return body;
}

function TimetableGridView({ periods, grid }: { periods: string[]; grid: TimetableGrid }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="bg-emerald-800 text-white">교시</TableHead>
          {DAY_LABELS.map((d) => (
            <TableHead key={d} className="bg-emerald-800 text-center text-white">
              {d}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {grid.map((row, periodIdx) => (
          <TableRow key={periodIdx}>
            <TableCell className="whitespace-nowrap bg-emerald-50 text-center font-medium">
              {periodIdx + 1}교시
              {periods[periodIdx] && <div className="text-xs text-muted-foreground">{periods[periodIdx]}</div>}
            </TableCell>
            {row.map((cell, dayIdx) => (
              <TableCell
                key={dayIdx}
                className={cn(
                  'text-center',
                  cell?.changed && 'bg-yellow-100 font-semibold text-red-600'
                )}
              >
                {cell ? (
                  <>
                    {cell.subject}
                    <div className="text-xs text-muted-foreground">{cell.person}</div>
                  </>
                ) : (
                  ''
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function TimetablePage() {
  // useLiveQuery returns undefined both while still loading AND once resolved if the query
  // function itself resolves to undefined — coerce "no row found" to null so the two are
  // distinguishable below (undefined = still loading, null = confirmed no settings saved).
  const settings = useLiveQuery(async () => (await getTimetableSettings()) ?? null, []);

  const [teacherState, setTeacherState] = useState<
    { status: 'loading' | 'error'; error?: string } | { status: 'idle'; data: TimetableResponse }
  >({ status: 'loading' });

  const loadTeacherTimetable = async () => {
    if (!settings) return;
    setTeacherState({ status: 'loading' });
    try {
      const data = await fetchTimetable({ schoolCode: settings.schoolCode, teacherIndex: String(settings.teacherIndex) });
      setTeacherState({ status: 'idle', data });
    } catch (err) {
      setTeacherState({ status: 'error', error: (err as Error).message });
    }
  };

  // Depend on the primitive fields, not the useLiveQuery object itself — that object gets a
  // new reference on every live-query re-resolution even when its content hasn't changed,
  // which would otherwise re-fetch comci.net on every unrelated Dexie write.
  useEffect(() => {
    if (settings) loadTeacherTimetable();
  }, [settings?.schoolCode, settings?.teacherIndex]);

  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [classState, setClassState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: string } | { status: 'loaded'; grid: TimetableGrid }
  >({ status: 'idle' });

  const handleLoadClassTimetable = async () => {
    if (!settings || !grade || !classNum) return;
    setClassState({ status: 'loading' });
    try {
      const data = await fetchTimetable({ schoolCode: settings.schoolCode, grade, classNum });
      setClassState({ status: 'loaded', grid: data.classTimetable ?? [] });
    } catch (err) {
      setClassState({ status: 'error', error: (err as Error).message });
    }
  };

  if (settings === undefined) return null; // still loading from IndexedDB

  if (!settings) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">시간표</h1>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            아직 시간표 설정이 없습니다.{' '}
            <Link to="/setup/timetable" className="font-medium text-primary hover:underline">
              설정 &gt; 시간표 설정
            </Link>
            에서 학교코드와 교사를 먼저 등록하세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  const periods = teacherState.status === 'idle' ? teacherState.data.periods ?? [] : [];
  const gradeClassCounts = teacherState.status === 'idle' ? teacherState.data.gradeClassCounts ?? [] : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">시간표</h1>
          <p className="text-sm text-muted-foreground">
            {settings.teacherName} 교사
            {teacherState.status === 'idle' && teacherState.data.schoolName ? ` · ${teacherState.data.schoolName}` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={loadTeacherTimetable} disabled={teacherState.status === 'loading'}>
          {teacherState.status === 'loading' ? '새로고침 중...' : '새로고침'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">교사 시간표</CardTitle>
        </CardHeader>
        <CardContent>
          {teacherState.status === 'loading' && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {teacherState.status === 'error' && <p className="text-sm text-destructive">{teacherState.error}</p>}
          {teacherState.status === 'idle' &&
            (teacherState.data.teacherTimetable ? (
              <TimetableGridView periods={periods} grid={teacherState.data.teacherTimetable} />
            ) : (
              <p className="text-sm text-muted-foreground">시간표 데이터가 없습니다.</p>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">학급 시간표 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="학년" className="w-28">
              <option value="">학년</option>
              {gradeClassCounts.map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}학년
                </option>
              ))}
            </Select>
            <Select value={classNum} onChange={(e) => setClassNum(e.target.value)} aria-label="반" className="w-28">
              <option value="">반</option>
              {grade &&
                Array.from({ length: gradeClassCounts[Number(grade) - 1] ?? 0 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}반
                  </option>
                ))}
            </Select>
            <Button onClick={handleLoadClassTimetable} disabled={!grade || !classNum || classState.status === 'loading'}>
              {classState.status === 'loading' ? '조회 중...' : '조회'}
            </Button>
          </div>
          {classState.status === 'error' && <p className="text-sm text-destructive">{classState.error}</p>}
          {classState.status === 'loaded' && <TimetableGridView periods={periods} grid={classState.grid} />}
        </CardContent>
      </Card>
    </div>
  );
}
