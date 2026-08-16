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

export async function upsertAttendance(
  classId: number,
  studentId: number,
  date: string,
  status: AttendanceStatus,
  note = ''
): Promise<void> {
  const existing = await db.attendance.where({ classId, studentId, date }).first();
  if (existing) {
    await db.attendance.update(existing.id!, { status, note });
  } else {
    await db.attendance.add({ classId, studentId, date, status, note });
  }
}

export async function getAttendanceForDate(
  classId: number,
  date: string
): Promise<Map<number, AttendanceStatus>> {
  const rows = await db.attendance.where({ classId, date }).toArray();
  return new Map(rows.map((r) => [r.studentId, r.status]));
}

export async function deleteEntry(kind: EntryKind, id: number): Promise<void> {
  if (kind === 'attendance') await db.attendance.delete(id);
  if (kind === 'sticker') await db.stickers.delete(id);
  if (kind === 'note') await db.records.delete(id);
}

export async function updateAttendanceEntry(
  id: number,
  changes: Partial<{ status: AttendanceStatus; note: string; date: string }>
): Promise<void> {
  await db.attendance.update(id, changes);
}

export async function updateNoteEntry(
  id: number,
  changes: Partial<{ type: NoteType; content: string; date: string }>
): Promise<void> {
  await db.records.update(id, changes);
}

export interface EntryFilters {
  studentId?: number;
  kind?: EntryKind;
  date?: string;
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
    .filter((e) => filters.date === undefined || e.date === filters.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}
