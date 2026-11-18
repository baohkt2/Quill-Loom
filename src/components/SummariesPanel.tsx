import React, { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { StorySummary } from '../types/novel';
import {
  mergeOrReplaceSummaries,
  parseSummariesJson,
  serializeSummariesJson,
} from '../utils/assetExchange';
import { sanitizeFilename, triggerFileDownload } from '../utils/storage';
import { PendingImportPrompt } from './ImportConflictModal';

interface SummariesPanelProps {
  projectTitle: string;
  storyLength: number;
  contextBudgetChars: number;
  summarizedUpToChar: number;
  autoSummarizeEnabled: boolean;
  summaries: StorySummary[];
  isSummarizing: boolean;
  summaryError: string | null;
  onToggleAutoSummarize: (enabled: boolean) => void;
  onSummarizeNow: (customStart?: number, customEnd?: number) => void;
  onChangeSummaries: (summaries: StorySummary[]) => void;
  onRequestImportConflict: (prompt: PendingImportPrompt) => void;
  onDismissError: () => void;
}

export const SummariesPanel: React.FC<SummariesPanelProps> = ({
  projectTitle,
  storyLength,
  contextBudgetChars,
  summarizedUpToChar,
  autoSummarizeEnabled,
  summaries,
  isSummarizing,
  summaryError,
  onToggleAutoSummarize,
  onSummarizeNow,
  onChangeSummaries,
  onRequestImportConflict,
  onDismissError,
}) => {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<number>(summarizedUpToChar);
  const [rangeEnd, setRangeEnd] = useState<number>(storyLength);
  const [ioNotice, setIoNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddManualSummary = () => {
    const nextNum = summaries.length + 1;
    const created: StorySummary = {
      id: `sum_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `Chapter ${nextNum}`,
      content: '- ',
      enabled: true,
      startChar: summarizedUpToChar,
      endChar: storyLength,
      createdAt: Date.now(),
    };
    onChangeSummaries([...summaries, created]);
  };

  const handleUpdateSummary = (id: string, patch: Partial<StorySummary>) => {
    onChangeSummaries(
      summaries.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const handleDeleteSummary = (id: string) => {
    onChangeSummaries(summaries.filter((s) => s.id !== id));
  };

  const handleOpenRange = () => {
    if (!rangeOpen) {
      setRangeStart(Math.min(summarizedUpToChar, storyLength));
      setRangeEnd(storyLength);
    }
    setRangeOpen(!rangeOpen);
  };

  const handleExportSummaries = () => {
    const filename = `${sanitizeFilename(projectTitle)}_summaries.json`;
    triggerFileDownload(
      filename,
      serializeSummariesJson(summaries),
      'application/json;charset=utf-8'
    );
  };

  const handleImportSummariesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIoNotice(null);

    try {
      const raw = await file.text();
      const incoming = parseSummariesJson(raw);
      if (incoming.length === 0) {
        setIoNotice({ type: 'error', text: 'Không tìm thấy tóm tắt hợp lệ trong tệp JSON.' });
        return;
      }

      onRequestImportConflict({
        categoryLabel: 'Tóm tắt (Summaries)',
        fileName: file.name,
        incomingCount: incoming.length,
        existingCount: summaries.length,
        previewNames: incoming.map((s) => s.title),
        onResolve: (mode) => {
          const res = mergeOrReplaceSummaries(summaries, incoming, mode);
          onChangeSummaries(res.summaries);
          setIoNotice({
            type: 'success',
            text:
              mode === 'replace'
                ? `Đã ghi đè bằng ${res.addedCount} bản tóm tắt.`
                : `Đã gộp thêm ${res.addedCount} bản tóm tắt${
                    res.skippedDuplicates > 0 ? ` (bỏ qua ${res.skippedDuplicates} trùng lặp)` : ''
                  }.`,
          });
        },
      });
    } catch (err) {
      setIoNotice({
        type: 'error',
        text: (err as Error).message || 'Không thể đọc tệp JSON Summaries.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const overBudget = storyLength > contextBudgetChars;

  return (
    <div className="space-y-4">
      {/* Actions Header */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isSummarizing || storyLength === 0}
            onClick={() => onSummarizeNow()}
            className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#5e7cf2] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#4e6ce4] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Summarize Now</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleAddManualSummary}
            title="Add manual summary"
            aria-label="Add manual summary"
            className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.03] px-2 text-xs font-medium text-slate-200 hover:bg-white/[0.07] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Manual</span>
          </button>

          <button
            type="button"
            data-testid="import-summaries-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Nhập bản sao lưu Summaries (.json)"
            aria-label="Import Summaries JSON"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            data-testid="export-summaries-btn"
            onClick={handleExportSummaries}
            title="Xuất bản sao lưu Summaries (.json)"
            aria-label="Export Summaries JSON"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <input
            ref={fileInputRef}
            data-testid="summaries-import-input"
            type="file"
            accept=".json,application/json"
            onChange={handleImportSummariesFile}
            className="hidden"
            aria-label="Import Summaries JSON file"
          />
        </div>

        {/* Auto-Summarize Toggle + Custom Range Disclosure */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.07] bg-[#13141c] px-3 py-2">
          <label
            htmlFor="auto-summarize-toggle"
            className="flex cursor-pointer items-center gap-2 text-xs text-slate-300"
          >
            <input
              id="auto-summarize-toggle"
              type="checkbox"
              checked={autoSummarizeEnabled}
              onChange={(e) => onToggleAutoSummarize(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-[#181a24] accent-[#6d8cff]"
            />
            <span>Auto-summarize over budget</span>
          </label>

          <button
            type="button"
            onClick={handleOpenRange}
            aria-expanded={rangeOpen}
            className="flex items-center gap-1 text-[11px] font-medium text-[#a5b8ff] hover:text-white whitespace-nowrap"
          >
            <span>Range</span>
            {rangeOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>

        {rangeOpen && (
          <div className="space-y-2 rounded-md border border-white/[0.08] bg-[#13141c] p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="sum-range-start" className="block text-[11px] text-slate-400">
                  Start Char
                </label>
                <input
                  id="sum-range-start"
                  type="number"
                  min={0}
                  max={storyLength}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Math.max(0, parseInt(e.target.value || '0', 10) || 0))}
                  className="w-full rounded border border-white/[0.1] bg-[#161822] px-2 py-1 font-mono text-xs tabular-nums text-slate-100 focus:border-[#8aa2ff] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sum-range-end" className="block text-[11px] text-slate-400">
                  End Char
                </label>
                <input
                  id="sum-range-end"
                  type="number"
                  min={0}
                  max={storyLength}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Math.min(storyLength, parseInt(e.target.value || '0', 10) || 0))}
                  className="w-full rounded border border-white/[0.1] bg-[#161822] px-2 py-1 font-mono text-xs tabular-nums text-slate-100 focus:border-[#8aa2ff] focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={isSummarizing || rangeEnd <= rangeStart}
              onClick={() => onSummarizeNow(rangeStart, rangeEnd)}
              className="w-full rounded bg-[#6d8cff]/20 py-1.5 text-xs font-medium text-[#c7d4ff] hover:bg-[#6d8cff]/30 disabled:opacity-45"
            >
              Summarize Selected Range ({Math.max(0, rangeEnd - rangeStart).toLocaleString()} ch)
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span>
            Covered:{' '}
            <strong className="font-mono font-medium text-slate-200">
              {Math.min(summarizedUpToChar, storyLength).toLocaleString()}
            </strong>{' '}
            / {storyLength.toLocaleString()} ch
          </span>
          {overBudget && (
            <span className="font-medium text-amber-300">Over budget</span>
          )}
        </div>
      </div>

      {ioNotice && (
        <div
          role={ioNotice.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs ${
            ioNotice.type === 'error'
              ? 'border-rose-500/35 bg-rose-950/40 text-rose-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          <span>{ioNotice.text}</span>
          <button
            type="button"
            onClick={() => setIoNotice(null)}
            aria-label="Dismiss summaries notice"
            className="opacity-80 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {summaryError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-md border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
        >
          <span>{summaryError}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss summary error"
            className="text-rose-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Summaries List */}
      {summaries.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/[0.1] px-4 py-6 text-center">
          <p className="text-xs leading-relaxed text-slate-400">
            No chapter summaries yet. Click <strong>Summarize Now</strong> or exceed your Context Budget to auto-summarize older arcs.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Story chapter summaries">
          {summaries.map((sum) => (
            <li
              key={sum.id}
              data-testid={`summary-item-${sum.id}`}
              className={`space-y-2 rounded-md border p-3 ${
                sum.enabled
                  ? 'border-white/[0.09] bg-[#13141c]'
                  : 'border-white/[0.05] bg-[#13141c]/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  aria-label={`Summary title for ${sum.title}`}
                  value={sum.title}
                  onChange={(e) => handleUpdateSummary(sum.id, { title: e.target.value })}
                  className="min-w-0 flex-1 border-b border-transparent bg-transparent text-xs font-semibold text-slate-100 focus:border-[#8aa2ff] focus:outline-none"
                />

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateSummary(sum.id, { enabled: !sum.enabled })}
                    aria-label={sum.enabled ? `Disable ${sum.title}` : `Enable ${sum.title}`}
                    title={sum.enabled ? 'Injected into context' : 'Disabled'}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
                  >
                    {sum.enabled ? (
                      <Eye className="h-3.5 w-3.5 text-[#8aa2ff]" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSummary(sum.id)}
                    aria-label={`Delete ${sum.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                aria-label={`Summary content for ${sum.title}`}
                value={sum.content}
                onChange={(e) => handleUpdateSummary(sum.id, { content: e.target.value })}
                className="w-full resize-y rounded border border-white/[0.08] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-200 focus:border-[#8aa2ff] focus:outline-none"
              />

              <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-slate-500">
                <span>
                  Chars {sum.startChar.toLocaleString()}–{sum.endChar.toLocaleString()}
                </span>
                <span>{sum.enabled ? 'Injected after Memory' : 'Paused'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
