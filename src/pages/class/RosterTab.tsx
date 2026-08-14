import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addStudent, updateStudent, deleteStudent } from '../../db/students';

export default function RosterTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!number || !name) return;
    await addStudent(classId, Number(number), name);
    setNumber('');
    setName('');
  };

  return (
    <div>
      <table>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <input
                  defaultValue={s.number}
                  aria-label={`번호-${s.id}`}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (!Number.isNaN(value)) updateStudent(s.id!, { number: value });
                  }}
                />
              </td>
              <td>
                <input
                  defaultValue={s.name}
                  aria-label={`이름-${s.id}`}
                  onBlur={(e) => updateStudent(s.id!, { name: e.target.value })}
                />
              </td>
              <td>
                <button onClick={() => deleteStudent(s.id!)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <input placeholder="번호" value={number} onChange={(e) => setNumber(e.target.value)} />
      <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleAdd}>학생 추가</button>
    </div>
  );
}
