import ClassManager from './ClassManager';

export default function ClassesPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">학급을 추가하거나 이름을 변경, 삭제합니다.</p>
      <ClassManager />
    </div>
  );
}
