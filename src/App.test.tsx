import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the home page with the sidebar visible', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /설정 및 백업/ })).toHaveAttribute('href', '#/setup');
  });
});
