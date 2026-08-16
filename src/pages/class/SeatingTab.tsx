import { useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateSeat } from '../../db/students';
import { updateSeatingSize } from '../../db/classes';
import { parseSeatingBackup } from '../../db/seatingImport';
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
  const fileInput = useRef<HTMLInputElement>(null);

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE) updateSeatingSize(classId, n, cols);
  };

  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE) updateSeatingSize(classId, rows, n);
  };

  const seated = new Map(
    students
      .filter((s) => s.seatRow !== null && s.seatCol !== null)
      .map((s) => [`${s.seatRow}-${s.seatCol}`, s])
  );
  const unseated = students.filter((s) => s.seatRow === null || s.seatCol === null);

  const handleImportClick = () => fileInput.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { placements, skipped } = parseSeatingBackup(JSON.parse(text));

      if (
        !window.confirm(
          `배치도 파일을 불러오면 현재 자리배치가 모두 지워지고 파일의 배치로 교체됩니다. 계속할까요? (${placements.length}자리)`
        )
      ) {
        e.target.value = '';
        return;
      }

      const studentByNumber = new Map(students.map((s) => [s.number, s]));
      const unmatched: number[] = [];

      await Promise.all(students.map((s) => updateSeat(s.id!, null, null)));

      for (const p of placements) {
        const student = studentByNumber.get(p.studentNumber);
        if (!student) {
          unmatched.push(p.studentNumber);
          continue;
        }
        await updateSeat(student.id!, p.row, p.col);
      }

      let message = `${placements.length - unmatched.length}명 배치를 불러왔습니다.`;
      if (unmatched.length > 0) {
        message += `\n명단에 없는 번호라 건너뜀: ${unmatched.join(', ')}`;
      }
      if (skipped.length > 0) {
        message += `\n무시된 좌석: ${skipped.length}건`;
      }
      window.alert(message);
    } catch (err) {
      window.alert(`배치도 불러오기 실패: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

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
                value={rows}
                onChange={handleRowsChange}
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
                value={cols}
                onChange={handleColsChange}
                className="h-8 w-16"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              배치도 불러오기
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="배치도 파일 선택"
            />
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
