import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { createClass, renameClass, deleteClass } from '../../db/classes';

export default function ClassManager() {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createClass(name.trim());
    setName('');
  };

  return (
    <section>
      <h2>학급</h2>
      <ul>
        {classes.map((c) => (
          <li key={c.id}>
            <Link to={`/class/${c.id}`}>{c.name}</Link>
            <button
              onClick={() => {
                const next = window.prompt('새 이름', c.name);
                if (next) renameClass(c.id!, next);
              }}
            >
              이름 변경
            </button>
            <button
              onClick={() => {
                if (window.confirm(`${c.name}을(를) 삭제할까요? 학생과 기록도 함께 삭제됩니다.`)) {
                  deleteClass(c.id!);
                }
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      <input
        aria-label="새 학급 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 1학년 3반"
      />
      <button onClick={handleAdd}>학급 추가</button>
    </section>
  );
}
