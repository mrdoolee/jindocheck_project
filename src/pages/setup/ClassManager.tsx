import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { createClass, renameClass, deleteClass } from '../../db/classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClassManager() {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createClass(name.trim());
    setName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>학급</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border rounded-md border border-border">
          {classes.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <Link to={`/class/${c.id}`} className="font-medium text-primary hover:underline">
                {c.name}
              </Link>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = window.prompt('새 이름', c.name);
                    if (next && next.trim()) renameClass(c.id!, next.trim());
                  }}
                >
                  이름 변경
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (window.confirm(`${c.name}을(를) 삭제할까요? 학생과 기록도 함께 삭제됩니다.`)) {
                      deleteClass(c.id!);
                    }
                  }}
                >
                  삭제
                </Button>
              </div>
            </li>
          ))}
          {classes.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">아직 등록된 학급이 없습니다.</li>
          )}
        </ul>
        <div className="flex gap-2">
          <Input
            aria-label="새 학급 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 1학년 3반"
          />
          <Button onClick={handleAdd} className="shrink-0">
            학급 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
