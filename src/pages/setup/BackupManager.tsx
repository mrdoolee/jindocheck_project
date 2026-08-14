import { useRef } from 'react';
import { exportData, importData } from '../../db/backup';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    if (!window.confirm('백업을 불러오면 현재 모든 데이터가 삭제되고 백업 파일의 데이터로 교체됩니다. 계속하시겠습니까?')) {
      e.target.value = '';
      return;
    }
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
    <Card>
      <CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Button onClick={handleExport}>내보내기</Button>
        <Button asChild variant="outline">
          <label className="cursor-pointer">
            백업 파일 선택
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </Button>
      </CardContent>
    </Card>
  );
}
