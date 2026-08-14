import BackupManager from './BackupManager';

export default function BackupPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">중앙 서버가 없으므로, 데이터를 지킬 유일한 수단입니다.</p>
      <BackupManager />
    </div>
  );
}
