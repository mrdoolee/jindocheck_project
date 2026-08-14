import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { addCurriculumItem } from '../../db/curriculum';
import ProgressTab from './ProgressTab';

beforeEach(async () => {
  await db.curriculum.clear();
  await db.progress.clear();
});

describe('ProgressTab', () => {
  it('checks an item and shows today date', async () => {
    await addCurriculumItem('1단원', '1차시');
    const user = userEvent.setup();
    render(<ProgressTab classId={1} />);

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
    const today = new Date().toISOString().slice(0, 10);
    expect(await screen.findByText(new RegExp(today))).toBeInTheDocument();
  });

  it('keeps progress independent between classes', async () => {
    await addCurriculumItem('1단원', '1차시');
    const user = userEvent.setup();
    const { rerender } = render(<ProgressTab classId={1} />);
    await user.click(await screen.findByRole('checkbox'));

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    rerender(<ProgressTab classId={2} />);
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('displays the actual persisted date, not today\'s date', async () => {
    const curriculumId = await addCurriculumItem('1단원', '1차시');
    await db.progress.add({ classId: 1, curriculumItemId: curriculumId, done: true, date: '2026-01-15' });

    render(<ProgressTab classId={1} />);

    expect(await screen.findByText(/2026-01-15/)).toBeInTheDocument();
    // also assert today's date is NOT what's shown, to be extra sure:
    const today = new Date().toISOString().slice(0, 10);
    expect(screen.queryByText(new RegExp(today))).not.toBeInTheDocument();
  });
});
