import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './db';
import { recordsToGrid, gridToRecords, SheetSchemaError, syncTick } from './sheetsSync';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
  await db.curriculum.clear();
  await db.progress.clear();
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
  localStorage.clear();
});

describe('put() honors an explicit updatedAt (does not get clobbered by the auto-stamp hook)', () => {
  it('keeps the caller-supplied updatedAt when put()-ing an existing row', async () => {
    const id = await db.classes.add({ name: '1반', createdAt: '2026-01-01', order: 0 });
    const old = await db.classes.get(id);
    expect(old?.updatedAt).toBeTruthy();

    const pastTimestamp = '2020-01-01T00:00:00.000Z';
    await db.classes.put({ ...old!, name: '1반(수정)', updatedAt: pastTimestamp }, id);

    const after = await db.classes.get(id);
    expect(after?.updatedAt).toBe(pastTimestamp);
    expect(after?.name).toBe('1반(수정)');
  });

  it('keeps the caller-supplied updatedAt when put()-ing a brand new row (id not present locally)', async () => {
    const pastTimestamp = '2020-01-01T00:00:00.000Z';
    await db.classes.put({ id: 999, name: '새 반', createdAt: '2026-01-01', order: 0, updatedAt: pastTimestamp }, 999);

    const row = await db.classes.get(999);
    expect(row?.updatedAt).toBe(pastTimestamp);
  });

  it('still auto-stamps updatedAt on normal add()/update() calls that do not pass one', async () => {
    const before = Date.now();
    const id = await db.classes.add({ name: '2반', createdAt: '2026-01-01', order: 1 });
    const row = await db.classes.get(id);
    expect(new Date(row!.updatedAt!).getTime()).toBeGreaterThanOrEqual(before);

    await db.classes.update(id, { name: '2반(변경)' });
    const row2 = await db.classes.get(id);
    expect(row2?.updatedAt).not.toBe(row?.updatedAt);
  });
});

describe('recordsToGrid / gridToRecords round-trip', () => {
  it('round-trips a class record including nullable numbers', () => {
    const grid = recordsToGrid('classes', [
      { id: 1, name: '1반', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: undefined, updatedAt: 't1' },
    ]);
    expect(grid[0]).toEqual(['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt']);

    const records = gridToRecords('classes', grid);
    expect(records).toEqual([
      { id: 1, name: '1반', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: null, updatedAt: 't1' },
    ]);
  });

  it('round-trips a progress record including boolean + nullable date', () => {
    const grid = recordsToGrid('progress', [
      { id: 5, classId: 1, curriculumItemId: 2, done: true, date: '2026-01-15', updatedAt: 't1' },
      { id: 6, classId: 1, curriculumItemId: 3, done: false, date: null, updatedAt: 't2' },
    ]);
    const records = gridToRecords('progress', grid);
    expect(records[0]).toEqual({ id: 5, classId: 1, curriculumItemId: 2, done: true, date: '2026-01-15', updatedAt: 't1' });
    expect(records[1]).toEqual({ id: 6, classId: 1, curriculumItemId: 3, done: false, date: null, updatedAt: 't2' });
  });

  it('treats an empty grid as no records, not an error', () => {
    expect(gridToRecords('classes', [])).toEqual([]);
  });

  it('throws SheetSchemaError when the header row does not match', () => {
    expect(() => gridToRecords('classes', [['id', 'name']])).toThrow(SheetSchemaError);
  });

  it('pads short rows (trailing blank cells Sheets omits) out to the full column count', () => {
    // 'note' column omitted entirely on this row, as Sheets does for trailing empty cells
    const records = gridToRecords('attendance', [
      ['id', 'classId', 'studentId', 'date', 'status', 'note', 'updatedAt'],
      [1, 1, 1, '2026-01-01', '출석'],
    ]);
    expect(records[0]).toEqual({
      id: 1,
      classId: 1,
      studentId: 1,
      date: '2026-01-01',
      status: '출석',
      note: '',
      updatedAt: '',
    });
  });
});

describe('syncTick', () => {
  function stubFetch(getTables: Record<string, unknown[][]>) {
    const pushed: { tables?: Record<string, unknown[][]> }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!init || init.method === undefined) {
          return new Response(JSON.stringify({ tables: getTables }), { status: 200 });
        }
        if (init.method === 'POST') {
          pushed.push(JSON.parse(init.body as string));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        throw new Error(`unexpected request to ${url}`);
      })
    );
    return pushed;
  }

  it('pulls a newer sheet-side record and applies it locally (LWW: sheet wins)', async () => {
    const id = await db.classes.add({ name: '원래이름', createdAt: '2026-01-01', order: 0 });
    await db.classes.update(id, { updatedAt: '2020-01-01T00:00:00.000Z' });

    const sheetGrid = recordsToGrid('classes', [
      { id, name: '시트에서바뀜', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: null, updatedAt: '2030-01-01T00:00:00.000Z' },
    ]);
    stubFetch({
      classes: sheetGrid,
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });

    await syncTick();

    const after = await db.classes.get(id);
    expect(after?.name).toBe('시트에서바뀜');
  });

  it('keeps the local record when it is newer than the sheet (LWW: local wins)', async () => {
    const id = await db.classes.add({ name: '로컬최신', createdAt: '2026-01-01', order: 0 });

    const sheetGrid = recordsToGrid('classes', [
      { id, name: '시트구버전', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: null, updatedAt: '2020-01-01T00:00:00.000Z' },
    ]);
    stubFetch({
      classes: sheetGrid,
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });

    await syncTick();

    const after = await db.classes.get(id);
    expect(after?.name).toBe('로컬최신');
  });

  it('creates a locally-missing row that has a blank id in the sheet', async () => {
    const sheetGrid = [
      ['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt'],
      ['', '시트에서추가', '2026-01-01', 0, '', '', '2026-01-01T00:00:00.000Z'],
    ];
    stubFetch({
      classes: sheetGrid,
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });

    await syncTick();

    const all = await db.classes.toArray();
    expect(all.some((c) => c.name === '시트에서추가')).toBe(true);
  });

  it('deletes a local row when it disappears from the sheet after being seen once', async () => {
    const id = await db.classes.add({ name: '지워질반', createdAt: '2026-01-01', order: 0 });

    // First tick: sheet has the row, establishes lastKnownIds
    const firstGrid = recordsToGrid('classes', [
      { id, name: '지워질반', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: null, updatedAt: '2020-01-01T00:00:00.000Z' },
    ]);
    stubFetch({
      classes: firstGrid,
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });
    await syncTick();
    expect(await db.classes.get(id)).toBeTruthy();

    // Second tick: sheet no longer has the row -> should be deleted locally
    stubFetch({
      classes: [['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt']],
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });
    await syncTick();

    expect(await db.classes.get(id)).toBeUndefined();
  });

  it('does not delete a row that was never seen in the sheet yet (not-yet-pushed, not a deletion)', async () => {
    const id = await db.classes.add({ name: '아직안올라감', createdAt: '2026-01-01', order: 0 });

    stubFetch({
      classes: [['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt']],
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });
    await syncTick();

    expect(await db.classes.get(id)).toBeTruthy();
  });

  it('does not resurrect a row this device deleted, even if the sheet has not caught up to the deletion yet', async () => {
    const id = await db.classes.add({ name: '삭제될반', createdAt: '2026-01-01', order: 0 });

    // Simulate a prior successful sync that saw this id (so it's in lastKnownIds).
    localStorage.setItem('sheets-sync:last-known-ids:v1', JSON.stringify({ classes: [id] }));

    // The user deletes it locally, but the sheet (pulled this same tick) still has the old row —
    // the sheet hasn't been pushed to since the deletion happened.
    await db.classes.delete(id);

    const staleSheetGrid = recordsToGrid('classes', [
      { id, name: '삭제될반', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: null, updatedAt: '2020-01-01T00:00:00.000Z' },
    ]);
    const pushed = stubFetch({
      classes: staleSheetGrid,
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });

    await syncTick();

    expect(await db.classes.get(id)).toBeUndefined();
    const pushedClasses = pushed[0].tables!.classes;
    expect(pushedClasses.some((row) => row[0] === id)).toBe(false);
  });

  it('does not resurrect a row deleted right after the tick that first pushed it (real two-tick sequence)', async () => {
    // Tick 1: sheet starts empty, local has a new class -> gets pushed for the first time.
    const id = await db.classes.add({ name: '삭제될반', createdAt: '2026-01-01', order: 0 });
    const pushedTick1 = stubFetch({
      classes: [],
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });
    await syncTick();
    const sheetAfterTick1 = pushedTick1[0].tables!.classes;

    // Tick 2: the user deletes the class locally. The "sheet", as this device pulls it,
    // still reflects exactly what tick 1 pushed (nothing has changed it since).
    await db.classes.delete(id);
    const pushedTick2 = stubFetch({
      classes: sheetAfterTick1,
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });
    await syncTick();

    expect(await db.classes.get(id)).toBeUndefined();
    const sheetAfterTick2 = pushedTick2[0].tables!.classes;
    expect(sheetAfterTick2.some((row) => row[0] === id)).toBe(false);
  });

  it('pushes the merged local state back to the sheet', async () => {
    await db.classes.add({ name: '푸시테스트', createdAt: '2026-01-01', order: 0 });

    const pushed = stubFetch({
      classes: [],
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });
    await syncTick();

    expect(pushed).toHaveLength(1);
    const classesGrid = pushed[0].tables!.classes;
    expect(classesGrid[0]).toEqual(['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt']);
    expect(classesGrid.some((row) => row[1] === '푸시테스트')).toBe(true);
  });
});
