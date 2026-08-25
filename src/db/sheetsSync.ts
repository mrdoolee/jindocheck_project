import { exportData, importData, type BackupPayload } from './backup';

export const TABLE_NAMES = [
  'classes',
  'students',
  'subjects',
  'classSubjects',
  'curriculum',
  'progress',
  'attendance',
  'stickers',
  'records',
  'timetableEntries',
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
    columns: ['id', 'classId', 'number', 'name', 'role', 'seatRow', 'seatCol', 'updatedAt'],
    types: {
      id: 'number',
      classId: 'number',
      number: 'number',
      name: 'string',
      role: 'nullable-string',
      seatRow: 'nullable-number',
      seatCol: 'nullable-number',
      updatedAt: 'string',
    },
  },
  subjects: {
    columns: ['id', 'name', 'order', 'createdAt', 'updatedAt'],
    types: { id: 'number', name: 'string', order: 'number', createdAt: 'string', updatedAt: 'string' },
  },
  classSubjects: {
    columns: ['id', 'classId', 'subjectId', 'updatedAt'],
    types: { id: 'number', classId: 'number', subjectId: 'number', updatedAt: 'string' },
  },
  curriculum: {
    columns: ['id', 'subjectId', 'order', 'unit', 'lesson', 'updatedAt'],
    types: {
      id: 'number',
      subjectId: 'number',
      order: 'number',
      unit: 'string',
      lesson: 'string',
      updatedAt: 'string',
    },
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
  timetableEntries: {
    columns: ['id', 'day', 'period', 'subject', 'note', 'updatedAt'],
    types: {
      id: 'number',
      day: 'number',
      period: 'number',
      subject: 'string',
      note: 'string',
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

const LAST_EXPORTED_KEY = 'sheets-sync:last-exported-at';
const LAST_IMPORTED_KEY = 'sheets-sync:last-imported-at';

export function getLastExportedAt(): string | null {
  return localStorage.getItem(LAST_EXPORTED_KEY);
}

export function getLastImportedAt(): string | null {
  return localStorage.getItem(LAST_IMPORTED_KEY);
}

export interface SyncResult {
  syncedAt: string;
}

// Shared by every fetch call in this module (and re-exported for useSheetsSync.tsx's
// Picker-related calls) so a failed request's actual server-supplied message is always
// surfaced, not a generic status-code string.
export async function readErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `동기화 서버 오류 (${res.status})`;
}

async function fetchSheet(apiBase: string): Promise<Record<string, unknown[][]>> {
  const res = await fetch(`${apiBase}/api/sheet`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readErrorMessage(res));
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
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

// One-directional, explicit overwrite: local -> sheet. No merge, no per-row id matching —
// the entire sheet is replaced with this device's current local state.
export async function exportToSheet(options: { apiBase?: string } = {}): Promise<SyncResult> {
  const apiBase = options.apiBase ?? '';
  const payload = await exportData();
  const tables: Record<string, unknown[][]> = {};
  for (const name of TABLE_NAMES) {
    tables[name] = recordsToGrid(name, payload.data[name] as AnyRecord[]);
  }
  await pushSheet(apiBase, tables);
  const syncedAt = new Date().toISOString();
  localStorage.setItem(LAST_EXPORTED_KEY, syncedAt);
  return { syncedAt };
}

// One-directional, explicit overwrite: sheet -> local. Fully replaces this device's local
// database with the sheet's contents via the same clear+bulkAdd transaction backup restore uses.
export async function importFromSheet(options: { apiBase?: string } = {}): Promise<SyncResult> {
  const apiBase = options.apiBase ?? '';
  const grids = await fetchSheet(apiBase);
  const data = {} as BackupPayload['data'];
  for (const name of TABLE_NAMES) {
    data[name] = gridToRecords(name, grids[name] ?? []);
  }
  await importData({ version: 1, exportedAt: new Date().toISOString(), data });
  const syncedAt = new Date().toISOString();
  localStorage.setItem(LAST_IMPORTED_KEY, syncedAt);
  return { syncedAt };
}
