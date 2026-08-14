import Dexie, { type Table } from 'dexie';
import type {
  ClassRecord,
  StudentRecord,
  CurriculumItem,
  ProgressRecord,
  AttendanceRecord,
  StickerRecord,
  NoteRecord,
} from './types';

export class AppDatabase extends Dexie {
  classes!: Table<ClassRecord, number>;
  students!: Table<StudentRecord, number>;
  curriculum!: Table<CurriculumItem, number>;
  progress!: Table<ProgressRecord, number>;
  attendance!: Table<AttendanceRecord, number>;
  stickers!: Table<StickerRecord, number>;
  records!: Table<NoteRecord, number>;

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
  }
}

export const db = new AppDatabase();
