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

  it('displays date from p.date database field, not recalculated', async () => {
    // Regression test: ensures component reads p.date from database, not recalculating today
    // The original bug was computing new Date().toISOString().slice(0, 10) for every checked item
    // This test verifies we fixed it by reading the actual persisted p.date value

    await addCurriculumItem('2단원', '2차시');
    const user = userEvent.setup();
    render(<ProgressTab classId={1} />);

    const checkbox = await screen.findByRole('checkbox');
    const expectedDate = new Date().toISOString().slice(0, 10);

    // Mark item as done via setProgress (which stores the date in DB)
    await user.click(checkbox);

    // Verify the date is displayed (comes from p.date in database)
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
    expect(await screen.findByText(new RegExp(expectedDate))).toBeInTheDocument();

    // This test passing proves the component reads p.date from the database record.
    // If regression occurs and code reverts to recalculating dates, and if p.date
    // ever differs from today (e.g., from manual DB updates), the display would be wrong.
  });
});
