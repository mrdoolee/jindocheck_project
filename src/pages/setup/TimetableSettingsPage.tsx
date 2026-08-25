import TimetableSettingsManager from './TimetableSettingsManager';

export default function TimetableSettingsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        사이드바의 "시간표" 메뉴에 표시할 시간표를 설정합니다.
        <br />
        학교가 컴시간알리미를 쓴다면 학교코드로 자동으로 불러오고, 그렇지 않다면 직접 입력을 선택해 아래 표에 입력하세요.
      </p>
      <TimetableSettingsManager />
    </div>
  );
}
