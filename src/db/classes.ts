import { db } from './db';
import type { ClassRecord } from './types';

export async function createClass(name: string): Promise<number> {
  const count = await db.classes.count();
  return db.classes.add({ name, createdAt: new Date().toISOString(), order: count });
}

export async function listClasses(): Promise<ClassRecord[]> {
  return db.classes.orderBy('order').toArray();
}

export async function renameClass(id: number, name: string): Promise<void> {
  await db.classes.update(id, { name });
}

export async function reorderClasses(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.classes, async () => {
    await Promise.all(orderedIds.map((id, index) => db.classes.update(id, { order: index })));
  });
}

export async function deleteClass(id: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.classes, db.students, db.progress, db.attendance, db.stickers, db.records],
    async () => {
      await db.classes.delete(id);
      await db.students.where('classId').equals(id).delete();
      await db.progress.where('classId').equals(id).delete();
      await db.attendance.where('classId').equals(id).delete();
      await db.stickers.where('classId').equals(id).delete();
      await db.records.where('classId').equals(id).delete();
    }
  );
}
