import { describe, it, expect, beforeEach } from 'vitest';
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

    expect(await screen.findByText('1번 홍길동')).toBeInTheDocument();

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

  it('unseats a student when the × button is clicked', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: 0, seatCol: 0 });
    const user = userEvent.setup();
    render(<SeatingTab classId={1} />);

    await screen.findByText('홍길동');
    await user.click(screen.getByLabelText('홍길동 자리 비우기'));

    await waitFor(async () => {
      const student = await db.students.get(studentId);
      expect(student?.seatRow).toBeNull();
      expect(student?.seatCol).toBeNull();
    });
    expect(await screen.findByText('1번 홍길동')).toBeInTheDocument(); // now shown in 미배치 학생
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
    fireEvent.blur(screen.getByLabelText('행 개수'));

    await waitFor(async () => {
      const cls = await db.classes.get(1);
      expect(cls?.seatRows).toBe(3);
    });
    expect(screen.queryByLabelText('좌석-4-0')).not.toBeInTheDocument();
    expect(screen.getByLabelText('좌석-2-0')).toBeInTheDocument();
  });

  it('lets the rows field be cleared while typing instead of snapping back immediately', async () => {
    await db.classes.add({ id: 1, name: '1', createdAt: new Date().toISOString(), order: 0 });
    render(<SeatingTab classId={1} />);
    await screen.findByLabelText('좌석-0-0');

    fireEvent.change(screen.getByLabelText('행 개수'), { target: { value: '' } });
    expect(screen.getByLabelText('행 개수')).toHaveValue(null);

    fireEvent.blur(screen.getByLabelText('행 개수'));
    expect(screen.getByLabelText('행 개수')).toHaveValue(6);
    const cls = await db.classes.get(1);
    expect(cls?.seatRows).toBeUndefined();
  });

  it('unseats students who fall outside a shrunk grid', async () => {
    await db.classes.add({ id: 1, name: '1', createdAt: new Date().toISOString(), order: 0 });
    const studentId = await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: 5, seatCol: 5 });
    render(<SeatingTab classId={1} />);
    await screen.findByText('학생A');

    fireEvent.change(screen.getByLabelText('열 개수'), { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('열 개수'));

    await waitFor(async () => {
      const student = await db.students.get(studentId);
      expect(student?.seatRow).toBeNull();
      expect(student?.seatCol).toBeNull();
    });
  });
});
