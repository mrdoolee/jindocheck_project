import { db } from './db';
import type { ProgressRecord } from './types';

export async function setProgress(classId: number, curriculumItemId: number, done: boolean): Promise<void> {
  const existing = await db.progress
    .where('[classId+curriculumItemId]')
    .equals([classId, curriculumItemId])
    .first();
  const date = done ? new Date().toISOString().slice(0, 10) : null;
  if (existing) {
    await db.progress.update(existing.id!, { done, date });
  } else {
    await db.progress.add({ classId, curriculumItemId, done, date });
  }
}

export async function listProgress(classId: number): Promise<ProgressRecord[]> {
  return db.progress.where('classId').equals(classId).toArray();
}
