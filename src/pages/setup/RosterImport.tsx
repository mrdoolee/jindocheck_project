import { useState } from 'react';
import { addStudent } from '../../db/students';
import { Button } from '@/components/ui/button';
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

export default function RosterImport({ classId }: { classId: number | '' }) {
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
          <Label htmlFor="roster-text">명단 붙여넣기</Label>
          <Textarea
            id="roster-text"
            aria-label="명단 붙여넣기"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'번호,이름\n1,홍길동\n2,김철수'}
            rows={4}
            disabled={classId === ''}
          />
        </div>
        <Button onClick={handleImport} disabled={classId === ''}>
          명단 추가
        </Button>
      </CardContent>
    </Card>
  );
}
