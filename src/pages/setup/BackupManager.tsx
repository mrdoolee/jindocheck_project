import { useRef } from 'react';
import { exportData, importData } from '../../db/backup';

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
    <section>
      <h2>백업</h2>
      <button onClick={handleExport}>내보내기</button>
      <label>
        백업 파일 선택
        <input ref={fileInput} type="file" accept="application/json" onChange={handleFileChange} />
      </label>
    </section>
  );
}
