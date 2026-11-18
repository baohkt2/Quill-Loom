import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { LongTermMemoryCard, MemoryCategory } from '../types/novel';
import {
  mergeOrReplaceMemories,
  parseMemoriesJson,
  serializeMemoriesJson,
} from '../utils/assetExchange';
import { sanitizeFilename, triggerFileDownload } from '../utils/storage';
import { PendingImportPrompt } from './ImportConflictModal';

interface LongMemoryPanelProps {
  projectTitle: string;
  storyLength: number;
  cards: LongTermMemoryCard[];
  recalledIds: Set<string>;
  isExtracting: boolean;
  extractError: string | null;
  onExtractFacts: () => void;
  onChangeCards: (cards: LongTermMemoryCard[]) => void;
  onRequestImportConflict: (prompt: PendingImportPrompt) => void;
  onDismissError: () => void;
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  fact: 'Fact',
  relationship: 'Relationship',
  item: 'Item',
  promise: 'Promise',
  event: 'Event',
};

export const LongMemoryPanel: React.FC<LongMemoryPanelProps> = ({
  projectTitle,
  storyLength,
  cards,
  recalledIds,
  isExtracting,
  extractError,
  onExtractFacts,
  onChangeCards,
  onRequestImportConflict,
  onDismissError,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('fact');
  const [draftContent, setDraftContent] = useState('');
  const [draftKeywords, setDraftKeywords] = useState('');
  const [ioNotice, setIoNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setDraftCategory('fact');
    setDraftContent('');
    setDraftKeywords('');
  };

  const startEdit = (card: LongTermMemoryCard) => {
    setIsCreating(false);
    setEditingId(card.id);
    setDraftCategory(card.category);
    setDraftContent(card.content);
    setDraftKeywords(card.keywords);
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const saveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;

    if (isCreating) {
      const created: LongTermMemoryCard = {
        id: `ltm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category: draftCategory,
        content: draftContent.trim(),
        keywords: draftKeywords.trim(),
        enabled: true,
        createdAt: Date.now(),
      };
      onChangeCards([created, ...cards]);
      setIsCreating(false);
    } else if (editingId) {
      onChangeCards(
        cards.map((c) =>
          c.id === editingId
            ? {
                ...c,
                category: draftCategory,
                content: draftContent.trim(),
                keywords: draftKeywords.trim(),
              }
            : c
        )
      );
      setEditingId(null);
    }
  };

  const toggleCard = (id: string) => {
    onChangeCards(
      cards.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const deleteCard = (id: string) => {
    onChangeCards(cards.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleExportMemories = () => {
    const filename = `${sanitizeFilename(projectTitle)}_memories.json`;
    triggerFileDownload(
      filename,
      serializeMemoriesJson(cards),
      'application/json;charset=utf-8'
    );
  };

  const handleImportMemoriesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIoNotice(null);

    try {
      const raw = await file.text();
      const incoming = parseMemoriesJson(raw);
      if (incoming.length === 0) {
        setIoNotice({ type: 'error', text: 'Không tìm thấy thẻ ký ức hợp lệ trong tệp JSON.' });
        return;
      }

      onRequestImportConflict({
        categoryLabel: 'Ký ức dài hạn (Long-Term Memory)',
        fileName: file.name,
        incomingCount: incoming.length,
        existingCount: cards.length,
        previewNames: incoming.map((c) => c.content.slice(0, 48)),
        onResolve: (mode) => {
          const res = mergeOrReplaceMemories(cards, incoming, mode);
          onChangeCards(res.cards);
          setIoNotice({
            type: 'success',
            text:
              mode === 'replace'
                ? `Đã ghi đè bằng ${res.addedCount} thẻ ký ức.`
                : `Đã gộp thêm ${res.addedCount} thẻ ký ức${
                    res.skippedDuplicates > 0 ? ` (bỏ qua ${res.skippedDuplicates} trùng lặp)` : ''
                  }.`,
          });
        },
      });
    } catch (err) {
      setIoNotice({
        type: 'error',
        text: (err as Error).message || 'Không thể đọc tệp JSON Long-Term Memory.',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isExtracting || storyLength === 0}
            onClick={onExtractFacts}
            className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#5e7cf2] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#4e6ce4] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Extract Facts</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={startCreate}
            aria-label="Add memory card"
            className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.03] px-2 text-xs font-medium text-slate-200 hover:bg-white/[0.07] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>

          <button
            type="button"
            data-testid="import-memories-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Nhập bản sao lưu Long-Term Memory (.json)"
            aria-label="Import Long-Term Memory JSON"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            data-testid="export-memories-btn"
            onClick={handleExportMemories}
            title="Xuất bản sao lưu Long-Term Memory (.json)"
            aria-label="Export Long-Term Memory JSON"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <input
            ref={fileInputRef}
            data-testid="memories-import-input"
            type="file"
            accept=".json,application/json"
            onChange={handleImportMemoriesFile}
            className="hidden"
            aria-label="Import Long-Term Memory JSON file"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span>
            {cards.length} memory card{cards.length === 1 ? '' : 's'}
          </span>
          <span>
            <strong className="font-mono font-medium text-[#b4c4ff]">
              {recalledIds.size}
            </strong>{' '}
            recalled (Top 5 BM25)
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          Scores all enabled cards against the last 1,500 characters of your story and injects the top 5 matches before generation.
        </p>
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
            aria-label="Dismiss memory notice"
            className="opacity-80 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {extractError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-md border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
        >
          <span>{extractError}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss fact extraction error"
            className="text-rose-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Create / Edit Memory Card Form */}
      {(isCreating || editingId) && (
        <form
          onSubmit={saveCard}
          className="space-y-2.5 rounded-md border border-[#8aa2ff]/35 bg-[#13141c] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              {isCreating ? 'New Memory Card' : 'Edit Memory Card'}
            </span>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Cancel memory editing"
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="ltm-category" className="block text-[11px] font-medium text-slate-400">
              Category
            </label>
            <select
              id="ltm-category"
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value as MemoryCategory)}
              className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 focus:border-[#8aa2ff] focus:outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="ltm-content" className="block text-[11px] font-medium text-slate-400">
              Memory Fact / State
            </label>
            <textarea
              id="ltm-content"
              rows={3}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="e.g., Mirei owes Captain Kestrel three calibrated Prismite lenses."
              className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="ltm-keywords" className="block text-[11px] font-medium text-slate-400">
              Search Keywords (comma-separated)
            </label>
            <input
              id="ltm-keywords"
              type="text"
              value={draftKeywords}
              onChange={(e) => setDraftKeywords(e.target.value)}
              placeholder="kestrel, prismite, lenses, debt"
              className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[#6d8cff] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5b7bf5]"
            >
              Save Card
            </button>
          </div>
        </form>
      )}

      {/* Memory Cards List */}
      {cards.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/[0.1] px-4 py-6 text-center">
          <p className="text-xs leading-relaxed text-slate-400">
            No Long-Term Memory cards yet. Click <strong>Extract Facts from Recent Text</strong> or add one manually.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5" aria-label="Long-term memory cards">
          {cards.map((card) => {
            const isRecalled = recalledIds.has(card.id);
            const timeLabel = new Date(card.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <li
                key={card.id}
                data-testid={`ltm-card-${card.id}`}
                data-recalled={isRecalled ? 'true' : 'false'}
                className={`rounded-md border p-3 transition-colors ${
                  isRecalled
                    ? 'border-[#8aa2ff]/45 bg-[#8aa2ff]/[0.07]'
                    : card.enabled
                    ? 'border-white/[0.08] bg-[#13141c]'
                    : 'border-white/[0.05] bg-[#13141c]/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold text-slate-200">
                      {CATEGORY_LABELS[card.category]}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {timeLabel}
                    </span>
                    {isRecalled && (
                      <>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="flex items-center gap-1 font-medium text-[#b4c4ff]">
                          <Check className="h-3 w-3" />
                          Recalled
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleCard(card.id)}
                      aria-label={card.enabled ? `Disable memory ${card.id}` : `Enable memory ${card.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
                    >
                      {card.enabled ? (
                        <Eye className="h-3.5 w-3.5 text-[#8aa2ff]" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      aria-label={`Edit memory ${card.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCard(card.id)}
                      aria-label={`Delete memory ${card.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                  {card.content}
                </p>

                {card.keywords && (
                  <p className="mt-1.5 truncate font-mono text-[11px] text-slate-400">
                    {card.keywords}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
