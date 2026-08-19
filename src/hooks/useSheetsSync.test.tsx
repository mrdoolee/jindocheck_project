import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetsSyncProvider, useSheetsSync } from './useSheetsSync';
import { exportToSheet, importFromSheet, getLastExportedAt, getLastImportedAt } from '../db/sheetsSync';

vi.mock('../db/sheetsSync', () => ({
  exportToSheet: vi.fn(),
  importFromSheet: vi.fn(),
  getLastExportedAt: vi.fn(() => null),
  getLastImportedAt: vi.fn(() => null),
}));

function Probe() {
  const { status, exportNow, importNow } = useSheetsSync();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <button onClick={exportNow}>내보내기</button>
      <button onClick={importNow}>불러오기</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <SheetsSyncProvider>
      <Probe />
    </SheetsSyncProvider>
  );
}

async function flushConnectionCheck() {
  for (let i = 0; i < 5; i++) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

function stubMeEndpoint(connected: boolean, email?: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/auth/me') {
        return new Response(JSON.stringify({ connected, email }), { status: 200 });
      }
      throw new Error(`unexpected fetch to ${url}`);
    })
  );
}

beforeEach(() => {
  vi.mocked(exportToSheet).mockReset();
  vi.mocked(exportToSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
  vi.mocked(importFromSheet).mockReset();
  vi.mocked(importFromSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
  vi.mocked(getLastExportedAt).mockReturnValue(null);
  vi.mocked(getLastImportedAt).mockReturnValue(null);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSheetsSync (manual export/import, no automation)', () => {
  it('never syncs on its own — no timers, no polling', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();

    await vi.advanceTimersByTimeAsync(60000);
    expect(exportToSheet).not.toHaveBeenCalled();
    expect(importFromSheet).not.toHaveBeenCalled();
  });

  it('exportNow calls exportToSheet', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('내보내기').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(exportToSheet).toHaveBeenCalledTimes(1);
    expect(importFromSheet).not.toHaveBeenCalled();
  });

  it('importNow calls importFromSheet', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('불러오기').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(importFromSheet).toHaveBeenCalledTimes(1);
    expect(exportToSheet).not.toHaveBeenCalled();
  });

  it('reflects exporting/idle status while an export runs', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    let resolveExport: (v: { syncedAt: string }) => void;
    vi.mocked(exportToSheet).mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      })
    );
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('내보내기').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('status').textContent).toBe('exporting');

    resolveExport!({ syncedAt: '2026-08-15T00:00:00.000Z' });
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('reflects importing/idle status while an import runs', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    let resolveImport: (v: { syncedAt: string }) => void;
    vi.mocked(importFromSheet).mockReturnValue(
      new Promise((resolve) => {
        resolveImport = resolve;
      })
    );
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('불러오기').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('status').textContent).toBe('importing');

    resolveImport!({ syncedAt: '2026-08-15T00:00:00.000Z' });
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('sets status to error and surfaces the message when export fails', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    vi.mocked(exportToSheet).mockRejectedValue(new Error('동기화 서버 오류 (502)'));
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('내보내기').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('status').textContent).toBe('error');
  });
});
