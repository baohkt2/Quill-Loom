import React, { useMemo, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ManuscriptAct, ManuscriptChapter } from '../types/novel';
import {
  parseBulkChapters,
  parseBulkChaptersPreview,
} from '../utils/bulkImporter';

interface BulkImportModalProps {
  isOpen: boolean;
  acts: ManuscriptAct[];
  onClose: () => void;
  onImportChapters: (targetActId: string, chapters: ManuscriptChapter[]) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  acts,
  onClose,
  onImportChapters,
}) => {
  const [rawText, setRawText] = useState('');
  const [targetActId, setTargetActId] = useState(acts[0]?.id ?? '');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const preview = useMemo(() => parseBulkChaptersPreview(rawText), [rawText]);

  if (!isOpen) return null;

  const effectiveActId =
    acts.some((a) => a.id === targetActId) ? targetActId : acts[0]?.id ?? '';

  const handleConfirm = () => {
    if (!effectiveActId || preview.length === 0) return;
    const chapters = parseBulkChapters(rawText);
    onImportChapters(effectiveActId, chapters);
    setRawText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Nhập hàng loạt nhiều chương"
      data-testid="bulk-import-modal"
    >
      <div className="w-full max-w-2xl max-h-[88vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
              Nhập hàng loạt Chương từ .txt / .md
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Tự động nhận diện các dòng tiêu đề Chương X / Hồi X / Chapter X để tách thẳng vào Quyển
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng nhập hàng loạt"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <label className="font-medium text-stone-700 dark:text-slate-300">
                Nhập vào Quyển:
              </label>
              <select
                value={effectiveActId}
                onChange={(e) => setTargetActId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {acts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const text = await file.text();
                    setRawText(text);
                  }
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Chọn tệp .txt / .md</span>
              </button>
            </div>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Dán nội dung truyện có phân tách Chương 1: ..., Chương 2: ... tại đây..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 font-sans"
          />

          <div className="text-xs space-y-1.5">
            <div className="font-semibold text-stone-800 dark:text-slate-200">
              Xem trước: phát hiện {preview.length} chương
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-medium truncate">{item.title}</span>
                  <span className="font-mono-tabular text-stone-500 dark:text-slate-400 shrink-0">
                    {item.wordCount.toLocaleString('vi-VN')} từ
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-stone-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-200/70"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={preview.length === 0}
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90 disabled:opacity-40"
          >
            Nhập {preview.length} chương
          </button>
        </div>
      </div>
    </div>
  );
};
