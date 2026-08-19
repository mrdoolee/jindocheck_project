import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './db';
import { recordsToGrid, gridToRecords, SheetSchemaError, exportToSheet, importFromSheet } from './sheetsSync';

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

describe('exportToSheet (local -> sheet, full overwrite)', () => {
  function stubFetch() {
    const pushed: { tables?: Record<string, unknown[][]> }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          pushed.push(JSON.parse(init.body as string));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        throw new Error(`unexpected request to ${url}`);
      })
    );
    return pushed;
  }

  it('pushes the full local state to the sheet, one grid per table', async () => {
    await db.classes.add({ name: '푸시테스트', createdAt: '2026-01-01', order: 0 });
    const pushed = stubFetch();

    await exportToSheet();

    expect(pushed).toHaveLength(1);
    const classesGrid = pushed[0].tables!.classes;
    expect(classesGrid[0]).toEqual(['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt']);
    expect(classesGrid.some((row) => row[1] === '푸시테스트')).toBe(true);
    // every table is included even when empty
    expect(pushed[0].tables!.students).toEqual([['id', 'classId', 'number', 'name', 'role', 'seatRow', 'seatCol', 'updatedAt']]);
  });

  it('does not touch local data', async () => {
    const id = await db.classes.add({ name: '로컬유지', createdAt: '2026-01-01', order: 0 });
    stubFetch();

    await exportToSheet();

    expect(await db.classes.get(id)).toBeTruthy();
  });

  it('propagates a server error instead of silently succeeding', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: '동기화 서버 오류' }), { status: 502 }))
    );
    await expect(exportToSheet()).rejects.toThrow();
  });
});

describe('importFromSheet (sheet -> local, full overwrite)', () => {
  function stubFetch(tables: Record<string, unknown[][]>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!init || init.method === undefined) {
          return new Response(JSON.stringify({ tables }), { status: 200 });
        }
        throw new Error(`unexpected request to ${url}`);
      })
    );
  }

  it('replaces local data entirely with the sheet contents', async () => {
    await db.classes.add({ name: '기존로컬데이터', createdAt: '2026-01-01', order: 0 });

    const sheetGrid = recordsToGrid('classes', [
      { id: 1, name: '시트데이터', createdAt: '2026-01-01', order: 0, seatRows: null, seatCols: null, updatedAt: 't1' },
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

    await importFromSheet();

    const all = await db.classes.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('시트데이터');
  });

  it('results in an empty local table when the sheet tab is empty', async () => {
    await db.classes.add({ name: '지워질데이터', createdAt: '2026-01-01', order: 0 });

    stubFetch({
      classes: [['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt']],
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });

    await importFromSheet();

    expect(await db.classes.toArray()).toHaveLength(0);
  });

  it('propagates SheetSchemaError when a tab header does not match the expected schema', async () => {
    stubFetch({
      classes: [['id', 'name']],
      students: [],
      curriculum: [],
      progress: [],
      attendance: [],
      stickers: [],
      records: [],
    });

    await expect(importFromSheet()).rejects.toThrow(SheetSchemaError);
  });
});
