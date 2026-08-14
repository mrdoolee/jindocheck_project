import CurriculumManager from './CurriculumManager';

export default function CurriculumPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">모든 학급이 공유하는 공통 진도표를 입력합니다.</p>
      <CurriculumManager />
    </div>
  );
}
