import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  listTeachers,
  getGradeClassCounts,
  getPeriodTimes,
  getClassTimetable,
  getTeacherTimetable,
  deobfuscatePage,
  discoverPageConfig,
  decryptPayload,
  decodeMaskedString,
  cleanTeacherName,
  type ComciSchoolData,
} from './comci';

// Hand-built but internally-consistent fixture in the *normalized* shape fetchSchoolData()
// returns (names already decoded, comci's rotating field names already resolved).
// 분리=1000 cell encoding: class cell = subject*1000 + teacher, teacher cell = subject*1000 + classCode.
//
// 1학년1반 Mon period1: 김민수/국어 (baseline) -> live-changed to 체육 (same teacher)
// 1학년1반 Mon period2: 이영희/수학
// 2학년1반 Mon period1: 이영희/영어
// 2학년1반 Tue period1: 김민수/과학 (unchanged)
function buildFixture(변경알림: 0 | 1): ComciSchoolData {
  const classBaseline = {
    1: { 1: { 1: { 1: 1001, 2: 2002 } } },
    2: { 1: { 1: { 1: 3002 }, 2: { 1: 4001 } } },
  };
  const classCurrent =
    변경알림 === 1
      ? {
          1: { 1: { 1: { 1: '>5001', 2: 2002 } } },
          2: { 1: { 1: { 1: 3002 }, 2: { 1: 4001 } } },
        }
      : {
          1: { 1: { 1: { 1: 5001, 2: 2002 } } },
          2: { 1: { 1: { 1: 3002 }, 2: { 1: 4001 } } },
        };
  const teacherCurrent =
    변경알림 === 1
      ? {
          1: { 1: { 1: '>5101' }, 2: { 1: 4201 } },
          2: { 1: { 1: 3201, 2: 2101 } },
        }
      : {
          1: { 1: { 1: 5101 }, 2: { 1: 4201 } },
          2: { 1: { 1: 3201, 2: 2101 } },
        };

  return {
    분리: 1000,
    변경알림,
    학교명: '테스트중학교',
    교사수: 2,
    teacherNames: ['', '김민수', '이영희'],
    subjectNames: ['5', '국어', '수학', '영어', '과학', '체육'],
    학급수: [2, 1, 1, 0],
    가상학급수: [0, 0, 0, 0],
    classBaseline,
    classCurrent,
    teacherCurrent,
    periodTimes: ['1(09:00)', '2(09:55)'],
  };
}

describe('listTeachers / getGradeClassCounts / getPeriodTimes', () => {
  it('skips the unused index 0', () => {
    expect(listTeachers(buildFixture(1))).toEqual([
      { index: 1, name: '김민수' },
      { index: 2, name: '이영희' },
    ]);
  });

  it('returns per-grade class counts, excluding virtual classes', () => {
    expect(getGradeClassCounts(buildFixture(1))).toEqual([1, 1, 0]);
    expect(getGradeClassCounts({ ...buildFixture(1), 학급수: [9, 4, 3, 2], 가상학급수: [1, 1, 0, 0] })).toEqual([
      3, 3, 2,
    ]);
  });

  it('extracts the HH:MM start time out of comci\'s "N(HH:MM)" period labels', () => {
    expect(getPeriodTimes(buildFixture(1)).slice(0, 3)).toEqual(['09:00', '09:55', '']);
  });
});

describe('cleanTeacherName (mirrors comci Q성명)', () => {
  it('drops a trailing mask star but keeps an interior one', () => {
    expect(cleanTeacherName('길주*')).toBe('길주');
    expect(cleanTeacherName('김*수')).toBe('김*수');
    expect(cleanTeacherName('김*')).toBe('김*');
  });
});

describe('getClassTimetable (변경알림=1, "> prefix" change detection)', () => {
  const data = buildFixture(1);

  it('decodes a normal cell to subject + teacher', () => {
    expect(getClassTimetable(data, 1, 1)[1][0]).toEqual({ subject: '수학', person: '이영희', changed: false });
  });

  it('marks a ">"-prefixed cell as changed and strips the marker', () => {
    expect(getClassTimetable(data, 1, 1)[0][0]).toEqual({ subject: '체육', person: '김민수', changed: true });
  });

  it('returns null for empty cells', () => {
    const grid = getClassTimetable(data, 1, 1);
    expect(grid[0][1]).toBeNull();
    expect(grid[7][0]).toBeNull();
  });

  it('returns all nulls for a grade/class combination with no data', () => {
    const grid = getClassTimetable(data, 3, 1);
    expect(grid.every((row) => row.every((cell) => cell === null))).toBe(true);
  });
});

describe('getClassTimetable (변경알림=0, diff-against-baseline change detection)', () => {
  it('flags a cell as changed when it differs from the baseline, with no ">" marker present', () => {
    const grid = getClassTimetable(buildFixture(0), 1, 1);
    expect(grid[0][0]).toEqual({ subject: '체육', person: '김민수', changed: true });
    expect(grid[1][0]).toEqual({ subject: '수학', person: '이영희', changed: false });
  });
});

describe('getClassTimetable / getTeacherTimetable (분리=100 school)', () => {
  // The packed integer is split into 3-digit groups regardless of 분리 (comci baSplit/thSplit);
  // 분리 only decides how the subject group is reduced (subject % 분리).
  const data: ComciSchoolData = {
    ...buildFixture(1),
    분리: 100,
    classCurrent: { 1: { 1: { 1: { 1: 21017 } } } },
    classBaseline: { 1: { 1: { 1: { 1: 21017 } } } },
    teacherCurrent: { 17: { 1: { 1: 21101 } } },
    teacherNames: Object.assign(Array(18).fill(''), { 17: '박교사' }),
    subjectNames: Object.assign(Array(22).fill(''), { 21: '음악' }),
    교사수: 17,
  };

  it('decodes teacher = low 3 digits, subject = the rest', () => {
    expect(getClassTimetable(data, 1, 1)[0][0]).toEqual({ subject: '음악', person: '박교사', changed: false });
  });

  it('decodes teacher-view class code = low 3 digits', () => {
    expect(getTeacherTimetable(data, 17)[0][0]).toEqual({ subject: '음악', person: '1-1', changed: false });
  });
});

describe('getTeacherTimetable (변경알림=1, "> prefix" change detection)', () => {
  const data = buildFixture(1);

  it("computes the teacher's own weekly schedule across different classes", () => {
    const grid = getTeacherTimetable(data, 1);
    expect(grid[0][0]).toEqual({ subject: '체육', person: '1-1', changed: true });
    expect(grid[0][1]).toEqual({ subject: '과학', person: '2-1', changed: false });
  });

  it('returns null where the teacher has no class that period', () => {
    expect(getTeacherTimetable(data, 2)[1][1]).toBeNull();
  });
});

describe('getTeacherTimetable (변경알림=0, rebuilt-from-baseline diff)', () => {
  it('flags a change by comparing against the inverted class-grid baseline', () => {
    const grid = getTeacherTimetable(buildFixture(0), 1);
    expect(grid[0][0]).toEqual({ subject: '체육', person: '1-1', changed: true });
    expect(grid[0][1]).toEqual({ subject: '과학', person: '2-1', changed: false });
  });
});

// --- page / payload decoding -------------------------------------------------------------

// Re-implements comci's own XOR+hex encoder (the inverse of its in-page decoder) so tests can
// build an obfuscated page without depending on a live capture.
function obfuscate(src: string, k: number): string {
  let hex = '';
  for (let j = 0; j < src.length; j++) {
    hex += (src.charCodeAt(j) ^ ((k + j * 13) & 255)).toString(16).toUpperCase().padStart(4, '0');
  }
  return (
    "/* hour-obfuscated-v2 */(function(a,k){var s='',i,j,b;for(i=0;i<a.length;i++){if(a[i][0]){s+=a[i][1];continue;}" +
    'b=a[i][1];for(j=0;j<b.length;j+=4){s+=String.fromCharCode(parseInt(b.substr(j,4),16)^((k+(j/4)*13)&255));}}' +
    `(0,eval)(s);})([[0,"${hex}"]],${k});`
  );
}

describe('deobfuscatePage', () => {
  it('decodes nested obfuscation layers without executing them', () => {
    const inner = obfuscate("function QAjaxTimetable(){return {url:'./111222_T?'};}", 41);
    const page = `<script>${obfuscate(`var x=1;${inner}var y=2;`, 83)}</script>`;
    const out = deobfuscatePage(page);
    expect(out).toContain('var x=1;');
    expect(out).toContain("url:'./111222_T?'");
    expect(out).toContain('var y=2;');
    expect(out).not.toContain('(0,eval)');
  });
});

describe('discoverPageConfig', () => {
  const page =
    "<script>window.__HourRequestToken='ABCDEF0123';</script>" +
    "url:'./424242_T?'+btoa(s7);sc_data('55555_',sc,r,'0');" +
    'var key=CryptoJS.enc.Hex.parse((function(a){return a[2]+a[1]+a[3]+a[0];})([\'0000000000000000\',\'1111111111111111\',\'2222222222222222\',\'3333333333333333\']));' +
    'var 키=String.fromCharCode(1,2,3);        var 바이트문자열=atob(암호문);' +
    '교사자료=Q자료(자료.자료999[교사][요일][교시]);일일자료=Q자료(자료.자료888[학년][반][요일][교시]);' +
    '원자료=Q자료(자료.자료777[학년][반][요일][교시]);' +
    'QnmsbChange(자료.자료666[교사])+"x";과목명=Q과목명(자료.자료555[sb]);' +
    '"<td>"+자료.자료444[교시-1]+"</td>"';

  it('reads every rotating value from the page', () => {
    expect(discoverPageConfig(page)).toEqual({
      token: 'ABCDEF0123',
      endpoint: '424242_T',
      prefix: '55555_',
      aesKeyHex: '2222222222222222111111111111111133333333333333330000000000000000',
      xorKey: [1, 2, 3],
      keys: {
        teacherCurrent: '자료999',
        classCurrent: '자료888',
        classBaseline: '자료777',
        teacherNames: '자료666',
        subjectNames: '자료555',
        periodTimes: '자료444',
      },
    });
  });

  it('falls back to the last known values when a pattern is missing', () => {
    const cfg = discoverPageConfig("window.__HourRequestToken='AA';");
    expect(cfg.endpoint).toBe('367509_T');
    expect(cfg.keys.teacherNames).toBe('자료172');
  });

  it('returns a null token when the page has none', () => {
    expect(discoverPageConfig('<html></html>').token).toBeNull();
  });
});

describe('decryptPayload', () => {
  const keyHex = 'ae27e3ca1b2c4dd2c8d659a8db033e236f5ad39908081c703dc0ddc0b3fcbc57';
  function encrypt(plain: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const c = crypto.createCipheriv('aes-256-cbc', key, iv);
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    const head = `enc5:${iv.toString('base64')}:${ct.toString('base64')}`;
    const hmacKey = crypto.createHash('sha256').update(key).digest();
    return `${head}:${crypto.createHmac('sha256', hmacKey).update(head).digest('base64')}`;
  }

  it('verifies the HMAC and decrypts an enc5 payload', () => {
    expect(decryptPayload(encrypt('{"학교명":"x"}'), keyHex)).toBe('{"학교명":"x"}');
  });

  it('rejects a tampered payload', () => {
    const tampered = encrypt('{"a":1}').replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    expect(() => decryptPayload(tampered, keyHex)).toThrow();
  });

  it('passes plain (unencrypted) responses through', () => {
    expect(decryptPayload('{"a":1}\u0000\u0000', keyHex)).toBe('{"a":1}');
  });
});

describe('decodeMaskedString', () => {
  it('XOR-decodes base64 EUC-KR text (sample captured from a live comci response)', () => {
    expect(decodeMaskedString('5vD5wA==', [90, 93, 70, 47, 117, 80, 44, 38, 39, 34, 105, 49])).toBe('서울');
  });

  it('returns an empty string for empty input', () => {
    expect(decodeMaskedString('', [1])).toBe('');
  });
});
