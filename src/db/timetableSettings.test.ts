import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { getTimetableSettings, saveTimetableSettings } from './timetableSettings';

beforeEach(async () => {
  await db.timetableSettings.clear();
});

describe('timetableSettings', () => {
  it('returns undefined when nothing has been saved yet', async () => {
    expect(await getTimetableSettings()).toBeUndefined();
  });

  it('saves and reads back the settings', async () => {
    await saveTimetableSettings({ schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    expect(await getTimetableSettings()).toEqual({
      id: 1,
      schoolCode: '39286',
      teacherIndex: 1,
      teacherName: '김민수',
    });
  });

  it('overwrites the previous settings on a second save (single-row table)', async () => {
    await saveTimetableSettings({ schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    await saveTimetableSettings({ schoolCode: '10101', teacherIndex: 3, teacherName: '이영희' });

    const all = await db.timetableSettings.toArray();
    expect(all).toHaveLength(1);
    expect(await getTimetableSettings()).toEqual({
      id: 1,
      schoolCode: '10101',
      teacherIndex: 3,
      teacherName: '이영희',
    });
  });
});
