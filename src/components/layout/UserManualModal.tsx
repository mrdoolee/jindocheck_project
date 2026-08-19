import { Button } from '@/components/ui/button';

export default function UserManualModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사용자 매뉴얼"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">사용자 매뉴얼</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
        <div className="space-y-5 overflow-y-auto p-4 text-sm leading-relaxed">
          <section>
            <h3 className="mb-1 font-semibold">기본 사용법</h3>
            <p>
              이 앱은 계정 없이 브라우저에 데이터를 저장합니다. 같은 브라우저(같은 기기)에서만 데이터가 유지되니,
              중요한 시점마다 <b>설정 &gt; 백업</b>에서 JSON 파일로 내보내두는 것을 권장합니다.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">시작 순서</h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>설정 &gt; 반 관리에서 학급 추가</li>
              <li>설정 &gt; 명단 관리에서 학급 선택 후 번호,이름 형식으로 명단 붙여넣기 (수정·삭제도 이 탭에서)</li>
              <li>설정 &gt; 진도표 관리에서 공통 진도 항목(단원/차시) 등록</li>
              <li>왼쪽 메뉴에서 학급을 눌러 진도체크·출결확인·누가기록·자리배치표 탭 이용</li>
            </ol>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">학급 탭 4가지</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>진도체크</b>: 날짜별로 진도 항목 완료 여부 체크</li>
              <li><b>출결확인</b>: 날짜 선택 후 학생별 출결 입력, 이력보기로 지난 기록 조회</li>
              <li><b>누가기록</b>: 학생별 특이사항 기록, 전체/학생별 이력 조회 및 정렬</li>
              <li><b>자리배치표</b>: 행/열 크기 조정, 드래그로 좌석 배치, 배치도 JSON 불러오기</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">백업</h3>
            <p>
              설정 &gt; 백업에서 전체 데이터를 JSON으로 내보내거나, 내보낸 파일을 다시 불러와 복원할 수 있습니다.
              기기를 바꾸거나 브라우저 데이터가 초기화될 위험이 있을 때 꼭 사용하세요.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Google 시트 동기화 (선택)</h3>
            <p>
              설정 &gt; Google 시트에서 구글 계정을 연결하면, "내보내기"(이 기기 → 시트)와 "불러오기"(시트 → 이
              기기) 버튼으로 데이터를 주고받을 수 있습니다. <b>자동으로 동기화되지 않으며</b>, 두 버튼 모두 반대쪽
              내용을 완전히 덮어씁니다 — 방향을 확인하고 누르세요.
            </p>
            <p className="mt-1">
              <b>연결 해제</b> 후 다시 연결하면 매번 새 스프레드시트가 만들어집니다. 예전에 쓰던 시트를 계속 쓰려면
              "다른 스프레드시트 선택" 버튼으로 내 Drive에서 직접 골라 연결할 수 있습니다.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">시간표 (선택)</h3>
            <p>
              왼쪽 메뉴의 "🕐 시간표"는 컴시간알리미 시간표를 앱 안에서 보여줍니다. 설정 &gt; 시간표 설정에서
              학교코드와 교사를 먼저 등록하면 기본으로 뜨고, 페이지 아래쪽에서 다른 학년/반 시간표도 조회할 수
              있습니다. 계정 연결 없이 쓸 수 있고, 자동 새로고침은 되지 않습니다.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">더 자세한 내용</h3>
            <p>
              스프레드시트의 각 탭·열이 앱의 어떤 데이터에 대응하는지 등 더 상세한 내용은{' '}
              <a
                href="https://github.com/mrdoolee/jindocheck_project/blob/master/docs/user-manual.md"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline hover:no-underline"
              >
                docs/user-manual.md
              </a>{' '}
              문서를 참고하세요.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
