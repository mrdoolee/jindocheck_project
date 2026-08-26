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

// Commits a single field (subject or note) by reading the row's current state fresh from the
// DB rather than trusting a value the caller captured earlier — the subject/note inputs for one
// cell commit independently on their own onBlur, and if both are edited in quick succession
// (type subject, Tab, type note, blur) a caller-supplied "current" value for the other field
// would be stale, silently reverting whichever field committed first. Deletes the row once both
// fields end up blank, same as setManualTimetableCell.
export async function setManualTimetableField(
  day: number,
  period: number,
  field: 'subject' | 'note',
  value: string
): Promise<void> {
  const trimmed = value.trim();
  const existing = await db.timetableEntries.where('[day+period]').equals([day, period]).first();

  if (!existing) {
    if (!trimmed) return;
    await db.timetableEntries.add({
      day,
      period,
      subject: field === 'subject' ? trimmed : '',
      note: field === 'note' ? trimmed : '',
    });
    return;
  }

  const next = { ...existing, [field]: trimmed };
  if (!next.subject && !next.note) {
    await db.timetableEntries.delete(existing.id!);
  } else {
    await db.timetableEntries.update(existing.id!, { [field]: trimmed });
  }
}
