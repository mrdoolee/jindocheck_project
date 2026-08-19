import { useLiveQuery } from 'dexie-react-hooks';
import { listStudents, updateStudent, deleteStudent } from '../../db/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function RosterList({ classId }: { classId: number | '' }) {
  const students = useLiveQuery(() => (classId === '' ? [] : listStudents(classId)), [classId]) ?? [];

  if (classId === '') {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">학급을 먼저 선택하세요.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <ul className="divide-y divide-border rounded-md border border-border">
          {students.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <Input
                  key={`number-${s.id}-${s.number}`}
                  type="number"
                  defaultValue={s.number}
                  aria-label={`번호-${s.id}`}
                  className="w-16 shrink-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (e.target.value.trim() !== '' && !Number.isNaN(value)) {
                      updateStudent(s.id!, { number: value });
                    }
                  }}
                />
                <Input
                  key={`name-${s.id}-${s.name}`}
                  defaultValue={s.name}
                  aria-label={`이름-${s.id}`}
                  className="min-w-0 flex-1"
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) updateStudent(s.id!, { name: value });
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  key={`role-${s.id}-${s.role ?? ''}`}
                  defaultValue={s.role ?? ''}
                  aria-label={`역할-${s.id}`}
                  placeholder="실장 등"
                  className="min-w-0 flex-1"
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    updateStudent(s.id!, { role: value === '' ? null : value });
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (window.confirm(`${s.name} 학생을 삭제할까요?`)) {
                      deleteStudent(s.id!);
                    }
                  }}
                >
                  삭제
                </Button>
              </div>
            </li>
          ))}
          {students.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">등록된 학생이 없습니다.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
