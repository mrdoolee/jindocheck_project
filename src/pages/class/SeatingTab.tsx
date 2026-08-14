import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateSeat } from '../../db/students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ROWS = 6;
const COLS = 6;

export default function SeatingTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).toArray(), [classId]) ?? [];

  const seated = new Map(
    students
      .filter((s) => s.seatRow !== null && s.seatCol !== null)
      .map((s) => [`${s.seatRow}-${s.seatCol}`, s])
  );
  const unseated = students.filter((s) => s.seatRow === null || s.seatCol === null);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="overflow-auto p-4">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(64px, 1fr))` }}
          >
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const key = `${row}-${col}`;
                const student = seated.get(key);
                return (
                  <div
                    key={key}
                    aria-label={`좌석-${row}-${col}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const draggedId = Number(e.dataTransfer.getData('text/plain'));
                      const draggedStudent = students.find((s) => s.id === draggedId);
                      if (!draggedStudent) return;
                      const occupant = seated.get(key);
                      if (occupant && occupant.id !== draggedId) {
                        updateSeat(occupant.id!, draggedStudent.seatRow, draggedStudent.seatCol);
                      }
                      updateSeat(draggedId, row, col);
                    }}
                    className="flex h-14 items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-center transition-colors"
                  >
                    {student && (
                      <div
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(student.id))}
                        className="w-full cursor-grab select-none rounded-md bg-primary px-1 py-1.5 text-xs font-medium text-primary-foreground shadow-sm active:cursor-grabbing"
                      >
                        {student.name}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">미배치 학생</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {unseated.map((s) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(s.id!))}
              className="cursor-grab select-none rounded-full border border-border bg-white px-3 py-1 text-xs font-medium shadow-sm active:cursor-grabbing"
            >
              {s.name}
            </div>
          ))}
          {unseated.length === 0 && (
            <p className="text-sm text-muted-foreground">모든 학생이 배치되었습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
