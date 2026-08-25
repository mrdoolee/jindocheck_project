import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TimetablePage from './TimetablePage';
import { db } from '@/db/db';

const TEACHER_RESPONSE = {
  schoolName: '테스트중학교',
  periods: ['09:00', '09:55'],
  gradeClassCounts: [2, 1],
  teacherTimetable: [
    [
      { subject: '체육', person: '1-1', changed: true },
      null,
    ],
    [null, { subject: '과학', person: '2-1', changed: false }],
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TimetablePage />
    </MemoryRouter>
  );
}

beforeEach(async () => {
  await db.timetableSettings.clear();
  await db.timetableEntries.clear();
  vi.unstubAllGlobals();
});

describe('TimetablePage', () => {
  it('shows setup guidance when no settings are saved yet', async () => {
    renderPage();
    expect(await screen.findByText(/시간표 설정이 없습니다/)).toBeInTheDocument();
  });

  it('fetches and renders the teacher timetable, highlighting changed cells', async () => {
    await db.timetableSettings.put({ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('schoolCode=39286');
        expect(url).toContain('teacherIndex=1');
        return new Response(JSON.stringify(TEACHER_RESPONSE), { status: 200 });
      })
    );

    renderPage();

    expect(await screen.findByText('체육')).toBeInTheDocument();
    expect(screen.getByText('1-1')).toBeInTheDocument();
    expect(screen.getByText('과학')).toBeInTheDocument();
    expect(screen.getByText('체육').closest('td')).toHaveClass('bg-yellow-100');
    expect(screen.getByText('과학').closest('td')).not.toHaveClass('bg-yellow-100');
  });

  it('shows an error message when the timetable fetch fails', async () => {
    await db.timetableSettings.put({ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: '컴시간 서버 응답 오류' }), { status: 502 }))
    );

    renderPage();
    expect(await screen.findByText('컴시간 서버 응답 오류')).toBeInTheDocument();
  });

  it('looks up a class timetable from the grade/class pickers', async () => {
    await db.timetableSettings.put({ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    const classGrid = [[{ subject: '국어', person: '김민수', changed: false }, null]];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('grade=')) {
          expect(url).toContain('grade=1');
          expect(url).toContain('classNum=1');
          return new Response(JSON.stringify({ classTimetable: classGrid }), { status: 200 });
        }
        return new Response(JSON.stringify(TEACHER_RESPONSE), { status: 200 });
      })
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('체육'); // wait for the initial teacher-view load to settle
    await user.selectOptions(screen.getByLabelText('학년'), '1');
    await user.selectOptions(screen.getByLabelText('반'), '1');
    await user.click(screen.getByText('조회'));

    expect(await screen.findByText('국어')).toBeInTheDocument();
  });

  it('renders a manually entered timetable without calling the comci API', async () => {
    await db.timetableSettings.put({ id: 1, mode: 'manual', periodCount: 2 });
    await db.timetableEntries.add({ day: 0, period: 1, subject: '국어', note: '3-2' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('should not call comci API in manual mode');
      })
    );

    renderPage();

    expect(await screen.findByText('국어')).toBeInTheDocument();
    expect(screen.getByText('3-2')).toBeInTheDocument();
    expect(screen.getByText('수정하기')).toBeInTheDocument();
  });
});
