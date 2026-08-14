import { db } from './db';
import type { StudentRecord } from './types';

export async function addStudent(classId: number, number: number, name: string): Promise<number> {
  return db.students.add({ classId, number, name, seatRow: null, seatCol: null });
}

export async function listStudents(classId: number): Promise<StudentRecord[]> {
  return db.students.where('classId').equals(classId).sortBy('number');
}

export async function updateStudent(
  id: number,
  changes: Partial<Pick<StudentRecord, 'number' | 'name'>>
): Promise<void> {
  await db.students.update(id, changes);
}

export async function deleteStudent(id: number): Promise<void> {
  await db.students.delete(id);
}

export async function updateSeat(id: number, seatRow: number | null, seatCol: number | null): Promise<void> {
  await db.students.update(id, { seatRow, seatCol });
}
