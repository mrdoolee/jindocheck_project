import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import CurriculumManager from './CurriculumManager';

beforeEach(async () => {
  await db.curriculum.clear();
});

describe('CurriculumManager', () => {
  it('adds a curriculum item and shows it in the list', async () => {
    const user = userEvent.setup();
    render(<CurriculumManager />);

    await user.type(screen.getByLabelText('새 단원'), '1단원 수와 연산');
    await user.type(screen.getByLabelText('새 차시'), '1차시 정수와 유리수');
    await user.click(screen.getByText('진도 항목 추가'));

    expect(await screen.findByLabelText(/^단원-/)).toHaveValue('1단원 수와 연산');
    expect(await screen.findByLabelText(/^차시-/)).toHaveValue('1차시 정수와 유리수');
  });

  it('rejects blank unit or lesson on add', async () => {
    const user = userEvent.setup();
    render(<CurriculumManager />);

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
    const user = userEvent.setup();
    render(<CurriculumManager />);

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
});
