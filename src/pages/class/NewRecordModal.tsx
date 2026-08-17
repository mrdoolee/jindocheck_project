import { Button } from '@/components/ui/button';
import QuickRecordForm from './QuickRecordForm';

export default function NewRecordModal({
  open,
  onClose,
  classId,
  presetStudentId,
}: {
  open: boolean;
  onClose: () => void;
  classId: number;
  presetStudentId?: number;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="새 기록 추가"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">새 기록 추가</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-4">
          <QuickRecordForm classId={classId} presetStudentId={presetStudentId} />
        </div>
      </div>
    </div>
  );
}
