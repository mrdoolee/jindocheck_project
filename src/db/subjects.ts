import { db } from './db';
import type { Subject } from './types';

export async function createSubject(name: string): Promise<number> {
  const count = await db.subjects.count();
  return db.subjects.add({ name, order: count, createdAt: new Date().toISOString() });
}

export async function listSubjects(): Promise<Subject[]> {
  return db.subjects.orderBy('order').toArray();
}

export async function renameSubject(id: number, name: string): Promise<void> {
  await db.subjects.update(id, { name });
}

export async function reorderSubjects(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.subjects, async () => {
    await Promise.all(orderedIds.map((id, index) => db.subjects.update(id, { order: index })));
  });
}

export async function deleteSubject(id: number): Promise<void> {
  await db.transaction('rw', db.subjects, db.classSubjects, db.curriculum, db.progress, async () => {
    const items = await db.curriculum.where('subjectId').equals(id).toArray();
    const itemIds = items.map((item) => item.id!);
    await db.subjects.delete(id);
    await db.classSubjects.where('subjectId').equals(id).delete();
    await db.curriculum.where('subjectId').equals(id).delete();
    if (itemIds.length > 0) {
      await db.progress.where('curriculumItemId').anyOf(itemIds).delete();
    }
  });
}
