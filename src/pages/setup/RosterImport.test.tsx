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
    render(<RosterImport classId={classId} />);

    await user.type(screen.getByLabelText('명단 붙여넣기'), '1,홍길동\n2,김철수');
    await user.click(screen.getByText('명단 추가'));

    const students = await db.students.where('classId').equals(classId).sortBy('number');
    expect(students.map((s) => s.name)).toEqual(['홍길동', '김철수']);
  });

  it('rejects malformed rows with blank number fields', async () => {
    const classId = await createClass('1반');
    const user = userEvent.setup();
    render(<RosterImport classId={classId} />);

    await user.type(screen.getByLabelText('명단 붙여넣기'), '1,홍길동\n,이름없음\n2,김철수');
    await user.click(screen.getByText('명단 추가'));

    const students = await db.students.where('classId').equals(classId).sortBy('number');
    expect(students.map((s) => s.name)).toEqual(['홍길동', '김철수']);
    expect(students.some((s) => s.number === 0)).toBe(false);
  });

  it('disables the textarea and button when no class is selected', () => {
    render(<RosterImport classId="" />);
    expect(screen.getByLabelText('명단 붙여넣기')).toBeDisabled();
    expect(screen.getByText('명단 추가')).toBeDisabled();
  });
});
