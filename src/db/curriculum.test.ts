import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addCurriculumItem, listCurriculum, updateCurriculumItem, deleteCurriculumItem } from './curriculum';

beforeEach(async () => {
  await db.curriculum.clear();
});

describe('curriculum CRUD', () => {
  it('adds items preserving insertion order', async () => {
    await addCurriculumItem('1단원', '1차시');
    await addCurriculumItem('1단원', '2차시');
    const items = await listCurriculum();
    expect(items.map((i) => i.lesson)).toEqual(['1차시', '2차시']);
  });

  it('updates an item', async () => {
    const id = await addCurriculumItem('1단원', '1차시');
    await updateCurriculumItem(id, { lesson: '1차시(수정)' });
    const [item] = await listCurriculum();
    expect(item.lesson).toBe('1차시(수정)');
  });

  it('deletes an item', async () => {
    const id = await addCurriculumItem('1단원', '1차시');
    await deleteCurriculumItem(id);
    expect(await listCurriculum()).toHaveLength(0);
  });

  it('preserves insertion order after deleting non-tail items', async () => {
    const idA = await addCurriculumItem('1단원', '1차시');
    const idB = await addCurriculumItem('1단원', '2차시');
    const idC = await addCurriculumItem('1단원', '3차시');

    await deleteCurriculumItem(idA);
    await deleteCurriculumItem(idB);

    await addCurriculumItem('1단원', '4차시');
    const items = await listCurriculum();

    expect(items.map((i) => i.lesson)).toEqual(['3차시', '4차시']);
  });
});
