import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateSeat, clearSeating } from '../../db/students';
import { updateSeatingSize } from '../../db/classes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEFAULT_ROWS = 6;
const DEFAULT_COLS = 6;
const MIN_SIZE = 1;
const MAX_SIZE = 20;

export default function SeatingTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).toArray(), [classId]) ?? [];
  const classRecord = useLiveQuery(() => db.classes.get(classId), [classId]);
  const rows = classRecord?.seatRows ?? DEFAULT_ROWS;
  const cols = classRecord?.seatCols ?? DEFAULT_COLS;

  // Local draft state, committed on blur — the inputs used to be bound straight to the DB
  // value with no buffer, so clearing the field to type a new number (e.g. backspace to
  // retype "6" as "12") produced an out-of-range/empty intermediate value that immediately
  // snapped back to the old DB value, making the field look frozen/unresponsive.
  const [rowsInput, setRowsInput] = useState(String(rows));
  const [colsInput, setColsInput] = useState(String(cols));

  useEffect(() => setRowsInput(String(rows)), [rows]);
  useEffect(() => setColsInput(String(cols)), [cols]);

  const commitRows = () => {
    const n = Number(rowsInput);
    if (Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE) {
      if (n !== rows) updateSeatingSize(classId, n, cols);
    } else {
      setRowsInput(String(rows));
    }
  };

  const commitCols = () => {
    const n = Number(colsInput);
    if (Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE) {
      if (n !== cols) updateSeatingSize(classId, rows, n);
    } else {
      setColsInput(String(cols));
    }
  };

  const commitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  const seated = new Map(
    students
      .filter((s) => s.seatRow !== null && s.seatCol !== null)
      .map((s) => [`${s.seatRow}-${s.seatCol}`, s])
  );
  const unseated = students.filter((s) => s.seatRow === null || s.seatCol === null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">자리배치표</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="seat-rows" className="text-xs text-muted-foreground">
                행
              </Label>
              <Input
                id="seat-rows"
                type="number"
                aria-label="행 개수"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={rowsInput}
                onChange={(e) => setRowsInput(e.target.value)}
                onBlur={commitRows}
                onKeyDown={commitOnEnter}
                className="h-8 w-16"
              />
              <Label htmlFor="seat-cols" className="text-xs text-muted-foreground">
                열
              </Label>
              <Input
                id="seat-cols"
                type="number"
                aria-label="열 개수"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={colsInput}
                onChange={(e) => setColsInput(e.target.value)}
                onBlur={commitCols}
                onKeyDown={commitOnEnter}
                className="h-8 w-16"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={seated.size === 0}
              onClick={() => {
                if (window.confirm('모든 학생의 자리 배치를 초기화할까요?')) {
                  clearSeating(classId);
                }
              }}
            >
              초기화
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto pt-0">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(64px, 1fr))` }}
          >
            {Array.from({ length: rows }).map((_, row) =>
              Array.from({ length: cols }).map((_, col) => {
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
                      <div className="relative w-full">
                        <div
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', String(student.id))}
                          className="flex w-full cursor-grab select-none flex-col items-center rounded-md bg-primary px-1 py-1 leading-tight text-primary-foreground shadow-sm active:cursor-grabbing"
                        >
                          <span className="text-[11px]">{student.number}번</span>
                          <span className="text-xs font-medium">{student.name}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`${student.name} 자리 비우기`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSeat(student.id!, null, null);
                          }}
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] leading-none text-destructive shadow ring-1 ring-border hover:bg-destructive hover:text-destructive-foreground"
                        >
                          ×
                        </button>
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
              {s.number}번 {s.name}
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
