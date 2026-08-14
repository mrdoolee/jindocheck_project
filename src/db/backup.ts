import { db } from './db';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  data: {
    classes: unknown[];
    students: unknown[];
    curriculum: unknown[];
    progress: unknown[];
    attendance: unknown[];
    stickers: unknown[];
    records: unknown[];
  };
}

export async function exportData(): Promise<BackupPayload> {
  const [classes, students, curriculum, progress, attendance, stickers, records] = await Promise.all([
    db.classes.toArray(),
    db.students.toArray(),
    db.curriculum.toArray(),
    db.progress.toArray(),
    db.attendance.toArray(),
    db.stickers.toArray(),
    db.records.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { classes, students, curriculum, progress, attendance, stickers, records },
  };
}

export async function importData(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error(`지원하지 않는 백업 버전입니다: ${payload.version}`);
  }
  await db.transaction(
    'rw',
    [db.classes, db.students, db.curriculum, db.progress, db.attendance, db.stickers, db.records],
    async () => {
      await Promise.all([
        db.classes.clear(),
        db.students.clear(),
        db.curriculum.clear(),
        db.progress.clear(),
        db.attendance.clear(),
        db.stickers.clear(),
        db.records.clear(),
      ]);
      await Promise.all([
        db.classes.bulkAdd(payload.data.classes as never[]),
        db.students.bulkAdd(payload.data.students as never[]),
        db.curriculum.bulkAdd(payload.data.curriculum as never[]),
        db.progress.bulkAdd(payload.data.progress as never[]),
        db.attendance.bulkAdd(payload.data.attendance as never[]),
        db.stickers.bulkAdd(payload.data.stickers as never[]),
        db.records.bulkAdd(payload.data.records as never[]),
      ]);
    }
  );
}
