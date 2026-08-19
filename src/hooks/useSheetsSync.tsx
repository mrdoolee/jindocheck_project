import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { exportToSheet, importFromSheet, getLastExportedAt, getLastImportedAt } from '../db/sheetsSync';

export interface SheetsSyncStatus {
  enabled: boolean;
  connectedEmail: string | null;
  status: 'idle' | 'exporting' | 'importing' | 'error';
  lastExportedAt: string | null;
  lastImportedAt: string | null;
  error: string | null;
  exportNow: () => void;
  importNow: () => void;
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
  const [status, setStatus] = useState<'idle' | 'exporting' | 'importing' | 'error'>('idle');
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(() => getLastExportedAt());
  const [lastImportedAt, setLastImportedAt] = useState<string | null>(() => getLastImportedAt());
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

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

  const exportNow = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus('exporting');
    try {
      const result = await exportToSheet();
      setLastExportedAt(result.syncedAt);
      setError(null);
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    } finally {
      runningRef.current = false;
    }
  }, []);

  const importNow = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus('importing');
    try {
      const result = await importFromSheet();
      setLastImportedAt(result.syncedAt);
      setError(null);
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    } finally {
      runningRef.current = false;
    }
  }, []);

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

  return {
    enabled,
    connectedEmail,
    status,
    lastExportedAt,
    lastImportedAt,
    error,
    exportNow,
    importNow,
    connect,
    disconnect,
  };
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
