import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addCurriculumItem, updateCurriculumItem, deleteCurriculumItem, reorderCurriculumItems } from '../../db/curriculum';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function CurriculumManager() {
  const items = useLiveQuery(() => db.curriculum.orderBy('order').toArray(), []) ?? [];
  const [unit, setUnit] = useState('');
  const [lesson, setLesson] = useState('');

  const handleAdd = async () => {
    if (!unit.trim() || !lesson.trim()) return;
    await addCurriculumItem(unit.trim(), lesson.trim());
    setUnit('');
    setLesson('');
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    const draggingId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggingId || draggingId === targetId) return;
    const ids = items.map((item) => item.id!);
    const fromIndex = ids.indexOf(draggingId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggingId);
    reorderCurriculumItems(ids);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">항목을 드래그하면 순서를 바꿀 수 있습니다.</p>
        <ol className="list-none divide-y divide-border rounded-md border border-border">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(item.id))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, item.id!)}
              className="flex cursor-grab items-center gap-2 px-3 py-2 active:cursor-grabbing"
            >
              <span aria-hidden className="shrink-0 text-muted-foreground">
                ⠿
              </span>
              <span className="w-6 shrink-0 text-sm text-muted-foreground">{index + 1}</span>
              <Input
                key={`unit-${item.id}-${item.unit}`}
                defaultValue={item.unit}
                aria-label={`단원-${item.id}`}
                className="flex-1"
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value) updateCurriculumItem(item.id!, { unit: value });
                }}
              />
              <Input
                key={`lesson-${item.id}-${item.lesson}`}
                defaultValue={item.lesson}
                aria-label={`차시-${item.id}`}
                className="flex-1"
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value) updateCurriculumItem(item.id!, { lesson: value });
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() => deleteCurriculumItem(item.id!)}
              >
                삭제
              </Button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">아직 등록된 진도 항목이 없습니다.</li>
          )}
        </ol>
        <div className="flex gap-2">
          <Input aria-label="새 단원" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="단원" className="flex-1" />
          <Input aria-label="새 차시" value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="차시" className="flex-1" />
          <Button onClick={handleAdd} className="shrink-0">
            진도 항목 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
