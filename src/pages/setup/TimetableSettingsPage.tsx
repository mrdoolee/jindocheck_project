import TimetableSettingsManager from './TimetableSettingsManager';

export default function TimetableSettingsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        사이드바의 "시간표" 메뉴에 기본으로 표시할 교사 시간표를 설정합니다. 학교코드를 입력해 교사 목록을 불러온
        뒤 본인을 선택하세요.
      </p>
      <TimetableSettingsManager />
    </div>
  );
}
