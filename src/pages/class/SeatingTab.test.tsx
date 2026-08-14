import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { db } from '../../db/db';
import SeatingTab from './SeatingTab';

beforeEach(async () => {
  await db.students.clear();
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
});
