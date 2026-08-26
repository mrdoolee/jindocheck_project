import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { listManualTimetable, setManualTimetableCell, setManualTimetableField } from './manualTimetable';

beforeEach(async () => {
  await db.timetableEntries.clear();
});

describe('manualTimetable', () => {
  it('creates a cell when both fields are filled', async () => {
    await setManualTimetableCell(0, 1, '국어', '3-2');
    const entries = await listManualTimetable();
    expect(entries).toEqual([{ id: expect.any(Number), day: 0, period: 1, subject: '국어', note: '3-2', updatedAt: expect.any(String) }]);
  });

  it('trims whitespace on both fields', async () => {
    await setManualTimetableCell(0, 1, '  국어  ', '  3-2  ');
    const [entry] = await listManualTimetable();
    expect(entry.subject).toBe('국어');
    expect(entry.note).toBe('3-2');
  });

  it('updates an existing cell in place instead of duplicating it', async () => {
    await setManualTimetableCell(1, 2, '수학', '1-1');
    await setManualTimetableCell(1, 2, '영어', '1-1');
    const entries = await listManualTimetable();
    expect(entries).toHaveLength(1);
    expect(entries[0].subject).toBe('영어');
  });

  it('deletes the cell when both fields are cleared', async () => {
    await setManualTimetableCell(2, 3, '과학', '2-3');
    expect(await listManualTimetable()).toHaveLength(1);

    await setManualTimetableCell(2, 3, '', '');
    expect(await listManualTimetable()).toHaveLength(0);
  });

  it('keeps different (day, period) cells independent', async () => {
    await setManualTimetableCell(0, 1, '국어', '');
    await setManualTimetableCell(0, 2, '수학', '');
    await setManualTimetableCell(1, 1, '영어', '');
    const entries = await listManualTimetable();
    expect(entries).toHaveLength(3);
  });
});

describe('setManualTimetableField', () => {
  it('creates a row with only the given field set when the cell is empty', async () => {
    await setManualTimetableField(0, 1, 'subject', '국어');
    const [entry] = await listManualTimetable();
    expect(entry.subject).toBe('국어');
    expect(entry.note).toBe('');
  });

  it('does nothing when setting an empty value on an already-empty cell', async () => {
    await setManualTimetableField(0, 1, 'subject', '');
    expect(await listManualTimetable()).toHaveLength(0);
  });

  it('committing one field does not clobber the other field with a stale value', async () => {
    // Simulates the real bug: subject commits first, then note commits — note's onBlur must
    // not overwrite subject with whatever it thought subject was before that first commit.
    await setManualTimetableField(0, 1, 'subject', '국어');
    await setManualTimetableField(0, 1, 'note', '3-2');

    const [entry] = await listManualTimetable();
    expect(entry.subject).toBe('국어');
    expect(entry.note).toBe('3-2');
  });

  it('deletes the row once both fields have been cleared via independent field commits', async () => {
    await setManualTimetableField(0, 1, 'subject', '국어');
    await setManualTimetableField(0, 1, 'note', '3-2');

    await setManualTimetableField(0, 1, 'subject', '');
    expect(await listManualTimetable()).toHaveLength(1); // note still set, row survives

    await setManualTimetableField(0, 1, 'note', '');
    expect(await listManualTimetable()).toHaveLength(0);
  });
});
