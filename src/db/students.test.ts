import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addStudent, listStudents, updateStudent, deleteStudent, updateSeat } from './students';

beforeEach(async () => {
  await db.students.clear();
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

  it('updates a student seat position', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await updateSeat(id, 2, 3);
    const [student] = await listStudents(1);
    expect(student.seatRow).toBe(2);
    expect(student.seatCol).toBe(3);
  });
});
