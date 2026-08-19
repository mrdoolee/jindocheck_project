import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimetableSettingsManager from './TimetableSettingsManager';
import { db } from '@/db/db';

function stubFetch(response: { schoolName: string; teachers: { index: number; name: string }[] }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith('/api/timetable')) {
        return new Response(JSON.stringify(response), { status: 200 });
      }
      throw new Error(`unexpected fetch to ${url}`);
    })
  );
}

beforeEach(async () => {
  await db.timetableSettings.clear();
  vi.unstubAllGlobals();
});

describe('TimetableSettingsManager', () => {
  it('loads the teacher list for a school code and saves the chosen teacher', async () => {
    stubFetch({
      schoolName: '테스트중학교',
      teachers: [
        { index: 1, name: '김민수' },
        { index: 2, name: '이영희' },
      ],
    });
    const user = userEvent.setup();
    render(<TimetableSettingsManager />);

    await user.type(screen.getByLabelText('학교코드'), '39286');
    await user.click(screen.getByText('교사 목록 불러오기'));

    expect(await screen.findByText('테스트중학교')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('교사 선택'), '2');
    await user.click(screen.getByText('저장'));

    await waitFor(async () => {
      expect(await db.timetableSettings.get(1)).toEqual({
        id: 1,
        schoolCode: '39286',
        teacherIndex: 2,
        teacherName: '이영희',
      });
    });
  });

  it('shows an error message when the school code lookup fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: '학교코드를 확인해주세요.' }), { status: 502 }))
    );
    const user = userEvent.setup();
    render(<TimetableSettingsManager />);

    await user.type(screen.getByLabelText('학교코드'), '00000');
    await user.click(screen.getByText('교사 목록 불러오기'));

    expect(await screen.findByText('학교코드를 확인해주세요.')).toBeInTheDocument();
  });

  it('shows the currently saved settings when some already exist', async () => {
    await db.timetableSettings.put({ id: 1, schoolCode: '39286', teacherIndex: 1, teacherName: '김민수' });
    render(<TimetableSettingsManager />);

    expect(await screen.findByText('39286')).toBeInTheDocument();
    expect(screen.getByText('김민수')).toBeInTheDocument();
  });
});
