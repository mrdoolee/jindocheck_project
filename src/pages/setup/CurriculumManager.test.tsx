import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { addCurriculumItem } from '../../db/curriculum';
import CurriculumManager from './CurriculumManager';

let subjectId: number;

beforeEach(async () => {
  await db.subjects.clear();
  await db.curriculum.clear();
  subjectId = await db.subjects.add({ name: '수학', order: 0, createdAt: new Date().toISOString() });
});

async function renderAndSelectSubject() {
  const user = userEvent.setup();
  render(<CurriculumManager />);
  await screen.findByRole('option', { name: '수학' });
  await user.selectOptions(screen.getByLabelText('대상 과목'), String(subjectId));
  return user;
}

describe('CurriculumManager', () => {
  it('adds a curriculum item and shows it in the list', async () => {
    const user = await renderAndSelectSubject();

    await user.type(screen.getByLabelText('새 단원'), '1단원 수와 연산');
    await user.type(screen.getByLabelText('새 차시'), '1차시 정수와 유리수');
    await user.click(screen.getByText('진도 항목 추가'));

    expect(await screen.findByLabelText(/^단원-/)).toHaveValue('1단원 수와 연산');
    expect(await screen.findByLabelText(/^차시-/)).toHaveValue('1차시 정수와 유리수');
  });

  it('rejects blank unit or lesson on add', async () => {
    const user = await renderAndSelectSubject();

    // Try to add with blank unit
    await user.type(screen.getByLabelText('새 차시'), '1차시 정수와 유리수');
    await user.click(screen.getByText('진도 항목 추가'));

    // Verify no item was added
    expect(db.curriculum.toArray()).resolves.toHaveLength(0);

    // Clear and try with blank lesson
    await user.clear(screen.getByLabelText('새 차시'));
    await user.type(screen.getByLabelText('새 단원'), '1단원 수와 연산');
    await user.click(screen.getByText('진도 항목 추가'));

    // Verify no item was added
    expect(db.curriculum.toArray()).resolves.toHaveLength(0);
  });

  it('rejects blank or whitespace-only values on inline-edit blur', async () => {
    const user = await renderAndSelectSubject();

    // Add an initial item
    await user.type(screen.getByLabelText('새 단원'), '1단원 수와 연산');
    await user.type(screen.getByLabelText('새 차시'), '1차시 정수와 유리수');
    await user.click(screen.getByText('진도 항목 추가'));

    const unitInput = await screen.findByLabelText(/^단원-/);
    const lessonInput = await screen.findByLabelText(/^차시-/);

    // Try to clear unit field (whitespace only)
    await user.clear(unitInput);
    await user.type(unitInput, '   ');
    unitInput.blur(); // blur the input

    // Verify unit value is still original in the database
    const items = await db.curriculum.toArray();
    expect(items[0]?.unit).toBe('1단원 수와 연산');

    // Try to clear lesson field (empty)
    await user.clear(lessonInput);
    lessonInput.blur(); // blur the input

    // Verify lesson value is still original in the database
    const updatedItems = await db.curriculum.toArray();
    expect(updatedItems[0]?.lesson).toBe('1차시 정수와 유리수');
  });

  it('reorders curriculum items via drag and drop', async () => {
    await addCurriculumItem(subjectId, 'A단원', 'A차시');
    await addCurriculumItem(subjectId, 'B단원', 'B차시');

    await renderAndSelectSubject();
    await screen.findByDisplayValue('A단원');

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByDisplayValue('A단원')).toBeInTheDocument();
    expect(within(items[1]).getByDisplayValue('B단원')).toBeInTheDocument();

    const allItems = await db.curriculum.toArray();
    const bItemId = allItems.find((i) => i.unit === 'B단원')!.id!;
    const store = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => store.set(k, v),
      getData: (k: string) => store.get(k) ?? '',
    };
    store.set('text/plain', String(bItemId));

    fireEvent.dragStart(items[1], { dataTransfer });
    fireEvent.dragOver(items[0], { dataTransfer });
    fireEvent.drop(items[0], { dataTransfer });

    await waitFor(async () => {
      const ordered = await db.curriculum.orderBy('order').toArray();
      expect(ordered.map((i) => i.unit)).toEqual(['B단원', 'A단원']);
    });
  });

  it('scopes the item list to the selected subject only', async () => {
    const otherSubjectId = await db.subjects.add({ name: '영어', order: 1, createdAt: new Date().toISOString() });
    await addCurriculumItem(subjectId, '수학 1단원', '1차시');
    await addCurriculumItem(otherSubjectId, '영어 1단원', '1차시');

    await renderAndSelectSubject();

    expect(await screen.findByDisplayValue('수학 1단원')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('영어 1단원')).not.toBeInTheDocument();
  });

  it('falls back to "선택 안 함" when the selected subject is deleted elsewhere', async () => {
    await addCurriculumItem(subjectId, '1단원', '1차시');
    await renderAndSelectSubject();
    await screen.findByText('진도 항목 추가');

    await db.subjects.delete(subjectId);

    await waitFor(() => {
      expect(screen.queryByText('진도 항목 추가')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('대상 과목')).toHaveValue('');
  });
});
