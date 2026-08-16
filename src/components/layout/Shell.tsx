import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { SheetsSyncProvider } from '@/hooks/useSheetsSync';

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SheetsSyncProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-2 border-b border-border p-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="메뉴 열기"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            >
              ☰
            </button>
            <span className="text-sm font-semibold">학급 진도 관리</span>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SheetsSyncProvider>
  );
}
