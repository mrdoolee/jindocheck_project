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
});
