import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('AppDatabase', () => {
  it('opens with all expected tables', async () => {
    await db.open();
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      ['attendance', 'classes', 'curriculum', 'progress', 'records', 'stickers', 'students', 'timetableSettings'].sort()
    );
  });
});
