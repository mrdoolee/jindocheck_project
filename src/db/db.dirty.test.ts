import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./dirtyBus', () => ({
  notifyDirty: vi.fn(),
  withDirtySuppressed: (fn: () => Promise<unknown>) => fn(),
}));

import { db } from './db';
import { notifyDirty } from './dirtyBus';

beforeEach(async () => {
  await db.classes.clear();
  vi.mocked(notifyDirty).mockClear();
});

describe('db.ts write hooks notify the dirty bus', () => {
  it('notifies on add()', async () => {
    await db.classes.add({ name: '1반', createdAt: '2026-01-01', order: 0 });
    expect(notifyDirty).toHaveBeenCalled();
  });

  it('notifies on update()', async () => {
    const id = await db.classes.add({ name: '1반', createdAt: '2026-01-01', order: 0 });
    vi.mocked(notifyDirty).mockClear();
    await db.classes.update(id, { name: '1반(수정)' });
    expect(notifyDirty).toHaveBeenCalled();
  });

  it('notifies on delete()', async () => {
    const id = await db.classes.add({ name: '1반', createdAt: '2026-01-01', order: 0 });
    vi.mocked(notifyDirty).mockClear();
    await db.classes.delete(id);
    expect(notifyDirty).toHaveBeenCalled();
  });
});
