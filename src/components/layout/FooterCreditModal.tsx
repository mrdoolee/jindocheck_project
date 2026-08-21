import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function FooterCreditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Purely presentational — closing/reopening never touches any app data, so scroll-lock and
  // Escape are the only side effects this modal needs, and both are undone on close/unmount.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="제작 정보"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-2 top-2 h-8 w-8"
        >
          ✕
        </Button>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-base">✨ 제작: 두리쌤</CardTitle>
            <p className="text-sm font-semibold">📌 이용 조건</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
              <li>재배포 시 출처(제작자 표기)를 유지해주세요.</li>
              <li>코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.</li>
              <li>수정이 필요하시면 아래 연락처로 요청해주세요.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-semibold">📷 문의</p>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                Instagram:{' '}
                <a
                  href="https://www.instagram.com/trdoolee"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  trdoolee
                </a>
              </li>
              <li>
                Blog:{' '}
                <a
                  href="https://blog.naver.com/trdoolee"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  blog.naver.com/trdoolee
                </a>
              </li>
            </ul>
            <p className="text-xs italic text-muted-foreground">
              간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
