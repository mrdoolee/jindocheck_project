import TimetableSettingsManager from './TimetableSettingsManager';

export default function TimetableSettingsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        사이드바의 "시간표" 메뉴에 기본으로 표시할 교사 시간표를 설정합니다.
        <br />
        학교코드를 입력해 교사 목록을 불러온 뒤 본인을 선택하세요.
      </p>
      <p className="text-xs text-muted-foreground">
        학교에서 컴시간알리미(comci.net)를 사용 중인 경우에만 이용할 수 있는 기능입니다.
      </p>
      <TimetableSettingsManager />
    </div>
  );
}
