import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { exportData, importData } from './backup';
import { createClass } from './classes';
import { addStudent } from './students';

beforeEach(async () => {
  await Promise.all([
    db.classes.clear(),
    db.students.clear(),
    db.curriculum.clear(),
    db.progress.clear(),
    db.attendance.clear(),
    db.stickers.clear(),
    db.records.clear(),
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

  it('rejects an unsupported version', async () => {
    await expect(
      importData({ version: 99 as 1, exportedAt: '', data: {
        classes: [], students: [], curriculum: [], progress: [], attendance: [], stickers: [], records: [],
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
