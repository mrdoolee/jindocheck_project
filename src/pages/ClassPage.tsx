import { NavLink, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn } from '@/lib/utils';
import ProgressTab from './class/ProgressTab';
import AttendanceTab from './class/AttendanceTab';
import RecordsTab from './class/RecordsTab';
import SeatingTab from './class/SeatingTab';

const TABS = [
  { to: 'progress', label: '진도체크' },
  { to: 'attendance', label: '출결확인' },
  { to: 'records', label: '누가기록' },
  { to: 'seating', label: '자리배치표' },
];

export default function ClassPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const klass = useLiveQuery(async () => (await db.classes.get(id)) ?? null, [id]);

  if (klass === undefined) return null;
  if (klass === null) return <Navigate to="/setup" replace />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{klass.name}</h1>
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
        <Route path="/" element={<Navigate to="progress" replace />} />
        <Route path="progress" element={<ProgressTab classId={id} />} />
        <Route path="attendance" element={<AttendanceTab classId={id} />} />
        <Route path="records" element={<RecordsTab classId={id} />} />
        <Route path="seating" element={<SeatingTab classId={id} />} />
      </Routes>
    </div>
  );
}
