import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('renders the home page with the sidebar visible', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /설정 및 백업/ })).toHaveAttribute('href', '#/setup');
  });

  it('opens the footer credit modal from the "두리쌤" link and closes it again', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: '홈' });

    expect(screen.queryByRole('dialog', { name: '제작 정보' })).not.toBeInTheDocument();
    await user.click(screen.getByText('두리쌤'));
    expect(screen.getByRole('dialog', { name: '제작 정보' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('닫기'));
    expect(screen.queryByRole('dialog', { name: '제작 정보' })).not.toBeInTheDocument();
  });
});
