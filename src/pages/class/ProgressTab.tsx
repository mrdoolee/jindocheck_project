import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { setProgress } from '../../db/progress';

export default function ProgressTab({ classId }: { classId: number }) {
  const curriculum = useLiveQuery(() => db.curriculum.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.where('classId').equals(classId).toArray(), [classId]);

  if (!curriculum || !progress) return null;

  const progressByItem = new Map(progress.map((p) => [p.curriculumItemId, p]));

  return (
    <ul>
      {curriculum.map((item) => {
        const p = progressByItem.get(item.id!);
        return (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={p?.done ?? false}
                onChange={(e) => setProgress(classId, item.id!, e.target.checked)}
              />
              {item.unit} - {item.lesson}
            </label>
            {p?.done && p.date && (
              <input
                type="date"
                aria-label={`날짜-${item.id}`}
                value={p.date}
                onChange={(e) => {
                  if (e.target.value) setProgress(classId, item.id!, true, e.target.value);
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
