import { useEffect, useState } from 'react';
import { addNote } from '../../db/entries';
import type { NoteType } from '../../db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

const today = () => new Date().toISOString().slice(0, 10);

export default function QuickRecordForm({
  classId,
  presetStudentId,
}: {
  classId: number;
  presetStudentId?: number;
}) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [studentId, setStudentId] = useState<number | ''>(presetStudentId ?? '');
  const [date, setDate] = useState(today());
  const [noteType, setNoteType] = useState<NoteType>('특이사항');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (presetStudentId !== undefined) setStudentId(presetStudentId);
  }, [presetStudentId]);

  const handleSave = async () => {
    if (studentId === '') return;
    await addNote(classId, studentId, noteType, content, date);
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
          <Label>기록 세부유형</Label>
          <Select aria-label="기록 세부유형" value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)}>
            <option value="특이사항">특이사항</option>
            <option value="과제제출">과제제출</option>
            <option value="기타">기타</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>날짜</Label>
          <Input type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>내용</Label>
        <Input aria-label="내용" value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" />
      </div>

      <Button onClick={handleSave} className="w-full">
        기록 저장
      </Button>
    </div>
  );
}
