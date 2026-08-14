import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import RosterTab from './RosterTab';

beforeEach(async () => {
  await db.students.clear();
});

describe('RosterTab', () => {
  it('adds a student to the roster', async () => {
    const user = userEvent.setup();
    render(<RosterTab classId={1} />);

    await user.type(screen.getByPlaceholderText('번호'), '1');
    await user.type(screen.getByPlaceholderText('이름'), '홍길동');
    await user.click(screen.getByText('학생 추가'));

    expect(await screen.findByDisplayValue('홍길동')).toBeInTheDocument();
  });

  it('edits a student name on blur', async () => {
    const id = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RosterTab classId={1} />);

    const nameInput = await screen.findByLabelText(`이름-${id}`);
    await user.clear(nameInput);
    await user.type(nameInput, '홍길순');
    await user.tab();

    const student = await db.students.get(id);
    expect(student?.name).toBe('홍길순');
  });
});
