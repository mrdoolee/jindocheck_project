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
  seatRow: number | null;
  seatCol: number | null;
  updatedAt?: string;
}

export interface CurriculumItem {
  id?: number;
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
