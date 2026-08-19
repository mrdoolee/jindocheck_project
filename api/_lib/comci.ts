// Ports the "컴시간알리미" (comci.net) student/teacher timetable scraping technique that a
// working Google Apps Script (student/class view) and comci's own live client JS (teacher
// view, inspected directly at http://comci.net:4082/th) both use. comci.net is an unofficial,
// undocumented service — this whole module is inherently a best-effort scrape, not a
// contract. Anything read from the live HTML (endpoint number, key names) is re-discovered
// on every request rather than hardcoded, so it keeps working if the operator's build
// changes those; only the last-resort fallback values are hardcoded.

const PORTS = ['http://comci.net:4082', 'http://comci.net:4085'];
const MAX_PERIOD = 8;
const MAX_DAY = 5;

export class ComciError extends Error {}

export interface ComciSchoolData {
  분리: number;
  변경알림: number;
  학교명: string;
  교사수: number;
  자료446: string[]; // teacher names, 1-indexed, '*'-masked
  자료492: unknown[]; // subject names, index 0 is a count, names start at 1
  학급수: number[]; // [total, grade1, grade2, grade3]
  자료481: unknown; // 자료481[grade][classNum][day][period] — baseline class data
  자료147: unknown; // 자료147[grade][classNum][day][period] — current class data
  자료542: unknown; // 자료542[teacherIndex][day][period] — current teacher data
  일과시간: string[]; // period start times
}

export interface TimetableCell {
  subject: string;
  person: string; // teacher name (class view) or "N-M" grade-class (teacher view)
  changed: boolean;
}

export type TimetableGrid = (TimetableCell | null)[][]; // [period-1][day-1]

// The reference script's key-name discovery regex used [a-zA-Z0-9_]+, which can never match
// the Korean key names it's looking for (자료147 등) — so it always fell through to the
// hardcoded fallback in production. Widening the character class to include Hangul syllables
// makes the discovery actually work, so a future rename on comci's end is more likely to be
// picked up automatically instead of silently breaking.
function findAssignedKey(html: string, varName: string, qualifier: string, fallback: string): string {
  const re = new RegExp(`${varName}\\s*=\\s*${qualifier}\\([^.]*\\.([a-zA-Z0-9_가-힣]+)`);
  return html.match(re)?.[1] ?? fallback;
}

function discoverEndpoint(html: string): { endpoint: string; prefix: string } {
  const endpoint = html.match(/\.\/(\d+)\?/)?.[1] ?? '36179';
  const prefix = html.match(/sc_data\(['"](\d+_)['"]/)?.[1] ?? '73629_';
  return { endpoint, prefix };
}

async function fetchStPageHtml(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/st`);
  if (!res.ok) throw new ComciError(`컴시간 서버 응답 오류 (${res.status})`);
  const buf = await res.arrayBuffer();
  return new TextDecoder('euc-kr').decode(buf);
}

export async function fetchSchoolData(schoolCode: string): Promise<ComciSchoolData> {
  let baseUrl = PORTS[0];
  let html: string | undefined;
  let lastErr: unknown;
  for (const candidate of PORTS) {
    try {
      html = await fetchStPageHtml(candidate);
      baseUrl = candidate;
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!html) {
    throw lastErr instanceof Error ? lastErr : new ComciError('컴시간 서버에 접속할 수 없습니다.');
  }

  const { endpoint, prefix } = discoverEndpoint(html);
  const dailyTableKey = findAssignedKey(html, '일일자료', 'Q자료', '자료147');
  const subjKey = findAssignedKey(html, '과목명', 'Q과목명', '자료492');
  const teacherKey = findAssignedKey(html, '성명', 'Q성명', '자료446');

  const query = `${prefix}${schoolCode}_0_1`;
  const param = Buffer.from(query, 'utf8').toString('base64');
  const dataRes = await fetch(`${baseUrl}/${endpoint}?${param}`);
  if (!dataRes.ok) throw new ComciError(`컴시간 서버 응답 오류 (${dataRes.status})`);
  const text = await dataRes.text();
  const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!jsonText) {
    throw new ComciError('컴시간에서 학교 데이터를 찾을 수 없습니다. 학교코드를 확인해주세요.');
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new ComciError('컴시간 응답 형식이 바뀐 것 같습니다.');
  }

  const 자료446 = (raw[teacherKey] ?? raw['자료446']) as string[] | undefined;
  const 자료492 = (raw[subjKey] ?? raw['자료492']) as unknown[] | undefined;
  const 자료147 = raw[dailyTableKey] ?? raw['자료147'];
  const 자료481 = raw['자료481'];
  if (!자료446?.length || !자료492?.length || !자료147 || !자료481) {
    throw new ComciError('컴시간 응답 형식이 바뀐 것 같습니다.');
  }

  return {
    분리: typeof raw['분리'] === 'number' ? (raw['분리'] as number) : 100,
    변경알림: typeof raw['변경알림'] === 'number' ? (raw['변경알림'] as number) : 0,
    학교명: (raw['학교명'] as string) ?? '',
    교사수: (raw['교사수'] as number) ?? 자료446.length - 1,
    자료446,
    자료492,
    학급수: (raw['학급수'] as number[]) ?? [],
    자료481,
    자료147,
    자료542: raw['자료542'],
    일과시간: (raw['일과시간'] as string[]) ?? [],
  };
}

export function listTeachers(data: ComciSchoolData): { index: number; name: string }[] {
  const list: { index: number; name: string }[] = [];
  for (let i = 1; i <= data.교사수; i++) {
    const name = String(data.자료446[i] ?? '').replace(/\*/g, '');
    if (name) list.push({ index: i, name });
  }
  return list;
}

// [grade1Count, grade2Count, grade3Count]
export function getGradeClassCounts(data: ComciSchoolData): number[] {
  return [1, 2, 3].map((grade) => Number(data.학급수[grade] ?? 0));
}

export function getPeriodTimes(data: ComciSchoolData): string[] {
  return Array.from({ length: MAX_PERIOD }, (_, i) => data.일과시간[i] ?? '');
}

// comci's mTh/mSb: which formula extracts "the first packed number" vs "the second" flips
// depending on 분리, but which array a value came from determines what those numbers *mean*
// (teacher+subject for 자료481/자료147, class+subject for 자료542/the teacher-view baseline).
function mTh(value: number, 분리: number): number {
  return 분리 === 100 ? Math.floor(value / 100) : value % 분리;
}
function mSb(value: number, 분리: number): number {
  return 분리 === 100 ? value % 100 : Math.floor(value / 분리);
}
function encodeTeacherCell(classCode: number, subjIdx: number, 분리: number): number {
  return 분리 === 100 ? classCode * 100 + subjIdx : subjIdx * 분리 + classCode;
}

function get3(source: unknown, a: number, b: number, c: number): unknown {
  return (source as Record<number, Record<number, Record<number, unknown>>> | undefined)?.[a]?.[b]?.[c];
}
function get4(source: unknown, a: number, b: number, c: number, d: number): unknown {
  return (source as Record<number, Record<number, Record<number, Record<number, unknown>>>> | undefined)?.[a]?.[b]?.[
    c
  ]?.[d];
}

function decodeChangeAndValue(
  current: unknown,
  baseline: unknown,
  변경알림: number
): { numeric: number; changed: boolean } {
  if (!current) return { numeric: 0, changed: false };
  if (변경알림 === 1) {
    const str = String(current);
    if (str.startsWith('>')) return { numeric: Number(str.slice(1)), changed: true };
    return { numeric: Number(str), changed: false };
  }
  const numeric = Number(current);
  const changed = baseline !== undefined && Number(baseline) !== numeric;
  return { numeric, changed };
}

export function getClassTimetable(data: ComciSchoolData, grade: number, classNum: number): TimetableGrid {
  const grid: TimetableGrid = [];
  for (let period = 1; period <= MAX_PERIOD; period++) {
    const row: (TimetableCell | null)[] = [];
    for (let day = 1; day <= MAX_DAY; day++) {
      const current = get4(data.자료147, grade, classNum, day, period);
      const baseline = get4(data.자료481, grade, classNum, day, period);
      const { numeric, changed } = decodeChangeAndValue(current, baseline, data.변경알림);
      if (!numeric) {
        row.push(null);
        continue;
      }
      const teacherIdx = mTh(numeric, data.분리);
      const subjIdx = mSb(numeric, data.분리);
      const subject = String(data.자료492[subjIdx] ?? '');
      const teacher = String(data.자료446[teacherIdx] ?? '').replace(/\*/g, '');
      row.push(subject ? { subject, person: teacher, changed } : null);
    }
    grid.push(row);
  }
  return grid;
}

// Mirrors 교사시간표_원자료생성(): scans every grade/class/day/period in 자료481 (the
// baseline class data) once, keeping only the slots that belong to this teacher, re-encoded
// the same way 자료542 encodes values — so it can be decoded/compared with the same mTh/mSb
// calls. Only needed when 변경알림==0 (that school doesn't use the ">" change-marker
// convention, so "changed" has to be detected by diffing against this baseline instead).
function buildTeacherBaseline(data: ComciSchoolData, teacherIndex: number): Map<string, number> {
  const baseline = new Map<string, number>();
  const gradeClassCounts = getGradeClassCounts(data);
  for (let grade = 1; grade <= 3; grade++) {
    const classCount = gradeClassCounts[grade - 1];
    for (let classNum = 1; classNum <= classCount; classNum++) {
      for (let day = 1; day <= MAX_DAY; day++) {
        for (let period = 1; period <= MAX_PERIOD; period++) {
          const cell = get4(data.자료481, grade, classNum, day, period);
          if (!cell) continue;
          const numeric = Number(cell);
          if (mTh(numeric, data.분리) !== teacherIndex) continue;
          const subjIdx = mSb(numeric, data.분리);
          const classCode = grade * 100 + classNum;
          baseline.set(`${day}-${period}`, encodeTeacherCell(classCode, subjIdx, data.분리));
        }
      }
    }
  }
  return baseline;
}

export function getTeacherTimetable(data: ComciSchoolData, teacherIndex: number): TimetableGrid {
  const baseline = data.변경알림 === 0 ? buildTeacherBaseline(data, teacherIndex) : null;
  const grid: TimetableGrid = [];
  for (let period = 1; period <= MAX_PERIOD; period++) {
    const row: (TimetableCell | null)[] = [];
    for (let day = 1; day <= MAX_DAY; day++) {
      const current = get3(data.자료542, teacherIndex, day, period);
      const baselineValue = baseline?.get(`${day}-${period}`);
      const { numeric, changed } = decodeChangeAndValue(current, baselineValue, data.변경알림);
      if (!numeric) {
        row.push(null);
        continue;
      }
      const classCode = mTh(numeric, data.분리);
      const subjIdx = mSb(numeric, data.분리);
      const subject = String(data.자료492[subjIdx] ?? '');
      if (!subject || classCode <= 0) {
        row.push(null);
        continue;
      }
      const grade = Math.floor(classCode / 100);
      const classNum = classCode % 100;
      row.push({ subject, person: `${grade}-${classNum}`, changed });
    }
    grid.push(row);
  }
  return grid;
}
