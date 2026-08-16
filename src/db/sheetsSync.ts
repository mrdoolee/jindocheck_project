import { db } from './db';
import { exportData } from './backup';
import { deleteClass } from './classes';
import { deleteStudent } from './students';
import { deleteCurriculumItem } from './curriculum';
import { deleteEntry } from './entries';
import { withDirtySuppressed } from './dirtyBus';
import type { Table } from 'dexie';

export const TABLE_NAMES = [
  'classes',
  'students',
  'curriculum',
  'progress',
  'attendance',
  'stickers',
  'records',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

type ColumnType = 'number' | 'nullable-number' | 'string' | 'nullable-string' | 'boolean';

interface TableSchema {
  columns: string[];
  types: Record<string, ColumnType>;
}

const SHEET_SCHEMA: Record<TableName, TableSchema> = {
  classes: {
    columns: ['id', 'name', 'createdAt', 'order', 'seatRows', 'seatCols', 'updatedAt'],
    types: {
      id: 'number',
      name: 'string',
      createdAt: 'string',
      order: 'number',
      seatRows: 'nullable-number',
      seatCols: 'nullable-number',
      updatedAt: 'string',
    },
  },
  students: {
    columns: ['id', 'classId', 'number', 'name', 'seatRow', 'seatCol', 'updatedAt'],
    types: {
      id: 'number',
      classId: 'number',
      number: 'number',
      name: 'string',
      seatRow: 'nullable-number',
      seatCol: 'nullable-number',
      updatedAt: 'string',
    },
  },
  curriculum: {
    columns: ['id', 'order', 'unit', 'lesson', 'updatedAt'],
    types: { id: 'number', order: 'number', unit: 'string', lesson: 'string', updatedAt: 'string' },
  },
  progress: {
    columns: ['id', 'classId', 'curriculumItemId', 'done', 'date', 'updatedAt'],
    types: {
      id: 'number',
      classId: 'number',
      curriculumItemId: 'number',
      done: 'boolean',
      date: 'nullable-string',
      updatedAt: 'string',
    },
  },
  attendance: {
    columns: ['id', 'classId', 'studentId', 'date', 'status', 'note', 'updatedAt'],
    types: {
      id: 'number',
      classId: 'number',
      studentId: 'number',
      date: 'string',
      status: 'string',
      note: 'string',
      updatedAt: 'string',
    },
  },
  stickers: {
    columns: ['id', 'classId', 'studentId', 'date', 'points', 'reason', 'updatedAt'],
    types: {
      id: 'number',
      classId: 'number',
      studentId: 'number',
      date: 'string',
      points: 'number',
      reason: 'string',
      updatedAt: 'string',
    },
  },
  records: {
    columns: ['id', 'classId', 'studentId', 'date', 'type', 'content', 'updatedAt'],
    types: {
      id: 'number',
      classId: 'number',
      studentId: 'number',
      date: 'string',
      type: 'string',
      content: 'string',
      updatedAt: 'string',
    },
  },
};

type AnyRecord = Record<string, unknown> & { id?: number; updatedAt?: string };

function coerceOut(value: unknown, type: ColumnType): unknown {
  if (type === 'nullable-number' || type === 'nullable-string') {
    return value === null || value === undefined ? '' : value;
  }
  return value ?? '';
}

function coerceIn(cell: unknown, type: ColumnType): unknown {
  switch (type) {
    case 'number':
      return typeof cell === 'number' ? cell : Number(cell);
    case 'nullable-number':
      return cell === '' || cell === null || cell === undefined ? null : Number(cell);
    case 'nullable-string':
      return cell === '' || cell === null || cell === undefined ? null : String(cell);
    case 'boolean':
      return cell === true || cell === 'TRUE' || cell === 1;
    case 'string':
    default:
      return cell === null || cell === undefined ? '' : String(cell);
  }
}

export function recordsToGrid(tableName: TableName, records: AnyRecord[]): unknown[][] {
  const { columns, types } = SHEET_SCHEMA[tableName];
  const rows = records.map((r) => columns.map((col) => coerceOut(r[col], types[col])));
  return [columns, ...rows];
}

export class SheetSchemaError extends Error {}

export function gridToRecords(tableName: TableName, grid: unknown[][]): AnyRecord[] {
  if (!grid || grid.length === 0) return [];
  const { columns, types } = SHEET_SCHEMA[tableName];
  const header = grid[0].map((c) => String(c));
  const expected = columns;
  const matches = header.length === expected.length && header.every((h, i) => h === expected[i]);
  if (!matches) {
    throw new SheetSchemaError(
      `"${tableName}" 탭의 헤더가 예상과 다릅니다. 예상: [${expected.join(', ')}], 실제: [${header.join(', ')}]`
    );
  }
  return grid.slice(1).map((row) => {
    const record: AnyRecord = {};
    columns.forEach((col, i) => {
      const cell = i < row.length ? row[i] : '';
      record[col] = coerceIn(cell, types[col]);
    });
    return record;
  });
}

const LAST_KNOWN_IDS_KEY = 'sheets-sync:last-known-ids:v1';

function getLastKnownIds(): Record<TableName, number[]> {
  try {
    const raw = localStorage.getItem(LAST_KNOWN_IDS_KEY);
    if (!raw) return {} as Record<TableName, number[]>;
    return JSON.parse(raw);
  } catch {
    return {} as Record<TableName, number[]>;
  }
}

function setLastKnownIds(all: Record<TableName, number[]>): void {
  localStorage.setItem(LAST_KNOWN_IDS_KEY, JSON.stringify(all));
}

const deleteHandlers: Record<TableName, (id: number) => Promise<void>> = {
  classes: (id) => deleteClass(id),
  students: (id) => deleteStudent(id),
  curriculum: (id) => deleteCurriculumItem(id),
  progress: (id) => db.progress.delete(id),
  attendance: (id) => deleteEntry('attendance', id),
  stickers: (id) => deleteEntry('sticker', id),
  records: (id) => deleteEntry('note', id),
};

function tableFor(name: TableName): Table<AnyRecord, number> {
  return db[name] as unknown as Table<AnyRecord, number>;
}

async function mergeTable(name: TableName, sheetRecords: AnyRecord[], lastKnownIds: number[]): Promise<void> {
  const table = tableFor(name);
  const localRecords = await table.toArray();
  const localById = new Map(localRecords.map((r) => [r.id, r]));
  const sheetIds = sheetRecords.filter((r) => r.id != null).map((r) => r.id as number);

  for (const sheetRec of sheetRecords) {
    if (sheetRec.id == null) {
      const { id: _unused, ...rest } = sheetRec;
      await table.add(rest as AnyRecord);
      continue;
    }
    const localRec = localById.get(sheetRec.id);
    if (!localRec) {
      // We've seen this id before (lastKnownIds) but it's gone locally now — that means
      // *this* device deleted it. Don't resurrect it from the sheet; let the push step
      // below drop it from the sheet instead. Only truly-new-to-us ids (never synced
      // before) get adopted here.
      const known = lastKnownIds.includes(sheetRec.id);
      if (!known) {
        await table.put(sheetRec, sheetRec.id);
      }
      continue;
    }
    const sheetUpdatedAt = sheetRec.updatedAt ?? '';
    const localUpdatedAt = localRec.updatedAt ?? '';
    if (sheetUpdatedAt > localUpdatedAt) {
      await table.put(sheetRec, sheetRec.id);
    }
  }

  const currentSheetIds = new Set(sheetIds);
  const deletedIds = lastKnownIds.filter((id) => !currentSheetIds.has(id) && localById.has(id));
  for (const id of deletedIds) {
    await deleteHandlers[name](id);
  }

}

const LAST_SYNCED_KEY = 'sheets-sync:last-synced-at';

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY);
}

export interface SyncResult {
  syncedAt: string;
}

async function fetchSheet(apiBase: string): Promise<Record<string, unknown[][]>> {
  const res = await fetch(`${apiBase}/api/sheet`, { credentials: 'include' });
  if (!res.ok) throw new Error(`동기화 서버 오류 (${res.status})`);
  const body = (await res.json()) as { tables: Record<string, unknown[][]> };
  return body.tables;
}

async function pushSheet(apiBase: string, tables: Record<string, unknown[][]>): Promise<void> {
  const res = await fetch(`${apiBase}/api/sheet`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tables }),
  });
  if (!res.ok) throw new Error(`동기화 서버 오류 (${res.status})`);
}

export async function syncTick(options: { apiBase?: string } = {}): Promise<SyncResult> {
  const apiBase = options.apiBase ?? '';
  const grids = await fetchSheet(apiBase);
  const lastKnownAll = getLastKnownIds();

  // Merge writes go through the same Dexie hooks as any user edit, which would otherwise
  // re-trigger the debounced sync-on-write listener right after this tick finishes.
  await withDirtySuppressed(async () => {
    for (const name of TABLE_NAMES) {
      const records = gridToRecords(name, grids[name] ?? []);
      await mergeTable(name, records, lastKnownAll[name] ?? []);
    }
  });

  const payload = await exportData();
  const tables: Record<string, unknown[][]> = {};
  // lastKnownIds must reflect what we're *about* to push (the post-merge local state),
  // not what the pull happened to see — otherwise a row pushed in this same tick looks
  // "never seen" on the next tick and a subsequent local delete of it gets resurrected
  // from the sheet before the sheet has caught up to the deletion.
  const newLastKnownAll: Partial<Record<TableName, number[]>> = {};
  for (const name of TABLE_NAMES) {
    const localRecords = payload.data[name] as AnyRecord[];
    newLastKnownAll[name] = localRecords.map((r) => r.id).filter((id): id is number => id != null);
    tables[name] = recordsToGrid(name, localRecords);
  }
  setLastKnownIds(newLastKnownAll as Record<TableName, number[]>);

  await pushSheet(apiBase, tables);

  const syncedAt = new Date().toISOString();
  localStorage.setItem(LAST_SYNCED_KEY, syncedAt);
  return { syncedAt };
}
