import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ClassesPage from './setup/ClassesPage';
import CurriculumPage from './setup/CurriculumPage';
import RosterPage from './setup/RosterPage';
import BackupPage from './setup/BackupPage';
import SheetsSyncPage from './setup/SheetsSyncPage';
import TimetableSettingsPage from './setup/TimetableSettingsPage';

const TABS = [
  { to: 'classes', label: '반 관리' },
  { to: 'curriculum', label: '진도표 관리' },
  { to: 'roster', label: '명단 관리' },
  { to: 'timetable', label: '시간표 설정' },
  { to: 'backup', label: '백업' },
  { to: 'sheets', label: 'Google 시트' },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">설정 및 백업</h1>
        <p className="text-sm text-muted-foreground">학급, 공통 진도표, 학생 명단, 백업을 관리합니다.</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'shrink-0 whitespace-nowrap rounded-t-md border-b-2 px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="classes" replace />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="curriculum" element={<CurriculumPage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="sheets" element={<SheetsSyncPage />} />
        <Route path="timetable" element={<TimetableSettingsPage />} />
      </Routes>
    </div>
  );
}
