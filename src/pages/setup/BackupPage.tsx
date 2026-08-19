import BackupManager from './BackupManager';

export default function BackupPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">중앙 서버가 없습니다. 주기적으로 개인 디바이스에 백업 데이터를 저장 해주세요.</p>
      <BackupManager />
    </div>
  );
}
