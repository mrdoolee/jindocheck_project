import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addStudent, updateStudent, deleteStudent } from '../../db/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function RosterTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  const handleAdd = async () => {
    const n = Number(number);
    if (!number.trim() || !Number.isFinite(n) || !name.trim()) return;
    await addStudent(classId, n, name.trim());
    setNumber('');
    setName('');
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">번호</TableHead>
              <TableHead>이름</TableHead>
              <TableHead className="w-20 text-right">삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Input
                    key={`number-${s.id}-${s.number}`}
                    defaultValue={s.number}
                    aria-label={`번호-${s.id}`}
                    className="w-16"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isNaN(value)) updateStudent(s.id!, { number: value });
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    key={`name-${s.id}-${s.name}`}
                    defaultValue={s.name}
                    aria-label={`이름-${s.id}`}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value) updateStudent(s.id!, { name: value });
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => deleteStudent(s.id!)}
                  >
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  아직 등록된 학생이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="번호" value={number} onChange={(e) => setNumber(e.target.value)} className="w-24" />
          <Input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
          <Button onClick={handleAdd}>학생 추가</Button>
        </div>
      </CardContent>
    </Card>
  );
}
