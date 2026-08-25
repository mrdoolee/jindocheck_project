import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { exportData, importData } from './backup';
import { createClass } from './classes';
import { addStudent } from './students';

beforeEach(async () => {
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
    db.timetableSettings.clear(),
  ]);
});

describe('backup', () => {
  it('round-trips all tables through export/import', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');

    const payload = await exportData();
    expect(payload.version).toBe(1);
    expect(payload.data.classes).toHaveLength(1);
    expect(payload.data.students).toHaveLength(1);

    await db.classes.clear();
    await db.students.clear();
    expect(await db.classes.count()).toBe(0);

    await importData(payload);

    const classes = await db.classes.toArray();
    const students = await db.students.toArray();
    expect(classes).toHaveLength(1);
    expect(classes[0].name).toBe('1반');
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe('홍길동');
  });

  it('round-trips subjects and classSubjects', async () => {
    const classId = await createClass('1반');
    const subjectId = await db.subjects.add({ name: '수학', order: 0, createdAt: new Date().toISOString() });
    await db.classSubjects.add({ classId, subjectId });

    const payload = await exportData();
    expect(payload.data.subjects).toHaveLength(1);
    expect(payload.data.classSubjects).toHaveLength(1);

    await db.subjects.clear();
    await db.classSubjects.clear();
    await importData(payload);

    expect(await db.subjects.toArray()).toHaveLength(1);
    expect(await db.classSubjects.toArray()).toHaveLength(1);
  });

  it('imports an older backup that predates subject support without throwing', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');
    const payload = await exportData();
    const { subjects: _s, classSubjects: _cs, ...dataWithoutSubjects } = payload.data;

    await expect(importData({ ...payload, data: dataWithoutSubjects })).resolves.not.toThrow();
    expect(await db.subjects.toArray()).toHaveLength(0);
    expect(await db.classSubjects.toArray()).toHaveLength(0);
  });

  it('round-trips manual timetable entries', async () => {
    await db.timetableEntries.add({ day: 0, period: 1, subject: '국어', note: '3-2' });

    const payload = await exportData();
    expect(payload.data.timetableEntries).toHaveLength(1);

    await db.timetableEntries.clear();
    await importData(payload);

    const entries = await db.timetableEntries.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].subject).toBe('국어');
  });

  it('imports an older backup that predates manual-timetable support without throwing', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');
    const payload = await exportData();
    const { timetableEntries: _te, ...dataWithoutTimetableEntries } = payload.data;

    await expect(importData({ ...payload, data: dataWithoutTimetableEntries })).resolves.not.toThrow();
    expect(await db.timetableEntries.toArray()).toHaveLength(0);
  });

  it('round-trips timetableSettings', async () => {
    await db.timetableSettings.put({ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });

    const payload = await exportData();
    expect(payload.data.timetableSettings).toHaveLength(1);

    await db.timetableSettings.clear();
    await importData(payload);

    const settings = await db.timetableSettings.toArray();
    expect(settings).toEqual([{ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' }]);
  });

  it('leaves timetableSettings untouched when the payload omits it (Sheets-import shape)', async () => {
    await db.timetableSettings.put({ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');

    const payload = await exportData();
    // sheetsSync.ts's importFromSheet() never sets this key at all — simulate that shape.
    const { timetableSettings: _omit, ...dataWithoutTimetable } = payload.data;
    await importData({ ...payload, data: dataWithoutTimetable });

    const settings = await db.timetableSettings.toArray();
    expect(settings).toEqual([{ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' }]);
  });

  it('rejects an unsupported version', async () => {
    await expect(
      importData({ version: 99 as 1, exportedAt: '', data: {
        classes: [], students: [], subjects: [], classSubjects: [], curriculum: [], progress: [], attendance: [], stickers: [], records: [],
      } })
    ).rejects.toThrow();
  });

  it('rolls back the transaction if bulkAdd fails partway through', async () => {
    // Step 1: Seed the database with baseline data
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');

    // Verify baseline exists
    let baselineClasses = await db.classes.toArray();
    expect(baselineClasses).toHaveLength(1);
    expect(baselineClasses[0].name).toBe('1반');

    // Step 2: Export and construct a malformed payload with duplicate class IDs
    const validPayload = await exportData();
    const classData = validPayload.data.classes as Array<{ id?: number; name: string; createdAt: string }>;

    // Create a malformed payload with duplicate IDs in the classes table
    // This will cause bulkAdd to fail when it tries to add the duplicate
    const firstClassId = classData[0].id;
    const malformedPayload = {
      ...validPayload,
      data: {
        ...validPayload.data,
        classes: [
          classData[0],
          { id: firstClassId, name: '2반', createdAt: new Date().toISOString() }, // duplicate ID
        ],
      },
    };

    // Step 3: Try to import the malformed payload - should fail
    await expect(importData(malformedPayload)).rejects.toThrow();

    // Step 4: Verify database is rolled back to original state
    const afterFailureClasses = await db.classes.toArray();
    expect(afterFailureClasses).toHaveLength(1);
    expect(afterFailureClasses[0].id).toBe(firstClassId);
    expect(afterFailureClasses[0].name).toBe('1반');

    const afterFailureStudents = await db.students.toArray();
    expect(afterFailureStudents).toHaveLength(1);
    expect(afterFailureStudents[0].name).toBe('홍길동');
  });
});
