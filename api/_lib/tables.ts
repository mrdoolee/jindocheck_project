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
