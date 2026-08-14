import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import RecordsTab from './RecordsTab';

beforeEach(async () => {
  await db.students.clear();
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('RecordsTab', () => {
  it('saves an attendance entry and shows it in the list', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByLabelText('학생')).toHaveTextContent('홍길동');
    });
    await user.selectOptions(screen.getByLabelText('학생'), String(studentId));
    await user.selectOptions(screen.getByLabelText('출결 상태'), '지각');
    await user.click(screen.getByText('저장'));

    expect(await screen.findByText(/지각/)).toBeInTheDocument();
  });

  it('saves a note entry with free text content', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.selectOptions(screen.getByLabelText('기록 유형'), 'note');
    await waitFor(() => {
      expect(screen.getByLabelText('학생')).toHaveTextContent('홍길동');
    });
    await user.selectOptions(screen.getByLabelText('학생'), String(studentId));
    await user.selectOptions(screen.getByLabelText('기록 세부유형'), '과제제출');
    await user.type(screen.getByLabelText('내용'), '수학 숙제 제출');
    await user.click(screen.getByText('저장'));

    expect(await screen.findByText(/수학 숙제 제출/)).toBeInTheDocument();
  });

  it('filters entries by kind', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.attendance.add({ classId: 1, studentId, date: '2026-08-14', status: '지각', note: '' });
    await db.records.add({ classId: 1, studentId, date: '2026-08-14', type: '과제제출', content: '수학 숙제 제출' });

    render(<RecordsTab classId={1} />);

    const list = screen.getByRole('list');
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    });
    expect(within(list).getByText(/지각/)).toBeInTheDocument();
    expect(within(list).getByText(/수학 숙제 제출/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('유형 필터'), 'attendance');

    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    });
    expect(within(list).getByText(/지각/)).toBeInTheDocument();
    expect(within(list).queryByText(/수학 숙제 제출/)).not.toBeInTheDocument();
  });
});
