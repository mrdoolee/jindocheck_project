// Scrapes "컴시간알리미" (comci.net) teacher/class timetables. comci.net is an unofficial,
// undocumented service — this whole module is inherently a best-effort scrape, not a contract.
//
// As of late 2026 comci protects its data endpoint (verified against the live /th page):
//   1. Its client JS is obfuscated ("hour-obfuscated-v2": hex strings XOR'd with a per-page
//      key, then eval'd — sometimes nested). deobfuscatePage() reverses that with the same
//      arithmetic. It never evaluates the page's code — remote JS is only ever read as text.
//   2. Each page embeds a one-time request token (window.__HourRequestToken) and sets a session
//      cookie; the data request must send both (X-Hour-Token header + Cookie) or comci answers
//      403 HOUR_TOKEN_REQUIRED. It also rate-limits (429 HOUR_RATE_LIMIT).
//   3. The response body is "enc5:<iv>:<ciphertext>:<hmac>" — AES-256-CBC with an HMAC-SHA256
//      tag, key embedded in the page JS (decryptPayload()).
//   4. Teacher/subject/school names inside the JSON are base64 of EUC-KR bytes XOR'd with a
//      short key (decodeMaskedString(), comci's QnmsbChange).
//   5. The JSON field names (자료172, 자료145, ...) are build-specific.
// Everything rotating (endpoint, query prefix, AES key, XOR key, field names) is re-discovered
// from the live page on every request (discoverPageConfig()); hardcoded values are only a
// last-resort fallback.

import crypto from 'node:crypto';

const PORTS = ['http://comci.net:4082', 'http://comci.net:4085'];
const REQUEST_TIMEOUT_MS = 6000;
const MAX_PERIOD = 8;
const MAX_DAY = 5;

export class ComciError extends Error {}

export interface ComciSchoolData {
  분리: number;
  변경알림: number;
  학교명: string;
  교사수: number;
  teacherNames: string[]; // 1-indexed, decoded + mask-cleaned
  subjectNames: string[]; // 1-indexed, decoded (index 0 is comci's count)
  학급수: number[]; // [total, grade1, grade2, grade3]
  가상학급수: number[]; // virtual (non-real) classes per grade, same layout
  classBaseline: unknown; // [grade][classNum][day][period] — 원자료
  classCurrent: unknown; // [grade][classNum][day][period] — 일일자료 (current week)
  teacherCurrent: unknown; // [teacherIndex][day][period] — current week
  periodTimes: string[]; // e.g. "1(08:30)"
}

export interface TimetableCell {
  subject: string;
  person: string; // teacher name (class view) or "N-M" grade-class (teacher view)
  changed: boolean;
}

export type TimetableGrid = (TimetableCell | null)[][]; // [period-1][day-1]

// --- page decoding -------------------------------------------------------------------------

const OBFUSCATED_BLOCK =
  /\(function\(a,k\)\{var s='',i,j,b;[\s\S]*?\(0,eval\)\(s\);\}\)\((\[\[[\s\S]*?\]\]),(\d+)\);?/g;

function decodeBlock(parts: [number, string][], k: number): string {
  let s = '';
  for (const [plain, body] of parts) {
    if (plain) {
      s += body;
      continue;
    }
    for (let j = 0; j < body.length; j += 4) {
      s += String.fromCharCode(parseInt(body.substr(j, 4), 16) ^ ((k + (j / 4) * 13) & 255));
    }
  }
  return s;
}

/** Replaces every obfuscated block (recursively) with its decoded source text. */
export function deobfuscatePage(html: string, depth = 0): string {
  if (depth > 5) return html;
  return html.replace(OBFUSCATED_BLOCK, (whole, arr: string, k: string) => {
    try {
      return deobfuscatePage(decodeBlock(JSON.parse(arr), Number(k)), depth + 1);
    } catch {
      return whole;
    }
  });
}

export interface ComciPageConfig {
  token: string | null;
  endpoint: string;
  prefix: string;
  aesKeyHex: string;
  xorKey: number[];
  keys: {
    teacherNames: string;
    subjectNames: string;
    teacherCurrent: string;
    classCurrent: string;
    classBaseline: string;
    periodTimes: string;
  };
}

// Last values seen live (2026-11). Only used when discovery fails.
const FALLBACK = {
  endpoint: '367509_T',
  prefix: '77871_',
  aesKeyHex: 'ae27e3ca1b2c4dd2c8d659a8db033e236f5ad39908081c703dc0ddc0b3fcbc57',
  xorKey: [90, 93, 70, 47, 117, 80, 44, 38, 39, 34, 105, 49],
  keys: {
    teacherNames: '자료172',
    subjectNames: '자료168',
    teacherCurrent: '자료145',
    classCurrent: '자료122',
    classBaseline: '자료104',
    periodTimes: '자료180',
  },
};

const FIELD = '([^\\[\\]\\s.()]+)';

function discoverAesKey(js: string): string | null {
  const m = js.match(
    /\(function\(a\)\{return a\[(\d)\]\+a\[(\d)\]\+a\[(\d)\]\+a\[(\d)\];\}\)\(\[([^\]]+)\]\)/
  );
  if (!m) return null;
  const parts = m[5].split(',').map((s) => s.trim().replace(/['"]/g, ''));
  const hex = [m[1], m[2], m[3], m[4]].map((i) => parts[Number(i)] ?? '').join('');
  return /^[0-9a-f]{64}$/i.test(hex) ? hex : null;
}

/** Reads every rotating value from an already-deobfuscated /th page. */
export function discoverPageConfig(js: string): ComciPageConfig {
  const pick = (re: RegExp) => js.match(re)?.[1];
  const xor = pick(/var 키=String\.fromCharCode\(([\d,\s]+)\)/);
  return {
    token: pick(/__HourRequestToken\s*=\s*['"]([0-9A-Za-z]+)['"]/) ?? null,
    endpoint: pick(/url:\s*'\.\/(\d+_T)\?'/) ?? FALLBACK.endpoint,
    prefix: pick(/sc_data\(\s*'(\d+_)'/) ?? FALLBACK.prefix,
    aesKeyHex: discoverAesKey(js) ?? FALLBACK.aesKeyHex,
    xorKey: xor ? xor.split(',').map((n) => Number(n.trim())) : FALLBACK.xorKey,
    keys: {
      teacherNames: pick(new RegExp(`QnmsbChange\\(자료\\.${FIELD}\\[교사\\]\\)`)) ?? FALLBACK.keys.teacherNames,
      subjectNames: pick(new RegExp(`Q과목명\\(자료\\.${FIELD}\\[sb\\]\\)`)) ?? FALLBACK.keys.subjectNames,
      teacherCurrent: pick(new RegExp(`교사자료=Q자료\\(자료\\.${FIELD}\\[교사\\]`)) ?? FALLBACK.keys.teacherCurrent,
      classCurrent: pick(new RegExp(`일일자료=Q자료\\(자료\\.${FIELD}\\[학년\\]\\[반\\]`)) ?? FALLBACK.keys.classCurrent,
      classBaseline: pick(new RegExp(`원자료=Q자료\\(자료\\.${FIELD}\\[학년\\]\\[반\\]`)) ?? FALLBACK.keys.classBaseline,
      periodTimes: pick(new RegExp(`자료\\.${FIELD}\\[교시-1\\]`)) ?? FALLBACK.keys.periodTimes,
    },
  };
}

/** comci HChange: verifies + decrypts an "enc5:iv:ct:tag" body; plain bodies pass through. */
export function decryptPayload(body: string, aesKeyHex: string): string {
  const data = body.replace(/\x00+$/, '');
  if (!data.startsWith('enc5:') && !data.startsWith('enc1:')) return data;
  const parts = data.split(':');
  if (parts.length !== 4) throw new ComciError('컴시간 응답 형식이 바뀐 것 같습니다. (암호화 형식)');
  const encoding = parts[0] === 'enc5' ? 'base64' : 'hex';
  const key = Buffer.from(aesKeyHex, 'hex');
  const hmacKey = crypto.createHash('sha256').update(key).digest();
  const expected = crypto.createHmac('sha256', hmacKey).update(parts.slice(0, 3).join(':')).digest(encoding);
  if (expected !== parts[3]) throw new ComciError('컴시간 응답을 해독하지 못했습니다. (키가 바뀐 것 같습니다)');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(parts[1], encoding));
  return Buffer.concat([decipher.update(Buffer.from(parts[2], encoding)), decipher.final()])
    .toString('utf8')
    .replace(/\x00+$/, '');
}

/** comci QnmsbChange: base64 → XOR with a repeating key → EUC-KR text. */
export function decodeMaskedString(value: unknown, xorKey: number[]): string {
  if (typeof value !== 'string' || value === '') return '';
  const bytes = Buffer.from(value, 'base64');
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= xorKey[i % xorKey.length];
  return new TextDecoder('euc-kr').decode(bytes);
}

/** comci Q성명: keep an interior mask star (or "김*"), otherwise drop the first star. */
export function cleanTeacherName(name: string): string {
  if ((name.includes('*') && !name.startsWith('*') && !name.endsWith('*')) || (name.length === 2 && name[1] === '*')) {
    return name;
  }
  return name.replace('*', '');
}

// --- network -------------------------------------------------------------------------------

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function sessionCookie(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') ?? ''].filter(Boolean);
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

function describeHttpError(status: number, body: string): string {
  if (status === 429 || body.includes('HOUR_RATE_LIMIT')) {
    return '컴시간 요청이 너무 많습니다. 1분 후 다시 시도해주세요.';
  }
  if (status === 503 || body.includes('HOUR_SERVICE_BUSY')) return '컴시간 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.';
  if (body.includes('HOUR_TOKEN_REQUIRED')) return '컴시간 접속 확인(토큰)에 실패했습니다. 컴시간 접속 방식이 바뀐 것 같습니다.';
  return `컴시간 서버 응답 오류 (${status})`;
}

async function openTeacherPage(): Promise<{ baseUrl: string; js: string; cookie: string }> {
  let lastErr: unknown;
  for (const baseUrl of PORTS) {
    try {
      const res = await timedFetch(`${baseUrl}/th`);
      if (!res.ok) throw new ComciError(`컴시간 서버 응답 오류 (${res.status})`);
      const html = new TextDecoder('euc-kr').decode(await res.arrayBuffer());
      return { baseUrl, js: deobfuscatePage(html), cookie: sessionCookie(res) };
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof ComciError) throw lastErr;
  throw new ComciError('컴시간 서버에 접속할 수 없습니다. 잠시 후 다시 시도해주세요.');
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.map((v) => Number(v) || 0) : [];
}

export async function fetchSchoolData(schoolCode: string): Promise<ComciSchoolData> {
  if (!/^\d+$/.test(schoolCode)) throw new ComciError('학교코드는 숫자여야 합니다.');

  const { baseUrl, js, cookie } = await openTeacherPage();
  const cfg = discoverPageConfig(js);
  if (!cfg.token) throw new ComciError('컴시간 접속 확인 정보를 찾지 못했습니다. 컴시간 접속 방식이 바뀐 것 같습니다.');

  const param = Buffer.from(`${cfg.prefix}${schoolCode}_0_1_enc5`, 'utf8').toString('base64');
  let res: Response;
  try {
    res = await timedFetch(`${baseUrl}/${cfg.endpoint}?${param}`, {
      headers: { 'X-Hour-Token': cfg.token, Cookie: cookie, Referer: `${baseUrl}/th` },
    });
  } catch {
    throw new ComciError('컴시간 서버에 접속할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
  const body = await res.text();
  if (!res.ok) throw new ComciError(describeHttpError(res.status, body));

  const text = decryptPayload(body, cfg.aesKeyHex);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end - start < 2) {
    throw new ComciError('컴시간에서 학교 데이터를 찾을 수 없습니다. 학교코드를 확인해주세요.');
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new ComciError('컴시간 응답 형식이 바뀐 것 같습니다.');
  }

  const k = cfg.keys;
  const teacherRaw = raw[k.teacherNames];
  const subjectRaw = raw[k.subjectNames];
  if (!Array.isArray(teacherRaw) || !Array.isArray(subjectRaw) || !raw[k.classCurrent] || !raw[k.teacherCurrent]) {
    throw new ComciError('컴시간 응답 형식이 바뀐 것 같습니다.');
  }
  const decode = (v: unknown) => decodeMaskedString(v, cfg.xorKey);
  // comci now sends the same placeholder name ("컴시간중") for every school — its own page shows
  // the name from the school-search list instead. Report no name rather than a wrong one.
  const schoolName = decode(raw['학교명']);

  return {
    분리: typeof raw['분리'] === 'number' ? raw['분리'] : 100,
    변경알림: typeof raw['변경알림'] === 'number' ? raw['변경알림'] : 0,
    학교명: schoolName === '컴시간중' ? '' : schoolName,
    교사수: typeof raw['교사수'] === 'number' ? raw['교사수'] : teacherRaw.length - 1,
    teacherNames: teacherRaw.map((v, i) => (i === 0 ? '' : cleanTeacherName(decode(v)))),
    subjectNames: subjectRaw.map((v, i) => (i === 0 ? String(v) : decode(v))),
    학급수: toNumberArray(raw['학급수']),
    가상학급수: toNumberArray(raw['가상학급수']),
    classBaseline: raw[k.classBaseline],
    classCurrent: raw[k.classCurrent],
    teacherCurrent: raw[k.teacherCurrent],
    periodTimes: Array.isArray(raw[k.periodTimes]) ? (raw[k.periodTimes] as unknown[]).map(String) : [],
  };
}

// --- pure decoding over the normalized data --------------------------------------------------

export function listTeachers(data: ComciSchoolData): { index: number; name: string }[] {
  const list: { index: number; name: string }[] = [];
  for (let i = 1; i <= data.교사수; i++) {
    const name = data.teacherNames[i] ?? '';
    if (name) list.push({ index: i, name });
  }
  return list;
}

// [grade1Count, grade2Count, grade3Count], real classes only (comci 학급설정하기)
export function getGradeClassCounts(data: ComciSchoolData): number[] {
  return [1, 2, 3].map((grade) => Math.max(0, (data.학급수[grade] ?? 0) - (data.가상학급수[grade] ?? 0)));
}

export function getPeriodTimes(data: ComciSchoolData): string[] {
  return Array.from({ length: MAX_PERIOD }, (_, i) => {
    const label = data.periodTimes[i] ?? '';
    return label.match(/\((\d{1,2}:\d{2})\)/)?.[1] ?? label;
  });
}

function get3(source: unknown, a: number, b: number, c: number): unknown {
  return (source as Record<number, Record<number, Record<number, unknown>>> | undefined)?.[a]?.[b]?.[c];
}
function get4(source: unknown, a: number, b: number, c: number, d: number): unknown {
  return (source as Record<number, Record<number, Record<number, Record<number, unknown>>>> | undefined)?.[a]?.[b]?.[
    c
  ]?.[d];
}

// comci baSplit/thSplit: a cell is a packed integer, optionally ">"-prefixed when 변경알림=1
// marks a changed slot. When 변경알림=0, "changed" means "differs from the baseline".
function parseCell(
  current: unknown,
  baseline: unknown,
  변경알림: number
): { value: number; changed: boolean } | null {
  if (current === undefined || current === null || current === '' || current === 0) return null;
  const str = String(current);
  const marked = str.startsWith('>');
  const value = Number(marked ? str.slice(1) : str);
  if (!Number.isFinite(value) || value <= 0) return null;
  const changed = 변경알림 === 1 ? marked : Number(baseline ?? 0) !== value;
  return { value, changed };
}

// Low 3 digits = teacher (class view) or grade*100+class (teacher view); the rest = subject
// group, reduced by 분리 to the subject index (comci splitData / mTh(…,1000) / sb % 분리).
const low3 = (v: number) => v % 1000;
const high = (v: number) => Math.floor(v / 1000);

export function getClassTimetable(data: ComciSchoolData, grade: number, classNum: number): TimetableGrid {
  const grid: TimetableGrid = [];
  for (let period = 1; period <= MAX_PERIOD; period++) {
    const row: (TimetableCell | null)[] = [];
    for (let day = 1; day <= MAX_DAY; day++) {
      const cell = parseCell(
        get4(data.classCurrent, grade, classNum, day, period),
        get4(data.classBaseline, grade, classNum, day, period),
        data.변경알림
      );
      const teacherIdx = cell ? low3(cell.value) : 0;
      if (!cell || teacherIdx <= 0) {
        row.push(null);
        continue;
      }
      const subject = data.subjectNames[high(cell.value) % data.분리] ?? '';
      const teacher = data.teacherNames[teacherIdx] ?? '';
      row.push(subject || teacher ? { subject, person: teacher, changed: cell.changed } : null);
    }
    grid.push(row);
  }
  return grid;
}

// Mirrors comci 교사시간표_원자료생성(): the server doesn't send a teacher-view baseline, so
// rebuild it by inverting the class baseline, re-encoded the way teacher cells are encoded
// (subject*1000 + classCode) so it can be compared directly. Only needed when 변경알림=0.
function buildTeacherBaseline(data: ComciSchoolData, teacherIndex: number): Map<string, number> {
  const baseline = new Map<string, number>();
  for (let grade = 1; grade <= 3; grade++) {
    const classCount = data.학급수[grade] ?? 0;
    for (let classNum = 1; classNum <= classCount; classNum++) {
      for (let day = 1; day <= MAX_DAY; day++) {
        for (let period = 1; period <= MAX_PERIOD; period++) {
          const value = Number(get4(data.classBaseline, grade, classNum, day, period) ?? 0);
          if (!value || low3(value) !== teacherIndex) continue;
          baseline.set(`${day}-${period}`, high(value) * 1000 + grade * 100 + classNum);
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
      const cell = parseCell(
        get3(data.teacherCurrent, teacherIndex, day, period),
        baseline?.get(`${day}-${period}`),
        data.변경알림
      );
      if (!cell || high(cell.value) <= 0) {
        row.push(null);
        continue;
      }
      const classCode = low3(cell.value);
      const subject = data.subjectNames[high(cell.value) % data.분리] ?? '';
      if (!subject || classCode <= 0) {
        row.push(null);
        continue;
      }
      row.push({ subject, person: `${Math.floor(classCode / 100)}-${classCode % 100}`, changed: cell.changed });
    }
    grid.push(row);
  }
  return grid;
}
