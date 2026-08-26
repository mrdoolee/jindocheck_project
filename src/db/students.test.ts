import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addStudent, listStudents, updateStudent, deleteStudent, updateSeat } from './students';

beforeEach(async () => {
  await db.students.clear();
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('students CRUD', () => {
  it('adds and lists students sorted by number', async () => {
    await addStudent(1, 3, '박영희');
    await addStudent(1, 1, '홍길동');
    const students = await listStudents(1);
    expect(students.map((s) => s.name)).toEqual(['홍길동', '박영희']);
  });

  it('updates a student name and number', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await updateStudent(id, { name: '홍길순' });
    const [student] = await listStudents(1);
    expect(student.name).toBe('홍길순');
  });

  it('deletes a student', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await deleteStudent(id);
    expect(await listStudents(1)).toHaveLength(0);
  });

  it('deletes the student\'s attendance, stickers, and records too, not just the roster row', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await db.attendance.add({ classId: 1, studentId: id, date: '2026-01-01', status: '출석', note: '' });
    await db.stickers.add({ classId: 1, studentId: id, date: '2026-01-01', points: 1, reason: '' });
    await db.records.add({ classId: 1, studentId: id, date: '2026-01-01', type: '기타', content: '' });

    await deleteStudent(id);

    expect(await db.attendance.where('studentId').equals(id).count()).toBe(0);
    expect(await db.stickers.where('studentId').equals(id).count()).toBe(0);
    expect(await db.records.where('studentId').equals(id).count()).toBe(0);
  });

  it('updates a student seat position', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await updateSeat(id, 2, 3);
    const [student] = await listStudents(1);
    expect(student.seatRow).toBe(2);
    expect(student.seatCol).toBe(3);
  });
});
