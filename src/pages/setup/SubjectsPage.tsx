import SubjectManager from './SubjectManager';

export default function SubjectsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        과목을 추가한 뒤, 설정 &gt; 반 관리에서 학급에 연결하고 설정 &gt; 진도표 관리에서 과목별 진도표를 입력하세요.
      </p>
      <SubjectManager />
    </div>
  );
}
