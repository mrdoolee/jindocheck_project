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
});
