import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { ChapterSyncResult } from '../types/novel';

interface ChapterSyncModalProps {
  isOpen: boolean;
  chapterTitle: string;
  isLoading: boolean;
  error: string | null;
  result: ChapterSyncResult | null;
  onClose: () => void;
  onApply: (selection: {
    applySummary: boolean;
    selectedFactIds: string[];
    selectedCharacterIds: string[];
    applyProtagonistStatus: boolean;
    selectedLoreIds: string[];
    selectedPlotThreadIds: string[];
  }) => void;
}

export const ChapterSyncModal: React.FC<ChapterSyncModalProps> = ({
  isOpen,
  chapterTitle,
  isLoading,
  error,
  result,
  onClose,
  onApply,
}) => {
  const [applySummary, setApplySummary] = useState(true);
  const [selectedFacts, setSelectedFacts] = useState<string[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [applyProtagonist, setApplyProtagonist] = useState(true);
  const [selectedLore, setSelectedLore] = useState<string[]>([]);
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);

  useEffect(() => {
    if (result) {
      setApplySummary(Boolean(result.summary));
      setSelectedFacts(result.longTermFacts.map((f) => f.id));
      setSelectedChars(result.characterUpdates.map((c) => c.id));
      setApplyProtagonist(Boolean(result.protagonistStatusUpdate));
      setSelectedLore(result.lorebookSuggestions.map((l) => l.id));
      setSelectedThreads(result.plotThreadUpdates.map((t) => t.id));
    }
  }, [result]);

  if (!isOpen) return null;

  const toggleId = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const selectedCount =
    (applySummary && result?.summary ? 1 : 0) +
    selectedFacts.length +
    selectedChars.length +
    (applyProtagonist && result?.protagonistStatusUpdate ? 1 : 0) +
    selectedLore.length +
    selectedThreads.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Chốt chương — Đồng bộ dữ liệu"
      data-testid="chapter-sync-modal"
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
              Chốt chương — {chapterTitle}
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Kiểm duyệt và đồng bộ Tóm tắt, Ký ức, Nhân vật, Trạng thái, Lorebook &amp; Tuyến truyện
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Chốt chương"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-stone-600 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span>Architect API đang phân tích toàn bộ chương truyện...</span>
            </div>
          ) : error ? (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200">
              {error}
            </div>
          ) : result ? (
            <div className="space-y-4 text-xs">
              {result.thinking && (
                <details className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/50 p-3">
                  <summary className="cursor-pointer font-medium text-stone-700 dark:text-slate-300">
                    Quá trình suy luận (Thinking)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-[11px] text-stone-600 dark:text-slate-400 max-h-40 overflow-y-auto font-sans">
                    {result.thinking}
                  </pre>
                </details>
              )}

              {/* 1. Summary */}
              {result.summary && (
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-stone-900 dark:text-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applySummary}
                      onChange={(e) => setApplySummary(e.target.checked)}
                      className="accent-amber-600"
                    />
                    <span>1. Tóm tắt chương (Summary)</span>
                  </label>
                  <p className="text-stone-700 dark:text-slate-300 whitespace-pre-wrap pl-5 leading-relaxed">
                    {result.summary}
                  </p>
                </div>
              )}

              {/* 2. Long-Term Facts */}
              {result.longTermFacts.length > 0 && (
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                  <div className="font-semibold text-stone-900 dark:text-slate-100">
                    2. Ký ức dài hạn ({result.longTermFacts.length})
                  </div>
                  <div className="space-y-2">
                    {result.longTermFacts.map((fact) => (
                      <label key={fact.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFacts.includes(fact.id)}
                          onChange={() => toggleId(selectedFacts, setSelectedFacts, fact.id)}
                          className="accent-amber-600 mt-0.5"
                        />
                        <div>
                          <span className="font-medium text-amber-800 dark:text-amber-300">
                            [{fact.category}]
                          </span>{' '}
                          <span className="text-stone-800 dark:text-slate-200">{fact.content}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Character Updates */}
              {result.characterUpdates.length > 0 && (
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                  <div className="font-semibold text-stone-900 dark:text-slate-100">
                    3. Cập nhật Nhân vật ({result.characterUpdates.length})
                  </div>
                  <div className="space-y-2">
                    {result.characterUpdates.map((ch) => (
                      <label key={ch.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedChars.includes(ch.id)}
                          onChange={() => toggleId(selectedChars, setSelectedChars, ch.id)}
                          className="accent-amber-600 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-stone-900 dark:text-slate-100">
                            {ch.name}:
                          </span>{' '}
                          <span className="text-stone-700 dark:text-slate-300">
                            {ch.updatedStatus}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Protagonist Status */}
              {result.protagonistStatusUpdate && (
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-stone-900 dark:text-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyProtagonist}
                      onChange={(e) => setApplyProtagonist(e.target.checked)}
                      className="accent-amber-600"
                    />
                    <span>4. Trạng thái &amp; Hành trang Nhân vật chính</span>
                  </label>
                  <div className="pl-5 space-y-1 text-stone-700 dark:text-slate-300">
                    {result.protagonistStatusUpdate.realm && (
                      <div>Cảnh giới: {result.protagonistStatusUpdate.realm}</div>
                    )}
                    {result.protagonistStatusUpdate.techniques && (
                      <div>Công pháp: {result.protagonistStatusUpdate.techniques}</div>
                    )}
                    {result.protagonistStatusUpdate.resources && (
                      <div>Tài nguyên: {result.protagonistStatusUpdate.resources}</div>
                    )}
                    {result.protagonistStatusUpdate.inventory && (
                      <div>Hành trang: {result.protagonistStatusUpdate.inventory}</div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Lorebook Suggestions */}
              {result.lorebookSuggestions.length > 0 && (
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                  <div className="font-semibold text-stone-900 dark:text-slate-100">
                    5. Lorebook ({result.lorebookSuggestions.length})
                  </div>
                  <div className="space-y-2">
                    {result.lorebookSuggestions.map((lore) => (
                      <label key={lore.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLore.includes(lore.id)}
                          onChange={() => toggleId(selectedLore, setSelectedLore, lore.id)}
                          className="accent-amber-600 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-stone-900 dark:text-slate-100">
                            [{lore.action === 'update' ? 'Cập nhật' : 'Mới'}] {lore.name}
                          </span>{' '}
                          <span className="text-stone-500">({lore.keys})</span>
                          <div className="text-stone-700 dark:text-slate-300">{lore.content}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Plot Threads & Foreshadowing */}
              {result.plotThreadUpdates.length > 0 && (
                <div
                  data-testid="sync-plot-threads-section"
                  className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 space-y-2"
                >
                  <div className="font-semibold text-stone-900 dark:text-slate-100">
                    6. Tuyến truyện &amp; Phục bút ({result.plotThreadUpdates.length})
                  </div>
                  <div className="space-y-2">
                    {result.plotThreadUpdates.map((pt) => (
                      <label key={pt.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedThreads.includes(pt.id)}
                          onChange={() => toggleId(selectedThreads, setSelectedThreads, pt.id)}
                          className="accent-amber-600 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-amber-800 dark:text-amber-300">
                            [{pt.action === 'resolve' ? 'Đánh dấu Resolved' : 'Mở tuyến mới'}]
                          </span>{' '}
                          <span className="font-semibold text-stone-900 dark:text-slate-100">
                            {pt.title}
                          </span>
                          {pt.description && (
                            <div className="text-stone-700 dark:text-slate-300">
                              {pt.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="px-5 py-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-stone-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
          {result && !isLoading && (
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                onApply({
                  applySummary,
                  selectedFactIds: selectedFacts,
                  selectedCharacterIds: selectedChars,
                  applyProtagonistStatus: applyProtagonist,
                  selectedLoreIds: selectedLore,
                  selectedPlotThreadIds: selectedThreads,
                });
                onClose();
              }}
              data-testid="apply-chapter-sync-btn"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Áp dụng ({selectedCount}) mục đã chọn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
