import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import SeatingTab from './SeatingTab';

beforeEach(async () => {
  await db.students.clear();
  await db.classes.clear();
});

function makeDataTransfer(studentId: number) {
  const store = new Map<string, string>();
  store.set('text/plain', String(studentId));
  return {
    setData: (k: string, v: string) => store.set(k, v),
    getData: (k: string) => store.get(k) ?? '',
  };
}

describe('SeatingTab', () => {
  it('moves an unseated student into a grid cell on drop', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    render(<SeatingTab classId={1} />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();

    const targetCell = screen.getByLabelText('좌석-0-0');
    fireEvent.drop(targetCell, { dataTransfer: makeDataTransfer(studentId) });

    const student = await db.students.get(studentId);
    expect(student?.seatRow).toBe(0);
    expect(student?.seatCol).toBe(0);
  });

  it('swaps two students when one is dropped onto an occupied cell', async () => {
    const studentAId = await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: 0, seatCol: 0 });
    const studentBId = await db.students.add({ classId: 1, number: 2, name: '학생B', seatRow: 1, seatCol: 1 });
    render(<SeatingTab classId={1} />);

    expect(await screen.findByText('학생A')).toBeInTheDocument();
    expect(await screen.findByText('학생B')).toBeInTheDocument();

    const targetCell = screen.getByLabelText('좌석-1-1');
    fireEvent.drop(targetCell, { dataTransfer: makeDataTransfer(studentAId) });

    const studentA = await db.students.get(studentAId);
    const studentB = await db.students.get(studentBId);
    expect(studentA?.seatRow).toBe(1);
    expect(studentA?.seatCol).toBe(1);
    expect(studentB?.seatRow).toBe(0);
    expect(studentB?.seatCol).toBe(0);
  });

  it('imports seat placements from an uploaded backup file, matching by student number', async () => {
    const student14Id = await db.students.add({ classId: 1, number: 14, name: '학생14', seatRow: null, seatCol: null });
    const student2Id = await db.students.add({ classId: 1, number: 2, name: '학생2', seatRow: 3, seatCol: 3 });

    const payload = {
      version: '1.0',
      assignments: { desk_0_0: 's14', desk_0_1: 's2' },
      desks: [
        { id: 'desk_0_0', row: 0, col: 0, disabled: false },
        { id: 'desk_0_1', row: 0, col: 1, disabled: false },
      ],
    };
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();

    render(<SeatingTab classId={1} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('배치도 파일 선택');
    await user.upload(input, file);

    await waitFor(async () => {
      const student14 = await db.students.get(student14Id);
      expect(student14?.seatRow).toBe(0);
      expect(student14?.seatCol).toBe(0);
    });
    const student2 = await db.students.get(student2Id);
    expect(student2?.seatRow).toBe(0);
    expect(student2?.seatCol).toBe(1);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('reports unmatched student numbers instead of silently dropping them', async () => {
    await db.students.add({ classId: 1, number: 1, name: '학생1', seatRow: null, seatCol: null });

    const payload = {
      version: '1.0',
      assignments: { desk_0_0: 's99' },
      desks: [{ id: 'desk_0_0', row: 0, col: 0, disabled: false }],
    };
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    window.confirm = vi.fn(() => true);
    const alertSpy = vi.fn();
    window.alert = alertSpy;

    render(<SeatingTab classId={1} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('배치도 파일 선택');
    await user.upload(input, file);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(alertSpy.mock.calls[0][0]).toContain('99');
  });

  it('defaults to a 6x6 grid when the class has no saved seating size', async () => {
    render(<SeatingTab classId={1} />);

    expect(await screen.findByLabelText('좌석-5-5')).toBeInTheDocument();
    expect(screen.queryByLabelText('좌석-6-0')).not.toBeInTheDocument();
    expect(screen.getByLabelText('행 개수')).toHaveValue(6);
    expect(screen.getByLabelText('열 개수')).toHaveValue(6);
  });

  it('resizes the grid and persists the new size on the class', async () => {
    await db.classes.add({ id: 1, name: '1', createdAt: new Date().toISOString(), order: 0 });
    render(<SeatingTab classId={1} />);
    await screen.findByLabelText('좌석-0-0');

    fireEvent.change(screen.getByLabelText('행 개수'), { target: { value: '3' } });

    await waitFor(async () => {
      const cls = await db.classes.get(1);
      expect(cls?.seatRows).toBe(3);
    });
    expect(screen.queryByLabelText('좌석-4-0')).not.toBeInTheDocument();
    expect(screen.getByLabelText('좌석-2-0')).toBeInTheDocument();
  });

  it('unseats students who fall outside a shrunk grid', async () => {
    await db.classes.add({ id: 1, name: '1', createdAt: new Date().toISOString(), order: 0 });
    const studentId = await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: 5, seatCol: 5 });
    render(<SeatingTab classId={1} />);
    await screen.findByText('학생A');

    fireEvent.change(screen.getByLabelText('열 개수'), { target: { value: '2' } });

    await waitFor(async () => {
      const student = await db.students.get(studentId);
      expect(student?.seatRow).toBeNull();
      expect(student?.seatCol).toBeNull();
    });
  });
});
