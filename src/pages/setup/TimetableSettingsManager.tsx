import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { getTimetableSettings, saveTimetableSettings } from '@/db/timetableSettings';
import { setManualTimetableField } from '@/db/manualTimetable';
import type { TimetableMode, TimetableSettings } from '@/db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface Teacher {
  index: number;
  name: string;
}

const DAY_LABELS = ['월', '화', '수', '목', '금'];
const MIN_PERIODS = 1;
const MAX_PERIODS = 15;
const DEFAULT_PERIOD_COUNT = 7;

function ModeToggle({ mode, onChange }: { mode: TimetableMode; onChange: (mode: TimetableMode) => void }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex gap-2">
          <Button variant={mode === 'comci' ? 'default' : 'outline'} size="sm" onClick={() => onChange('comci')}>
            컴시간알리미 사용
          </Button>
          <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => onChange('manual')}>
            직접 입력
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === 'comci'
            ? '학교가 컴시간알리미(comci.net)를 쓰는 경우 학교코드로 시간표를 자동으로 불러옵니다.'
            : '학교가 컴시간알리미를 쓰지 않는다면 아래 표에 직접 시간표를 입력하세요.'}
        </p>
      </CardContent>
    </Card>
  );
}

function ComciSettingsCard({ settings }: { settings: TimetableSettings | undefined }) {
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadTeachers = async () => {
    const code = schoolCode.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    setTeachers(null);
    try {
      const res = await fetch(`/api/timetable?schoolCode=${encodeURIComponent(code)}`);
      const body = (await res.json()) as { error?: string; schoolName?: string; teachers?: Teacher[] };
      if (!res.ok) throw new Error(body.error ?? `컴시간 서버 오류 (${res.status})`);
      setSchoolName(body.schoolName ?? null);
      setTeachers(body.teachers ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const teacher = teachers?.find((t) => String(t.index) === selectedIndex);
    if (!teacher) return;
    setSaving(true);
    try {
      await saveTimetableSettings({
        schoolCode: schoolCode.trim(),
        teacherIndex: teacher.index,
        teacherName: teacher.name,
      });
      window.alert('저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4 text-sm">
        {settings?.schoolCode && (
          <p className="text-muted-foreground">
            현재 저장된 설정: 학교코드 <span className="font-medium text-foreground">{settings.schoolCode}</span>,
            교사 <span className="font-medium text-foreground">{settings.teacherName}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
            placeholder="학교코드 (예: 12345)"
            aria-label="학교코드"
            className="w-40"
          />
          <Button onClick={handleLoadTeachers} disabled={loading || !schoolCode.trim()}>
            {loading ? '불러오는 중...' : '교사 목록 불러오기'}
          </Button>
        </div>
        {error && <p className="text-destructive">{error}</p>}
        {teachers && (
          <div className="flex flex-wrap items-center gap-2">
            {schoolName && <span className="text-muted-foreground">{schoolName}</span>}
            <Select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(e.target.value)}
              aria-label="교사 선택"
              className="w-48"
            >
              <option value="">교사를 선택하세요</option>
              {teachers.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.index} {t.name}
                </option>
              ))}
            </Select>
            <Button onClick={handleSave} disabled={!selectedIndex || saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManualTimetableEditor({ settings }: { settings: TimetableSettings | undefined }) {
  const entries = useLiveQuery(() => db.timetableEntries.toArray(), []) ?? [];
  const periodCount = settings?.periodCount ?? DEFAULT_PERIOD_COUNT;

  const [periodCountInput, setPeriodCountInput] = useState(String(periodCount));
  useEffect(() => setPeriodCountInput(String(periodCount)), [periodCount]);

  const commitPeriodCount = () => {
    const n = Number(periodCountInput);
    if (Number.isFinite(n) && n >= MIN_PERIODS && n <= MAX_PERIODS) {
      if (n !== periodCount) {
        const { id: _id, ...rest } = settings ?? ({} as TimetableSettings);
        saveTimetableSettings({ ...rest, mode: 'manual', periodCount: n });
      }
    } else {
      setPeriodCountInput(String(periodCount));
    }
  };

  const entryFor = (day: number, period: number) => entries.find((e) => e.day === day && e.period === period);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="manual-period-count" className="text-xs text-muted-foreground">
            교시 수
          </Label>
          <Input
            id="manual-period-count"
            type="number"
            aria-label="교시 수"
            min={MIN_PERIODS}
            max={MAX_PERIODS}
            value={periodCountInput}
            onChange={(e) => setPeriodCountInput(e.target.value)}
            onBlur={commitPeriodCount}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="h-8 w-16"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-14 border border-border bg-secondary p-1 text-xs font-medium">교시</th>
                {DAY_LABELS.map((d) => (
                  <th key={d} className="border border-border bg-secondary p-1 text-xs font-medium">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodCount }, (_, i) => i + 1).map((period) => (
                <tr key={period}>
                  <td className="border border-border p-1 text-center text-xs text-muted-foreground">{period}교시</td>
                  {DAY_LABELS.map((dayLabel, day) => {
                    const entry = entryFor(day, period);
                    return (
                      <td key={day} className="border border-border p-1 align-top">
                        <Input
                          key={`subject-${day}-${period}-${entry?.subject ?? ''}`}
                          defaultValue={entry?.subject ?? ''}
                          aria-label={`${dayLabel}요일 ${period}교시 과목`}
                          placeholder="과목"
                          className="h-7 text-xs"
                          onBlur={(e) => setManualTimetableField(day, period, 'subject', e.target.value)}
                        />
                        <Input
                          key={`note-${day}-${period}-${entry?.note ?? ''}`}
                          defaultValue={entry?.note ?? ''}
                          aria-label={`${dayLabel}요일 ${period}교시 비고`}
                          placeholder="비고"
                          className="mt-1 h-6 text-xs text-muted-foreground"
                          onBlur={(e) => setManualTimetableField(day, period, 'note', e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          칸을 비워두면 빈 시간으로 표시됩니다. 왼쪽 메뉴의 "시간표"에서 입력한 내용을 확인할 수 있습니다.
        </p>
      </CardContent>
    </Card>
  );
}

export default function TimetableSettingsManager() {
  const settings = useLiveQuery(() => getTimetableSettings(), []);
  const mode: TimetableMode = settings?.mode ?? 'comci';

  const handleModeChange = async (nextMode: TimetableMode) => {
    if (nextMode === mode) return;
    const { id: _id, ...rest } = settings ?? ({} as TimetableSettings);
    await saveTimetableSettings({ ...rest, mode: nextMode });
  };

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} onChange={handleModeChange} />
      {mode === 'comci' ? <ComciSettingsCard settings={settings} /> : <ManualTimetableEditor settings={settings} />}
    </div>
  );
}
