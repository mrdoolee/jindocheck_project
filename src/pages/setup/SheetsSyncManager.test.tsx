import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SheetsSyncManager from './SheetsSyncManager';
import { SheetsSyncProvider } from '@/hooks/useSheetsSync';
import { exportToSheet, importFromSheet, getLastExportedAt, getLastImportedAt } from '../../db/sheetsSync';

vi.mock('../../db/sheetsSync', () => ({
  exportToSheet: vi.fn(),
  importFromSheet: vi.fn(),
  getLastExportedAt: vi.fn(() => null),
  getLastImportedAt: vi.fn(() => null),
}));

function stubMeEndpoint(connected: boolean, email?: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/auth/me') {
        return new Response(JSON.stringify({ connected, email }), { status: 200 });
      }
      if (url === '/api/auth/disconnect' && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`unexpected fetch to ${url}`);
    })
  );
}

function renderManager() {
  return render(
    <SheetsSyncProvider>
      <SheetsSyncManager />
    </SheetsSyncProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(exportToSheet).mockReset();
  vi.mocked(importFromSheet).mockReset();
  vi.mocked(getLastExportedAt).mockReturnValue(null);
  vi.mocked(getLastImportedAt).mockReturnValue(null);
  vi.unstubAllGlobals();
});

describe('SheetsSyncManager', () => {
  it('shows a connect button when not connected', async () => {
    stubMeEndpoint(false);
    renderManager();
    expect(await screen.findByText('구글 계정 연결하기')).toBeInTheDocument();
    expect(screen.queryByText('내보내기')).not.toBeInTheDocument();
  });

  it('exports after confirm, and shows the last-exported timestamp', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    vi.mocked(exportToSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    renderManager();

    expect(await screen.findByText(/teacher@example.com/)).toBeInTheDocument();

    await user.click(screen.getByText('내보내기'));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(exportToSheet).toHaveBeenCalledWith();
    });
    expect(await screen.findByText(/마지막 내보내기:/)).toBeInTheDocument();
  });

  it('does not export when the confirm dialog is dismissed', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    window.confirm = vi.fn(() => false);
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('내보내기');
    await user.click(screen.getByText('내보내기'));

    expect(exportToSheet).not.toHaveBeenCalled();
  });

  it('imports after confirm, and shows the last-imported timestamp', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    vi.mocked(importFromSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('불러오기');
    await user.click(screen.getByText('불러오기'));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(importFromSheet).toHaveBeenCalledWith();
    });
    expect(await screen.findByText(/마지막 불러오기:/)).toBeInTheDocument();
  });

  it('shows an error message when export rejects', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    vi.mocked(exportToSheet).mockRejectedValue(new Error('동기화 서버 오류 (401)'));
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('내보내기');
    await user.click(screen.getByText('내보내기'));

    expect(await screen.findByText(/동기화 실패:/)).toBeInTheDocument();
  });
});
