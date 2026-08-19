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
    lastExportedAt: null,
    lastImportedAt: null,
    spreadsheetSelectedAt: null,
    error: null,
    exportNow: vi.fn(),
    importNow: vi.fn(),
    selectSpreadsheet: vi.fn(),
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
      lastExportedAt: null,
      lastImportedAt: null,
      spreadsheetSelectedAt: null,
      error: null,
      exportNow: vi.fn(),
      importNow: vi.fn(),
      selectSpreadsheet: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    renderSidebar();
    expect(screen.queryByText(/연동됨/)).not.toBeInTheDocument();
  });

  it('shows a static "연동됨" indicator when connected, regardless of status', () => {
    vi.mocked(useSheetsSync).mockReturnValue({
      enabled: true,
      connectedEmail: 'teacher@example.com',
      status: 'idle',
      lastExportedAt: null,
      lastImportedAt: null,
      spreadsheetSelectedAt: null,
      error: null,
      exportNow: vi.fn(),
      importNow: vi.fn(),
      selectSpreadsheet: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    renderSidebar();
    expect(screen.getByText('🔗 Google 시트 연동됨')).toBeInTheDocument();
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

  it('calls onClose when a nav link is clicked on mobile (auto-close on navigate)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ open: true, onClose });

    await user.click(screen.getByText('🏠 홈'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when a nav link is clicked on tablet/desktop — only the ☰ toggle should close it there', async () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ open: true, onClose });

    await user.click(screen.getByText('🏠 홈'));
    expect(onClose).not.toHaveBeenCalled();

    matchMediaSpy.mockRestore();
  });
});

describe('Sidebar bottom section', () => {
  it('has no data-export shortcut', () => {
    renderSidebar();
    expect(screen.queryByText(/데이터 내보내기/)).not.toBeInTheDocument();
  });

  it('opens and closes the user manual modal', async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.queryByRole('dialog', { name: '사용자 매뉴얼' })).not.toBeInTheDocument();

    await user.click(screen.getByText('📖 사용자 매뉴얼'));
    expect(screen.getByRole('dialog', { name: '사용자 매뉴얼' })).toBeInTheDocument();

    await user.click(screen.getByText('닫기'));
    expect(screen.queryByRole('dialog', { name: '사용자 매뉴얼' })).not.toBeInTheDocument();
  });
});
