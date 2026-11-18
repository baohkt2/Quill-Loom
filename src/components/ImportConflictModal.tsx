import React from 'react';
import { X } from 'lucide-react';
import { ImportCategory } from '../types/novel';

interface ImportConflictModalProps {
  isOpen: boolean;
  category: ImportCategory;
  summaryText: string;
  onCancel: () => void;
  onConfirm: (mode: 'merge' | 'replace') => void;
}

const CATEGORY_LABELS: Record<ImportCategory, string> = {
  characters: 'Hồ sơ Nhân vật',
  lorebook: 'Lorebook / Thế giới',
  memories: 'Ký ức dài hạn',
  presets: 'Preset Văn phong & Sampler',
  masterPlot: 'Cốt truyện chính (Master Plot)',
};

export const ImportConflictModal: React.FC<ImportConflictModalProps> = ({
  isOpen,
  category,
  summaryText,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận Gộp hoặc Ghi đè khi nhập dữ liệu"
      data-testid="import-conflict-modal"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
            Nhập {CATEGORY_LABELS[category]}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Hủy nhập dữ liệu"
            className="p-1 rounded-md text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
            {summaryText}
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onConfirm('merge')}
              data-testid="import-mode-merge"
              className="w-full p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-left hover:bg-amber-100/70 dark:hover:bg-amber-900/40"
            >
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Gộp thêm (Merge)
              </div>
              <div className="text-[11px] text-stone-600 dark:text-slate-400 mt-0.5">
                Giữ nguyên dữ liệu hiện có và chỉ thêm các mục mới chưa trùng tên.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onConfirm('replace')}
              data-testid="import-mode-replace"
              className="w-full p-3 rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/50 dark:bg-rose-950/20 text-left hover:bg-rose-100/60 dark:hover:bg-rose-900/30"
            >
              <div className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                Ghi đè toàn bộ (Replace)
              </div>
              <div className="text-[11px] text-stone-600 dark:text-slate-400 mt-0.5">
                Xóa danh sách hiện tại trong mục này và thay bằng dữ liệu từ tệp nhập vào.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
