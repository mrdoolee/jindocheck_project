import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { SheetsSyncProvider } from '@/hooks/useSheetsSync';

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <SheetsSyncProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </SheetsSyncProvider>
  );
}
