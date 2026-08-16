import RosterManager from './RosterManager';

export default function RosterPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        학급을 선택해 명단을 붙여넣거나, 등록된 학생의 번호·이름을 수정하고 삭제할 수 있습니다.
      </p>
      <RosterManager />
    </div>
  );
}
