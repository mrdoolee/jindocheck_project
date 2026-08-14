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
});
