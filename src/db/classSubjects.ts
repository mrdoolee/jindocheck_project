import { db } from './db';

export async function listSubjectIdsForClass(classId: number): Promise<number[]> {
  const rows = await db.classSubjects.where('classId').equals(classId).toArray();
  return rows.map((r) => r.subjectId);
}

export async function setClassSubjects(classId: number, subjectIds: number[]): Promise<void> {
  await db.transaction('rw', db.classSubjects, async () => {
    await db.classSubjects.where('classId').equals(classId).delete();
    await Promise.all(subjectIds.map((subjectId) => db.classSubjects.add({ classId, subjectId })));
  });
}
