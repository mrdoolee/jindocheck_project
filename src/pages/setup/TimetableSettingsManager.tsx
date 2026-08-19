import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTimetableSettings, saveTimetableSettings } from '@/db/timetableSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface Teacher {
  index: number;
  name: string;
}

export default function TimetableSettingsManager() {
  const settings = useLiveQuery(() => getTimetableSettings(), []);
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
        {settings && (
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
