export interface SeatingBackupDesk {
  id: string;
  row: number;
  col: number;
  disabled?: boolean;
}

export interface SeatingBackupFile {
  assignments: Record<string, string>;
  desks: SeatingBackupDesk[];
}

export interface SeatPlacement {
  studentNumber: number;
  row: number;
  col: number;
}

export interface ParsedSeatingBackup {
  placements: SeatPlacement[];
  skipped: string[];
}

const STUDENT_TOKEN = /^s(\d+)$/i;

function isSeatingBackupFile(value: unknown): value is SeatingBackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.assignments === 'object' && v.assignments !== null && Array.isArray(v.desks);
}

export function parseSeatingBackup(json: unknown): ParsedSeatingBackup {
  if (!isSeatingBackupFile(json)) {
    throw new Error('배치도 파일 형식을 인식할 수 없습니다 (assignments, desks 필드 필요).');
  }

  const deskById = new Map(json.desks.map((d) => [d.id, d]));
  const placements: SeatPlacement[] = [];
  const skipped: string[] = [];

  for (const [deskId, token] of Object.entries(json.assignments)) {
    const desk = deskById.get(deskId);
    if (!desk) {
      skipped.push(`${deskId}: 알 수 없는 좌석`);
      continue;
    }
    if (desk.disabled) {
      skipped.push(`${deskId}: 비활성화된 좌석`);
      continue;
    }
    const match = STUDENT_TOKEN.exec(String(token));
    if (!match) {
      skipped.push(`${deskId}: 인식할 수 없는 학생 식별자(${token})`);
      continue;
    }
    placements.push({ studentNumber: Number(match[1]), row: desk.row, col: desk.col });
  }

  return { placements, skipped };
}
