import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ClassesPage from './setup/ClassesPage';
import CurriculumPage from './setup/CurriculumPage';
import RosterPage from './setup/RosterPage';
import BackupPage from './setup/BackupPage';

const TABS = [
  { to: 'classes', label: '반 관리' },
  { to: 'curriculum', label: '진도표 관리' },
  { to: 'roster', label: '명단 붙여넣기' },
  { to: 'backup', label: '백업' },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">설정 및 백업</h1>
        <p className="text-sm text-muted-foreground">학급, 공통 진도표, 학생 명단, 백업을 관리합니다.</p>
      </div>
      <nav className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
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
      </Routes>
    </div>
  );
}
