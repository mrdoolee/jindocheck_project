import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { setProgress } from '../../db/progress';

export default function ProgressTab({ classId }: { classId: number }) {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, boolean>>(new Map());
  const curriculum = useLiveQuery(() => db.curriculum.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.where('classId').equals(classId).toArray(), [classId]);

  // Clear optimistic updates when classId changes
  useEffect(() => {
    setOptimisticUpdates(new Map());
  }, [classId]);

  if (!curriculum || !progress) return null;

  const progressByItem = new Map(progress.map((p) => [p.curriculumItemId, p]));

  return (
    <ul>
      {curriculum.map((item) => {
        const p = progressByItem.get(item.id!);
        const hasOptimisticUpdate = optimisticUpdates.has(item.id!);
        const optimisticDone = hasOptimisticUpdate ? optimisticUpdates.get(item.id!)! : p?.done ?? false;
        const optimisticDate = optimisticDone ? new Date().toISOString().slice(0, 10) : null;

        return (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={optimisticDone}
                onChange={(e) => {
                  const newDone = e.target.checked;
                  setOptimisticUpdates(new Map(optimisticUpdates).set(item.id!, newDone));
                  setProgress(classId, item.id!, newDone);
                }}
              />
              {item.unit} - {item.lesson}
              {optimisticDone && optimisticDate && <span> ({optimisticDate})</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
