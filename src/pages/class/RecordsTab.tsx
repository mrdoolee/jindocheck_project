import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addAttendance, addSticker, addNote, listEntries } from '../../db/entries';
import type { AttendanceStatus, NoteType, EntryKind } from '../../db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Kind = 'attendance' | 'sticker' | 'note';

const today = () => new Date().toISOString().slice(0, 10);

export default function RecordsTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [kind, setKind] = useState<Kind>('attendance');
  const [studentId, setStudentId] = useState<number | ''>('');
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<AttendanceStatus>('출석');
  const [points, setPoints] = useState('1');
  const [reason, setReason] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('특이사항');
  const [content, setContent] = useState('');
  const [filterStudent, setFilterStudent] = useState<number | ''>('');
  const [filterKind, setFilterKind] = useState<EntryKind | ''>('');

  const filters = useMemo(
    () => ({
      studentId: filterStudent === '' ? undefined : filterStudent,
      kind: filterKind === '' ? undefined : filterKind,
    }),
    [filterStudent, filterKind]
  );
  const entries = useLiveQuery(() => listEntries(classId, filters), [classId, filters]) ?? [];

  const handleSave = async () => {
    if (studentId === '') return;
    if (kind === 'attendance') await addAttendance(classId, studentId, status, reason, date);
    if (kind === 'sticker') await addSticker(classId, studentId, Number(points), reason, date);
    if (kind === 'note') await addNote(classId, studentId, noteType, content, date);
    setReason('');
    setContent('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 기록 추가</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>기록 유형</Label>
              <Select aria-label="기록 유형" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                <option value="attendance">출결</option>
                <option value="sticker">칭찬포인트</option>
                <option value="note">특이사항/과제제출</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>학생</Label>
              <Select
                aria-label="학생"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">학생 선택</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>날짜</Label>
              <Input type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            {kind === 'attendance' && (
              <div className="space-y-1.5">
                <Label>출결 상태</Label>
                <Select aria-label="출결 상태" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
                  <option value="출석">출석</option>
                  <option value="결석">결석</option>
                  <option value="지각">지각</option>
                  <option value="조퇴">조퇴</option>
                </Select>
              </div>
            )}
            {kind === 'sticker' && (
              <div className="space-y-1.5">
                <Label>점수</Label>
                <Input aria-label="점수" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
              </div>
            )}
            {kind === 'note' && (
              <div className="space-y-1.5">
                <Label>기록 세부유형</Label>
                <Select aria-label="기록 세부유형" value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)}>
                  <option value="특이사항">특이사항</option>
                  <option value="과제제출">과제제출</option>
                  <option value="기타">기타</option>
                </Select>
              </div>
            )}
          </div>

          {kind !== 'note' ? (
            <div className="space-y-1.5">
              <Label>사유</Label>
              <Input aria-label="사유" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>내용</Label>
              <Input aria-label="내용" value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" />
            </div>
          )}

          <Button onClick={handleSave}>저장</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">기록 목록</CardTitle>
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
              <option value="sticker">칭찬포인트</option>
              <option value="note">특이사항/과제제출</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{e.date}</span>
                <Badge variant={e.kind === 'attendance' ? 'outline' : e.kind === 'sticker' ? 'default' : 'secondary'}>
                  {e.label}
                </Badge>
                {e.detail && <span>{e.detail}</span>}
              </li>
            ))}
            {entries.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">기록이 없습니다.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
