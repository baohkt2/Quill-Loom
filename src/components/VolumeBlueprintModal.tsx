import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import {
  DEFAULT_VOLUME_BLUEPRINT,
  ManuscriptAct,
  VolumeBlueprint,
} from '../types/novel';

interface VolumeBlueprintModalProps {
  act: ManuscriptAct | null;
  isBusy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSaveBlueprint: (actId: string, blueprint: VolumeBlueprint, title: string) => void;
  onGenerateVolumeChapters: (actId: string, count: number) => void;
}

export const VolumeBlueprintModal: React.FC<VolumeBlueprintModalProps> = ({
  act,
  isBusy,
  errorMessage,
  onClose,
  onSaveBlueprint,
  onGenerateVolumeChapters,
}) => {
  const [title, setTitle] = useState('');
  const [blueprint, setBlueprint] = useState<VolumeBlueprint>({ ...DEFAULT_VOLUME_BLUEPRINT });
  const [chapterCount, setChapterCount] = useState(5);

  useEffect(() => {
    if (act) {
      setTitle(act.title);
      setBlueprint({
        ...DEFAULT_VOLUME_BLUEPRINT,
        ...(act.blueprint ?? {}),
      });
    }
  }, [act]);

  if (!act) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Đại cương Quyển (Volume Blueprint)"
      data-testid="volume-blueprint-modal"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
              Đại cương Quyển (Tầng 2)
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {act.chapters.length} chương hiện có trong quyển này
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Đại cương Quyển"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
              Tên Quyển (Volume Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
              Mục tiêu Quyển (Arc Goal)
            </label>
            <textarea
              rows={3}
              value={blueprint.arcGoal}
              onChange={(e) => setBlueprint((b) => ({ ...b, arcGoal: e.target.value }))}
              data-testid="volume-arc-goal-input"
              placeholder="Nhân vật chính cần đạt được bước ngoặt, cảnh giới hay mục tiêu gì khi kết thúc quyển này?"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
              Thế lực &amp; Đối thủ chính (Key Antagonists)
            </label>
            <textarea
              rows={2}
              value={blueprint.keyAntagonists}
              onChange={(e) => setBlueprint((b) => ({ ...b, keyAntagonists: e.target.value }))}
              placeholder="Những đối thủ, phe phái hoặc trở ngại lớn nhất trong quyển..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
              Nút thắt &amp; Cao trào (Turning Points &amp; Climax)
            </label>
            <textarea
              rows={3}
              value={blueprint.turningPointsAndClimax}
              onChange={(e) =>
                setBlueprint((b) => ({ ...b, turningPointsAndClimax: e.target.value }))
              }
              placeholder="Các biến cố bước ngoặt giữa quyển và trận cao trào khép lại quyển..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100"
            />
          </div>

          {/* Tier 2 -> Tier 3 Action: Generate Chapter Outlines */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-700 dark:text-slate-200 max-w-md">
              <span className="font-semibold">✨ API Lên khung Chương:</span> Tạo sẵn bộ khung các Chương nối tiếp (kèm Mục tiêu Chương &amp; Nhịp mở đầu) bằng Architect API.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={12}
                value={chapterCount}
                onChange={(e) =>
                  setChapterCount(Math.max(2, Math.min(12, Number(e.target.value) || 5)))
                }
                aria-label="Số chương cần tạo"
                className="w-16 px-2 py-1 text-xs rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  onSaveBlueprint(act.id, blueprint, title.trim() || act.title);
                  onGenerateVolumeChapters(act.id, chapterCount);
                }}
                data-testid="generate-volume-chapters-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Lên khung {chapterCount} Chương</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-stone-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveBlueprint(act.id, blueprint, title.trim() || act.title);
              onClose();
            }}
            data-testid="save-volume-blueprint-btn"
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90"
          >
            Lưu Đại cương Quyển
          </button>
        </div>
      </div>
    </div>
  );
};
