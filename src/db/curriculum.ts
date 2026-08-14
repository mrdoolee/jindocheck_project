import { db } from './db';
import type { CurriculumItem } from './types';

export async function addCurriculumItem(unit: string, lesson: string): Promise<number> {
  const count = await db.curriculum.count();
  return db.curriculum.add({ order: count, unit, lesson });
}

export async function listCurriculum(): Promise<CurriculumItem[]> {
  return db.curriculum.orderBy('order').toArray();
}

export async function updateCurriculumItem(
  id: number,
  changes: Partial<Pick<CurriculumItem, 'unit' | 'lesson'>>
): Promise<void> {
  await db.curriculum.update(id, changes);
}

export async function deleteCurriculumItem(id: number): Promise<void> {
  await db.curriculum.delete(id);
}
