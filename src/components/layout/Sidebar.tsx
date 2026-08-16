import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { exportData } from '@/db/backup';
import { cn } from '@/lib/utils';
import { useSheetsSync } from '@/hooks/useSheetsSync';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}

function SyncStatusBadge() {
  const { enabled, status, lastSyncedAt, syncNow } = useSheetsSync();
  if (!enabled) return null;

  if (status === 'error') {
    return (
      <button
        onClick={syncNow}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-amber-400 transition-colors hover:bg-slate-800"
      >
        ⚠️ 동기화 실패 · 다시 시도
      </button>
    );
  }

  return (
    <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
      {status === 'syncing' ? '🔄 동기화 중...' : lastSyncedAt ? `🔄 동기화됨 · ${formatRelativeTime(lastSyncedAt)}` : '🔄 동기화 대기 중'}
    </p>
  );
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  );

async function handleExport() {
  const payload = await exportData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Sidebar({ open = false, onClose = () => {} }: { open?: boolean; onClose?: () => void }) {
  const classes = useLiveQuery(() => db.classes.orderBy('order').toArray(), []) ?? [];

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col gap-6 overflow-y-auto bg-slate-900 p-4 text-slate-100 transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavLink to="/" onClick={onClose} className="flex items-center gap-2 px-2 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            학
          </span>
          <span className="text-base font-bold tracking-tight">학급 진도 관리</span>
        </NavLink>

        <nav className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">관리 학급</p>
          <NavLink to="/" end onClick={onClose} className={navItemClass}>
            🏠 홈
          </NavLink>
          {classes.map((c) => (
            <NavLink key={c.id} to={`/class/${c.id}`} onClick={onClose} className={navItemClass}>
              🎒 {c.name}
            </NavLink>
          ))}
          {classes.length === 0 && (
            <p className="px-3 py-1 text-xs text-slate-500">등록된 학급이 없습니다.</p>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <NavLink to="/setup" onClick={onClose} className={navItemClass}>
            ⚙️ 설정 및 백업
          </NavLink>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            ⬆️ 데이터 내보내기
          </button>
          <SyncStatusBadge />
        </div>
      </aside>
    </>
  );
}
