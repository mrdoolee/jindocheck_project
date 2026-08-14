import RosterImport from './RosterImport';

export default function RosterPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">엑셀 등에서 복사한 번호·이름 목록을 학급에 한 번에 추가합니다.</p>
      <RosterImport />
    </div>
  );
}
