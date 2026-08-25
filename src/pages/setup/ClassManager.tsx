import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { createClass, renameClass, deleteClass, reorderClasses } from '../../db/classes';
import { setClassSubjects } from '../../db/classSubjects';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function ClassManager() {
  const classes = useLiveQuery(() => db.classes.orderBy('order').toArray(), []) ?? [];
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) ?? [];
  const classSubjects = useLiveQuery(() => db.classSubjects.toArray(), []) ?? [];
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createClass(name.trim());
    setName('');
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    const draggingId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggingId || draggingId === targetId) return;
    const ids = classes.map((c) => c.id!);
    const fromIndex = ids.indexOf(draggingId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggingId);
    reorderClasses(ids);
  };

  const toggleSubject = (classId: number, subjectId: number) => {
    const current = classSubjects.filter((cs) => cs.classId === classId).map((cs) => cs.subjectId);
    const next = current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId];
    setClassSubjects(classId, next);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <ul className="divide-y divide-border rounded-md border border-border">
          {classes.map((c) => (
            <li
              key={c.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(c.id))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, c.id!)}
              className="flex cursor-grab items-start justify-between gap-3 px-3 py-2 active:cursor-grabbing"
            >
              <div className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-muted-foreground">
                  ⠿
                </span>
                <div className="min-w-0">
                  <Link to={`/class/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {subjects.map((s) => {
                      const active = classSubjects.some((cs) => cs.classId === c.id && cs.subjectId === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSubject(c.id!, s.id!)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs transition-colors',
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-accent'
                          )}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                    {subjects.length === 0 && (
                      <span className="text-xs text-muted-foreground">설정 &gt; 과목 관리에서 과목을 먼저 추가하세요.</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = window.prompt('새 이름', c.name);
                    if (next && next.trim()) renameClass(c.id!, next.trim());
                  }}
                >
                  이름 변경
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (window.confirm(`${c.name}을(를) 삭제할까요? 학생과 기록도 함께 삭제됩니다.`)) {
                      deleteClass(c.id!);
                    }
                  }}
                >
                  삭제
                </Button>
              </div>
            </li>
          ))}
          {classes.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">아직 등록된 학급이 없습니다.</li>
          )}
        </ul>
        <p className="text-xs text-muted-foreground">
          항목을 드래그하면 순서를 바꿀 수 있습니다. 왼쪽 메뉴의 학급 목록도 이 순서를 따릅니다. 과목 배지를 눌러 그 학급에서
          가르치는 과목을 연결하세요(2개 이상도 가능).
        </p>
        <div className="flex gap-2">
          <Input
            aria-label="새 학급 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 1학년 3반"
          />
          <Button onClick={handleAdd} className="shrink-0">
            학급 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
