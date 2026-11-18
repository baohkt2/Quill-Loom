import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookPlus,
  Check,
  CheckCircle2,
  CircleDot,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Square,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ManuscriptAct,
  MasterPlotBlock,
  PlotThread,
} from '../types/novel';
import {
  GeneratedSeedBibleResult,
  LivingPlotRealignResult,
} from '../utils/plotArchitectEngine';

interface MasterPlotModalProps {
  isOpen: boolean;
  projectTitle: string;
  blocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
  acts: ManuscriptAct[];
  isBusy: boolean;
  busyActionLabel: string;
  streamingThinking?: string;
  receivedChars?: number;
  errorMessage: string | null;
  saveNotice?: string | null;
  seedPreview: GeneratedSeedBibleResult | null;
  realignPreview: LivingPlotRealignResult | null;
  onClose: () => void;
  onSaveAndClose: () => void;
  onCancelBusy?: () => void;
  onChangeBlocks: (blocks: MasterPlotBlock[]) => void;
  onChangeThreads: (threads: PlotThread[]) => void;
  onExpandBlock: (blockId: string) => void;
  onRunSeedToBible: (premiseIdea: string, genre: string) => void;
  onCreateNewProjectFromSeed: (
    title: string,
    genre: string,
    edited: GeneratedSeedBibleResult,
    options?: { autoGenerateBeats?: boolean }
  ) => void;
  onApplySeedPreview: (mode: 'replace' | 'merge', edited: GeneratedSeedBibleResult) => void;
  onDiscardSeedPreview: () => void;
  onExportSeedPreview?: (edited: GeneratedSeedBibleResult) => void;
  onRunGenerateVolumes: (desiredCount: number) => void;
  onRunLivingRealign: () => void;
  onApplyLivingRealign: () => void;
  onDiscardLivingRealign: () => void;
  onExportMasterPlot: () => void;
  onImportMasterPlotFile: (file: File) => void;
}

function suggestFallbackTitle(premise: string): string {
  const firstClause = premise.trim().split(/[.!?\n]/)[0]?.trim() || '';
  if (!firstClause) return 'Tác phẩm mới';
  if (firstClause.length <= 42) return firstClause;
  const words = firstClause.split(/\s+/).slice(0, 7).join(' ');
  return words || 'Tác phẩm mới';
}

export const MasterPlotModal: React.FC<MasterPlotModalProps> = ({
  isOpen,
  projectTitle,
  blocks,
  plotThreads,
  acts,
  isBusy,
  busyActionLabel,
  streamingThinking = '',
  receivedChars = 0,
  errorMessage,
  saveNotice = null,
  seedPreview,
  realignPreview,
  onClose,
  onSaveAndClose,
  onCancelBusy,
  onChangeBlocks,
  onChangeThreads,
  onExpandBlock,
  onRunSeedToBible,
  onCreateNewProjectFromSeed,
  onApplySeedPreview,
  onDiscardSeedPreview,
  onExportSeedPreview,
  onRunGenerateVolumes,
  onRunLivingRealign,
  onApplyLivingRealign,
  onDiscardLivingRealign,
  onExportMasterPlot,
  onImportMasterPlotFile,
}) => {
  const [showSeedForm, setShowSeedForm] = useState(false);
  const [seedGenre, setSeedGenre] = useState('Tiên hiệp / Huyền huyễn');
  const [seedPremise, setSeedPremise] = useState('');
  const [draftSeed, setDraftSeed] = useState<GeneratedSeedBibleResult | null>(seedPreview);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [showSaveAsNewBar, setShowSaveAsNewBar] = useState(false);
  const [saveAsNewTitle, setSaveAsNewTitle] = useState('');
  const [saveAsAutoBeats, setSaveAsAutoBeats] = useState(true);
  const [volumeCount, setVolumeCount] = useState(3);
  const [showVolumePrompt, setShowVolumePrompt] = useState(false);

  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadChapter, setNewThreadChapter] = useState('Chương 1');
  const [newThreadDesc, setNewThreadDesc] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftSeed(seedPreview);
    if (seedPreview) {
      const suggested =
        seedPreview.suggestedTitle?.trim() || suggestFallbackTitle(seedPremise);
      setNewProjectTitle(suggested);
      setSaveAsNewTitle(suggested);
    }
  }, [seedPreview]);

  useEffect(() => {
    if (!isOpen) {
      setShowSaveAsNewBar(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddBlock = () => {
    const next: MasterPlotBlock = {
      id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `Khối cốt truyện ${blocks.length + 1}`,
      content: '',
      includeInArchitect: true,
      includeInProse: false,
    };
    onChangeBlocks([...blocks, next]);
  };

  const handleUpdateBlock = (id: string, patch: Partial<MasterPlotBlock>) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleMoveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChangeBlocks(copy);
  };

  const handleDeleteBlock = (id: string) => {
    onChangeBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleAddThread = () => {
    if (!newThreadTitle.trim()) return;
    const next: PlotThread = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newThreadTitle.trim(),
      description: newThreadDesc.trim(),
      introducedChapter: newThreadChapter.trim() || 'Chương 1',
      status: 'Open',
    };
    onChangeThreads([...plotThreads, next]);
    setNewThreadTitle('');
    setNewThreadDesc('');
  };

  const handleToggleThreadStatus = (id: string) => {
    onChangeThreads(
      plotThreads.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'Open' ? 'Resolved' : 'Open' }
          : t
      )
    );
  };

  const handleUpdateThread = (id: string, patch: Partial<PlotThread>) => {
    onChangeThreads(plotThreads.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleDeleteThread = (id: string) => {
    onChangeThreads(plotThreads.filter((t) => t.id !== id));
  };

  const openCount = plotThreads.filter((t) => t.status === 'Open').length;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cốt truyện chính — Master Plot Canvas"
      data-testid="master-plot-modal"
    >
      <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-slate-100">
              Cốt truyện chính (Master Plot) — {projectTitle}
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
              Đây là bộ khung nền của tác phẩm &ldquo;{projectTitle}&rdquo; · Dùng để định hướng AI khi Chia Quyển, Lập dàn ý và Viết truyện.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportMasterPlotFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập JSON</span>
            </button>
            <button
              type="button"
              onClick={onExportMasterPlot}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Cốt truyện chính"
              className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Architect Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-stone-50 dark:bg-slate-950/60 border-b border-stone-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setShowSeedForm((v) => !v)}
            data-testid="seed-to-bible-toggle"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khởi tạo từ Ý tưởng</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => setShowVolumePrompt((v) => !v)}
            data-testid="auto-populate-volumes-toggle"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>API Chia Quyển</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onRunLivingRealign}
            data-testid="living-plot-realign-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Cập nhật Đại cương phía sau</span>
          </button>

          {isBusy && (
            <div className="inline-flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 ml-auto">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>
                {busyActionLabel || 'Đang gọi Architect API...'}
                {receivedChars > 0 ? ` (${receivedChars.toLocaleString()} ký tự)` : ''}
              </span>
              {onCancelBusy && (
                <button
                  type="button"
                  onClick={onCancelBusy}
                  data-testid="plot-architect-cancel-btn"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-900/60"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Dừng</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Authoring Workflow Guide */}
        <div className="px-4 sm:px-6 py-2 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/70 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">Cách sáng tác:</span>
          <span>1. Sinh hoặc sửa Cốt truyện chính</span>
          <span aria-hidden="true">→</span>
          <span>2. Tạo Tác phẩm Mới (hoặc bấm &ldquo;API Chia Quyển&rdquo;)</span>
          <span aria-hidden="true">→</span>
          <span>3. Đóng cửa sổ này &amp; bấm &ldquo;Lập dàn ý &amp; Viết tiếp&rdquo; trong Editor.</span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div
              data-testid="plot-architect-error"
              className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200"
            >
              {errorMessage}
            </div>
          )}

          {streamingThinking.trim() && (
            <details
              open={isBusy}
              className="rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-3 text-xs"
            >
              <summary className="cursor-pointer font-medium text-amber-900 dark:text-amber-200 select-none">
                Quá trình suy luận Architect (Thinking) · {streamingThinking.trim().length.toLocaleString()} ký tự
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-600 dark:text-slate-300 max-h-44 overflow-y-auto font-sans">
                {streamingThinking}
              </pre>
            </details>
          )}

          {/* Seed-to-Bible Expandable Panel */}
          {showSeedForm && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                  Khởi tạo Bộ Khung Cốt truyện từ Ý tưởng ngắn
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSeedForm(false)}
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-slate-200"
                >
                  Đóng
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Thể loại
                  </label>
                  <input
                    type="text"
                    value={seedGenre}
                    onChange={(e) => setSeedGenre(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Ý tưởng / Tiền đề gốc
                  </label>
                  <textarea
                    rows={3}
                    value={seedPremise}
                    onChange={(e) => setSeedPremise(e.target.value)}
                    placeholder="Ví dụ: Một đệ tử tạp dịch nhặt được la bàn nghịch chuyển thời gian..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isBusy || !seedPremise.trim()}
                  onClick={() => {
                    onRunSeedToBible(seedPremise, seedGenre);
                    setShowSeedForm(false);
                  }}
                  data-testid="seed-to-bible-submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Sinh Master Plot &amp; Tuyến truyện
                </button>
              </div>
            </div>
          )}

          {/* Auto-Populate Volumes Prompt */}
          {showVolumePrompt && (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-700 dark:text-slate-200">
                <span className="font-semibold">Tự động chia Quyển (Volumes) vào Mục lục Bản thảo:</span>{' '}
                Hiện có {acts.length} quyển. Architect API sẽ tạo các Quyển kèm Đại cương Quyển (Arc Goal, Đối thủ, Cao trào).
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-stone-600 dark:text-slate-300">Số quyển:</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={volumeCount}
                  onChange={(e) => setVolumeCount(Math.max(1, Math.min(8, Number(e.target.value) || 3)))}
                  className="w-16 px-2 py-1 text-xs rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    onRunGenerateVolumes(volumeCount);
                    setShowVolumePrompt(false);
                  }}
                  data-testid="auto-populate-volumes-submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  Tạo {volumeCount} Quyển
                </button>
              </div>
            </div>
          )}

          {saveNotice && (
            <div
              data-testid="plot-architect-save-notice"
              className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-100 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{saveNotice}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowVolumePrompt(true)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/60"
                >
                  API Chia Quyển ngay
                </button>
                <button
                  type="button"
                  onClick={onSaveAndClose}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Về Editor viết tiếp →
                </button>
              </div>
            </div>
          )}

          {/* Generated Seed-to-Bible Review & Destination Choice */}
          {draftSeed && (
            <div
              data-testid="seed-preview-panel"
              className="p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/25 space-y-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>
                      Đã sinh xong Bộ Khung Cốt truyện ({draftSeed.blocks.length} khối ·{' '}
                      {draftSeed.plotThreads.length} tuyến truyện)
                    </span>
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Chọn cách lưu bên dưới: tạo một tác phẩm mới hoàn toàn để viết từ Chương 1, hoặc ghi vào &ldquo;{projectTitle}&rdquo;.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {onExportSeedPreview && (
                    <button
                      type="button"
                      onClick={() => onExportSeedPreview(draftSeed)}
                      data-testid="export-seed-preview-btn"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải .json</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onDiscardSeedPreview}
                    data-testid="discard-seed-preview-btn"
                    className="px-2.5 py-1 rounded-lg text-xs text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>

              {/* Destination Option 1: Create Brand-New Project & Start Writing */}
              <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/80 dark:bg-emerald-950/35 space-y-2">
                <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                  Cách 1 (Khuyên dùng cho truyện mới): Tạo Tác phẩm Mới &amp; mở Chương 1
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="Nhập tên tác phẩm mới..."
                    aria-label="Tên tác phẩm mới"
                    data-testid="new-project-title-from-seed"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onCreateNewProjectFromSeed(
                        newProjectTitle.trim() || 'Tác phẩm mới',
                        seedGenre,
                        draftSeed
                      )
                    }
                    data-testid="create-project-from-seed-btn"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo Tác phẩm Mới &amp; Lập dàn ý Chương 1</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Tạo tiểu thuyết mới riêng biệt (không lẫn các chương mẫu của &ldquo;{projectTitle}&rdquo;), mở ngay Chương 1 trống và tự động lập dàn ý mở đầu để bạn bấm Viết tiếp.
                </p>
              </div>

              {/* Destination Option 2: Update Current Project's Master Plot */}
              <div className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] text-stone-600 dark:text-slate-300">
                  <span className="font-semibold text-stone-800 dark:text-slate-100">
                    Cách 2: Chỉ cập nhật Master Plot của &ldquo;{projectTitle}&rdquo;
                  </span>{' '}
                  (giữ nguyên các Quyển &amp; Chương hiện có của tác phẩm đang mở).
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onApplySeedPreview('replace', draftSeed)}
                    data-testid="apply-seed-replace-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Ghi vào &ldquo;{projectTitle}&rdquo;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplySeedPreview('merge', draftSeed)}
                    data-testid="apply-seed-merge-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-600 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gộp thêm</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {draftSeed.blocks.map((blk, idx) => (
                  <div
                    key={blk.id}
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 space-y-1.5"
                  >
                    <input
                      type="text"
                      value={blk.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setDraftSeed((prev) =>
                          prev
                            ? {
                                ...prev,
                                blocks: prev.blocks.map((item, i) =>
                                  i === idx ? { ...item, title } : item
                                ),
                              }
                            : prev
                        );
                      }}
                      className="w-full text-xs font-semibold text-stone-900 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      value={blk.content}
                      onChange={(e) => {
                        const content = e.target.value;
                        setDraftSeed((prev) =>
                          prev
                            ? {
                                ...prev,
                                blocks: prev.blocks.map((item, i) =>
                                  i === idx ? { ...item, content } : item
                                ),
                              }
                            : prev
                        );
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-stone-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ))}
              </div>

              {draftSeed.plotThreads.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                    Tuyến truyện &amp; Phục bút mới ({draftSeed.plotThreads.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {draftSeed.plotThreads.map((th) => (
                      <div
                        key={th.id}
                        className="p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-white/90 dark:bg-slate-900 text-xs space-y-1"
                      >
                        <div className="font-semibold text-stone-900 dark:text-slate-100">
                          {th.title}{' '}
                          <span className="font-normal text-[11px] text-stone-500">
                            ({th.introducedChapter})
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-slate-300">
                          {th.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Living Plot Re-alignment Preview */}
          {realignPreview && (
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    Đề xuất Căn chỉnh Đại cương phía sau
                  </h3>
                  {realignPreview.analysis && (
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      {realignPreview.analysis}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onDiscardLivingRealign}
                    className="px-2.5 py-1 rounded-md text-xs text-stone-600 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={onApplyLivingRealign}
                    data-testid="apply-living-realign-btn"
                    className="px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Áp dụng ({realignPreview.volumeUpdates.length} Quyển · {realignPreview.chapterGoalUpdates.length} Chương)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Modular Master Plot Blocks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                1. Các khối Cốt truyện Chính ({blocks.length})
              </h3>
              <button
                type="button"
                onClick={handleAddBlock}
                data-testid="add-plot-block-btn"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm khối</span>
              </button>
            </div>

            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  data-testid={`plot-block-${block.id}`}
                  className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      type="text"
                      value={block.title}
                      onChange={(e) => handleUpdateBlock(block.id, { title: e.target.value })}
                      aria-label="Tiêu đề khối cốt truyện"
                      className="flex-1 min-w-[200px] px-2.5 py-1 text-sm font-semibold rounded-md border border-transparent hover:border-stone-300 focus:border-amber-500 bg-transparent text-stone-900 dark:text-slate-100 focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={block.includeInArchitect}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { includeInArchitect: e.target.checked })
                          }
                          className="accent-amber-600"
                        />
                        <span className="text-stone-700 dark:text-slate-300">Architect</span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateBlock(block.id, { includeInProse: !block.includeInProse })
                        }
                        data-testid={`toggle-prose-block-${block.id}`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                          block.includeInProse
                            ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                            : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
                        }`}
                      >
                        <Target className="w-3 h-3" />
                        <span>Gửi sang Prose Context</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onExpandBlock(block.id)}
                        data-testid={`expand-plot-block-${block.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-900 dark:bg-slate-800 text-white hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>API Mở rộng</span>
                      </button>

                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveBlock(index, -1)}
                        aria-label="Di chuyển lên"
                        className="p-1 rounded-md text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-800 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === blocks.length - 1}
                        onClick={() => handleMoveBlock(index, 1)}
                        aria-label="Di chuyển xuống"
                        className="p-1 rounded-md text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-800 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        aria-label={`Xóa khối ${block.title}`}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={block.content}
                    onChange={(e) => handleUpdateBlock(block.id, { content: e.target.value })}
                    placeholder="Nhập nội dung cốt truyện cho khối này..."
                    className="w-full px-3 py-2 text-xs sm:text-sm leading-relaxed rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Plot Threads / Foreshadowing Tracker */}
          <section className="space-y-3 pt-2 border-t border-stone-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                2. Tuyến truyện &amp; Phục bút ({openCount} đang mở / {plotThreads.length} tổng)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plotThreads.map((thread) => (
                <div
                  key={thread.id}
                  data-testid={`plot-thread-${thread.id}`}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      value={thread.title}
                      onChange={(e) => handleUpdateThread(thread.id, { title: e.target.value })}
                      className="flex-1 text-xs font-semibold bg-transparent text-stone-900 dark:text-slate-100 border-b border-transparent focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleThreadStatus(thread.id)}
                        data-testid={`toggle-thread-${thread.id}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          thread.status === 'Open'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {thread.status === 'Open' ? (
                          <CircleDot className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        <span>{thread.status}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteThread(thread.id)}
                        aria-label={`Xóa tuyến truyện ${thread.title}`}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={thread.introducedChapter}
                    onChange={(e) =>
                      handleUpdateThread(thread.id, { introducedChapter: e.target.value })
                    }
                    placeholder="Xuất hiện tại chương..."
                    className="w-full text-[11px] text-stone-500 dark:text-slate-400 bg-transparent focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    value={thread.description}
                    onChange={(e) => handleUpdateThread(thread.id, { description: e.target.value })}
                    placeholder="Mô tả chi tiết phục bút hoặc mâu thuẫn..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-stone-800 dark:text-slate-200"
                  />
                </div>
              ))}
            </div>

            {/* Add Thread Form */}
            <div className="p-3.5 rounded-xl border border-dashed border-stone-300 dark:border-slate-700 bg-stone-50/40 dark:bg-slate-950/20 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="Tên tuyến truyện / phục bút mới..."
                  data-testid="new-thread-title"
                  className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={newThreadChapter}
                  onChange={(e) => setNewThreadChapter(e.target.value)}
                  placeholder="Chương gieo..."
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newThreadDesc}
                  onChange={(e) => setNewThreadDesc(e.target.value)}
                  placeholder="Mô tả bí ẩn / nút thắt cần nhớ..."
                  data-testid="new-thread-desc"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddThread}
                  disabled={!newThreadTitle.trim()}
                  data-testid="add-thread-btn"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90 disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tuyến</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 space-y-2.5">
          {showSaveAsNewBar && (
            <div
              data-testid="footer-save-as-new-panel"
              className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center gap-2.5"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-medium text-emerald-900 dark:text-emerald-200 mb-1">
                  Tên tác phẩm mới (lưu toàn bộ Khối cốt truyện &amp; Tuyến truyện đang có):
                </label>
                <input
                  type="text"
                  value={saveAsNewTitle}
                  onChange={(e) => setSaveAsNewTitle(e.target.value)}
                  placeholder="Nhập tên truyện mới..."
                  data-testid="footer-new-project-title-input"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs text-stone-700 dark:text-slate-300 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={saveAsAutoBeats}
                  onChange={(e) => setSaveAsAutoBeats(e.target.checked)}
                  data-testid="footer-new-project-auto-beats"
                  className="accent-emerald-600"
                />
                <span>Tự lập dàn ý Chương 1</span>
              </label>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSaveAsNewBar(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const source = draftSeed ?? { blocks, plotThreads };
                    const finalTitle =
                      saveAsNewTitle.trim() ||
                      newProjectTitle.trim() ||
                      `${projectTitle} (Mới)`;
                    setShowSaveAsNewBar(false);
                    onCreateNewProjectFromSeed(finalTitle, seedGenre, source, {
                      autoGenerateBeats: saveAsAutoBeats,
                    });
                  }}
                  data-testid="confirm-save-as-new-project-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <BookPlus className="w-3.5 h-3.5" />
                  <span>Xác nhận Tạo Tác phẩm Mới</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-stone-500 dark:text-slate-400">
              Đang mở tác phẩm: <strong className="text-stone-700 dark:text-slate-200">{projectTitle}</strong> (lưu trực tiếp chỉ cập nhật nền cốt truyện, không xóa chương đang viết).
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultTitle =
                    newProjectTitle.trim() ||
                    draftSeed?.suggestedTitle?.trim() ||
                    `${projectTitle} (Bản mới)`;
                  setSaveAsNewTitle((prev) => prev.trim() || defaultTitle);
                  setShowSaveAsNewBar((v) => !v);
                }}
                data-testid="master-plot-save-as-new-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/70 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                <BookPlus className="w-3.5 h-3.5" />
                <span>Lưu thành tác phẩm mới</span>
              </button>
              <button
                type="button"
                onClick={onSaveAndClose}
                data-testid="master-plot-save-close-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu vào &ldquo;{projectTitle}&rdquo; &amp; Đóng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
