import SheetsSyncManager from './SheetsSyncManager';

export default function SheetsSyncPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        구글 스프레드시트와 데이터를 동기화합니다. 같은 행을 시트와 앱에서 동시에 고치면 더 최근에 바뀐 쪽이
        남습니다.
      </p>
      <SheetsSyncManager />
    </div>
  );
}
