import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addCurriculumItem, updateCurriculumItem, deleteCurriculumItem } from '../../db/curriculum';

export default function CurriculumManager() {
  const items = useLiveQuery(() => db.curriculum.orderBy('order').toArray(), []) ?? [];
  const [unit, setUnit] = useState('');
  const [lesson, setLesson] = useState('');

  const handleAdd = async () => {
    if (!unit.trim() || !lesson.trim()) return;
    await addCurriculumItem(unit.trim(), lesson.trim());
    setUnit('');
    setLesson('');
  };

  return (
    <section>
      <h2>공통 진도표</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <input
              key={`unit-${item.id}-${item.unit}`}
              defaultValue={item.unit}
              aria-label={`단원-${item.id}`}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value) updateCurriculumItem(item.id!, { unit: value });
              }}
            />
            <input
              key={`lesson-${item.id}-${item.lesson}`}
              defaultValue={item.lesson}
              aria-label={`차시-${item.id}`}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value) updateCurriculumItem(item.id!, { lesson: value });
              }}
            />
            <button onClick={() => deleteCurriculumItem(item.id!)}>삭제</button>
          </li>
        ))}
      </ol>
      <input aria-label="새 단원" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="단원" />
      <input aria-label="새 차시" value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="차시" />
      <button onClick={handleAdd}>진도 항목 추가</button>
    </section>
  );
}
