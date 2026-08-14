import ClassManager from './setup/ClassManager';
import CurriculumManager from './setup/CurriculumManager';
import RosterImport from './setup/RosterImport';
import BackupManager from './setup/BackupManager';

export default function SetupPage() {
  return (
    <div>
      <h1>설정</h1>
      <ClassManager />
      <CurriculumManager />
      <RosterImport />
      <BackupManager />
    </div>
  );
}
