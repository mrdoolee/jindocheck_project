import SheetsSyncManager from './SheetsSyncManager';

export default function SheetsSyncPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        구글 스프레드시트로 데이터를 내보내거나 불러옵니다.
        <br />
        자동으로 동기화되지 않으며, 내보내기/불러오기 각각 선택한 방향의 데이터로 반대쪽을 완전히 덮어씁니다.
      </p>
      <SheetsSyncManager />
    </div>
  );
}
