import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { setProgress } from '../../db/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SubjectProgress({
  classId,
  subjectId,
  subjectName,
}: {
  classId: number;
  subjectId: number;
  subjectName: string;
}) {
  const curriculum = useLiveQuery(() => db.curriculum.where('subjectId').equals(subjectId).sortBy('order'), [subjectId]);
  const progress = useLiveQuery(() => db.progress.where('classId').equals(classId).toArray(), [classId]);

  if (!curriculum || !progress) return null;

  const progressByItem = new Map(progress.map((p) => [p.curriculumItemId, p]));
  const doneCount = curriculum.filter((item) => progressByItem.get(item.id!)?.done).length;
  const total = curriculum.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{subjectName}</CardTitle>
        <span className="text-xs font-medium text-muted-foreground">
          {doneCount}/{total} 완료 ({percent}%)
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {curriculum.map((item) => {
            const p = progressByItem.get(item.id!);
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={p?.done ?? false}
                  onChange={(e) => setProgress(classId, item.id!, e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className={p?.done ? 'text-sm font-medium text-muted-foreground line-through' : 'text-sm font-medium'}>
                    {item.unit}
                  </p>
                  {p?.done && p.date && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">완료일</span>
                      <Input
                        type="date"
                        aria-label={`날짜-${item.id}`}
                        value={p.date}
                        onChange={(e) => {
                          if (e.target.value) setProgress(classId, item.id!, true, e.target.value);
                        }}
                        className="h-6 w-auto border-none bg-transparent p-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
                      />
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {item.lesson}
                </Badge>
              </li>
            );
          })}
          {curriculum.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              아직 등록된 진도 항목이 없습니다. 설정 &gt; 진도표 관리에서 먼저 입력하세요.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ProgressTab({ classId }: { classId: number }) {
  const classSubjects = useLiveQuery(() => db.classSubjects.where('classId').equals(classId).toArray(), [classId]);
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  // ClassPage doesn't remount ProgressTab when switching classes on the same tab (same route,
  // just a new classId prop), so a stale selection from the previous class would otherwise
  // linger — reset back to "let the fallback pick the first subject" whenever classId changes.
  useEffect(() => setActiveSubjectId(null), [classId]);

  if (!classSubjects || !subjects) return null;

  const mySubjects = subjects.filter((s) => classSubjects.some((cs) => cs.subjectId === s.id));

  if (mySubjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          이 학급에 연결된 과목이 없습니다. 설정 &gt; 반 관리에서 과목을 연결하세요.
        </CardContent>
      </Card>
    );
  }

  const selected = mySubjects.find((s) => s.id === activeSubjectId) ?? mySubjects[0];

  return (
    <div className="space-y-4">
      {mySubjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {mySubjects.map((s) => (
            <Button
              key={s.id}
              type="button"
              size="sm"
              variant={selected.id === s.id ? 'default' : 'outline'}
              onClick={() => setActiveSubjectId(s.id!)}
            >
              {s.name}
            </Button>
          ))}
        </div>
      )}
      <SubjectProgress key={selected.id} classId={classId} subjectId={selected.id!} subjectName={selected.name} />
    </div>
  );
}
