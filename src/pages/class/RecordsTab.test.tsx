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
  it('saves a note entry with free text content', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await waitFor(() => {
      expect(screen.getByLabelText('학생')).toHaveTextContent('홍길동');
    });
    await user.selectOptions(screen.getByLabelText('학생'), String(studentId));
    await user.selectOptions(screen.getByLabelText('기록 세부유형'), '과제제출');
    await user.type(screen.getByLabelText('내용'), '수학 숙제 제출');
    await user.click(screen.getByText('기록 저장'));
    await user.click(screen.getByText('누가기록 이력보기'));

    expect(await screen.findByText(/수학 숙제 제출/)).toBeInTheDocument();
  });

  it('has no attendance-type dropdown, only note detail types', async () => {
    render(<RecordsTab classId={1} />);
    expect(screen.queryByLabelText('기록 유형')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('출결 상태')).not.toBeInTheDocument();
  });

  it('clicking a student name pre-fills the record form for that student', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.click(await screen.findByRole('button', { name: '1 홍길동' }));

    await waitFor(() => {
      expect(screen.getByLabelText('학생')).toHaveValue(String(studentId));
    });
  });

  it('history view shows every student, even after selecting one in the form', async () => {
    const studentAId = await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: null, seatCol: null });
    const studentBId = await db.students.add({ classId: 1, number: 2, name: '학생B', seatRow: null, seatCol: null });
    await db.records.add({ classId: 1, studentId: studentAId, date: '2026-08-14', type: '특이사항', content: 'A의 기록' });
    await db.records.add({ classId: 1, studentId: studentBId, date: '2026-08-14', type: '특이사항', content: 'B의 기록' });

    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.click(await screen.findByRole('button', { name: '1 학생A' }));
    await user.click(screen.getByText('누가기록 이력보기'));

    const list = screen.getByRole('list');
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    });
    expect(within(list).getByText(/A의 기록/)).toBeInTheDocument();
    expect(within(list).getByText(/B의 기록/)).toBeInTheDocument();
  });

  it('filters the history list to one student via the 학생별 조회 select', async () => {
    const studentAId = await db.students.add({ classId: 1, number: 1, name: '학생A', seatRow: null, seatCol: null });
    const studentBId = await db.students.add({ classId: 1, number: 2, name: '학생B', seatRow: null, seatCol: null });
    await db.records.add({ classId: 1, studentId: studentAId, date: '2026-08-14', type: '특이사항', content: 'A의 기록' });
    await db.records.add({ classId: 1, studentId: studentBId, date: '2026-08-14', type: '특이사항', content: 'B의 기록' });

    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.click(await screen.findByText('누가기록 이력보기'));
    const list = screen.getByRole('list');
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    });

    await user.selectOptions(screen.getByLabelText('학생별 조회'), String(studentAId));

    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    });
    expect(within(list).getByText(/A의 기록/)).toBeInTheDocument();
    expect(within(list).queryByText(/B의 기록/)).not.toBeInTheDocument();
  });

  it('sorts the history list by student name when selected', async () => {
    const studentBId = await db.students.add({ classId: 1, number: 2, name: '나나', seatRow: null, seatCol: null });
    const studentAId = await db.students.add({ classId: 1, number: 1, name: '가가', seatRow: null, seatCol: null });
    await db.records.add({ classId: 1, studentId: studentBId, date: '2026-08-14', type: '특이사항', content: '나나의 기록' });
    await db.records.add({ classId: 1, studentId: studentAId, date: '2026-08-10', type: '특이사항', content: '가가의 기록' });

    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.click(screen.getByText('누가기록 이력보기'));
    const list = screen.getByRole('list');
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    });
    // default date-sort: most recent first (나나의 기록, 2026-08-14)
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('나나의 기록');

    await user.selectOptions(screen.getByLabelText('정렬 기준'), 'name');

    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('가가의 기록');
    });
    expect(within(list).getAllByRole('listitem')[1]).toHaveTextContent('나나의 기록');
  });

  it('edits an existing note entry in place', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.records.add({ classId: 1, studentId, date: '2026-08-14', type: '특이사항', content: '원래 내용' });

    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);
    await user.click(screen.getByText('누가기록 이력보기'));

    const list = screen.getByRole('list');
    expect(await within(list).findByText(/원래 내용/)).toBeInTheDocument();
    await user.click(within(list).getByText('수정'));

    await user.selectOptions(within(list).getByLabelText('기록 세부유형 수정'), '과제제출');
    await user.click(within(list).getByText('저장'));

    await waitFor(() => {
      expect(within(list).getByText(/과제제출/)).toBeInTheDocument();
    });
  });

  it('deletes an entry after confirmation', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.records.add({ classId: 1, studentId, date: '2026-08-14', type: '특이사항', content: '지울 기록' });

    const user = userEvent.setup();
    window.confirm = () => true;
    render(<RecordsTab classId={1} />);
    await user.click(screen.getByText('누가기록 이력보기'));

    const list = screen.getByRole('list');
    expect(await within(list).findByText(/지울 기록/)).toBeInTheDocument();
    await user.click(within(list).getByText('삭제'));

    await waitFor(() => {
      expect(within(list).getByText('기록이 없습니다.')).toBeInTheDocument();
    });
  });
});
