import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export default function ClassSwitcher({ currentClassId }: { currentClassId: number }) {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];
  const navigate = useNavigate();

  return (
    <select aria-label="학급 전환" value={currentClassId} onChange={(e) => navigate(`/class/${e.target.value}`)}>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
