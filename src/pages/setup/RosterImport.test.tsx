import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
import RosterImport from './RosterImport';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
});

describe('RosterImport', () => {
  it('bulk-creates students from pasted text', async () => {
    const classId = await createClass('1반');
    const user = userEvent.setup();
    render(<RosterImport />);

    const select = screen.getByLabelText('대상 학급');
    await screen.findByText('1반');
    await user.selectOptions(select, String(classId));
    await user.type(screen.getByLabelText('명단 붙여넣기'), '1,홍길동\n2,김철수');
    await user.click(screen.getByText('명단 추가'));

    const students = await db.students.where('classId').equals(classId).sortBy('number');
    expect(students.map((s) => s.name)).toEqual(['홍길동', '김철수']);
  });
});
