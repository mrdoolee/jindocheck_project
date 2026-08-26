import { db } from './db';
import type { StudentRecord } from './types';

export async function addStudent(classId: number, number: number, name: string): Promise<number> {
  // order defaults to number, so a freshly-added roster keeps showing in number order until
  // a teacher explicitly drags to customize it — see resetStudentOrder() for the same rule.
  return db.students.add({ classId, number, name, seatRow: null, seatCol: null, order: number });
}

export async function listStudents(classId: number): Promise<StudentRecord[]> {
  return db.students.where('classId').equals(classId).sortBy('order');
}

export async function reorderStudents(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.students, async () => {
    await Promise.all(orderedIds.map((id, index) => db.students.update(id, { order: index })));
  });
}

export async function resetStudentOrder(classId: number): Promise<void> {
  const students = await db.students.where('classId').equals(classId).toArray();
  await db.transaction('rw', db.students, async () => {
    await Promise.all(students.map((s) => db.students.update(s.id!, { order: s.number })));
  });
}

export async function updateStudent(
  id: number,
  changes: Partial<Pick<StudentRecord, 'number' | 'name' | 'role'>>
): Promise<void> {
  await db.students.update(id, changes);
}

export async function deleteStudent(id: number): Promise<void> {
  await db.transaction('rw', db.students, db.attendance, db.stickers, db.records, async () => {
    await db.students.delete(id);
    await db.attendance.where('studentId').equals(id).delete();
    await db.stickers.where('studentId').equals(id).delete();
    await db.records.where('studentId').equals(id).delete();
  });
}

export async function updateSeat(id: number, seatRow: number | null, seatCol: number | null): Promise<void> {
  await db.students.update(id, { seatRow, seatCol });
}

export async function clearSeating(classId: number): Promise<void> {
  const students = await db.students.where('classId').equals(classId).toArray();
  await db.transaction('rw', db.students, async () => {
    await Promise.all(students.map((s) => db.students.update(s.id!, { seatRow: null, seatCol: null })));
  });
}
