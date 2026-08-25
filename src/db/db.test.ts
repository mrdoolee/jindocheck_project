import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('AppDatabase', () => {
  it('opens with all expected tables', async () => {
    await db.open();
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'attendance',
        'classes',
        'classSubjects',
        'curriculum',
        'progress',
        'records',
        'stickers',
        'students',
        'subjects',
        'timetableSettings',
      ].sort()
    );
  });
});
