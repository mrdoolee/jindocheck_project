import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetsSyncProvider, useSheetsSync } from './useSheetsSync';
import { exportToSheet, importFromSheet, getLastExportedAt, getLastImportedAt } from '../db/sheetsSync';
import { pickSpreadsheet } from '../lib/googlePicker';

vi.mock('../db/sheetsSync', () => ({
  exportToSheet: vi.fn(),
  importFromSheet: vi.fn(),
  getLastExportedAt: vi.fn(() => null),
  getLastImportedAt: vi.fn(() => null),
  readErrorMessage: vi.fn(async (res: Response) => {
    const body = await res.json().catch(() => ({}));
    return (body as { error?: string }).error ?? `동기화 서버 오류 (${res.status})`;
  }),
}));

vi.mock('../lib/googlePicker', () => ({
  pickSpreadsheet: vi.fn(),
}));

function Probe() {
  const { status, exportNow, importNow, selectSpreadsheet, spreadsheetSelectedAt, disconnect } = useSheetsSync();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="selected-at">{spreadsheetSelectedAt ?? ''}</div>
      <button onClick={exportNow}>내보내기</button>
      <button onClick={importNow}>불러오기</button>
      <button onClick={selectSpreadsheet}>다른 스프레드시트 선택</button>
      <button onClick={disconnect}>연결 해제</button>
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

function stubPickerFlow(options: { accessTokenOk?: boolean; selectOk?: boolean } = {}) {
  const posted: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/auth/me') {
        return new Response(JSON.stringify({ connected: true, email: 'teacher@example.com' }), { status: 200 });
      }
      if (url === '/api/auth/google/access-token') {
        if (options.accessTokenOk === false) {
          return new Response(JSON.stringify({ error: '인증 실패' }), { status: 401 });
        }
        return new Response(JSON.stringify({ accessToken: 'token-abc' }), { status: 200 });
      }
      if (url === '/api/auth/google/select-spreadsheet' && init?.method === 'POST') {
        posted.push(JSON.parse(init.body as string));
        if (options.selectOk === false) {
          return new Response(JSON.stringify({ error: '동기화 서버 오류' }), { status: 502 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url === '/api/auth/disconnect' && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`unexpected fetch to ${url}`);
    })
  );
  return posted;
}

beforeEach(() => {
  vi.mocked(exportToSheet).mockReset();
  vi.mocked(exportToSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
  vi.mocked(importFromSheet).mockReset();
  vi.mocked(importFromSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
  vi.mocked(getLastExportedAt).mockReturnValue(null);
  vi.mocked(getLastImportedAt).mockReturnValue(null);
  vi.mocked(pickSpreadsheet).mockReset();
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

describe('useSheetsSync selectSpreadsheet (Google Picker)', () => {
  it('fetches an access token, opens the picker, and posts the chosen spreadsheet id', async () => {
    const posted = stubPickerFlow();
    vi.mocked(pickSpreadsheet).mockResolvedValue('sheet-123');
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(pickSpreadsheet).toHaveBeenCalledWith('token-abc');
    expect(posted).toEqual([{ spreadsheetId: 'sheet-123', accessToken: 'token-abc' }]);
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('does not call select-spreadsheet when the user cancels the picker', async () => {
    const posted = stubPickerFlow();
    vi.mocked(pickSpreadsheet).mockResolvedValue(null);
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(posted).toEqual([]);
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('reflects selecting status while the flow is in progress', async () => {
    stubPickerFlow();
    let resolvePick: (id: string | null) => void;
    vi.mocked(pickSpreadsheet).mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      })
    );
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('status').textContent).toBe('selecting');

    resolvePick!('sheet-123');
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('sets status to error when the access-token request fails', async () => {
    stubPickerFlow({ accessTokenOk: false });
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(pickSpreadsheet).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('error');
  });

  it('sets status to error when select-spreadsheet rejects', async () => {
    stubPickerFlow({ selectOk: false });
    vi.mocked(pickSpreadsheet).mockResolvedValue('sheet-123');
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(screen.getByTestId('status').textContent).toBe('error');
  });

  it('shows spreadsheetSelectedAt after a successful selection, and clears it on the next export', async () => {
    stubPickerFlow();
    vi.mocked(pickSpreadsheet).mockResolvedValue('sheet-123');
    vi.mocked(exportToSheet).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('selected-at').textContent).not.toBe('');

    screen.getByText('내보내기').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('selected-at').textContent).toBe('');
  });

  it('clears spreadsheetSelectedAt on disconnect', async () => {
    stubPickerFlow();
    vi.mocked(pickSpreadsheet).mockResolvedValue('sheet-123');
    renderProbe();
    await flushConnectionCheck();

    screen.getByText('다른 스프레드시트 선택').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('selected-at').textContent).not.toBe('');

    screen.getByText('연결 해제').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByTestId('selected-at').textContent).toBe('');
  });
});
