import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SheetsSyncManager from './SheetsSyncManager';
import { SheetsSyncProvider } from '@/hooks/useSheetsSync';
import { syncTick, getLastSyncedAt } from '../../db/sheetsSync';

vi.mock('../../db/sheetsSync', () => ({
  syncTick: vi.fn(),
  getLastSyncedAt: vi.fn(() => null),
}));

vi.mock('../../db/dirtyBus', () => ({
  onDirty: vi.fn(() => () => {}),
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
  vi.mocked(syncTick).mockReset();
  vi.mocked(getLastSyncedAt).mockReturnValue(null);
  vi.unstubAllGlobals();
});

describe('SheetsSyncManager', () => {
  it('shows a connect button when not connected', async () => {
    stubMeEndpoint(false);
    renderManager();
    expect(await screen.findByText('구글 계정 연결하기')).toBeInTheDocument();
    expect(screen.queryByText('지금 동기화')).not.toBeInTheDocument();
  });

  it('shows the connected email and sync controls once connected', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    vi.mocked(syncTick).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
    const user = userEvent.setup();
    renderManager();

    expect(await screen.findByText(/teacher@example.com/)).toBeInTheDocument();

    await user.click(screen.getByText('지금 동기화'));

    await waitFor(() => {
      expect(syncTick).toHaveBeenCalledWith();
    });
    expect(await screen.findByText(/마지막 동기화:/)).toBeInTheDocument();
  });

  it('shows an error message when syncTick rejects', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    vi.mocked(syncTick).mockRejectedValue(new Error('동기화 서버 오류 (401)'));
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('지금 동기화');
    await user.click(screen.getByText('지금 동기화'));

    expect(await screen.findByText(/동기화 실패:/)).toBeInTheDocument();
  });
});
