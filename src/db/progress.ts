import { db } from './db';
import type { ProgressRecord } from './types';

export async function setProgress(
  classId: number,
  curriculumItemId: number,
  done: boolean,
  date?: string
): Promise<void> {
  const existing = await db.progress
    .where('[classId+curriculumItemId]')
    .equals([classId, curriculumItemId])
    .first();
  const resolvedDate = done ? (date || new Date().toISOString().slice(0, 10)) : null;
  if (existing) {
    await db.progress.update(existing.id!, { done, date: resolvedDate });
  } else {
    await db.progress.add({ classId, curriculumItemId, done, date: resolvedDate });
  }
}

export async function listProgress(classId: number): Promise<ProgressRecord[]> {
  return db.progress.where('classId').equals(classId).toArray();
}
