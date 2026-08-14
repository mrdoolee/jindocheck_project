import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import {
  addAttendance,
  addSticker,
  addNote,
  listEntries,
  deleteEntry,
  updateAttendanceEntry,
  updateNoteEntry,
} from './entries';

beforeEach(async () => {
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('entries', () => {
  it('merges attendance, stickers, notes sorted by date desc', async () => {
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    await addSticker(1, 100, 3, '적극적인 발표', '2026-08-12');
    await addNote(1, 101, '과제제출', '수학 숙제 제출', '2026-08-11');

    const entries = await listEntries(1);
    expect(entries.map((e) => e.date)).toEqual(['2026-08-12', '2026-08-11', '2026-08-10']);
    expect(entries[0]).toMatchObject({ kind: 'sticker', label: '+3점', detail: '적극적인 발표' });
    expect(entries[1]).toMatchObject({ kind: 'note', label: '과제제출', detail: '수학 숙제 제출' });
    expect(entries[2]).toMatchObject({ kind: 'attendance', label: '출석' });
  });

  it('filters by studentId', async () => {
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    await addAttendance(1, 101, '결석', '병결', '2026-08-10');
    const entries = await listEntries(1, { studentId: 101 });
    expect(entries).toHaveLength(1);
    expect(entries[0].studentId).toBe(101);
  });

  it('filters by kind', async () => {
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    await addSticker(1, 100, 1, '칭찬', '2026-08-10');
    const entries = await listEntries(1, { kind: 'sticker' });
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('sticker');
  });

  it('filters by both studentId and kind (AND semantics)', async () => {
    // Attendance for student 100 (matches studentId:100 only)
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    // Sticker for student 100 (matches BOTH studentId:100 AND kind:'sticker' - expected result)
    await addSticker(1, 100, 2, '칭찬', '2026-08-11');
    // Sticker for student 101 (matches kind:'sticker' only)
    await addSticker(1, 101, 1, '좋음', '2026-08-12');

    const entries = await listEntries(1, { studentId: 100, kind: 'sticker' });
    expect(entries).toHaveLength(1);
    expect(entries[0].studentId).toBe(100);
    expect(entries[0].kind).toBe('sticker');
  });

  it('deletes an attendance entry', async () => {
    const id = await addAttendance(1, 100, '출석', '', '2026-08-10');
    await deleteEntry('attendance', id);
    expect(await listEntries(1)).toHaveLength(0);
  });

  it('deletes a note entry', async () => {
    const id = await addNote(1, 100, '특이사항', '내용', '2026-08-10');
    await deleteEntry('note', id);
    expect(await listEntries(1)).toHaveLength(0);
  });

  it('updates an attendance entry', async () => {
    const id = await addAttendance(1, 100, '출석', '', '2026-08-10');
    await updateAttendanceEntry(id, { status: '지각', note: '늦잠', date: '2026-08-11' });
    const [entry] = await listEntries(1);
    expect(entry).toMatchObject({ label: '지각', detail: '늦잠', date: '2026-08-11' });
  });

  it('updates a note entry', async () => {
    const id = await addNote(1, 100, '특이사항', '원래 내용', '2026-08-10');
    await updateNoteEntry(id, { type: '과제제출', content: '수정된 내용', date: '2026-08-12' });
    const [entry] = await listEntries(1);
    expect(entry).toMatchObject({ label: '과제제출', detail: '수정된 내용', date: '2026-08-12' });
  });
});
