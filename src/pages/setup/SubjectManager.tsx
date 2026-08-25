import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { createSubject, renameSubject, deleteSubject, reorderSubjects } from '../../db/subjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function SubjectManager() {
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) ?? [];
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createSubject(name.trim());
    setName('');
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    const draggingId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggingId || draggingId === targetId) return;
    const ids = subjects.map((s) => s.id!);
    const fromIndex = ids.indexOf(draggingId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggingId);
    reorderSubjects(ids);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <ul className="divide-y divide-border rounded-md border border-border">
          {subjects.map((s) => (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(s.id))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, s.id!)}
              className="flex cursor-grab items-center justify-between gap-3 px-3 py-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-muted-foreground">
                  ⠿
                </span>
                <span className="font-medium">{s.name}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = window.prompt('새 과목명', s.name);
                    if (next && next.trim()) renameSubject(s.id!, next.trim());
                  }}
                >
                  이름 변경
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (window.confirm(`${s.name}을(를) 삭제할까요? 이 과목의 진도 항목도 함께 삭제됩니다.`)) {
                      deleteSubject(s.id!);
                    }
                  }}
                >
                  삭제
                </Button>
              </div>
            </li>
          ))}
          {subjects.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">아직 등록된 과목이 없습니다.</li>
          )}
        </ul>
        <p className="text-xs text-muted-foreground">항목을 드래그하면 순서를 바꿀 수 있습니다.</p>
        <div className="flex gap-2">
          <Input aria-label="새 과목명" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 수학" />
          <Button onClick={handleAdd} className="shrink-0">
            과목 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
