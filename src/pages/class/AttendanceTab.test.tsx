import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import AttendanceTab from './AttendanceTab';

beforeEach(async () => {
  await db.students.clear();
  await db.attendance.clear();
});

describe('AttendanceTab', () => {
  it('does not render a student-add box', async () => {
    await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    render(<AttendanceTab classId={1} />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('번호')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('이름')).not.toBeInTheDocument();
    expect(screen.queryByText('학생 추가')).not.toBeInTheDocument();
  });

  it('does not render a delete button for students', async () => {
    await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    render(<AttendanceTab classId={1} />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByText('삭제')).not.toBeInTheDocument();
  });

  it('does not render editable name/number inputs for existing students', async () => {
    await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    render(<AttendanceTab classId={1} />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('홍길동')).not.toBeInTheDocument();
  });

  it('shows a role badge next to the name when set, and nothing when unset', async () => {
    await db.students.add({ classId: 1, number: 1, name: '홍길동', role: '실장', seatRow: null, seatCol: null });
    await db.students.add({ classId: 1, number: 2, name: '김철수', seatRow: null, seatCol: null });
    render(<AttendanceTab classId={1} />);

    expect(await screen.findByText('실장')).toBeInTheDocument();
    const row = screen.getByText('김철수').closest('li')!;
    expect(within(row).queryByText('실장')).not.toBeInTheDocument();
  });

  it('checks a student present for the selected date via a button', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await screen.findByText('홍길동');
    const row = screen.getByText('홍길동').closest('li')!;
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

  it('clears all attendance marks for the date with the 초기화 button', async () => {
    await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: null, seatCol: null });
    await db.students.add({ classId: 1, number: 2, name: '학생B', seatRow: null, seatCol: null });
    window.confirm = () => true;
    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await screen.findByText('학생A');
    expect(screen.getByText('초기화')).toBeDisabled();

    await user.click(screen.getByText('전체 출석'));
    await waitFor(() => {
      const today = new Date().toISOString().slice(0, 10);
      return expect(db.attendance.where({ classId: 1, date: today }).count()).resolves.toBe(2);
    });
    expect(screen.getByText('초기화')).toBeEnabled();

    await user.click(screen.getByText('초기화'));
    await waitFor(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const records = await db.attendance.where({ classId: 1, date: today }).toArray();
      expect(records).toHaveLength(0);
    });
    expect(screen.getByText('초기화')).toBeDisabled();
  });

  it('toggles to the attendance history view for the selected date', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.attendance.add({ classId: 1, studentId, date: '2026-01-15', status: '결석', note: '' });

    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await user.click(screen.getByText('출결 이력 보기'));
    fireEvent.change(screen.getByLabelText('이력 조회 날짜'), { target: { value: '2026-01-15' } });

    expect(await screen.findByText(/결석/)).toBeInTheDocument();
  });

  it('history view only shows entries for the selected date', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.attendance.add({ classId: 1, studentId, date: '2026-01-15', status: '결석', note: '' });
    await db.attendance.add({ classId: 1, studentId, date: '2026-01-16', status: '지각', note: '' });

    const user = userEvent.setup();
    render(<AttendanceTab classId={1} />);

    await user.click(screen.getByText('출결 이력 보기'));
    fireEvent.change(screen.getByLabelText('이력 조회 날짜'), { target: { value: '2026-01-15' } });

    expect(await screen.findByText(/결석/)).toBeInTheDocument();
    expect(screen.queryByText(/지각/)).not.toBeInTheDocument();
  });
});
