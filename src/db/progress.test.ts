import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { setProgress, listProgress } from './progress';

beforeEach(async () => {
  await db.progress.clear();
});

describe('progress', () => {
  it('marks an item done and stamps today date', async () => {
    await setProgress(1, 10, true);
    const [record] = await listProgress(1);
    expect(record.done).toBe(true);
    expect(record.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('unmarking clears the date', async () => {
    await setProgress(1, 10, true);
    await setProgress(1, 10, false);
    const [record] = await listProgress(1);
    expect(record.done).toBe(false);
    expect(record.date).toBeNull();
  });

  it('does not create duplicate rows for the same class+item', async () => {
    await setProgress(1, 10, true);
    await setProgress(1, 10, false);
    const records = await listProgress(1);
    expect(records).toHaveLength(1);
  });

  it('keeps progress independent per class', async () => {
    await setProgress(1, 10, true);
    await setProgress(2, 10, false);
    expect(await listProgress(1)).toHaveLength(1);
    expect(await listProgress(2)).toHaveLength(1);
    expect((await listProgress(1))[0].done).toBe(true);
    expect((await listProgress(2))[0].done).toBe(false);
  });

  it('stamps an explicit date when provided instead of today', async () => {
    await setProgress(1, 10, true, '2026-01-15');
    const [record] = await listProgress(1);
    expect(record.done).toBe(true);
    expect(record.date).toBe('2026-01-15');
  });

  it('allows overriding the date of an already-done item', async () => {
    await setProgress(1, 10, true);
    await setProgress(1, 10, true, '2026-01-15');
    const [record] = await listProgress(1);
    expect(record.date).toBe('2026-01-15');
  });
});
