import ClassManager from './setup/ClassManager';
import CurriculumManager from './setup/CurriculumManager';
import RosterImport from './setup/RosterImport';
import BackupManager from './setup/BackupManager';

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground">학급, 공통 진도표, 학생 명단, 백업을 관리합니다.</p>
      </div>
      <ClassManager />
      <CurriculumManager />
      <RosterImport />
      <BackupManager />
    </div>
  );
}
