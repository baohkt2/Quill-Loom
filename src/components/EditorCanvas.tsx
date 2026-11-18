import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  History,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ChapterSnapshot,
  ChapterStatus,
  GenerationSwipeState,
} from '../types/novel';
import { countWords } from '../utils/promptBuilder';
import { lintVietnameseProse } from '../utils/proseLinter';

interface EditorCanvasProps {
  actTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterGoal: string;
  chapterStatus: ChapterStatus;
  chapterBeats: string;
  chapterSnapshots: ChapterSnapshot[];
  previousChapterTail: string | null;
  prevChapterTitle: string | null;
  nextChapterTitle: string | null;
  chapterPositionLabel: string;
  storyText: string;
  isGenerating: boolean;
  isGeneratingBeats: boolean;
  isSyncingChapter: boolean;
  beatsThinking: string;
  beatsError: string | null;
  beatsOutOfSync: boolean;
  errorMessage: string | null;
  canUndoAi: boolean;
  canRegenerate: boolean;
  swipeState: GenerationSwipeState | null;
  activeThinkingPreview: string;
  totalBudgetTokens: number;
  maxContextTokens: number;
  onSelectPrevChapter: () => void;
  onSelectNextChapter: () => void;
  onCreateNextChapter: () => void;
  onChangeChapterTitle: (title: string) => void;
  onChangeChapterGoal: (goal: string) => void;
  onCycleChapterStatus: () => void;
  onChangeChapterBeats: (beats: string) => void;
  onChangeStoryText: (text: string) => void;
  onGenerateContinue: () => void;
  onRegenerateLast: () => void;
  onStopGeneration: () => void;
  onUndoLastAi: () => void;
  onGenerateBeats: (andContinue: boolean) => void;
  onSyncBeatsToText: () => void;
  onOpenChapterSync: () => void;
  onSaveSnapshot: (label: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onSwitchSwipeVariant: (index: number) => void;
  onDismissSwipes: () => void;
  onRunInlineRewrite: (
    instruction: string,
    start: number,
    end: number
  ) => void;
}

const STATUS_STYLES: Record<ChapterStatus, { label: string; cls: string }> = {
  Draft: {
    label: 'Bản nháp',
    cls: 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700',
  },
  Revised: {
    label: 'Đang sửa',
    cls: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  Final: {
    label: 'Hoàn thiện',
    cls: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  actTitle,
  chapterId,
  chapterTitle,
  chapterGoal,
  chapterStatus,
  chapterBeats,
  chapterSnapshots,
  previousChapterTail,
  prevChapterTitle,
  nextChapterTitle,
  chapterPositionLabel,
  storyText,
  isGenerating,
  isGeneratingBeats,
  isSyncingChapter,
  beatsThinking,
  beatsError,
  beatsOutOfSync,
  errorMessage,
  canUndoAi,
  canRegenerate,
  swipeState,
  activeThinkingPreview,
  totalBudgetTokens,
  maxContextTokens,
  onSelectPrevChapter,
  onSelectNextChapter,
  onCreateNextChapter,
  onChangeChapterTitle,
  onChangeChapterGoal,
  onCycleChapterStatus,
  onChangeChapterBeats,
  onChangeStoryText,
  onGenerateContinue,
  onRegenerateLast,
  onStopGeneration,
  onUndoLastAi,
  onGenerateBeats,
  onSyncBeatsToText,
  onOpenChapterSync,
  onSaveSnapshot,
  onRestoreSnapshot,
  onSwitchSwipeVariant,
  onDismissSwipes,
  onRunInlineRewrite,
}) => {
  const [beatsOpen, setBeatsOpen] = useState(true);
  const [showBeatsThinking, setShowBeatsThinking] = useState(false);
  const [styleCheckEnabled, setStyleCheckEnabled] = useState(false);
  const [zenBookPreview, setZenBookPreview] = useState(false);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);

  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [customRewritePrompt, setCustomRewritePrompt] = useState('');

  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // CRITICAL FIX: Automatically exit Style Check and Zen Book Preview when prose generation starts
  // so `#story-prose-editor` is always mounted and streamed tokens render visibly!
  useEffect(() => {
    if (isGenerating) {
      setStyleCheckEnabled(false);
      setZenBookPreview(false);
    }
  }, [isGenerating]);

  // Reset text selection when switching chapters
  useEffect(() => {
    setSelectionRange(null);
  }, [chapterId]);

  const wordCount = useMemo(() => countWords(storyText), [storyText]);
  const lintReport = useMemo(
    () => (styleCheckEnabled ? lintVietnameseProse(storyText) : null),
    [styleCheckEnabled, storyText]
  );

  const statusMeta = STATUS_STYLES[chapterStatus];
  const activeSwipe =
    swipeState && swipeState.chapterId === chapterId && swipeState.variants.length > 0
      ? swipeState
      : null;

  const handleSelectText = () => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (end - start >= 8) {
      setSelectionRange({ start, end, text: storyText.slice(start, end) });
    } else {
      setSelectionRange(null);
    }
  };

  return (
    <main className="flex-1 min-w-0 h-full flex flex-col bg-[#FAF8F5] dark:bg-slate-950 overflow-hidden">
      {/* Chapter Header & Navigation */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-stone-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 flex flex-col gap-2 shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[220px] shrink-0">
            {actTitle}
          </span>
          <span className="text-stone-300 dark:text-slate-700 shrink-0" aria-hidden="true">
            /
          </span>
          <input
            type="text"
            value={chapterTitle}
            onChange={(e) => onChangeChapterTitle(e.target.value)}
            aria-label="Tiêu đề chương"
            data-testid="active-chapter-title-input"
            className="min-w-0 flex-1 text-sm font-semibold text-stone-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:outline-none py-0.5"
          />
          <button
            type="button"
            onClick={onCycleChapterStatus}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap shrink-0 ${statusMeta.cls}`}
          >
            {statusMeta.label}
          </button>
        </div>

        {/* Navigation & View Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <button
                type="button"
                disabled={!prevChapterTitle}
                onClick={onSelectPrevChapter}
                title={prevChapterTitle ? `Về ${prevChapterTitle}` : 'Đang ở chương đầu'}
                aria-label="Chương trước"
                className="p-1.5 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono-tabular text-stone-600 dark:text-slate-300 whitespace-nowrap">
                {chapterPositionLabel}
              </span>
              <button
                type="button"
                disabled={!nextChapterTitle}
                onClick={onSelectNextChapter}
                title={nextChapterTitle ? `Tới ${nextChapterTitle}` : 'Đang ở chương cuối'}
                aria-label="Chương sau"
                className="p-1.5 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onCreateNextChapter}
              data-testid="quick-next-chapter-btn"
              title="Thêm chương mới và tự động lập dàn ý nối tiếp"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Chương tiếp</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStyleCheckEnabled((v) => !v)}
              data-testid="style-check-toggle"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                styleCheckEnabled
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Soi văn phong</span>
            </button>

            <button
              type="button"
              onClick={() => setZenBookPreview((v) => !v)}
              data-testid="zen-preview-toggle"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                zenBookPreview
                  ? 'bg-stone-900 dark:bg-amber-600 border-stone-900 dark:border-amber-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đọc thử</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSnapshotsModal(true)}
              data-testid="snapshots-btn"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lịch sử ({chapterSnapshots.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Editor Workspace */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-10 py-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Previous Chapter Tail Context Strip */}
          {previousChapterTail && !storyText.trim() && (
            <div className="p-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100/70 dark:bg-slate-900/60 text-xs text-stone-600 dark:text-slate-400">
              <div className="font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Đoạn kết {prevChapterTitle || 'chương trước'} (tự động nối mạch):
              </div>
              <p className="line-clamp-3 italic leading-relaxed">
                …{previousChapterTail.slice(-340)}
              </p>
            </div>
          )}

          {/* Tier 3: Chapter Goal & Chapter Beats Panel */}
          <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-stone-50/80 dark:bg-slate-900/90 border-b border-stone-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setBeatsOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-slate-200"
              >
                {beatsOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>Mục tiêu &amp; Dàn ý Chương (Chapter Beats)</span>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={isGeneratingBeats || isGenerating || !storyText.trim()}
                  onClick={onSyncBeatsToText}
                  data-testid="sync-beats-btn"
                  title="Cập nhật lại dàn ý theo các chỉnh sửa thủ công mới nhất trong Editor"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 whitespace-nowrap ${
                    beatsOutOfSync
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingBeats ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ dàn ý</span>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingBeats || isGenerating}
                  onClick={() => onGenerateBeats(false)}
                  data-testid="generate-beats-btn"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {isGeneratingBeats ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-600" />
                  )}
                  <span>Lập dàn ý</span>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingBeats || isGenerating}
                  onClick={() => onGenerateBeats(true)}
                  data-testid="outline-and-continue-btn"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Lập dàn ý &amp; Viết tiếp</span>
                </button>
              </div>
            </div>

            {beatsOpen && (
              <div className="p-3.5 space-y-2.5">
                {/* Chapter Goal Input */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                  <label
                    htmlFor="chapter-goal-input"
                    className="text-xs font-medium text-stone-600 dark:text-slate-400 shrink-0"
                  >
                    Mục tiêu Chương:
                  </label>
                  <input
                    id="chapter-goal-input"
                    data-testid="chapter-goal-input"
                    type="text"
                    value={chapterGoal}
                    onChange={(e) => onChangeChapterGoal(e.target.value)}
                    placeholder="Ví dụ: Lâm Huyền phát hiện thủ đoạn rút linh thảo của Triệu Phong mà không để lộ mình..."
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-950 text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {beatsError && (
                  <div
                    data-testid="beats-error-banner"
                    className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200"
                  >
                    {beatsError}
                  </div>
                )}

                {/* Collapsible Thinking Accordion for Beats */}
                {beatsThinking.trim() && (
                  <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowBeatsThinking((v) => !v)}
                      data-testid="beats-thinking-accordion"
                      className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-medium text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800/60"
                    >
                      <span>Quá trình suy luận (Thinking)</span>
                      {showBeatsThinking ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {showBeatsThinking && (
                      <pre className="px-3 py-2 text-[11px] text-stone-600 dark:text-slate-400 whitespace-pre-wrap border-t border-stone-200 dark:border-slate-800 max-h-48 overflow-y-auto font-sans">
                        {beatsThinking}
                      </pre>
                    )}
                  </div>
                )}

                <textarea
                  rows={4}
                  value={chapterBeats}
                  onChange={(e) => onChangeChapterBeats(e.target.value)}
                  data-testid="chapter-beats-textarea"
                  placeholder="- Nhịp 1: ...&#10;- Nhịp 2: ...&#10;- Nhịp 3: ..."
                  className="w-full px-3 py-2 text-xs sm:text-sm leading-relaxed rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950/60 text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </section>

          {/* Inline Rewrite Bar (shown when user highlights prose) */}
          {selectionRange && !styleCheckEnabled && !zenBookPreview && !isGenerating && (
            <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/50 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200 mr-1">
                Đang chọn {countWords(selectionRange.text)} từ:
              </span>
              {[
                'Mở rộng chi tiết và cảm giác nhân vật',
                'Tăng nhịp độ kịch tính, sắc bén hơn',
                'Trau chuốt lại theo văn phong tiên hiệp cổ điển',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onRunInlineRewrite(preset, selectionRange.start, selectionRange.end);
                    setSelectionRange(null);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  {preset}
                </button>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={customRewritePrompt}
                  onChange={(e) => setCustomRewritePrompt(e.target.value)}
                  placeholder="Hoặc nhập lệnh viết lại..."
                  className="flex-1 px-2 py-1 text-xs rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="button"
                  disabled={!customRewritePrompt.trim()}
                  onClick={() => {
                    onRunInlineRewrite(
                      customRewritePrompt.trim(),
                      selectionRange.start,
                      selectionRange.end
                    );
                    setCustomRewritePrompt('');
                    setSelectionRange(null);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-600 text-white disabled:opacity-40"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionRange(null)}
                  aria-label="Đóng thanh viết lại"
                  className="p-1 text-stone-500 hover:text-stone-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              data-testid="generation-error-banner"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200"
            >
              {errorMessage}
            </div>
          )}

          {/* Active Prose Thinking Preview (if model streamed reasoning while generating prose) */}
          {activeThinkingPreview.trim() && (
            <details
              data-testid="prose-thinking-preview"
              className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 px-3.5 py-2 text-xs text-stone-700 dark:text-slate-300"
            >
              <summary className="cursor-pointer font-medium flex items-center gap-2">
                {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />}
                <span>
                  {isGenerating
                    ? `Model đang suy luận (đã nhận ${activeThinkingPreview.length.toLocaleString('vi-VN')} ký tự Thinking) — văn xuôi sẽ hiển thị ngay sau khi suy luận xong`
                    : `Quá trình suy luận của lượt viết vừa rồi (${activeThinkingPreview.length.toLocaleString('vi-VN')} ký tự)`}
                </span>
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] max-h-40 overflow-y-auto font-sans">
                {activeThinkingPreview}
              </pre>
            </details>
          )}

          {/* Main Prose Editor / Style Check View / Zen Book Preview */}
          {styleCheckEnabled && lintReport ? (
            <div
              data-testid="style-check-view"
              className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-slate-800">
                <div className="text-xs space-x-3">
                  <span className="font-semibold text-rose-700 dark:text-rose-300">
                    Từ hiện đại / dịch thô: {lintReport.forbiddenHits.reduce((s, h) => s + h.count, 0)}
                  </span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    Từ lặp (&gt;2 lần): {lintReport.overusedHits.length} nhóm
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStyleCheckEnabled(false)}
                  className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                >
                  Quay lại chỉnh sửa
                </button>
              </div>

              {(lintReport.forbiddenHits.length > 0 || lintReport.overusedHits.length > 0) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {lintReport.forbiddenHits.map((h) => (
                    <span
                      key={h.word}
                      className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200"
                    >
                      {h.word} ({h.count})
                    </span>
                  ))}
                  {lintReport.overusedHits.map((h) => (
                    <span
                      key={h.word}
                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200"
                    >
                      {h.word} ({h.count})
                    </span>
                  ))}
                </div>
              )}

              <div className="font-prose text-base leading-[1.9] text-stone-800 dark:text-slate-200 whitespace-pre-wrap">
                {lintReport.segments.map((seg, i) =>
                  seg.severity === 'error' ? (
                    <mark
                      key={i}
                      title={seg.label}
                      className="bg-rose-200/80 dark:bg-rose-900/70 text-rose-950 dark:text-rose-100 px-0.5 rounded"
                    >
                      {seg.text}
                    </mark>
                  ) : seg.severity === 'warning' ? (
                    <mark
                      key={i}
                      title={seg.label}
                      className="bg-amber-200/70 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 px-0.5 rounded"
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <React.Fragment key={i}>{seg.text}</React.Fragment>
                  )
                )}
              </div>
            </div>
          ) : zenBookPreview ? (
            <article
              data-testid="zen-preview-view"
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sm:px-10 py-8 space-y-4 font-prose"
            >
              <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-slate-100 text-center">
                {chapterTitle}
              </h1>
              <div className="space-y-4 text-base sm:text-[17px] leading-[1.95] text-stone-800 dark:text-slate-200">
                {storyText
                  .split(/\n\s*\n/)
                  .filter((p) => p.trim())
                  .map((para, idx) => (
                    <p key={idx} className="indent-6">
                      {para}
                    </p>
                  ))}
              </div>
            </article>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <textarea
                id="story-prose-editor"
                ref={editorRef}
                value={storyText}
                onChange={(e) => onChangeStoryText(e.target.value)}
                onMouseUp={handleSelectText}
                onKeyUp={handleSelectText}
                placeholder="Bắt đầu viết chương truyện tại đây hoặc nhấn 'Lập dàn ý & Viết tiếp' ở trên..."
                rows={18}
                className="w-full min-h-[420px] p-5 sm:p-7 font-prose text-base sm:text-[17px] leading-[1.9] bg-transparent text-stone-900 dark:text-slate-100 focus:outline-none resize-y"
              />
            </div>
          )}

          {/* Generation Swipes Floating Pill */}
          {activeSwipe && (
            <div
              data-testid="generation-swipes-bar"
              className="flex items-center justify-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm text-xs">
                <button
                  type="button"
                  disabled={activeSwipe.activeIndex <= 0}
                  onClick={() => onSwitchSwipeVariant(activeSwipe.activeIndex - 1)}
                  aria-label="Phương án trước"
                  className="p-1 rounded hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular font-medium text-stone-700 dark:text-slate-200">
                  {activeSwipe.activeIndex + 1} / {activeSwipe.variants.length}
                </span>
                <button
                  type="button"
                  disabled={activeSwipe.activeIndex >= activeSwipe.variants.length - 1}
                  onClick={() => onSwitchSwipeVariant(activeSwipe.activeIndex + 1)}
                  aria-label="Phương án tiếp"
                  className="p-1 rounded hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDismissSwipes}
                  aria-label="Chốt phương án này"
                  className="ml-1 text-[11px] text-amber-700 dark:text-amber-300 hover:underline"
                >
                  Giữ bản này
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Generation & Sync Toolbar */}
      <footer className="px-3 sm:px-6 py-2.5 border-t border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGeneration}
              data-testid="stop-generation-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 whitespace-nowrap"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Dừng viết</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerateContinue}
              data-testid="generate-prose-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Viết tiếp</span>
            </button>
          )}

          <button
            type="button"
            disabled={isGenerating || !canRegenerate}
            onClick={onRegenerateLast}
            data-testid="regenerate-last-btn"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Viết lại lượt cuối</span>
          </button>

          <button
            type="button"
            disabled={isGenerating || !canUndoAi}
            onClick={onUndoLastAi}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
            title="Hoàn tác lượt AI vừa viết"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hoàn tác</span>
          </button>

          <button
            type="button"
            disabled={isGenerating || isSyncingChapter || !storyText.trim()}
            onClick={onOpenChapterSync}
            data-testid="chapter-sync-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
          >
            {isSyncingChapter ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Chốt chương</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
          <span>{wordCount.toLocaleString('vi-VN')} từ</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              totalBudgetTokens > maxContextTokens
                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                : ''
            }
          >
            Ngữ cảnh: {totalBudgetTokens.toLocaleString('vi-VN')} /{' '}
            {maxContextTokens.toLocaleString('vi-VN')} tok
          </span>
        </div>
      </footer>

      {/* Snapshots / Version History Modal */}
      {showSnapshotsModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Lịch sử phiên bản chương"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                Lịch sử phiên bản — {chapterTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowSnapshotsModal(false)}
                aria-label="Đóng lịch sử"
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <button
                type="button"
                onClick={() => onSaveSnapshot('Lưu thủ công')}
                className="w-full py-2 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90"
              >
                + Lưu bản sao lưu mới cho chương này
              </button>

              {chapterSnapshots.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-slate-400 text-center py-6">
                  Chưa có bản sao lưu nào cho chương này (tối đa 10 bản gần nhất).
                </p>
              ) : (
                <div className="space-y-2">
                  {chapterSnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-800 dark:text-slate-200 truncate">
                          {snap.label} · {countWords(snap.content).toLocaleString('vi-VN')} từ
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-slate-400 font-mono-tabular">
                          {new Date(snap.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreSnapshot(snap.id);
                          setShowSnapshotsModal(false);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 shrink-0"
                      >
                        Khôi phục
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
