import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import RosterImport from './RosterImport';
import RosterList from './RosterList';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function RosterManager() {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];
  const [classId, setClassId] = useState<number | ''>('');

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="roster-manager-class">대상 학급</Label>
        <Select
          id="roster-manager-class"
          aria-label="대상 학급"
          value={classId}
          onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">학급 선택</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <RosterImport classId={classId} />
      <RosterList classId={classId} />
    </div>
  );
}
