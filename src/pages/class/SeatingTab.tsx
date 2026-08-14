import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateSeat } from '../../db/students';

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
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 60px)`, gap: 4 }}>
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
                  const studentId = Number(e.dataTransfer.getData('text/plain'));
                  updateSeat(studentId, row, col);
                }}
                style={{ border: '1px solid #ccc', height: 40 }}
              >
                {student && (
                  <div draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(student.id))}>
                    {student.name}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div>
        <h2>미배치 학생</h2>
        {unseated.map((s) => (
          <div key={s.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(s.id!))}>
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
