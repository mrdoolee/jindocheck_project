import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addAttendance, addSticker, addNote, listEntries } from '../../db/entries';
import type { AttendanceStatus, NoteType } from '../../db/types';

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

  const filters = useMemo(
    () => ({ studentId: filterStudent === '' ? undefined : filterStudent }),
    [filterStudent]
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
    <div>
      <select aria-label="기록 유형" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
        <option value="attendance">출결</option>
        <option value="sticker">칭찬포인트</option>
        <option value="note">특이사항/과제제출</option>
      </select>
      <select
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
      </select>
      <input type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} />

      {kind === 'attendance' && (
        <select aria-label="출결 상태" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
          <option value="출석">출석</option>
          <option value="결석">결석</option>
          <option value="지각">지각</option>
          <option value="조퇴">조퇴</option>
        </select>
      )}
      {kind === 'sticker' && (
        <input aria-label="점수" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
      )}
      {kind === 'note' && (
        <select aria-label="기록 세부유형" value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)}>
          <option value="특이사항">특이사항</option>
          <option value="과제제출">과제제출</option>
          <option value="기타">기타</option>
        </select>
      )}
      {kind !== 'note' ? (
        <input aria-label="사유" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유" />
      ) : (
        <input aria-label="내용" value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" />
      )}

      <button onClick={handleSave}>저장</button>

      <div>
        <select
          aria-label="학생 필터"
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">전체 학생</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.name}
            </option>
          ))}
        </select>
      </div>

      <ul>
        {entries.map((e) => (
          <li key={`${e.kind}-${e.id}`}>
            {e.date} - {e.label} - {e.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
