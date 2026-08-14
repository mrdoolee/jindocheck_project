import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('redirects root to /setup', async () => {
    render(<App />);
    expect(await screen.findByText('설정')).toBeInTheDocument();
  });
});
