import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
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

  it('reorders classes via drag and drop', async () => {
    await createClass('A반');
    await createClass('B반');

    render(
      <MemoryRouter>
        <ClassManager />
      </MemoryRouter>
    );

    await screen.findByText('A반');
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('A반'),
      expect.stringContaining('B반'),
    ]);

    const bClassId = await db.classes.where('name').equals('B반').first().then((c) => c!.id!);
    const store = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => store.set(k, v),
      getData: (k: string) => store.get(k) ?? '',
    };
    store.set('text/plain', String(bClassId));

    fireEvent.dragStart(items[1], { dataTransfer });
    fireEvent.dragOver(items[0], { dataTransfer });
    fireEvent.drop(items[0], { dataTransfer });

    await waitFor(async () => {
      const classes = await db.classes.orderBy('order').toArray();
      expect(classes.map((c) => c.name)).toEqual(['B반', 'A반']);
    });
  });
});
