import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
import BackupManager from './BackupManager';

beforeEach(async () => {
  await db.classes.clear();
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

describe('BackupManager', () => {
  it('exports data by creating a downloadable blob URL', async () => {
    await createClass('1반');
    const user = userEvent.setup();
    render(<BackupManager />);

    await user.click(screen.getByText('내보내기'));

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('imports data from an uploaded JSON file when confirmed', async () => {
    const classId = await createClass('1반');
    const payload = {
      version: 1,
      exportedAt: '2026-08-14T00:00:00.000Z',
      data: {
        classes: [{ id: classId, name: '불러온 반', createdAt: '2026-08-14T00:00:00.000Z' }],
        students: [],
        curriculum: [],
        progress: [],
        attendance: [],
        stickers: [],
        records: [],
      },
    };
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    window.confirm = vi.fn(() => true);

    render(<BackupManager />);
    const input = screen.getByLabelText('백업 파일 선택', { selector: 'input' });
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(window.confirm).toHaveBeenCalled();
    const classes = await db.classes.toArray();
    expect(classes).toHaveLength(1);
    expect(classes[0].name).toBe('불러온 반');
  });

  it('does not import data when the confirm dialog is cancelled', async () => {
    await createClass('1반');
    const payload = {
      version: 1,
      exportedAt: '2026-08-14T00:00:00.000Z',
      data: {
        classes: [{ id: 999, name: '불러온 반', createdAt: '2026-08-14T00:00:00.000Z' }],
        students: [],
        curriculum: [],
        progress: [],
        attendance: [],
        stickers: [],
        records: [],
      },
    };
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    window.confirm = vi.fn(() => false);

    render(<BackupManager />);
    const input = screen.getByLabelText('백업 파일 선택', { selector: 'input' });
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(window.confirm).toHaveBeenCalled();
    const classes = await db.classes.toArray();
    expect(classes).toHaveLength(1);
    expect(classes[0].name).toBe('1반');
  });
});
