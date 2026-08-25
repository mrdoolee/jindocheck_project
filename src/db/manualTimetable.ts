import { db } from './db';
import type { ManualTimetableEntry } from './types';

export async function listManualTimetable(): Promise<ManualTimetableEntry[]> {
  return db.timetableEntries.toArray();
}

export async function setManualTimetableCell(
  day: number,
  period: number,
  subject: string,
  note: string
): Promise<void> {
  const trimmedSubject = subject.trim();
  const trimmedNote = note.trim();
  const existing = await db.timetableEntries.where('[day+period]').equals([day, period]).first();

  if (!trimmedSubject && !trimmedNote) {
    if (existing) await db.timetableEntries.delete(existing.id!);
    return;
  }

  if (existing) {
    await db.timetableEntries.update(existing.id!, { subject: trimmedSubject, note: trimmedNote });
  } else {
    await db.timetableEntries.add({ day, period, subject: trimmedSubject, note: trimmedNote });
  }
}
