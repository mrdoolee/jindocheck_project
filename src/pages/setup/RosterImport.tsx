import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addStudent } from '../../db/students';

function parseRoster(text: string): { number: number; name: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [num, name] = line.split(/[\t,]/).map((v) => v.trim());
      return { number: Number(num), name };
    })
    .filter((row) => !Number.isNaN(row.number) && !!row.name);
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
    <section>
      <h2>학생 명단 붙여넣기</h2>
      <select
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
      </select>
      <textarea
        aria-label="명단 붙여넣기"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'번호,이름\n1,홍길동\n2,김철수'}
      />
      <button onClick={handleImport}>명단 추가</button>
    </section>
  );
}
