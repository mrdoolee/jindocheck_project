import { useState } from 'react';
import { addAttendance, addNote } from '../../db/entries';
import type { AttendanceStatus, NoteType } from '../../db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

type Kind = 'attendance' | 'note';

const today = () => new Date().toISOString().slice(0, 10);

export default function QuickRecordForm({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [kind, setKind] = useState<Kind>('attendance');
  const [studentId, setStudentId] = useState<number | ''>('');
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<AttendanceStatus>('출석');
  const [reason, setReason] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('특이사항');
  const [content, setContent] = useState('');

  const handleSave = async () => {
    if (studentId === '') return;
    if (kind === 'attendance') await addAttendance(classId, studentId, status, reason, date);
    if (kind === 'note') await addNote(classId, studentId, noteType, content, date);
    setReason('');
    setContent('');
  };

  return (
    <div className="space-y-3">
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
              {s.number} {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>기록 유형</Label>
          <Select aria-label="기록 유형" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="attendance">출결</option>
            <option value="note">누가기록</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>날짜</Label>
          <Input type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
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

      {kind === 'attendance' ? (
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

      <Button onClick={handleSave} className="w-full">
        기록 저장
      </Button>
    </div>
  );
}
