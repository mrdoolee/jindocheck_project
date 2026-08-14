import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const classes = useLiveQuery(() => db.classes.orderBy('name').toArray(), []) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">홈</h1>
        <p className="text-sm text-muted-foreground">담당 학급을 선택하세요.</p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            아직 등록된 학급이 없습니다. 왼쪽 메뉴의{' '}
            <Link to="/setup/classes" className="font-medium text-primary hover:underline">
              설정 &gt; 반 관리
            </Link>
            에서 학급을 먼저 추가하세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} to={`/class/${c.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">진도·명렬표·자리배치·기록 보기</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
