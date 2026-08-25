import Dexie, { type Table } from 'dexie';
import type {
  ClassRecord,
  StudentRecord,
  Subject,
  ClassSubject,
  CurriculumItem,
  ProgressRecord,
  AttendanceRecord,
  StickerRecord,
  NoteRecord,
  TimetableSettings,
  ManualTimetableEntry,
} from './types';
export class AppDatabase extends Dexie {
  classes!: Table<ClassRecord, number>;
  students!: Table<StudentRecord, number>;
  subjects!: Table<Subject, number>;
  classSubjects!: Table<ClassSubject, number>;
  curriculum!: Table<CurriculumItem, number>;
  progress!: Table<ProgressRecord, number>;
  attendance!: Table<AttendanceRecord, number>;
  stickers!: Table<StickerRecord, number>;
  records!: Table<NoteRecord, number>;
  timetableSettings!: Table<TimetableSettings, number>;
  timetableEntries!: Table<ManualTimetableEntry, number>;

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

    this.version(6)
      .stores({
        students: '++id, classId, number, order',
      })
      .upgrade(async (tx) => {
        // Default order = number, so the roster keeps showing in number order until a
        // teacher explicitly drags to customize it — see students.ts#addStudent/resetStudentOrder.
        const students = await tx.table('students').toArray();
        await Promise.all(students.map((s) => tx.table('students').update(s.id, { order: s.number })));
      });

    // Subjects (과목): a teacher can teach multiple subjects, and a class can be linked to
    // more than one (e.g. two subjects taught back-to-back to the same class). classSubjects
    // is the join table; curriculum items now belong to a subject instead of one single
    // global list shared by every class. Existing curriculum items/classes are migrated onto
    // one auto-created default subject so nothing looks empty right after the upgrade.
    this.version(7)
      .stores({
        subjects: '++id, order',
        classSubjects: '++id, classId, subjectId, [classId+subjectId]',
        curriculum: '++id, order, subjectId, [subjectId+order]',
      })
      .upgrade(async (tx) => {
        const curriculumItems = await tx.table('curriculum').toArray();
        const classes = await tx.table('classes').toArray();
        if (curriculumItems.length === 0 && classes.length === 0) return;
        const now = new Date().toISOString();
        const defaultSubjectId = await tx.table('subjects').add({ name: '과목1', order: 0, createdAt: now });
        await Promise.all(
          curriculumItems.map((item) => tx.table('curriculum').update(item.id, { subjectId: defaultSubjectId }))
        );
        await Promise.all(
          classes.map((c) => tx.table('classSubjects').add({ classId: c.id, subjectId: defaultSubjectId }))
        );
      });

    // Manual timetable entry (for teachers whose school doesn't use comci.net): one row per
    // (day, period) cell the teacher has filled in. Separate from timetableSettings — this is
    // real content worth backing up (local JSON backup + Google Sheets), unlike
    // timetableSettings' mode/schoolCode/periodCount, which stay device-local by design (see
    // the "시간표" section of CLAUDE.md).
    this.version(8).stores({
      timetableEntries: '++id, [day+period]',
    });

    // Auto-stamp updatedAt on every write, but never override a caller-supplied value —
    // the Sheets-sync import path (src/db/sheetsSync.ts) writes records with an explicit
    // updatedAt taken from the sheet, and that timestamp should reflect when the sheet row
    // was actually last edited, not the moment it happened to be imported.
    for (const table of [
      this.classes,
      this.students,
      this.subjects,
      this.classSubjects,
      this.curriculum,
      this.progress,
      this.attendance,
      this.stickers,
      this.records,
      this.timetableEntries,
    ]) {
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
