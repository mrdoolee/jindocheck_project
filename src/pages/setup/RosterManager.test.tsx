import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
import RosterManager from './RosterManager';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
});

describe('RosterManager', () => {
  it('selecting a class enables paste-import and shows that class\'s roster', async () => {
    const classId = await createClass('1반');
    await createClass('2반');
    const user = userEvent.setup();

    render(<RosterManager />);
    await screen.findByText('1반');

    expect(screen.getByText('명단 추가')).toBeDisabled();
    expect(screen.getByText('학급을 먼저 선택하세요.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('대상 학급'), String(classId));

    expect(screen.getByText('명단 추가')).toBeEnabled();
    await user.type(screen.getByLabelText('명단 붙여넣기'), '1,홍길동');
    await user.click(screen.getByText('명단 추가'));

    expect(await screen.findByDisplayValue('홍길동')).toBeInTheDocument();
  });

  it('falls back to "선택 안 함" when the selected class is deleted elsewhere', async () => {
    const classId = await createClass('1반');
    const user = userEvent.setup();

    render(<RosterManager />);
    await screen.findByText('1반');
    await user.selectOptions(screen.getByLabelText('대상 학급'), String(classId));
    expect(screen.getByText('명단 추가')).toBeEnabled();

    await db.classes.delete(classId);

    await waitFor(() => {
      expect(screen.getByText('명단 추가')).toBeDisabled();
    });
    expect(screen.getByLabelText('대상 학급')).toHaveValue('');
  });
});
