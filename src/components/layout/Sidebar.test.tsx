import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSheetsSync } from '@/hooks/useSheetsSync';

vi.mock('@/hooks/useSheetsSync', () => ({
  useSheetsSync: vi.fn(),
}));

function renderSidebar(props?: { open?: boolean; onClose?: () => void }) {
  return render(
    <MemoryRouter>
      <Sidebar {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(useSheetsSync).mockReset();
  vi.mocked(useSheetsSync).mockReturnValue({
    enabled: false,
    connectedEmail: null,
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    syncNow: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
});

describe('Sidebar sync status badge', () => {
  it('renders nothing when sync is disabled (no token configured)', () => {
    vi.mocked(useSheetsSync).mockReturnValue({
      enabled: false,
      connectedEmail: null,
      status: 'idle',
      lastSyncedAt: null,
      error: null,
      syncNow: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    renderSidebar();
    expect(screen.queryByText(/동기화/)).not.toBeInTheDocument();
  });

  it('shows a syncing indicator while a tick is in flight', () => {
    vi.mocked(useSheetsSync).mockReturnValue({
      enabled: true,
      connectedEmail: 'teacher@example.com',
      status: 'syncing',
      lastSyncedAt: null,
      error: null,
      syncNow: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    renderSidebar();
    expect(screen.getByText(/동기화 중/)).toBeInTheDocument();
  });

  it('shows the last-synced time when idle', () => {
    vi.mocked(useSheetsSync).mockReturnValue({
      enabled: true,
      connectedEmail: 'teacher@example.com',
      status: 'idle',
      lastSyncedAt: new Date().toISOString(),
      error: null,
      syncNow: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    renderSidebar();
    expect(screen.getByText(/동기화됨/)).toBeInTheDocument();
  });

  it('shows a retry control on error and calls syncNow when clicked', async () => {
    const syncNow = vi.fn();
    vi.mocked(useSheetsSync).mockReturnValue({
      enabled: true,
      connectedEmail: 'teacher@example.com',
      status: 'error',
      lastSyncedAt: null,
      error: '서버 오류',
      syncNow,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    const user = userEvent.setup();
    renderSidebar();

    const retryButton = screen.getByText(/동기화 실패/);
    await user.click(retryButton);
    expect(syncNow).toHaveBeenCalled();
  });
});

describe('Sidebar mobile drawer', () => {
  it('shows no backdrop when closed', () => {
    renderSidebar({ open: false });
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('shows a backdrop and calls onClose when it is clicked, while open', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ open: true, onClose });

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when a nav link is clicked (auto-close on navigate)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ open: true, onClose });

    await user.click(screen.getByText('🏠 홈'));
    expect(onClose).toHaveBeenCalled();
  });
});
