import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import AttendanceTab from './AttendanceTab';

beforeEach(async () => {
  await db.students.clear();
  await db.attendance.clear();
});

describe('AttendanceTab', () => {
  it('adds a student to the roster', async () => {
    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await user.type(screen.getByPlaceholderText('번호'), '1');
    await user.type(screen.getByPlaceholderText('이름'), '홍길동');
    await user.click(screen.getByText('학생 추가'));

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
  });

  it('does not render editable name/number inputs for existing students', async () => {
    await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    render(<AttendanceTab classId={1} />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('홍길동')).not.toBeInTheDocument();
  });

  it('checks a student present for the selected date via a button', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await screen.findByText('홍길동');
    const row = screen.getByText('홍길동').closest('tr')!;
    await user.click(within(row).getByText('지각'));

    await waitFor(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const record = await db.attendance.where({ classId: 1, studentId, date: today }).first();
      expect(record?.status).toBe('지각');
    });
  });

  it('marks every student present with the 전체 출석 button', async () => {
    await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: null, seatCol: null });
    await db.students.add({ classId: 1, number: 2, name: '학생B', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await screen.findByText('학생A');
    await user.click(screen.getByText('전체 출석'));

    await waitFor(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const records = await db.attendance.where({ classId: 1, date: today }).toArray();
      expect(records).toHaveLength(2);
      expect(records.every((r) => r.status === '출석')).toBe(true);
    });
  });

  it('toggles to the attendance history view', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.attendance.add({ classId: 1, studentId, date: '2026-01-15', status: '결석', note: '' });

    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await user.click(screen.getByText('출결 이력 보기'));

    expect(await screen.findByText(/결석/)).toBeInTheDocument();
  });
});
