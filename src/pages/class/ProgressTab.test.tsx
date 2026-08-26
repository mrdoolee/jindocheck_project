import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { addCurriculumItem } from '../../db/curriculum';
import ProgressTab from './ProgressTab';

beforeEach(async () => {
  await db.subjects.clear();
  await db.classSubjects.clear();
  await db.curriculum.clear();
  await db.progress.clear();
});

async function linkSubject(classId: number, subjectId?: number): Promise<number> {
  const id = subjectId ?? (await db.subjects.add({ name: '수학', order: 0, createdAt: new Date().toISOString() }));
  await db.classSubjects.add({ classId, subjectId: id });
  return id;
}

function renderProgressTab(classId: number) {
  return render(
    <MemoryRouter>
      <ProgressTab classId={classId} />
    </MemoryRouter>
  );
}

describe('ProgressTab', () => {
  it('shows a message when the class has no linked subject', async () => {
    renderProgressTab(1);
    expect(await screen.findByText(/연결된 과목이 없습니다/)).toBeInTheDocument();
  });

  it('checks an item and shows today date', async () => {
    const subjectId = await linkSubject(1);
    const curriculumId = await addCurriculumItem(subjectId, '1단원', '1차시');
    const user = userEvent.setup();
    renderProgressTab(1);

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = await screen.findByLabelText(`날짜-${curriculumId}`);
    expect(dateInput).toHaveValue(today);
  });

  it('keeps progress independent between classes', async () => {
    const subjectId = await linkSubject(1);
    await linkSubject(2, subjectId);
    await addCurriculumItem(subjectId, '1단원', '1차시');
    const user = userEvent.setup();
    const { rerender } = renderProgressTab(1);
    await user.click(await screen.findByRole('checkbox'));

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    rerender(
      <MemoryRouter>
        <ProgressTab classId={2} />
      </MemoryRouter>
    );
    // The checkbox DOM node persists across this rerender (same subject, same key), so
    // findByRole resolves instantly with the still-checked node from class 1 — it only waits
    // for the element to exist, not for the classId-scoped progress live-query to re-resolve.
    // waitFor is required here to avoid a race against that re-resolution.
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  it('shows a subject picker and only one subject at a time when a class has more than one', async () => {
    const mathId = await linkSubject(1);
    const englishId = await db.subjects.add({ name: '영어', order: 1, createdAt: new Date().toISOString() });
    await db.classSubjects.add({ classId: 1, subjectId: englishId });
    await addCurriculumItem(mathId, '수학 1단원', '1차시');
    await addCurriculumItem(englishId, '영어 1단원', '1차시');

    const user = userEvent.setup();
    renderProgressTab(1);

    // first subject shown by default; only its item is visible
    expect(await screen.findByText('수학 1단원')).toBeInTheDocument();
    expect(screen.queryByText('영어 1단원')).not.toBeInTheDocument();
    expect(await screen.findAllByRole('checkbox')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '영어' }));

    expect(await screen.findByText('영어 1단원')).toBeInTheDocument();
    expect(screen.queryByText('수학 1단원')).not.toBeInTheDocument();
    expect(await screen.findAllByRole('checkbox')).toHaveLength(1);
  });

  it('does not show a subject picker when the class has only one subject', async () => {
    const subjectId = await linkSubject(1);
    await addCurriculumItem(subjectId, '1단원', '1차시');

    renderProgressTab(1);

    await screen.findByText('1단원');
    expect(screen.queryByRole('button', { name: '수학' })).not.toBeInTheDocument();
  });

  it('displays the actual persisted date, not today\'s date', async () => {
    const subjectId = await linkSubject(1);
    const curriculumId = await addCurriculumItem(subjectId, '1단원', '1차시');
    await db.progress.add({ classId: 1, curriculumItemId: curriculumId, done: true, date: '2026-01-15' });

    renderProgressTab(1);

    const dateInput = await screen.findByLabelText(`날짜-${curriculumId}`);
    expect(dateInput).toHaveValue('2026-01-15');
    // also assert today's date is NOT what's shown, to be extra sure:
    const today = new Date().toISOString().slice(0, 10);
    expect(dateInput).not.toHaveValue(today);
  });

  it('allows editing the date to a past date after checking an item', async () => {
    const subjectId = await linkSubject(1);
    const curriculumId = await addCurriculumItem(subjectId, '1단원', '1차시');
    const user = userEvent.setup();
    renderProgressTab(1);

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
    const subjectId = await linkSubject(1);
    const curriculumId = await addCurriculumItem(subjectId, '1단원', '1차시');
    const user = userEvent.setup();
    renderProgressTab(1);

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

  it('scrolls to the most recently checked item on load, not the top of a long list', async () => {
    const subjectId = await linkSubject(1);
    const id1 = await addCurriculumItem(subjectId, '1단원', '1차시');
    const id2 = await addCurriculumItem(subjectId, '2단원', '2차시');
    await addCurriculumItem(subjectId, '3단원', '3차시'); // left unchecked
    await db.progress.add({
      classId: 1,
      curriculumItemId: id1,
      done: true,
      date: '2026-01-01',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await db.progress.add({
      classId: 1,
      curriculumItemId: id2,
      done: true,
      date: '2026-01-02',
      updatedAt: '2026-01-02T00:00:00.000Z', // checked later than id1
    });

    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderProgressTab(1);
    await screen.findByText('3단원');

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
    const target = scrollSpy.mock.instances[0] as unknown as HTMLElement;
    expect(target.id).toBe(`progress-item-${id2}`);
    scrollSpy.mockRestore();
  });

  it('does not scroll when nothing has been checked yet', async () => {
    const subjectId = await linkSubject(1);
    await addCurriculumItem(subjectId, '1단원', '1차시');

    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderProgressTab(1);
    await screen.findByText('1단원');

    expect(scrollSpy).not.toHaveBeenCalled();
    scrollSpy.mockRestore();
  });
});
