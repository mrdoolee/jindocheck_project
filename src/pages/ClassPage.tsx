import { NavLink, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import ClassSwitcher from './class/ClassSwitcher';
import ProgressTab from './class/ProgressTab';
import RosterTab from './class/RosterTab';
import SeatingTab from './class/SeatingTab';
import RecordsTab from './class/RecordsTab';

export default function ClassPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const klass = useLiveQuery(async () => (await db.classes.get(id)) ?? null, [id]);

  if (klass === undefined) return null;
  if (klass === null) return <Navigate to="/setup" replace />;

  return (
    <div>
      <ClassSwitcher currentClassId={id} />
      <h1>{klass.name}</h1>
      <nav>
        <NavLink to="progress">진도 체크</NavLink>
        <NavLink to="roster">명렬표</NavLink>
        <NavLink to="seating">자리배치표</NavLink>
        <NavLink to="records">기록</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="progress" replace />} />
        <Route path="progress" element={<ProgressTab classId={id} />} />
        <Route path="roster" element={<RosterTab classId={id} />} />
        <Route path="seating" element={<SeatingTab classId={id} />} />
        <Route path="records" element={<RecordsTab classId={id} />} />
      </Routes>
    </div>
  );
}
