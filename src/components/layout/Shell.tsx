import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { SheetsSyncProvider } from '@/hooks/useSheetsSync';

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  return (
    <SheetsSyncProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-2 border-b border-border p-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            >
              ☰
            </button>
            <span className="text-sm font-semibold">진도 췍</span>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SheetsSyncProvider>
  );
}
