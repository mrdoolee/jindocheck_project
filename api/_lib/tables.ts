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
