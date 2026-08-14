import { db } from './db';
import type { Entry, EntryKind, AttendanceStatus, NoteType } from './types';

export async function addAttendance(
  classId: number,
  studentId: number,
  status: AttendanceStatus,
  note: string,
  date: string
): Promise<number> {
  return db.attendance.add({ classId, studentId, date, status, note });
}

export async function addSticker(
  classId: number,
  studentId: number,
  points: number,
  reason: string,
  date: string
): Promise<number> {
  return db.stickers.add({ classId, studentId, date, points, reason });
}

export async function addNote(
  classId: number,
  studentId: number,
  type: NoteType,
  content: string,
  date: string
): Promise<number> {
  return db.records.add({ classId, studentId, date, type, content });
}

export interface EntryFilters {
  studentId?: number;
  kind?: EntryKind;
}

export async function listEntries(classId: number, filters: EntryFilters = {}): Promise<Entry[]> {
  const [attendance, stickers, notes] = await Promise.all([
    db.attendance.where('classId').equals(classId).toArray(),
    db.stickers.where('classId').equals(classId).toArray(),
    db.records.where('classId').equals(classId).toArray(),
  ]);

  const entries: Entry[] = [
    ...attendance.map((a) => ({
      id: a.id!,
      kind: 'attendance' as const,
      classId: a.classId,
      studentId: a.studentId,
      date: a.date,
      label: a.status,
      detail: a.note,
    })),
    ...stickers.map((s) => ({
      id: s.id!,
      kind: 'sticker' as const,
      classId: s.classId,
      studentId: s.studentId,
      date: s.date,
      label: `+${s.points}점`,
      detail: s.reason,
    })),
    ...notes.map((n) => ({
      id: n.id!,
      kind: 'note' as const,
      classId: n.classId,
      studentId: n.studentId,
      date: n.date,
      label: n.type,
      detail: n.content,
    })),
  ];

  return entries
    .filter((e) => filters.studentId === undefined || e.studentId === filters.studentId)
    .filter((e) => filters.kind === undefined || e.kind === filters.kind)
    .sort((a, b) => b.date.localeCompare(a.date));
}
