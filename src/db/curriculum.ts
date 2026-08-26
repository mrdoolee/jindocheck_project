import { db } from './db';
import type { CurriculumItem } from './types';

export async function addCurriculumItem(subjectId: number, unit: string, lesson: string): Promise<number> {
  const items = await db.curriculum.where('subjectId').equals(subjectId).toArray();
  const order = items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;
  return db.curriculum.add({ subjectId, order, unit, lesson });
}

export async function listCurriculum(subjectId: number): Promise<CurriculumItem[]> {
  return db.curriculum.where('subjectId').equals(subjectId).sortBy('order');
}

export async function updateCurriculumItem(
  id: number,
  changes: Partial<Pick<CurriculumItem, 'unit' | 'lesson'>>
): Promise<void> {
  await db.curriculum.update(id, changes);
}

export async function deleteCurriculumItem(id: number): Promise<void> {
  await db.transaction('rw', db.curriculum, db.progress, async () => {
    await db.curriculum.delete(id);
    await db.progress.where('curriculumItemId').equals(id).delete();
  });
}

export async function reorderCurriculumItems(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.curriculum, async () => {
    await Promise.all(orderedIds.map((id, index) => db.curriculum.update(id, { order: index })));
  });
}
