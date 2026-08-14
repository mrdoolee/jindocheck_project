import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    expect(await screen.findByDisplayValue(today)).toBeInTheDocument();
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

    expect(await screen.findByDisplayValue('2026-01-15')).toBeInTheDocument();
    // also assert today's date is NOT what's shown, to be extra sure:
    const today = new Date().toISOString().slice(0, 10);
    expect(screen.queryByDisplayValue(today)).not.toBeInTheDocument();
  });

  it('allows editing the date to a past date after checking an item', async () => {
    const curriculumId = await addCurriculumItem('1단원', '1차시');
    const user = userEvent.setup();
    render(<ProgressTab classId={1} />);

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

    const dateInput = await screen.findByLabelText(`날짜-${curriculumId}`);
    fireEvent.change(dateInput, { target: { value: '2026-01-15' } });

    await waitFor(async () => {
      const [record] = await db.progress.where('classId').equals(1).toArray();
      expect(record.date).toBe('2026-01-15');
    });
  });

  it('clearing the date input does not unmount it', async () => {
    const curriculumId = await addCurriculumItem('1단원', '1차시');
    const user = userEvent.setup();
    render(<ProgressTab classId={1} />);

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

    const dateInput = (await screen.findByLabelText(`날짜-${curriculumId}`)) as HTMLInputElement;
    const originalValue = dateInput.value;

    fireEvent.change(dateInput, { target: { value: '' } });

    await waitFor(() => {
      // Input should still be in the DOM
      expect(screen.getByLabelText(`날짜-${curriculumId}`)).toBeInTheDocument();
      // Value should not have changed to empty
      expect((screen.getByLabelText(`날짜-${curriculumId}`) as HTMLInputElement).value).toBe(originalValue);
    });
  });
});
