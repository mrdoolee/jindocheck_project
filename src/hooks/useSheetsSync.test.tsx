import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetsSyncProvider, useSheetsSync } from './useSheetsSync';
import { syncTick, getLastSyncedAt } from '../db/sheetsSync';
import { notifyDirty } from '../db/dirtyBus';

vi.mock('../db/sheetsSync', () => ({
  syncTick: vi.fn(),
  getLastSyncedAt: vi.fn(() => null),
}));

function Probe() {
  const { status, syncNow } = useSheetsSync();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <button onClick={syncNow}>동기화</button>
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

function setVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (visible ? 'visible' : 'hidden') });
}

// The initial connection check chains several microtasks (fetch -> res.json() -> setState);
// a single advanceTimersByTimeAsync(0) doesn't reliably drain all of them under fake timers.
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
  vi.mocked(syncTick).mockReset();
  vi.mocked(syncTick).mockResolvedValue({ syncedAt: '2026-08-15T00:00:00.000Z' });
  vi.mocked(getLastSyncedAt).mockReturnValue(null);
  setVisible(true);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSheetsSync automation', () => {
  it('does nothing when not connected, even on notifyDirty', async () => {
    stubMeEndpoint(false);
    renderProbe();
    await flushConnectionCheck();

    notifyDirty();
    await vi.advanceTimersByTimeAsync(20000);
    expect(syncTick).not.toHaveBeenCalled();
  });

  it('runs a debounced sync after a local write (notifyDirty) once connected', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();

    notifyDirty();
    await vi.advanceTimersByTimeAsync(3000);
    expect(syncTick).not.toHaveBeenCalled(); // still within debounce window

    await vi.advanceTimersByTimeAsync(2000);
    expect(syncTick).toHaveBeenCalledTimes(1);
    expect(syncTick).toHaveBeenCalledWith();
  });

  it('collapses rapid successive writes into a single sync (debounce restarts on each notifyDirty)', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();

    notifyDirty();
    await vi.advanceTimersByTimeAsync(2000);
    notifyDirty(); // restarts the debounce window
    await vi.advanceTimersByTimeAsync(2000);
    expect(syncTick).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(syncTick).toHaveBeenCalledTimes(1);
  });

  it('polls periodically even without local writes', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();

    await vi.advanceTimersByTimeAsync(10000);
    expect(syncTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10000);
    expect(syncTick).toHaveBeenCalledTimes(2);
  });

  it('does not poll or debounce-sync while the tab is hidden', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    setVisible(false);
    renderProbe();
    await flushConnectionCheck();

    notifyDirty();
    await vi.advanceTimersByTimeAsync(30000);
    expect(syncTick).not.toHaveBeenCalled();
  });

  it('runs a manually-triggered sync (syncNow) even while the tab is hidden', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    renderProbe();
    await flushConnectionCheck();
    setVisible(false);

    screen.getByText('동기화').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(syncTick).toHaveBeenCalledTimes(1);
  });

  it('reflects syncing/idle status while a tick runs', async () => {
    stubMeEndpoint(true, 'teacher@example.com');
    let resolveTick: (v: { syncedAt: string }) => void;
    vi.mocked(syncTick).mockReturnValue(
      new Promise((resolve) => {
        resolveTick = resolve;
      })
    );
    renderProbe();
    await flushConnectionCheck();

    notifyDirty();
    await vi.advanceTimersByTimeAsync(4000);
    expect(screen.getByTestId('status').textContent).toBe('syncing');

    resolveTick!({ syncedAt: '2026-08-15T00:00:00.000Z' });
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });
});
