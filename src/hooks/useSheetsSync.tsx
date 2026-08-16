import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { syncTick, getLastSyncedAt } from '../db/sheetsSync';
import { onDirty } from '../db/dirtyBus';

const DEBOUNCE_MS = 4000;
const POLL_MS = 10000;

export interface SheetsSyncStatus {
  enabled: boolean;
  connectedEmail: string | null;
  status: 'idle' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
  syncNow: () => void;
  connect: () => void;
  disconnect: () => Promise<void>;
}

async function fetchConnectionStatus(): Promise<{ connected: boolean; email?: string }> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return { connected: false };
    return (await res.json()) as { connected: boolean; email?: string };
  } catch {
    return { connected: false };
  }
}

function useSheetsSyncInternal(): SheetsSyncStatus {
  const [enabled, setEnabled] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => getLastSyncedAt());
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    fetchConnectionStatus().then((result) => {
      if (cancelled) return;
      setEnabled(result.connected);
      setConnectedEmail(result.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runTick = useCallback(async () => {
    if (!enabled || runningRef.current) return;
    runningRef.current = true;
    setStatus('syncing');
    try {
      const result = await syncTick();
      setLastSyncedAt(result.syncedAt);
      setError(null);
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    } finally {
      runningRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    return onDirty(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') runTick();
      }, DEBOUNCE_MS);
    });
  }, [enabled, runTick]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') runTick();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, runTick]);

  useEffect(() => {
    if (!enabled) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') runTick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [enabled, runTick]);

  const connect = useCallback(() => {
    window.location.href = '/api/auth/google/start';
  }, []);

  const disconnect = useCallback(async () => {
    await fetch('/api/auth/disconnect', { method: 'POST', credentials: 'include' });
    setEnabled(false);
    setConnectedEmail(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { enabled, connectedEmail, status, lastSyncedAt, error, syncNow: runTick, connect, disconnect };
}

const SheetsSyncContext = createContext<SheetsSyncStatus | null>(null);

export function SheetsSyncProvider({ children }: { children: ReactNode }) {
  const value = useSheetsSyncInternal();
  return <SheetsSyncContext.Provider value={value}>{children}</SheetsSyncContext.Provider>;
}

export function useSheetsSync(): SheetsSyncStatus {
  const ctx = useContext(SheetsSyncContext);
  if (!ctx) throw new Error('useSheetsSync must be used within a SheetsSyncProvider');
  return ctx;
}
