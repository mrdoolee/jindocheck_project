import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createClass } from '../db/classes';
import ClassPage from './ClassPage';

beforeEach(async () => {
  await db.classes.clear();
});

describe('ClassPage', () => {
  it('shows the class name and defaults to the progress tab', async () => {
    const classId = await createClass('1학년 3반');
    render(
      <MemoryRouter initialEntries={[`/class/${classId}`]}>
        <Routes>
          <Route path="/class/:classId/*" element={<ClassPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('1학년 3반')).toBeInTheDocument();
    expect(screen.getByText('진도 체크')).toBeInTheDocument();
  });

  it('redirects to /setup when the class does not exist', async () => {
    render(
      <MemoryRouter initialEntries={[`/class/999`]}>
        <Routes>
          <Route path="/class/:classId/*" element={<ClassPage />} />
          <Route path="/setup" element={<div>설정 페이지</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('설정 페이지')).toBeInTheDocument();
  });
});
