import { describe, it, expect } from 'vitest';
import { parseSeatingBackup } from './seatingImport';

const sampleFile = {
  version: '1.0',
  title: '후보 1',
  assignments: {
    desk_0_0: 's14',
    desk_0_1: 's2',
    desk_4_1: 's99',
  },
  desks: [
    { id: 'desk_0_0', row: 0, col: 0, podId: 0, disabled: false },
    { id: 'desk_0_1', row: 0, col: 1, podId: 0, disabled: false },
    { id: 'desk_4_1', row: 4, col: 1, podId: 6, disabled: true },
  ],
  dimensions: { rows: 6, cols: 6, rowAisles: [1, 3], colAisles: [1, 3] },
};

describe('parseSeatingBackup', () => {
  it('extracts student number + row/col placements from valid assignments', () => {
    const { placements } = parseSeatingBackup(sampleFile);
    expect(placements).toEqual([
      { studentNumber: 14, row: 0, col: 0 },
      { studentNumber: 2, row: 0, col: 1 },
    ]);
  });

  it('skips assignments pointing at a disabled desk', () => {
    const { skipped } = parseSeatingBackup(sampleFile);
    expect(skipped.some((s) => s.includes('desk_4_1'))).toBe(true);
  });

  it('skips assignments with an unknown desk id', () => {
    const file = {
      assignments: { desk_9_9: 's1' },
      desks: [],
    };
    const { placements, skipped } = parseSeatingBackup(file);
    expect(placements).toHaveLength(0);
    expect(skipped[0]).toContain('desk_9_9');
  });

  it('skips assignments with an unrecognized student token', () => {
    const file = {
      assignments: { desk_0_0: 'teacher' },
      desks: [{ id: 'desk_0_0', row: 0, col: 0, disabled: false }],
    };
    const { placements, skipped } = parseSeatingBackup(file);
    expect(placements).toHaveLength(0);
    expect(skipped[0]).toContain('teacher');
  });

  it('throws on a file missing the expected shape', () => {
    expect(() => parseSeatingBackup({ foo: 'bar' })).toThrow();
    expect(() => parseSeatingBackup(null)).toThrow();
    expect(() => parseSeatingBackup('not json')).toThrow();
  });
});
