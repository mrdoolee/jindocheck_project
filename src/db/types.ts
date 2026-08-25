export interface ClassRecord {
  id?: number;
  name: string;
  createdAt: string;
  order: number;
  seatRows?: number;
  seatCols?: number;
  updatedAt?: string;
}

export interface StudentRecord {
  id?: number;
  classId: number;
  number: number;
  name: string;
  role?: string | null;
  seatRow: number | null;
  seatCol: number | null;
  order?: number;
  updatedAt?: string;
}

export interface Subject {
  id?: number;
  name: string;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ClassSubject {
  id?: number;
  classId: number;
  subjectId: number;
  updatedAt?: string;
}

export interface CurriculumItem {
  id?: number;
  subjectId: number;
  order: number;
  unit: string;
  lesson: string;
  updatedAt?: string;
}

export interface ProgressRecord {
  id?: number;
  classId: number;
  curriculumItemId: number;
  done: boolean;
  date: string | null;
  updatedAt?: string;
}

export type AttendanceStatus = '출석' | '결석' | '지각' | '조퇴';

export interface AttendanceRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: string;
  status: AttendanceStatus;
  note: string;
  updatedAt?: string;
}

export interface StickerRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: string;
  points: number;
  reason: string;
  updatedAt?: string;
}

export type NoteType = '특이사항' | '과제제출' | '기타';

export interface NoteRecord {
  id?: number;
  classId: number;
  studentId: number;
  date: string;
  type: NoteType;
  content: string;
  updatedAt?: string;
}

export type TimetableMode = 'comci' | 'manual';

export interface TimetableSettings {
  id: number; // always 1 — single-row settings
  // Missing/undefined means 'comci' — every row saved before manual mode existed predates
  // this field, and the comci lookup flow's own save call still omits it (see
  // TimetableSettingsManager.tsx) so its existing tests keep asserting an exact object shape.
  mode?: TimetableMode;
  // comci mode only:
  schoolCode?: string;
  teacherIndex?: number;
  teacherName?: string;
  // manual mode only: how many period rows the manual grid/view render, default 7
  periodCount?: number;
}

export interface ManualTimetableEntry {
  id?: number;
  day: number; // 0=월 .. 4=금
  period: number; // 1-based
  subject: string;
  note: string;
  updatedAt?: string;
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
