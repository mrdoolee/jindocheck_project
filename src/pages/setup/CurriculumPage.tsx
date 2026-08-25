import CurriculumManager from './CurriculumManager';

export default function CurriculumPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        과목을 선택해 그 과목의 진도표를 입력합니다. 과목이 없다면 설정 &gt; 과목 관리에서 먼저 추가하세요.
      </p>
      <CurriculumManager />
    </div>
  );
}
