import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { setProgress } from '../../db/progress';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function ProgressTab({ classId }: { classId: number }) {
  const curriculum = useLiveQuery(() => db.curriculum.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.where('classId').equals(classId).toArray(), [classId]);

  if (!curriculum || !progress) return null;

  const progressByItem = new Map(progress.map((p) => [p.curriculumItemId, p]));

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {curriculum.map((item) => {
            const p = progressByItem.get(item.id!);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <label className="flex flex-1 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={p?.done ?? false}
                    onChange={(e) => setProgress(classId, item.id!, e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                  />
                  <span className={p?.done ? 'text-muted-foreground line-through' : ''}>
                    {item.unit} - {item.lesson}
                  </span>
                </label>
                {p?.done && p.date && (
                  <Input
                    type="date"
                    aria-label={`날짜-${item.id}`}
                    value={p.date}
                    onChange={(e) => {
                      if (e.target.value) setProgress(classId, item.id!, true, e.target.value);
                    }}
                    className="w-auto"
                  />
                )}
              </li>
            );
          })}
          {curriculum.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              아직 등록된 진도 항목이 없습니다. 설정 페이지에서 공통 진도표를 먼저 입력하세요.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
