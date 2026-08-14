import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addStudent } from '../../db/students';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

function parseRoster(text: string): { number: number; name: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [num, name] = line.split(/[\t,]/).map((v) => v.trim());
      return { number: Number(num), name, numStr: num };
    })
    .filter((row) => row.numStr !== '' && !Number.isNaN(row.number) && !!row.name)
    .map(({ numStr, ...row }) => row);
}

export default function RosterImport() {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];
  const [classId, setClassId] = useState<number | ''>('');
  const [text, setText] = useState('');

  const handleImport = async () => {
    if (classId === '') return;
    for (const row of parseRoster(text)) {
      await addStudent(classId, row.number, row.name);
    }
    setText('');
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="roster-class">대상 학급</Label>
          <Select
            id="roster-class"
            aria-label="대상 학급"
            value={classId}
            onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">학급 선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="roster-text">명단 붙여넣기</Label>
          <Textarea
            id="roster-text"
            aria-label="명단 붙여넣기"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'번호,이름\n1,홍길동\n2,김철수'}
            rows={4}
          />
        </div>
        <Button onClick={handleImport}>명단 추가</Button>
      </CardContent>
    </Card>
  );
}
