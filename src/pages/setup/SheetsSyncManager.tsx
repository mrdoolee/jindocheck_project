import { useState } from 'react';
import { useSheetsSync } from '@/hooks/useSheetsSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SheetsSyncManager() {
  const { enabled, connectedEmail, status, lastSyncedAt, error, syncNow, connect, disconnect } = useSheetsSync();
  const [connecting, setConnecting] = useState(false);

  if (!enabled) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <p className="text-muted-foreground">
            구글 계정을 연결하면 이 학급 데이터가 계정 소유의 스프레드시트와 자동으로 동기화됩니다.
          </p>
          <p className="text-xs text-muted-foreground">
            이름/이메일과 시트 접근 권한만 서버에 보관되고, 학생 데이터 자체는 서버에 저장되지 않습니다.
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

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          연결됨: <span className="font-medium text-foreground">{connectedEmail}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          앱을 열어둔 동안 변경 사항이 자동으로 동기화됩니다. 아래 버튼으로 바로 동기화할 수도 있습니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={syncNow} disabled={status === 'syncing'}>
            {status === 'syncing' ? '동기화 중...' : '지금 동기화'}
          </Button>
          {lastSyncedAt && (
            <span className="text-xs text-muted-foreground">
              마지막 동기화: {new Date(lastSyncedAt).toLocaleString('ko-KR')}
            </span>
          )}
        </div>
        {status === 'error' && error && <p className="text-sm text-destructive">동기화 실패: {error}</p>}
        <div className="border-t pt-3">
          <Button variant="outline" onClick={disconnect}>
            연결 해제
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            구글 계정 자체의 접근 권한도 회수됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
