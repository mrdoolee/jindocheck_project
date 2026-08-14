import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { createClass, listClasses, renameClass, deleteClass } from './classes';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
  await db.progress.clear();
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('classes CRUD', () => {
  it('creates and lists classes sorted by name', async () => {
    await createClass('2반');
    await createClass('1반');
    const classes = await listClasses();
    expect(classes.map((c) => c.name)).toEqual(['1반', '2반']);
  });

  it('renames a class', async () => {
    const id = await createClass('1반');
    await renameClass(id, '1반(변경)');
    const classes = await listClasses();
    expect(classes[0].name).toBe('1반(변경)');
  });

  it('deletes a class and its related data', async () => {
    const id = await createClass('1반');
    const studentId = await db.students.add({ classId: id, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.attendance.add({ classId: id, studentId, date: '2026-08-14', status: '출석', note: '' });
    const curriculumItemId = await db.curriculum.add({ order: 1, unit: 'Unit 1', lesson: 'Lesson 1' });
    await db.progress.add({ classId: id, curriculumItemId, done: false, date: null });
    await db.stickers.add({ classId: id, studentId, date: '2026-08-14', points: 10, reason: 'Good behavior' });
    await db.records.add({ classId: id, studentId, date: '2026-08-14', type: '특이사항', content: 'Test note' });
    await deleteClass(id);
    expect(await listClasses()).toHaveLength(0);
    expect(await db.students.where('classId').equals(id).count()).toBe(0);
    expect(await db.attendance.where('classId').equals(id).count()).toBe(0);
    expect(await db.progress.where('classId').equals(id).count()).toBe(0);
    expect(await db.stickers.where('classId').equals(id).count()).toBe(0);
    expect(await db.records.where('classId').equals(id).count()).toBe(0);
  });
});
