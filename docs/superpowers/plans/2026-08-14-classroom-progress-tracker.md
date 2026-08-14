# 학급 진도/기록 관리 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중고등 교과담임 교사가 학급별 진도 체크, 명렬표, 자리배치표, 출결/칭찬포인트/특이사항 기록을 중앙 서버 없이 브라우저(IndexedDB)에만 저장하며 관리하는 정적 웹앱을 만든다.

**Architecture:** React + Vite로 빌드하는 순수 정적 SPA. 데이터 계층은 Dexie.js(IndexedDB 래퍼)로 구현하고 `dexie-react-hooks`의 `useLiveQuery`로 UI가 DB 변경에 자동 반응하게 한다. 라우팅은 `HashRouter`를 사용해 서버 설정 없이(정적 호스팅, `file://` 모두) 동작하게 한다. 백업은 전체 테이블을 JSON으로 내보내기/불러오기 하는 기능으로 구현한다.

**Tech Stack:** React 18, TypeScript, Vite, Dexie.js, dexie-react-hooks, react-router-dom (HashRouter), Vitest + Testing Library + fake-indexeddb

## Global Constraints

- 백엔드/서버 없음. 정적 파일만으로 동작해야 함 (정적 호스팅과 `file://` 양쪽에서 동작).
- 모든 데이터는 브라우저 IndexedDB에만 저장됨. 데이터가 브라우저 밖으로 나가는 유일한 경로는 사용자가 명시적으로 누르는 JSON 백업 내보내기.
- UI 언어는 한국어.
- 날짜는 ISO `yyyy-mm-dd` 문자열로 저장.
- 라우팅은 `HashRouter` 사용 (서버 리라이트 불필요, `file://`에서도 동작).
- TypeScript strict 모드 사용.

---

## 파일 구조 개요

```
package.json, vite.config.ts, tsconfig.json, index.html
src/
  main.tsx, App.tsx, index.css
  test/setup.ts
  db/
    types.ts       # 공용 타입
    db.ts          # Dexie 스키마
    classes.ts      # 반 CRUD
    students.ts      # 학생 CRUD
    curriculum.ts     # 진도표 항목 CRUD
    progress.ts      # 반별 진도 체크
    entries.ts       # 출결/칭찬포인트/특이사항 통합 CRUD+조회
    backup.ts       # 내보내기/불러오기
  pages/
    SetupPage.tsx
    ClassPage.tsx
    setup/
      ClassManager.tsx
      CurriculumManager.tsx
      RosterImport.tsx
      BackupManager.tsx
    class/
      ClassSwitcher.tsx
      ProgressTab.tsx
      RosterTab.tsx
      SeatingTab.tsx
      RecordsTab.tsx
```

---

### Task 1: 프로젝트 스캐폴딩 및 테스트 도구 설정

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `App` 컴포넌트 (default export, `src/App.tsx`), Vitest+RTL+fake-indexeddb 실행 환경

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "classroom-progress-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.7",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: vite.config.ts 작성**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: index.html, src/main.tsx, src/index.css 작성**

`index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>학급 진도/기록 관리</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/index.css`:
```css
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 1rem;
}
```

- [ ] **Step 5: src/test/setup.ts 작성 (IndexedDB 폴리필 + jest-dom 매처)**

```ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 6: 실패하는 App 테스트 작성**

`src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 최소 App.tsx 작성 (테스트 통과 목적)**

```tsx
export default function App() {
  return <div>학급 진도/기록 관리</div>;
}
```

- [ ] **Step 8: 의존성 설치 및 테스트/빌드 확인**

```bash
npm install
npm test
npm run build
```
Expected: `npm test` PASS, `npm run build` 성공 (dist 생성)

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "chore: 프로젝트 스캐폴딩 및 테스트 환경 구성"
```

---

### Task 2: Dexie DB 스키마

**Files:**
- Create: `src/db/types.ts`
- Create: `src/db/db.ts`
- Test: `src/db/db.test.ts`

**Interfaces:**
- Produces: `db: AppDatabase` (`src/db/db.ts`), 테이블 `classes, students, curriculum, progress, attendance, stickers, records`. 타입 `ClassRecord, StudentRecord, CurriculumItem, ProgressRecord, AttendanceRecord, AttendanceStatus, StickerRecord, NoteRecord, NoteType, Entry, EntryKind` (`src/db/types.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/db.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('AppDatabase', () => {
  it('opens with all expected tables', async () => {
    await db.open();
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      ['attendance', 'classes', 'curriculum', 'progress', 'records', 'stickers', 'students'].sort()
    );
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/db.test.ts
```
Expected: FAIL (`src/db/db.ts` 없음)

- [ ] **Step 3: types.ts 작성**

```ts
export interface ClassRecord {
  id?: number;
  name: string;
  createdAt: string;
}

export interface StudentRecord {
  id?: number;
  classId: number;
  number: number;
  name: string;
  seatRow: number | null;
  seatCol: number | null;
}

export interface CurriculumItem {
  id?: number;
  order: number;
  unit: string;
  lesson: string;
}

export interface ProgressRecord {
  id?: number;
  classId: number;
  curriculumItemId: number;
  done: boolean;
  date: string | null;
}

export type AttendanceStatus = '출석' | '결석' | '지각' | '조퇴';

export interface AttendanceRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: string;
  status: AttendanceStatus;
  note: string;
}

export interface StickerRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: string;
  points: number;
  reason: string;
}

export type NoteType = '특이사항' | '과제제출' | '기타';

export interface NoteRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: string;
  type: NoteType;
  content: string;
}

export type EntryKind = 'attendance' | 'sticker' | 'note';

export interface Entry {
  id: number;
  kind: EntryKind;
  classId: number;
  studentId: number;
  date: string;
  label: string;
  detail: string;
}
```

- [ ] **Step 4: db.ts 작성**

```ts
import Dexie, { type Table } from 'dexie';
import type {
  ClassRecord,
  StudentRecord,
  CurriculumItem,
  ProgressRecord,
  AttendanceRecord,
  StickerRecord,
  NoteRecord,
} from './types';

export class AppDatabase extends Dexie {
  classes!: Table<ClassRecord, number>;
  students!: Table<StudentRecord, number>;
  curriculum!: Table<CurriculumItem, number>;
  progress!: Table<ProgressRecord, number>;
  attendance!: Table<AttendanceRecord, number>;
  stickers!: Table<StickerRecord, number>;
  records!: Table<NoteRecord, number>;

  constructor() {
    super('classroom-tracker');
    this.version(1).stores({
      classes: '++id, name',
      students: '++id, classId, number',
      curriculum: '++id, order',
      progress: '++id, classId, curriculumItemId, [classId+curriculumItemId]',
      attendance: '++id, classId, studentId, date',
      stickers: '++id, classId, studentId, date',
      records: '++id, classId, studentId, date',
    });
  }
}

export const db = new AppDatabase();
```

- [ ] **Step 5: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/db.test.ts
```
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/db/types.ts src/db/db.ts src/db/db.test.ts
git commit -m "feat: Dexie DB 스키마 정의"
```

---

### Task 3: 반(Class) CRUD

**Files:**
- Create: `src/db/classes.ts`
- Test: `src/db/classes.test.ts`

**Interfaces:**
- Consumes: `db` (`src/db/db.ts`), `ClassRecord` (`src/db/types.ts`)
- Produces: `createClass(name: string): Promise<number>`, `listClasses(): Promise<ClassRecord[]>`, `renameClass(id: number, name: string): Promise<void>`, `deleteClass(id: number): Promise<void>` (모두 `src/db/classes.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/classes.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { createClass, listClasses, renameClass, deleteClass } from './classes';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
  await db.progress.clear();
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('classes CRUD', () => {
  it('creates and lists classes sorted by name', async () => {
    await createClass('2반');
    await createClass('1반');
    const classes = await listClasses();
    expect(classes.map((c) => c.name)).toEqual(['1반', '2반']);
  });

  it('renames a class', async () => {
    const id = await createClass('1반');
    await renameClass(id, '1반(변경)');
    const classes = await listClasses();
    expect(classes[0].name).toBe('1반(변경)');
  });

  it('deletes a class and its related data', async () => {
    const id = await createClass('1반');
    const studentId = await db.students.add({ classId: id, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    await db.attendance.add({ classId: id, studentId, date: '2026-08-14', status: '출석', note: '' });
    await deleteClass(id);
    expect(await listClasses()).toHaveLength(0);
    expect(await db.students.where('classId').equals(id).count()).toBe(0);
    expect(await db.attendance.where('classId').equals(id).count()).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/classes.test.ts
```
Expected: FAIL (`src/db/classes.ts` 없음)

- [ ] **Step 3: classes.ts 작성**

```ts
import { db } from './db';
import type { ClassRecord } from './types';

export async function createClass(name: string): Promise<number> {
  return db.classes.add({ name, createdAt: new Date().toISOString() });
}

export async function listClasses(): Promise<ClassRecord[]> {
  return db.classes.orderBy('name').toArray();
}

export async function renameClass(id: number, name: string): Promise<void> {
  await db.classes.update(id, { name });
}

export async function deleteClass(id: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.classes, db.students, db.progress, db.attendance, db.stickers, db.records],
    async () => {
      await db.classes.delete(id);
      await db.students.where('classId').equals(id).delete();
      await db.progress.where('classId').equals(id).delete();
      await db.attendance.where('classId').equals(id).delete();
      await db.stickers.where('classId').equals(id).delete();
      await db.records.where('classId').equals(id).delete();
    }
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/classes.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db/classes.ts src/db/classes.test.ts
git commit -m "feat: 반 CRUD 구현"
```

---

### Task 4: 학생(Student) CRUD

**Files:**
- Create: `src/db/students.ts`
- Test: `src/db/students.test.ts`

**Interfaces:**
- Consumes: `db`, `StudentRecord`
- Produces: `addStudent(classId: number, number: number, name: string): Promise<number>`, `listStudents(classId: number): Promise<StudentRecord[]>`, `updateStudent(id: number, changes: Partial<Pick<StudentRecord, 'number' | 'name'>>): Promise<void>`, `deleteStudent(id: number): Promise<void>`, `updateSeat(id: number, seatRow: number | null, seatCol: number | null): Promise<void>` (모두 `src/db/students.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/students.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addStudent, listStudents, updateStudent, deleteStudent, updateSeat } from './students';

beforeEach(async () => {
  await db.students.clear();
});

describe('students CRUD', () => {
  it('adds and lists students sorted by number', async () => {
    await addStudent(1, 3, '박영희');
    await addStudent(1, 1, '홍길동');
    const students = await listStudents(1);
    expect(students.map((s) => s.name)).toEqual(['홍길동', '박영희']);
  });

  it('updates a student name and number', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await updateStudent(id, { name: '홍길순' });
    const [student] = await listStudents(1);
    expect(student.name).toBe('홍길순');
  });

  it('deletes a student', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await deleteStudent(id);
    expect(await listStudents(1)).toHaveLength(0);
  });

  it('updates a student seat position', async () => {
    const id = await addStudent(1, 1, '홍길동');
    await updateSeat(id, 2, 3);
    const [student] = await listStudents(1);
    expect(student.seatRow).toBe(2);
    expect(student.seatCol).toBe(3);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/students.test.ts
```
Expected: FAIL

- [ ] **Step 3: students.ts 작성**

```ts
import { db } from './db';
import type { StudentRecord } from './types';

export async function addStudent(classId: number, number: number, name: string): Promise<number> {
  return db.students.add({ classId, number, name, seatRow: null, seatCol: null });
}

export async function listStudents(classId: number): Promise<StudentRecord[]> {
  return db.students.where('classId').equals(classId).sortBy('number');
}

export async function updateStudent(
  id: number,
  changes: Partial<Pick<StudentRecord, 'number' | 'name'>>
): Promise<void> {
  await db.students.update(id, changes);
}

export async function deleteStudent(id: number): Promise<void> {
  await db.students.delete(id);
}

export async function updateSeat(id: number, seatRow: number | null, seatCol: number | null): Promise<void> {
  await db.students.update(id, { seatRow, seatCol });
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/students.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db/students.ts src/db/students.test.ts
git commit -m "feat: 학생 CRUD 구현"
```

---

### Task 5: 공통 진도표(Curriculum) CRUD

**Files:**
- Create: `src/db/curriculum.ts`
- Test: `src/db/curriculum.test.ts`

**Interfaces:**
- Consumes: `db`, `CurriculumItem`
- Produces: `addCurriculumItem(unit: string, lesson: string): Promise<number>`, `listCurriculum(): Promise<CurriculumItem[]>`, `updateCurriculumItem(id: number, changes: Partial<Pick<CurriculumItem, 'unit' | 'lesson'>>): Promise<void>`, `deleteCurriculumItem(id: number): Promise<void>` (모두 `src/db/curriculum.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/curriculum.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addCurriculumItem, listCurriculum, updateCurriculumItem, deleteCurriculumItem } from './curriculum';

beforeEach(async () => {
  await db.curriculum.clear();
});

describe('curriculum CRUD', () => {
  it('adds items preserving insertion order', async () => {
    await addCurriculumItem('1단원', '1차시');
    await addCurriculumItem('1단원', '2차시');
    const items = await listCurriculum();
    expect(items.map((i) => i.lesson)).toEqual(['1차시', '2차시']);
  });

  it('updates an item', async () => {
    const id = await addCurriculumItem('1단원', '1차시');
    await updateCurriculumItem(id, { lesson: '1차시(수정)' });
    const [item] = await listCurriculum();
    expect(item.lesson).toBe('1차시(수정)');
  });

  it('deletes an item', async () => {
    const id = await addCurriculumItem('1단원', '1차시');
    await deleteCurriculumItem(id);
    expect(await listCurriculum()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/curriculum.test.ts
```
Expected: FAIL

- [ ] **Step 3: curriculum.ts 작성**

```ts
import { db } from './db';
import type { CurriculumItem } from './types';

export async function addCurriculumItem(unit: string, lesson: string): Promise<number> {
  const count = await db.curriculum.count();
  return db.curriculum.add({ order: count, unit, lesson });
}

export async function listCurriculum(): Promise<CurriculumItem[]> {
  return db.curriculum.orderBy('order').toArray();
}

export async function updateCurriculumItem(
  id: number,
  changes: Partial<Pick<CurriculumItem, 'unit' | 'lesson'>>
): Promise<void> {
  await db.curriculum.update(id, changes);
}

export async function deleteCurriculumItem(id: number): Promise<void> {
  await db.curriculum.delete(id);
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/curriculum.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db/curriculum.ts src/db/curriculum.test.ts
git commit -m "feat: 공통 진도표 CRUD 구현"
```

---

### Task 6: 반별 진도 체크(Progress)

**Files:**
- Create: `src/db/progress.ts`
- Test: `src/db/progress.test.ts`

**Interfaces:**
- Consumes: `db`, `ProgressRecord`
- Produces: `setProgress(classId: number, curriculumItemId: number, done: boolean): Promise<void>`, `listProgress(classId: number): Promise<ProgressRecord[]>` (모두 `src/db/progress.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/progress.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { setProgress, listProgress } from './progress';

beforeEach(async () => {
  await db.progress.clear();
});

describe('progress', () => {
  it('marks an item done and stamps today date', async () => {
    await setProgress(1, 10, true);
    const [record] = await listProgress(1);
    expect(record.done).toBe(true);
    expect(record.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('unmarking clears the date', async () => {
    await setProgress(1, 10, true);
    await setProgress(1, 10, false);
    const [record] = await listProgress(1);
    expect(record.done).toBe(false);
    expect(record.date).toBeNull();
  });

  it('does not create duplicate rows for the same class+item', async () => {
    await setProgress(1, 10, true);
    await setProgress(1, 10, false);
    const records = await listProgress(1);
    expect(records).toHaveLength(1);
  });

  it('keeps progress independent per class', async () => {
    await setProgress(1, 10, true);
    await setProgress(2, 10, false);
    expect(await listProgress(1)).toHaveLength(1);
    expect(await listProgress(2)).toHaveLength(1);
    expect((await listProgress(1))[0].done).toBe(true);
    expect((await listProgress(2))[0].done).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/progress.test.ts
```
Expected: FAIL

- [ ] **Step 3: progress.ts 작성**

```ts
import { db } from './db';
import type { ProgressRecord } from './types';

export async function setProgress(classId: number, curriculumItemId: number, done: boolean): Promise<void> {
  const existing = await db.progress
    .where('[classId+curriculumItemId]')
    .equals([classId, curriculumItemId])
    .first();
  const date = done ? new Date().toISOString().slice(0, 10) : null;
  if (existing) {
    await db.progress.update(existing.id!, { done, date });
  } else {
    await db.progress.add({ classId, curriculumItemId, done, date });
  }
}

export async function listProgress(classId: number): Promise<ProgressRecord[]> {
  return db.progress.where('classId').equals(classId).toArray();
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/progress.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db/progress.ts src/db/progress.test.ts
git commit -m "feat: 반별 진도 체크 구현"
```

---

### Task 7: 통합 기록(Entries) — 출결/칭찬포인트/특이사항

**Files:**
- Create: `src/db/entries.ts`
- Test: `src/db/entries.test.ts`

**Interfaces:**
- Consumes: `db`, `AttendanceStatus`, `NoteType`, `Entry`, `EntryKind`
- Produces: `addAttendance(classId: number, studentId: number, status: AttendanceStatus, note: string, date: string): Promise<number>`, `addSticker(classId: number, studentId: number, points: number, reason: string, date: string): Promise<number>`, `addNote(classId: number, studentId: number, type: NoteType, content: string, date: string): Promise<number>`, `listEntries(classId: number, filters?: { studentId?: number; kind?: EntryKind }): Promise<Entry[]>` (모두 `src/db/entries.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/entries.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addAttendance, addSticker, addNote, listEntries } from './entries';

beforeEach(async () => {
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('entries', () => {
  it('merges attendance, stickers, notes sorted by date desc', async () => {
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    await addSticker(1, 100, 3, '적극적인 발표', '2026-08-12');
    await addNote(1, 101, '과제제출', '수학 숙제 제출', '2026-08-11');

    const entries = await listEntries(1);
    expect(entries.map((e) => e.date)).toEqual(['2026-08-12', '2026-08-11', '2026-08-10']);
    expect(entries[0]).toMatchObject({ kind: 'sticker', label: '+3점', detail: '적극적인 발표' });
    expect(entries[1]).toMatchObject({ kind: 'note', label: '과제제출', detail: '수학 숙제 제출' });
    expect(entries[2]).toMatchObject({ kind: 'attendance', label: '출석' });
  });

  it('filters by studentId', async () => {
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    await addAttendance(1, 101, '결석', '병결', '2026-08-10');
    const entries = await listEntries(1, { studentId: 101 });
    expect(entries).toHaveLength(1);
    expect(entries[0].studentId).toBe(101);
  });

  it('filters by kind', async () => {
    await addAttendance(1, 100, '출석', '', '2026-08-10');
    await addSticker(1, 100, 1, '칭찬', '2026-08-10');
    const entries = await listEntries(1, { kind: 'sticker' });
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('sticker');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/entries.test.ts
```
Expected: FAIL

- [ ] **Step 3: entries.ts 작성**

```ts
import { db } from './db';
import type { Entry, EntryKind, AttendanceStatus, NoteType } from './types';

export async function addAttendance(
  classId: number,
  studentId: number,
  status: AttendanceStatus,
  note: string,
  date: string
): Promise<number> {
  return db.attendance.add({ classId, studentId, date, status, note });
}

export async function addSticker(
  classId: number,
  studentId: number,
  points: number,
  reason: string,
  date: string
): Promise<number> {
  return db.stickers.add({ classId, studentId, date, points, reason });
}

export async function addNote(
  classId: number,
  studentId: number,
  type: NoteType,
  content: string,
  date: string
): Promise<number> {
  return db.records.add({ classId, studentId, date, type, content });
}

export interface EntryFilters {
  studentId?: number;
  kind?: EntryKind;
}

export async function listEntries(classId: number, filters: EntryFilters = {}): Promise<Entry[]> {
  const [attendance, stickers, notes] = await Promise.all([
    db.attendance.where('classId').equals(classId).toArray(),
    db.stickers.where('classId').equals(classId).toArray(),
    db.records.where('classId').equals(classId).toArray(),
  ]);

  const entries: Entry[] = [
    ...attendance.map((a) => ({
      id: a.id!,
      kind: 'attendance' as const,
      classId: a.classId,
      studentId: a.studentId,
      date: a.date,
      label: a.status,
      detail: a.note,
    })),
    ...stickers.map((s) => ({
      id: s.id!,
      kind: 'sticker' as const,
      classId: s.classId,
      studentId: s.studentId,
      date: s.date,
      label: `+${s.points}점`,
      detail: s.reason,
    })),
    ...notes.map((n) => ({
      id: n.id!,
      kind: 'note' as const,
      classId: n.classId,
      studentId: n.studentId,
      date: n.date,
      label: n.type,
      detail: n.content,
    })),
  ];

  return entries
    .filter((e) => filters.studentId === undefined || e.studentId === filters.studentId)
    .filter((e) => filters.kind === undefined || e.kind === filters.kind)
    .sort((a, b) => b.date.localeCompare(a.date));
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/entries.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db/entries.ts src/db/entries.test.ts
git commit -m "feat: 출결/칭찬포인트/특이사항 통합 기록 구현"
```

---

### Task 8: 백업 내보내기/불러오기

**Files:**
- Create: `src/db/backup.ts`
- Test: `src/db/backup.test.ts`

**Interfaces:**
- Consumes: `db`
- Produces: `BackupPayload` 타입, `exportData(): Promise<BackupPayload>`, `importData(payload: BackupPayload): Promise<void>` (모두 `src/db/backup.ts`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/db/backup.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { exportData, importData } from './backup';
import { createClass } from './classes';
import { addStudent } from './students';

beforeEach(async () => {
  await Promise.all([
    db.classes.clear(),
    db.students.clear(),
    db.curriculum.clear(),
    db.progress.clear(),
    db.attendance.clear(),
    db.stickers.clear(),
    db.records.clear(),
  ]);
});

describe('backup', () => {
  it('round-trips all tables through export/import', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');

    const payload = await exportData();
    expect(payload.version).toBe(1);
    expect(payload.data.classes).toHaveLength(1);
    expect(payload.data.students).toHaveLength(1);

    await db.classes.clear();
    await db.students.clear();
    expect(await db.classes.count()).toBe(0);

    await importData(payload);

    const classes = await db.classes.toArray();
    const students = await db.students.toArray();
    expect(classes).toHaveLength(1);
    expect(classes[0].name).toBe('1반');
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe('홍길동');
  });

  it('rejects an unsupported version', async () => {
    await expect(
      importData({ version: 99 as 1, exportedAt: '', data: {
        classes: [], students: [], curriculum: [], progress: [], attendance: [], stickers: [], records: [],
      } })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/db/backup.test.ts
```
Expected: FAIL

- [ ] **Step 3: backup.ts 작성**

```ts
import { db } from './db';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  data: {
    classes: unknown[];
    students: unknown[];
    curriculum: unknown[];
    progress: unknown[];
    attendance: unknown[];
    stickers: unknown[];
    records: unknown[];
  };
}

export async function exportData(): Promise<BackupPayload> {
  const [classes, students, curriculum, progress, attendance, stickers, records] = await Promise.all([
    db.classes.toArray(),
    db.students.toArray(),
    db.curriculum.toArray(),
    db.progress.toArray(),
    db.attendance.toArray(),
    db.stickers.toArray(),
    db.records.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { classes, students, curriculum, progress, attendance, stickers, records },
  };
}

export async function importData(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error(`지원하지 않는 백업 버전입니다: ${payload.version}`);
  }
  await db.transaction(
    'rw',
    [db.classes, db.students, db.curriculum, db.progress, db.attendance, db.stickers, db.records],
    async () => {
      await Promise.all([
        db.classes.clear(),
        db.students.clear(),
        db.curriculum.clear(),
        db.progress.clear(),
        db.attendance.clear(),
        db.stickers.clear(),
        db.records.clear(),
      ]);
      await Promise.all([
        db.classes.bulkAdd(payload.data.classes as never[]),
        db.students.bulkAdd(payload.data.students as never[]),
        db.curriculum.bulkAdd(payload.data.curriculum as never[]),
        db.progress.bulkAdd(payload.data.progress as never[]),
        db.attendance.bulkAdd(payload.data.attendance as never[]),
        db.stickers.bulkAdd(payload.data.stickers as never[]),
        db.records.bulkAdd(payload.data.records as never[]),
      ]);
    }
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/db/backup.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db/backup.ts src/db/backup.test.ts
git commit -m "feat: 백업 내보내기/불러오기 구현"
```

---

### Task 9: 앱 셸 및 라우팅 뼈대

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/SetupPage.tsx` (placeholder)
- Create: `src/pages/ClassPage.tsx` (placeholder)
- Test: `src/App.test.tsx` (수정)

**Interfaces:**
- Consumes: `react-router-dom` (`HashRouter, Routes, Route, Navigate`)
- Produces: `/setup`, `/class/:classId/*` 라우트. `SetupPage`, `ClassPage` default export (뒤 Task에서 내용 채움)

- [ ] **Step 1: 실패하는 테스트로 갱신**

`src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('redirects root to /setup', async () => {
    render(<App />);
    expect(await screen.findByText('설정')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/App.test.tsx
```
Expected: FAIL (현재 App은 "학급 진도/기록 관리" 텍스트만 렌더)

- [ ] **Step 3: placeholder 페이지 및 App.tsx 작성**

`src/pages/SetupPage.tsx`:
```tsx
export default function SetupPage() {
  return <h1>설정</h1>;
}
```

`src/pages/ClassPage.tsx`:
```tsx
export default function ClassPage() {
  return <h1>학급</h1>;
}
```

`src/App.tsx`:
```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import ClassPage from './pages/ClassPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/setup" replace />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/class/:classId/*" element={<ClassPage />} />
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/App.test.tsx
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/App.tsx src/App.test.tsx src/pages/SetupPage.tsx src/pages/ClassPage.tsx
git commit -m "feat: 라우팅 뼈대 구성"
```

---

### Task 10: 설정 페이지 — 반 관리(ClassManager)

**Files:**
- Create: `src/pages/setup/ClassManager.tsx`
- Test: `src/pages/setup/ClassManager.test.tsx`

**Interfaces:**
- Consumes: `db` (`../../db/db`), `createClass, renameClass, deleteClass` (`../../db/classes`)
- Produces: `ClassManager` default export (`src/pages/setup/ClassManager.tsx`), 반 목록으로의 링크 `/class/{id}`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/setup/ClassManager.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../db/db';
import ClassManager from './ClassManager';

beforeEach(async () => {
  await db.classes.clear();
});

describe('ClassManager', () => {
  it('adds a class and shows it in the list', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClassManager />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('새 학급 이름'), '1학년 3반');
    await user.click(screen.getByText('학급 추가'));

    expect(await screen.findByText('1학년 3반')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/setup/ClassManager.test.tsx
```
Expected: FAIL

- [ ] **Step 3: ClassManager.tsx 작성**

```tsx
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
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/setup/ClassManager.test.tsx
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/pages/setup/ClassManager.tsx src/pages/setup/ClassManager.test.tsx
git commit -m "feat: 설정 페이지 반 관리 UI 구현"
```

---

### Task 11: 설정 페이지 — 공통 진도표 관리(CurriculumManager)

**Files:**
- Create: `src/pages/setup/CurriculumManager.tsx`
- Test: `src/pages/setup/CurriculumManager.test.tsx`

**Interfaces:**
- Consumes: `db`, `addCurriculumItem, updateCurriculumItem, deleteCurriculumItem` (`../../db/curriculum`)
- Produces: `CurriculumManager` default export (`src/pages/setup/CurriculumManager.tsx`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/setup/CurriculumManager.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import CurriculumManager from './CurriculumManager';

beforeEach(async () => {
  await db.curriculum.clear();
});

describe('CurriculumManager', () => {
  it('adds a curriculum item and shows it in the list', async () => {
    const user = userEvent.setup();
    render(<CurriculumManager />);

    await user.type(screen.getByLabelText('새 단원'), '1단원 수와 연산');
    await user.type(screen.getByLabelText('새 차시'), '1차시 정수와 유리수');
    await user.click(screen.getByText('진도 항목 추가'));

    expect(await screen.findByLabelText(/^단원-/)).toHaveValue('1단원 수와 연산');
    expect(await screen.findByLabelText(/^차시-/)).toHaveValue('1차시 정수와 유리수');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/setup/CurriculumManager.test.tsx
```
Expected: FAIL

- [ ] **Step 3: CurriculumManager.tsx 작성**

```tsx
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
              defaultValue={item.unit}
              aria-label={`단원-${item.id}`}
              onBlur={(e) => updateCurriculumItem(item.id!, { unit: e.target.value })}
            />
            <input
              defaultValue={item.lesson}
              aria-label={`차시-${item.id}`}
              onBlur={(e) => updateCurriculumItem(item.id!, { lesson: e.target.value })}
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
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/setup/CurriculumManager.test.tsx
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/pages/setup/CurriculumManager.tsx src/pages/setup/CurriculumManager.test.tsx
git commit -m "feat: 설정 페이지 공통 진도표 관리 UI 구현"
```

---

### Task 12: 설정 페이지 — 학생 명단 붙여넣기(RosterImport)

**Files:**
- Create: `src/pages/setup/RosterImport.tsx`
- Test: `src/pages/setup/RosterImport.test.tsx`

**Interfaces:**
- Consumes: `db`, `addStudent` (`../../db/students`), `createClass` (`../../db/classes`, 테스트 전용)
- Produces: `RosterImport` default export (`src/pages/setup/RosterImport.tsx`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/setup/RosterImport.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
import RosterImport from './RosterImport';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
});

describe('RosterImport', () => {
  it('bulk-creates students from pasted text', async () => {
    const classId = await createClass('1반');
    const user = userEvent.setup();
    render(<RosterImport />);

    await user.selectOptions(await screen.findByLabelText('대상 학급'), String(classId));
    await user.type(screen.getByLabelText('명단 붙여넣기'), '1,홍길동\n2,김철수');
    await user.click(screen.getByText('명단 추가'));

    const students = await db.students.where('classId').equals(classId).sortBy('number');
    expect(students.map((s) => s.name)).toEqual(['홍길동', '김철수']);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/setup/RosterImport.test.tsx
```
Expected: FAIL

- [ ] **Step 3: RosterImport.tsx 작성**

```tsx
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
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/setup/RosterImport.test.tsx
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/pages/setup/RosterImport.tsx src/pages/setup/RosterImport.test.tsx
git commit -m "feat: 설정 페이지 학생 명단 붙여넣기 구현"
```

---

### Task 13: 설정 페이지 — 백업(BackupManager) 및 SetupPage 조립

**Files:**
- Create: `src/pages/setup/BackupManager.tsx`
- Test: `src/pages/setup/BackupManager.test.tsx`
- Modify: `src/pages/SetupPage.tsx`

**Interfaces:**
- Consumes: `exportData, importData` (`../../db/backup`)
- Produces: `BackupManager` default export (`src/pages/setup/BackupManager.tsx`). `SetupPage`가 `ClassManager, CurriculumManager, RosterImport, BackupManager`를 조립.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/setup/BackupManager.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
import BackupManager from './BackupManager';

beforeEach(async () => {
  await db.classes.clear();
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

describe('BackupManager', () => {
  it('exports data by creating a downloadable blob URL', async () => {
    await createClass('1반');
    const user = userEvent.setup();
    render(<BackupManager />);

    await user.click(screen.getByText('내보내기'));

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('imports data from an uploaded JSON file', async () => {
    const classId = await createClass('1반');
    const payload = {
      version: 1,
      exportedAt: '2026-08-14T00:00:00.000Z',
      data: {
        classes: [{ id: classId, name: '불러온 반', createdAt: '2026-08-14T00:00:00.000Z' }],
        students: [],
        curriculum: [],
        progress: [],
        attendance: [],
        stickers: [],
        records: [],
      },
    };
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });

    render(<BackupManager />);
    const input = screen.getByLabelText('백업 파일 선택', { selector: 'input' });
    const user = userEvent.setup();
    await user.upload(input, file);

    const classes = await db.classes.toArray();
    expect(classes).toHaveLength(1);
    expect(classes[0].name).toBe('불러온 반');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/setup/BackupManager.test.tsx
```
Expected: FAIL

- [ ] **Step 3: BackupManager.tsx 작성**

```tsx
import { useRef } from 'react';
import { exportData, importData } from '../../db/backup';

export default function BackupManager() {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const payload = await exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${payload.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importData(JSON.parse(text));
      window.alert('백업을 불러왔습니다.');
    } catch (err) {
      window.alert(`백업 불러오기 실패: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

  return (
    <section>
      <h2>백업</h2>
      <button onClick={handleExport}>내보내기</button>
      <label>
        백업 파일 선택
        <input ref={fileInput} type="file" accept="application/json" onChange={handleFileChange} />
      </label>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/setup/BackupManager.test.tsx
```
Expected: PASS

- [ ] **Step 5: SetupPage 조립**

`src/pages/SetupPage.tsx`:
```tsx
import ClassManager from './setup/ClassManager';
import CurriculumManager from './setup/CurriculumManager';
import RosterImport from './setup/RosterImport';
import BackupManager from './setup/BackupManager';

export default function SetupPage() {
  return (
    <div>
      <h1>설정</h1>
      <ClassManager />
      <CurriculumManager />
      <RosterImport />
      <BackupManager />
    </div>
  );
}
```

- [ ] **Step 6: 전체 테스트 실행 확인**

```bash
npm test
```
Expected: PASS (기존 App.test.tsx 포함 전부)

- [ ] **Step 7: 커밋**

```bash
git add src/pages/setup/BackupManager.tsx src/pages/setup/BackupManager.test.tsx src/pages/SetupPage.tsx
git commit -m "feat: 설정 페이지 백업 UI 및 페이지 조립"
```

---

### Task 14: 학급 탭 뼈대 — ClassPage + ClassSwitcher

**Files:**
- Create: `src/pages/class/ClassSwitcher.tsx`
- Modify: `src/pages/ClassPage.tsx`
- Test: `src/pages/ClassPage.test.tsx`

**Interfaces:**
- Consumes: `db`, `useLiveQuery`, `useParams, NavLink, Route, Routes, Navigate` (react-router-dom)
- Produces: `ClassPage` default export가 하위 라우트 `progress|roster|seating|records` 렌더 (내용은 Task 15~18에서 채움, 이 태스크에서는 placeholder). `ClassSwitcher` default export (`src/pages/class/ClassSwitcher.tsx`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/ClassPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createClass } from '../db/classes';
import ClassPage from './ClassPage';

beforeEach(async () => {
  await db.classes.clear();
});

describe('ClassPage', () => {
  it('shows the class name and defaults to the progress tab', async () => {
    const classId = await createClass('1학년 3반');
    render(
      <MemoryRouter initialEntries={[`/class/${classId}`]}>
        <Routes>
          <Route path="/class/:classId/*" element={<ClassPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('1학년 3반')).toBeInTheDocument();
    expect(screen.getByText('진도 체크')).toBeInTheDocument();
  });

  it('redirects to /setup when the class does not exist', async () => {
    render(
      <MemoryRouter initialEntries={[`/class/999`]}>
        <Routes>
          <Route path="/class/:classId/*" element={<ClassPage />} />
          <Route path="/setup" element={<div>설정 페이지</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('설정 페이지')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/ClassPage.test.tsx
```
Expected: FAIL

- [ ] **Step 3: ClassSwitcher.tsx 작성**

```tsx
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export default function ClassSwitcher({ currentClassId }: { currentClassId: number }) {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];
  const navigate = useNavigate();

  return (
    <select aria-label="학급 전환" value={currentClassId} onChange={(e) => navigate(`/class/${e.target.value}`)}>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: ClassPage.tsx 작성 (하위 탭은 placeholder)**

```tsx
import { NavLink, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import ClassSwitcher from './class/ClassSwitcher';

function Placeholder({ label }: { label: string }) {
  return <div>{label}</div>;
}

export default function ClassPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const klass = useLiveQuery(() => db.classes.get(id), [id]);

  if (klass === undefined) return null;
  if (klass === null) return <Navigate to="/setup" replace />;

  return (
    <div>
      <ClassSwitcher currentClassId={id} />
      <h1>{klass.name}</h1>
      <nav>
        <NavLink to="progress">진도 체크</NavLink>
        <NavLink to="roster">명렬표</NavLink>
        <NavLink to="seating">자리배치표</NavLink>
        <NavLink to="records">기록</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="progress" replace />} />
        <Route path="progress" element={<Placeholder label="진도 체크 탭" />} />
        <Route path="roster" element={<Placeholder label="명렬표 탭" />} />
        <Route path="seating" element={<Placeholder label="자리배치표 탭" />} />
        <Route path="records" element={<Placeholder label="기록 탭" />} />
      </Routes>
    </div>
  );
}
```

- [ ] **Step 5: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/ClassPage.test.tsx
```
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/pages/ClassPage.tsx src/pages/ClassPage.test.tsx src/pages/class/ClassSwitcher.tsx
git commit -m "feat: 학급 탭 뼈대 및 학급 전환 UI 구현"
```

---

### Task 15: 학급 탭 — 진도 체크(ProgressTab)

**Files:**
- Create: `src/pages/class/ProgressTab.tsx`
- Test: `src/pages/class/ProgressTab.test.tsx`
- Modify: `src/pages/ClassPage.tsx` (`progress` 라우트를 `ProgressTab`으로 교체)

**Interfaces:**
- Consumes: `db`, `setProgress` (`../../db/progress`)
- Produces: `ProgressTab` default export, props `{ classId: number }` (`src/pages/class/ProgressTab.tsx`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/class/ProgressTab.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { addCurriculumItem } from '../../db/curriculum';
import ProgressTab from './ProgressTab';

beforeEach(async () => {
  await db.curriculum.clear();
  await db.progress.clear();
});

describe('ProgressTab', () => {
  it('checks an item and shows today date', async () => {
    await addCurriculumItem('1단원', '1차시');
    const user = userEvent.setup();
    render(<ProgressTab classId={1} />);

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    const today = new Date().toISOString().slice(0, 10);
    expect(await screen.findByText(new RegExp(today))).toBeInTheDocument();
  });

  it('keeps progress independent between classes', async () => {
    await addCurriculumItem('1단원', '1차시');
    const user = userEvent.setup();
    const { rerender } = render(<ProgressTab classId={1} />);
    await user.click(await screen.findByRole('checkbox'));

    rerender(<ProgressTab classId={2} />);
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/class/ProgressTab.test.tsx
```
Expected: FAIL

- [ ] **Step 3: ProgressTab.tsx 작성**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { setProgress } from '../../db/progress';

export default function ProgressTab({ classId }: { classId: number }) {
  const curriculum = useLiveQuery(() => db.curriculum.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.where('classId').equals(classId).toArray(), [classId]);

  if (!curriculum || !progress) return null;

  const progressByItem = new Map(progress.map((p) => [p.curriculumItemId, p]));

  return (
    <ul>
      {curriculum.map((item) => {
        const p = progressByItem.get(item.id!);
        return (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={p?.done ?? false}
                onChange={(e) => setProgress(classId, item.id!, e.target.checked)}
              />
              {item.unit} - {item.lesson}
              {p?.done && p.date && <span> ({p.date})</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/class/ProgressTab.test.tsx
```
Expected: PASS

- [ ] **Step 5: ClassPage에 연결**

`src/pages/ClassPage.tsx`의 import 목록에 `import ProgressTab from './class/ProgressTab';` 추가하고, `<Route path="progress" element={<Placeholder label="진도 체크 탭" />} />`를 `<Route path="progress" element={<ProgressTab classId={id} />} />`로 교체.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/class/ProgressTab.tsx src/pages/class/ProgressTab.test.tsx src/pages/ClassPage.tsx
git commit -m "feat: 진도 체크 탭 구현"
```

---

### Task 16: 학급 탭 — 명렬표(RosterTab)

**Files:**
- Create: `src/pages/class/RosterTab.tsx`
- Test: `src/pages/class/RosterTab.test.tsx`
- Modify: `src/pages/ClassPage.tsx` (`roster` 라우트를 `RosterTab`으로 교체)

**Interfaces:**
- Consumes: `db`, `addStudent, updateStudent, deleteStudent` (`../../db/students`)
- Produces: `RosterTab` default export, props `{ classId: number }` (`src/pages/class/RosterTab.tsx`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/class/RosterTab.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import RosterTab from './RosterTab';

beforeEach(async () => {
  await db.students.clear();
});

describe('RosterTab', () => {
  it('adds a student to the roster', async () => {
    const user = userEvent.setup();
    render(<RosterTab classId={1} />);

    await user.type(screen.getByPlaceholderText('번호'), '1');
    await user.type(screen.getByPlaceholderText('이름'), '홍길동');
    await user.click(screen.getByText('학생 추가'));

    expect(await screen.findByDisplayValue('홍길동')).toBeInTheDocument();
  });

  it('edits a student name on blur', async () => {
    const id = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RosterTab classId={1} />);

    const nameInput = await screen.findByLabelText(`이름-${id}`);
    await user.clear(nameInput);
    await user.type(nameInput, '홍길순');
    await user.tab();

    const student = await db.students.get(id);
    expect(student?.name).toBe('홍길순');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/class/RosterTab.test.tsx
```
Expected: FAIL

- [ ] **Step 3: RosterTab.tsx 작성**

```tsx
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
                  onBlur={(e) => updateStudent(s.id!, { number: Number(e.target.value) })}
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
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/class/RosterTab.test.tsx
```
Expected: PASS

- [ ] **Step 5: ClassPage에 연결**

`src/pages/ClassPage.tsx`에 `import RosterTab from './class/RosterTab';` 추가하고 `roster` 라우트 element를 `<RosterTab classId={id} />`로 교체.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/class/RosterTab.tsx src/pages/class/RosterTab.test.tsx src/pages/ClassPage.tsx
git commit -m "feat: 명렬표 탭 구현"
```

---

### Task 17: 학급 탭 — 자리배치표(SeatingTab)

**Files:**
- Create: `src/pages/class/SeatingTab.tsx`
- Test: `src/pages/class/SeatingTab.test.tsx`
- Modify: `src/pages/ClassPage.tsx` (`seating` 라우트를 `SeatingTab`으로 교체)

**Interfaces:**
- Consumes: `db`, `updateSeat` (`../../db/students`)
- Produces: `SeatingTab` default export, props `{ classId: number }` (`src/pages/class/SeatingTab.tsx`), 6x6 격자, `aria-label="좌석-{row}-{col}"`인 셀

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/class/SeatingTab.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { db } from '../../db/db';
import SeatingTab from './SeatingTab';

beforeEach(async () => {
  await db.students.clear();
});

function makeDataTransfer(studentId: number) {
  const store = new Map<string, string>();
  store.set('text/plain', String(studentId));
  return {
    setData: (k: string, v: string) => store.set(k, v),
    getData: (k: string) => store.get(k) ?? '',
  };
}

describe('SeatingTab', () => {
  it('moves an unseated student into a grid cell on drop', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    render(<SeatingTab classId={1} />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();

    const targetCell = screen.getByLabelText('좌석-0-0');
    fireEvent.drop(targetCell, { dataTransfer: makeDataTransfer(studentId) });

    const student = await db.students.get(studentId);
    expect(student?.seatRow).toBe(0);
    expect(student?.seatCol).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/class/SeatingTab.test.tsx
```
Expected: FAIL

- [ ] **Step 3: SeatingTab.tsx 작성**

```tsx
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
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/class/SeatingTab.test.tsx
```
Expected: PASS

- [ ] **Step 5: ClassPage에 연결**

`src/pages/ClassPage.tsx`에 `import SeatingTab from './class/SeatingTab';` 추가하고 `seating` 라우트 element를 `<SeatingTab classId={id} />`로 교체.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/class/SeatingTab.tsx src/pages/class/SeatingTab.test.tsx src/pages/ClassPage.tsx
git commit -m "feat: 자리배치표 탭 구현"
```

---

### Task 18: 학급 탭 — 기록(RecordsTab)

**Files:**
- Create: `src/pages/class/RecordsTab.tsx`
- Test: `src/pages/class/RecordsTab.test.tsx`
- Modify: `src/pages/ClassPage.tsx` (`records` 라우트를 `RecordsTab`으로 교체)

**Interfaces:**
- Consumes: `db`, `addAttendance, addSticker, addNote, listEntries` (`../../db/entries`), `Entry, AttendanceStatus, NoteType` (`../../db/types`)
- Produces: `RecordsTab` default export, props `{ classId: number }` (`src/pages/class/RecordsTab.tsx`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/class/RecordsTab.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import RecordsTab from './RecordsTab';

beforeEach(async () => {
  await db.students.clear();
  await db.attendance.clear();
  await db.stickers.clear();
  await db.records.clear();
});

describe('RecordsTab', () => {
  it('saves an attendance entry and shows it in the list', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.selectOptions(screen.getByLabelText('학생'), String(studentId));
    await user.selectOptions(screen.getByLabelText('출결 상태'), '지각');
    await user.click(screen.getByText('저장'));

    expect(await screen.findByText(/지각/)).toBeInTheDocument();
  });

  it('saves a note entry with free text content', async () => {
    const studentId = await db.students.add({ classId: 1, number: 1, name: '홍길동', seatRow: null, seatCol: null });
    const user = userEvent.setup();
    render(<RecordsTab classId={1} />);

    await user.selectOptions(screen.getByLabelText('기록 유형'), 'note');
    await user.selectOptions(screen.getByLabelText('학생'), String(studentId));
    await user.selectOptions(screen.getByLabelText('기록 세부유형'), '과제제출');
    await user.type(screen.getByLabelText('내용'), '수학 숙제 제출');
    await user.click(screen.getByText('저장'));

    expect(await screen.findByText(/수학 숙제 제출/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx vitest run src/pages/class/RecordsTab.test.tsx
```
Expected: FAIL

- [ ] **Step 3: RecordsTab.tsx 작성**

```tsx
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addAttendance, addSticker, addNote, listEntries } from '../../db/entries';
import type { AttendanceStatus, NoteType } from '../../db/types';

type Kind = 'attendance' | 'sticker' | 'note';

const today = () => new Date().toISOString().slice(0, 10);

export default function RecordsTab({ classId }: { classId: number }) {
  const students = useLiveQuery(() => db.students.where('classId').equals(classId).sortBy('number'), [classId]) ?? [];
  const [kind, setKind] = useState<Kind>('attendance');
  const [studentId, setStudentId] = useState<number | ''>('');
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<AttendanceStatus>('출석');
  const [points, setPoints] = useState('1');
  const [reason, setReason] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('특이사항');
  const [content, setContent] = useState('');
  const [filterStudent, setFilterStudent] = useState<number | ''>('');

  const filters = useMemo(
    () => ({ studentId: filterStudent === '' ? undefined : filterStudent }),
    [filterStudent]
  );
  const entries = useLiveQuery(() => listEntries(classId, filters), [classId, filters]) ?? [];

  const handleSave = async () => {
    if (studentId === '') return;
    if (kind === 'attendance') await addAttendance(classId, studentId, status, reason, date);
    if (kind === 'sticker') await addSticker(classId, studentId, Number(points), reason, date);
    if (kind === 'note') await addNote(classId, studentId, noteType, content, date);
    setReason('');
    setContent('');
  };

  return (
    <div>
      <select aria-label="기록 유형" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
        <option value="attendance">출결</option>
        <option value="sticker">칭찬포인트</option>
        <option value="note">특이사항/과제제출</option>
      </select>
      <select
        aria-label="학생"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value === '' ? '' : Number(e.target.value))}
      >
        <option value="">학생 선택</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.number}. {s.name}
          </option>
        ))}
      </select>
      <input type="date" aria-label="날짜" value={date} onChange={(e) => setDate(e.target.value)} />

      {kind === 'attendance' && (
        <select aria-label="출결 상태" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
          <option value="출석">출석</option>
          <option value="결석">결석</option>
          <option value="지각">지각</option>
          <option value="조퇴">조퇴</option>
        </select>
      )}
      {kind === 'sticker' && (
        <input aria-label="점수" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
      )}
      {kind === 'note' && (
        <select aria-label="기록 세부유형" value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)}>
          <option value="특이사항">특이사항</option>
          <option value="과제제출">과제제출</option>
          <option value="기타">기타</option>
        </select>
      )}
      {kind !== 'note' ? (
        <input aria-label="사유" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유" />
      ) : (
        <input aria-label="내용" value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" />
      )}

      <button onClick={handleSave}>저장</button>

      <div>
        <select
          aria-label="학생 필터"
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">전체 학생</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.name}
            </option>
          ))}
        </select>
      </div>

      <ul>
        {entries.map((e) => (
          <li key={`${e.kind}-${e.id}`}>
            {e.date} - {e.label} - {e.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
npx vitest run src/pages/class/RecordsTab.test.tsx
```
Expected: PASS

- [ ] **Step 5: ClassPage에 연결하고 전체 테스트 실행**

`src/pages/ClassPage.tsx`에 `import RecordsTab from './class/RecordsTab';` 추가하고 `records` 라우트 element를 `<RecordsTab classId={id} />`로 교체. 이 시점에서 `Placeholder` 함수는 더 이상 쓰이지 않으므로 삭제.

```bash
npm test
npm run build
```
Expected: 전체 테스트 PASS, 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/pages/class/RecordsTab.tsx src/pages/class/RecordsTab.test.tsx src/pages/ClassPage.tsx
git commit -m "feat: 기록 탭 구현 및 학급 탭 통합 완료"
```
