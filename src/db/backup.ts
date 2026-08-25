import { db } from './db';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  data: {
    classes: unknown[];
    students: unknown[];
    // Optional for the same reason as timetableSettings below: older backups (exported
    // before subject/manual-timetable support existed) won't have these keys at all.
    subjects?: unknown[];
    classSubjects?: unknown[];
    curriculum: unknown[];
    progress: unknown[];
    attendance: unknown[];
    stickers: unknown[];
    records: unknown[];
    timetableEntries?: unknown[];
    // Optional: a device-local preference (which school/teacher this device cares about,
    // comci vs manual mode, manual grid's period count), not classroom data. sheetsSync.ts's
    // importFromSheet() builds a payload that never sets this key at all (it's deliberately
    // excluded from TABLE_NAMES) — importData() must leave this table untouched in that case,
    // not wipe it, so "불러오기" from Sheets doesn't reset a setting that has nothing to do
    // with Sheets sync.
    timetableSettings?: unknown[];
  };
}

export async function exportData(): Promise<BackupPayload> {
  const [
    classes,
    students,
    subjects,
    classSubjects,
    curriculum,
    progress,
    attendance,
    stickers,
    records,
    timetableEntries,
    timetableSettings,
  ] = await Promise.all([
    db.classes.toArray(),
    db.students.toArray(),
    db.subjects.toArray(),
    db.classSubjects.toArray(),
    db.curriculum.toArray(),
    db.progress.toArray(),
    db.attendance.toArray(),
    db.stickers.toArray(),
    db.records.toArray(),
    db.timetableEntries.toArray(),
    db.timetableSettings.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      classes,
      students,
      subjects,
      classSubjects,
      curriculum,
      progress,
      attendance,
      stickers,
      records,
      timetableEntries,
      timetableSettings,
    },
  };
}

export async function importData(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error(`지원하지 않는 백업 버전입니다: ${payload.version}`);
  }
  const hasTimetableSettings = payload.data.timetableSettings !== undefined;
  await db.transaction(
    'rw',
    [
      db.classes,
      db.students,
      db.subjects,
      db.classSubjects,
      db.curriculum,
      db.progress,
      db.attendance,
      db.stickers,
      db.records,
      db.timetableEntries,
      db.timetableSettings,
    ],
    async () => {
      await Promise.all([
        db.classes.clear(),
        db.students.clear(),
        db.subjects.clear(),
        db.classSubjects.clear(),
        db.curriculum.clear(),
        db.progress.clear(),
        db.attendance.clear(),
        db.stickers.clear(),
        db.records.clear(),
        db.timetableEntries.clear(),
        hasTimetableSettings ? db.timetableSettings.clear() : Promise.resolve(),
      ]);
      await Promise.all([
        db.classes.bulkAdd(payload.data.classes as never[]),
        db.students.bulkAdd(payload.data.students as never[]),
        // older backups (from before subject/manual-timetable support) won't have these keys
        db.subjects.bulkAdd((payload.data.subjects ?? []) as never[]),
        db.classSubjects.bulkAdd((payload.data.classSubjects ?? []) as never[]),
        db.curriculum.bulkAdd(payload.data.curriculum as never[]),
        db.progress.bulkAdd(payload.data.progress as never[]),
        db.attendance.bulkAdd(payload.data.attendance as never[]),
        db.stickers.bulkAdd(payload.data.stickers as never[]),
        db.records.bulkAdd(payload.data.records as never[]),
        db.timetableEntries.bulkAdd((payload.data.timetableEntries ?? []) as never[]),
        hasTimetableSettings ? db.timetableSettings.bulkAdd(payload.data.timetableSettings as never[]) : Promise.resolve(),
      ]);
    }
  );
}
