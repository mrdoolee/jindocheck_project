import { describe, it, expect } from 'vitest';
import { listTeachers, getGradeClassCounts, getClassTimetable, getTeacherTimetable, type ComciSchoolData } from './comci';

// Hand-built but internally-consistent fixture, shaped exactly like a real comci.net school
// response (분리=1000, 변경알림 verified live against 청주동중학교/schoolCode 39286 — see the
// plan doc for how the real endpoint/key discovery and cell-encoding were verified).
//
// 1학년1반 Mon period1: 김민수/국어 (baseline) -> live-changed to 체육 (same teacher)
// 1학년1반 Mon period2: 이영희/수학
// 2학년1반 Mon period1: 이영희/영어
// 2학년1반 Tue period1: 김민수/과학 (unchanged)
function buildFixture(변경알림: 0 | 1): ComciSchoolData {
  const 자료481 = {
    1: { 1: { 1: { 1: 1001, 2: 2002 } } }, // grade1 class1: mon p1=subj1/teacher1, mon p2=subj2/teacher2
    2: { 1: { 1: { 1: 3002 }, 2: { 1: 4001 } } }, // grade2 class1: mon p1=subj3/teacher2, tue p1=subj4/teacher1
  };
  const 자료147 =
    변경알림 === 1
      ? {
          1: { 1: { 1: { 1: '>5001', 2: 2002 } } }, // mon p1 changed to subj5, same teacher1
          2: { 1: { 1: { 1: 3002 }, 2: { 1: 4001 } } },
        }
      : {
          1: { 1: { 1: { 1: 5001, 2: 2002 } } }, // changed (no '>' — detected via diff vs baseline)
          2: { 1: { 1: { 1: 3002 }, 2: { 1: 4001 } } },
        };
  const 자료542 =
    변경알림 === 1
      ? {
          1: { 1: { 1: '>5101' }, 2: { 1: 4201 } }, // teacher1: mon p1 changed, tue p1 unchanged
          2: { 1: { 1: 3201, 2: 2101 } }, // teacher2: mon p1 & p2 unchanged
        }
      : {
          1: { 1: { 1: 5101 }, 2: { 1: 4201 } }, // mon p1 differs from baseline (1101) -> changed
          2: { 1: { 1: 3201, 2: 2101 } },
        };

  return {
    분리: 1000,
    변경알림,
    학교명: '테스트중학교',
    교사수: 2,
    자료446: ['', '김민수*', '이영희*'],
    자료492: [5, '국어', '수학', '영어', '과학', '체육'],
    학급수: [2, 1, 1, 0],
    자료481,
    자료147,
    자료542,
    일과시간: ['09:00', '09:55'],
  };
}

describe('listTeachers / getGradeClassCounts', () => {
  it('strips the masking * and skips the unused index 0', () => {
    const data = buildFixture(1);
    expect(listTeachers(data)).toEqual([
      { index: 1, name: '김민수' },
      { index: 2, name: '이영희' },
    ]);
  });

  it('returns per-grade class counts', () => {
    expect(getGradeClassCounts(buildFixture(1))).toEqual([1, 1, 0]);
  });
});

describe('getClassTimetable (변경알림=1, "> prefix" change detection)', () => {
  const data = buildFixture(1);

  it('decodes a normal cell to subject + teacher', () => {
    const grid = getClassTimetable(data, 1, 1);
    expect(grid[1][0]).toEqual({ subject: '수학', person: '이영희', changed: false }); // mon period2
  });

  it('marks a ">"-prefixed cell as changed and strips the marker', () => {
    const grid = getClassTimetable(data, 1, 1);
    expect(grid[0][0]).toEqual({ subject: '체육', person: '김민수', changed: true }); // mon period1
  });

  it('returns null for empty cells', () => {
    const grid = getClassTimetable(data, 1, 1);
    expect(grid[0][1]).toBeNull(); // tuesday, nothing scheduled
    expect(grid[7][0]).toBeNull(); // period 8, out of range for this fixture
  });

  it('returns all nulls for a grade/class combination with no data', () => {
    const grid = getClassTimetable(data, 3, 1);
    expect(grid.every((row) => row.every((cell) => cell === null))).toBe(true);
  });
});

describe('getClassTimetable (변경알림=0, diff-against-baseline change detection)', () => {
  it('flags a cell as changed when it differs from 자료481, with no "> " marker present', () => {
    const data = buildFixture(0);
    const grid = getClassTimetable(data, 1, 1);
    expect(grid[0][0]).toEqual({ subject: '체육', person: '김민수', changed: true });
    expect(grid[1][0]).toEqual({ subject: '수학', person: '이영희', changed: false });
  });
});

describe('getTeacherTimetable (변경알림=1, "> prefix" change detection)', () => {
  const data = buildFixture(1);

  it("computes the teacher's own weekly schedule across different classes", () => {
    const grid = getTeacherTimetable(data, 1); // 김민수
    expect(grid[0][0]).toEqual({ subject: '체육', person: '1-1', changed: true }); // mon p1
    expect(grid[0][1]).toEqual({ subject: '과학', person: '2-1', changed: false }); // tue p1
  });

  it('returns null where the teacher has no class that period', () => {
    const grid = getTeacherTimetable(data, 2); // 이영희
    expect(grid[1][1]).toBeNull();
  });
});

describe('getTeacherTimetable (변경알림=0, rebuilt-from-자료481 baseline diff)', () => {
  it('flags a change by comparing against the inverted class-grid baseline', () => {
    const data = buildFixture(0);
    const grid = getTeacherTimetable(data, 1);
    expect(grid[0][0]).toEqual({ subject: '체육', person: '1-1', changed: true });
    expect(grid[0][1]).toEqual({ subject: '과학', person: '2-1', changed: false });
  });
});
