import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import {
  listEntries,
  deleteEntry,
  updateAttendanceEntry,
  updateNoteEntry,
  type EntryFilters,
} from '../../db/entries';
import type { Entry, AttendanceStatus, NoteType } from '../../db/types';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

function badgeProps(kind: string, label: string): { variant: BadgeProps['variant']; className: string } {
  if (kind === 'sticker') return { variant: 'default', className: 'border-transparent bg-emerald-100 text-emerald-800' };
  if (label === '결석') return { variant: 'destructive', className: '' };
  if (label === '지각' || label === '조퇴') return { variant: 'outline', className: 'border-transparent bg-amber-100 text-amber-800' };
  if (kind === 'note') return { variant: 'outline', className: 'border-transparent bg-orange-100 text-orange-800' };
  return { variant: 'secondary', className: '' };
}

function AttendanceEditForm({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [status, setStatus] = useState<AttendanceStatus>(entry.label as AttendanceStatus);
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.detail);

  const handleSave = async () => {
    await updateAttendanceEntry(entry.id, { status, date, note });
    onDone();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <Select aria-label="출결 상태 수정" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} className="w-auto">
        <option value="출석">출석</option>
        <option value="결석">결석</option>
        <option value="지각">지각</option>
        <option value="조퇴">조퇴</option>
      </Select>
      <Input aria-label="날짜 수정" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      <Input aria-label="사유 수정" value={note} onChange={(e) => setNote(e.target.value)} placeholder="사유" className="flex-1" />
      <Button size="sm" onClick={handleSave}>
        저장
      </Button>
      <Button size="sm" variant="outline" onClick={onDone}>
        취소
      </Button>
    </div>
  );
}

function NoteEditForm({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [type, setType] = useState<NoteType>(entry.label as NoteType);
  const [date, setDate] = useState(entry.date);
  const [content, setContent] = useState(entry.detail);

  const handleSave = async () => {
    await updateNoteEntry(entry.id, { type, date, content });
    onDone();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <Select aria-label="기록 세부유형 수정" value={type} onChange={(e) => setType(e.target.value as NoteType)} className="w-auto">
        <option value="특이사항">특이사항</option>
        <option value="과제제출">과제제출</option>
        <option value="기타">기타</option>
      </Select>
      <Input aria-label="날짜 수정" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      <Input aria-label="내용 수정" value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" className="flex-1" />
      <Button size="sm" onClick={handleSave}>
        저장
      </Button>
      <Button size="sm" variant="outline" onClick={onDone}>
        취소
      </Button>
    </div>
  );
}

function EntryRow({ entry, studentLabel }: { entry: Entry; studentLabel: string }) {
  const [editing, setEditing] = useState(false);
  const { variant, className } = badgeProps(entry.kind, entry.label);

  const handleDelete = () => {
    if (window.confirm('이 기록을 삭제할까요?')) {
      deleteEntry(entry.kind, entry.id);
    }
  };

  if (editing) {
    if (entry.kind === 'attendance') return <AttendanceEditForm entry={entry} onDone={() => setEditing(false)} />;
    if (entry.kind === 'note') return <NoteEditForm entry={entry} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{studentLabel}</span>
        <div className="flex items-center gap-2">
          <Badge variant={variant} className={className}>
            {entry.label}
          </Badge>
          {entry.kind !== 'sticker' && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              수정
            </button>
          )}
          <button onClick={handleDelete} className="text-xs font-medium text-muted-foreground hover:text-destructive hover:underline">
            삭제
          </button>
        </div>
      </div>
      {entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
    </div>
  );
}

export default function RecentActivityList({
  classId,
  filters,
  limit,
  sortBy = 'date',
}: {
  classId: number;
  filters?: EntryFilters;
  limit?: number;
  sortBy?: 'date' | 'name';
}) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).toArray(), [classId]) ?? [];
  const studentById = new Map(students.map((s) => [s.id, s]));
  const entries = useLiveQuery(() => listEntries(classId, filters ?? {}), [classId, filters]) ?? [];
  const ordered =
    sortBy === 'name'
      ? [...entries].sort((a, b) => {
          const aName = studentById.get(a.studentId)?.name ?? '';
          const bName = studentById.get(b.studentId)?.name ?? '';
          return aName.localeCompare(bName, 'ko');
        })
      : entries;
  const shown = limit ? ordered.slice(0, limit) : ordered;

  return (
    <ul className="divide-y divide-border">
      {shown.length === 0 && <li className="py-4 text-sm text-muted-foreground">기록이 없습니다.</li>}
      {shown.map((e) => {
        const student = studentById.get(e.studentId);
        const studentLabel = student ? `${student.name} (${student.number})` : `학생#${e.studentId}`;
        return (
          <li key={`${e.kind}-${e.id}`}>
            <EntryRow entry={e} studentLabel={studentLabel} />
          </li>
        );
      })}
    </ul>
  );
}
