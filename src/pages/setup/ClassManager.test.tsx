import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('rejects whitespace-only rename values', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClassManager />
      </MemoryRouter>
    );

    // Add a class first
    await user.type(screen.getByLabelText('새 학급 이름'), '1학년 3반');
    await user.click(screen.getByText('학급 추가'));

    // Wait for the class to appear
    expect(await screen.findByText('1학년 3반')).toBeInTheDocument();

    // Mock window.prompt to return whitespace-only string
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('   ');

    // Click rename button
    const renameButtons = screen.getAllByText('이름 변경');
    await user.click(renameButtons[0]);

    // Restore the spy
    promptSpy.mockRestore();

    // Verify the class name is still the original
    expect(screen.getByText('1학년 3반')).toBeInTheDocument();
  });
});
