import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import FooterCreditModal from './FooterCreditModal';
import { SheetsSyncProvider } from '@/hooks/useSheetsSync';

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [creditOpen, setCreditOpen] = useState(false);

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
            <Link to="/" className="text-sm font-semibold hover:underline">
              진도 췍
            </Link>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          <footer className="shrink-0 border-t border-border px-3 py-3 text-center text-xs text-muted-foreground">
            © 2026 Designed &amp; Developed by{' '}
            <button
              type="button"
              onClick={() => setCreditOpen(true)}
              className="underline underline-offset-2 hover:no-underline"
            >
              두리쌤
            </button>
            . All rights reserved.
          </footer>
        </div>
      </div>
      <FooterCreditModal open={creditOpen} onClose={() => setCreditOpen(false)} />
    </SheetsSyncProvider>
  );
}
