import { useState } from 'react';
import { useSheetsSync } from '@/hooks/useSheetsSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SheetsSyncManager() {
  const {
    enabled,
    connectedEmail,
    status,
    lastExportedAt,
    lastImportedAt,
    spreadsheetSelectedAt,
    error,
    exportNow,
    importNow,
    selectSpreadsheet,
    connect,
    disconnect,
  } = useSheetsSync();
  const [connecting, setConnecting] = useState(false);

  if (!enabled) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <p className="text-muted-foreground">
            구글 계정을 연결하면 이 학급 데이터를 계정 소유의 스프레드시트로 내보내거나 불러올 수 있습니다.
          </p>
          <p className="text-xs text-muted-foreground">
            스프레드 시트에 접속하기 위한 기본 권한만 서버에 보관되고, 스프레드 시트에 작성된 내용은 서버에
            저장되지 않습니다.
          </p>
          <Button
            onClick={() => {
              setConnecting(true);
              connect();
            }}
            disabled={connecting}
          >
            {connecting ? '연결 중...' : '구글 계정 연결하기'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleExport = () => {
    if (
      window.confirm('내보내기를 하면 시트의 기존 내용이 이 기기의 데이터로 완전히 대체됩니다. 계속하시겠습니까?')
    ) {
      exportNow();
    }
  };

  const handleImport = () => {
    if (
      window.confirm('불러오기를 하면 이 기기의 데이터가 모두 삭제되고 시트의 내용으로 교체됩니다. 계속하시겠습니까?')
    ) {
      importNow();
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          연결됨: <span className="font-medium text-foreground">{connectedEmail}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          구글 스프레드시트로 데이터를 내보내거나 불러옵니다.
          <br />
          자동으로 동기화되지 않으며, 내보내기/불러오기 각각 선택한 방향의 데이터로 반대쪽을 완전히 덮어씁니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExport} disabled={status !== 'idle' && status !== 'error'}>
            {status === 'exporting' ? '내보내는 중...' : '내보내기'}
          </Button>
          <Button
            variant="outline"
            onClick={handleImport}
            disabled={status !== 'idle' && status !== 'error'}
          >
            {status === 'importing' ? '불러오는 중...' : '불러오기'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {lastExportedAt && <p>마지막 내보내기: {new Date(lastExportedAt).toLocaleString('ko-KR')}</p>}
          {lastImportedAt && <p>마지막 불러오기: {new Date(lastImportedAt).toLocaleString('ko-KR')}</p>}
        </div>
        {status === 'error' && error && <p className="text-sm text-destructive">동기화 실패: {error}</p>}
        <div className="border-t pt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            연결 해제 후 다시 연결하면 매번 새 스프레드시트가 만들어집니다. 예전에 쓰던 시트를 계속 쓰려면
            아래에서 직접 골라 연결하세요.
          </p>
          <Button
            variant="outline"
            onClick={selectSpreadsheet}
            disabled={status !== 'idle' && status !== 'error'}
          >
            {status === 'selecting' ? '선택 중...' : '다른 스프레드시트 선택'}
          </Button>
          {spreadsheetSelectedAt && (
            <p className="text-xs text-muted-foreground">
              새 스프레드시트로 전환됐습니다. 필요하면 내보내기/불러오기를 눌러주세요.
            </p>
          )}
        </div>
        <div className="border-t pt-3">
          <Button variant="outline" onClick={disconnect}>
            연결 해제
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            구글 계정 자체의 스프레드 시트에 대한 접근 권한도 회수됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
