import Dexie, { type Table } from 'dexie';
import type {
  ClassRecord,
  StudentRecord,
  CurriculumItem,
  ProgressRecord,
  AttendanceRecord,
  StickerRecord,
  NoteRecord,
  TimetableSettings,
} from './types';
export class AppDatabase extends Dexie {
  classes!: Table<ClassRecord, number>;
  students!: Table<StudentRecord, number>;
  curriculum!: Table<CurriculumItem, number>;
  progress!: Table<ProgressRecord, number>;
  attendance!: Table<AttendanceRecord, number>;
  stickers!: Table<StickerRecord, number>;
  records!: Table<NoteRecord, number>;
  timetableSettings!: Table<TimetableSettings, number>;

  constructor() {
    super('classroom-tracker');
    this.version(1).stores({
      classes: '++id, name',
      students: '++id, classId, number',
      curriculum: '++id, order',
      progress: '++id, classId, curriculumItemId, [classId+curriculumItemId]',
      attendance: '++id, classId, studentId, date',
      stickers: '++id, classId, studentId, date',
      records: '++id, classId, studentId, date',
    });

    this.version(2)
      .stores({
        classes: '++id, name, order',
      })
      .upgrade(async (tx) => {
        const classes = await tx.table('classes').orderBy('name').toArray();
        await Promise.all(classes.map((c, index) => tx.table('classes').update(c.id, { order: index })));
      });

    this.version(3).stores({
      attendance: '++id, classId, studentId, date, [classId+date], [classId+studentId+date]',
    });

    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        const now = new Date().toISOString();
        const tables = ['classes', 'students', 'curriculum', 'progress', 'attendance', 'stickers', 'records'];
        for (const name of tables) {
          const rows = await tx.table(name).toArray();
          await Promise.all(rows.map((r) => tx.table(name).update(r.id, { updatedAt: now })));
        }
      });

    this.version(5).stores({
      timetableSettings: 'id',
    });

    // Auto-stamp updatedAt on every write, but never override a caller-supplied value —
    // the Sheets-sync import path (src/db/sheetsSync.ts) writes records with an explicit
    // updatedAt taken from the sheet, and that timestamp should reflect when the sheet row
    // was actually last edited, not the moment it happened to be imported.
    for (const table of [this.classes, this.students, this.curriculum, this.progress, this.attendance, this.stickers, this.records]) {
      table.hook('creating', function (_primKey, obj) {
        const record = obj as { updatedAt?: string };
        if (!record.updatedAt) record.updatedAt = new Date().toISOString();
      });
      table.hook('updating', function (modifications) {
        if ((modifications as { updatedAt?: string }).updatedAt) return {};
        return { updatedAt: new Date().toISOString() };
      });
    }
  }
}

export const db = new AppDatabase();
