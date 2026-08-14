import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../db/db';
import ClassManager from './ClassManager';

beforeEach(async () => {
  await db.classes.clear();
});

describe('ClassManager', () => {
  it('adds a class and shows it in the list', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClassManager />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('새 학급 이름'), '1학년 3반');
    await user.click(screen.getByText('학급 추가'));

    expect(await screen.findByText('1학년 3반')).toBeInTheDocument();
  });
});
