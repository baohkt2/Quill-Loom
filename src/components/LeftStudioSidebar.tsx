import React, { useRef, useState } from 'react';
import {
  BookMarked,
  Brain,
  Download,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  LongTermMemoryCard,
  ManuscriptAct,
  MemoryCategory,
  StorySummary,
} from '../types/novel';
import { ManuscriptTreePanel } from './ManuscriptTreePanel';

interface LeftStudioSidebarProps {
  acts: ManuscriptAct[];
  activeChapterId: string;
  summaries: StorySummary[];
  longTermMemories: LongTermMemoryCard[];
  isBusyMemory: boolean;
  onSelectChapter: (chapterId: string) => void;
  onAddAct: () => void;
  onRenameAct: (actId: string, title: string) => void;
  onDeleteAct: (actId: string) => void;
  onToggleActCollapse: (actId: string) => void;
  onOpenVolumeBlueprint: (actId: string) => void;
  onAddChapter: (actId: string) => void;
  onRenameChapter: (chapterId: string, title: string) => void;
  onDeleteChapter: (actId: string, chapterId: string) => void;
  onMoveChapter: (actId: string, chapterId: string, direction: 'up' | 'down') => void;
  onCycleChapterStatus: (chapterId: string) => void;
  onOpenBulkImport: () => void;
  onChangeSummaries: (summaries: StorySummary[]) => void;
  onChangeMemories: (memories: LongTermMemoryCard[]) => void;
  onSummarizeActiveChapter: () => void;
  onExtractFactsFromActiveChapter: () => void;
  onExportMemories: () => void;
  onImportMemoriesFile: (file: File) => void;
}

const MEMORY_CATEGORIES: MemoryCategory[] = [
  'Sự kiện',
  'Lời hứa',
  'Mối quan hệ',
  'Bí mật',
  'Vật phẩm',
  'Cảnh giới',
];

export const LeftStudioSidebar: React.FC<LeftStudioSidebarProps> = ({
  acts,
  activeChapterId,
  summaries,
  longTermMemories,
  isBusyMemory,
  onSelectChapter,
  onAddAct,
  onRenameAct,
  onDeleteAct,
  onToggleActCollapse,
  onOpenVolumeBlueprint,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  onMoveChapter,
  onCycleChapterStatus,
  onOpenBulkImport,
  onChangeSummaries,
  onChangeMemories,
  onSummarizeActiveChapter,
  onExtractFactsFromActiveChapter,
  onExportMemories,
  onImportMemoriesFile,
}) => {
  const [tab, setTab] = useState<'manuscript' | 'memory'>('manuscript');
  const [newMemContent, setNewMemContent] = useState('');
  const [newMemKeywords, setNewMemKeywords] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<MemoryCategory>('Sự kiện');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleAddMemory = () => {
    if (!newMemContent.trim()) return;
    const card: LongTermMemoryCard = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content: newMemContent.trim(),
      keywords: newMemKeywords.trim(),
      category: newMemCategory,
      importance: 4,
      createdAt: Date.now(),
      enabled: true,
    };
    onChangeMemories([card, ...longTermMemories]);
    setNewMemContent('');
    setNewMemKeywords('');
  };

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-slate-800">
      {/* Tabs */}
      <div className="p-1.5 border-b border-stone-200 dark:border-slate-800 grid grid-cols-2 gap-1 bg-stone-50 dark:bg-slate-950/60">
        <button
          type="button"
          onClick={() => setTab('manuscript')}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'manuscript'
              ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 shadow-xs'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Mục lục</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('memory')}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'memory'
              ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 shadow-xs'
              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Ký ức ({longTermMemories.length})</span>
        </button>
      </div>

      {tab === 'manuscript' ? (
        <div className="flex-1 min-h-0">
          <ManuscriptTreePanel
            acts={acts}
            activeChapterId={activeChapterId}
            onSelectChapter={onSelectChapter}
            onAddAct={onAddAct}
            onRenameAct={onRenameAct}
            onDeleteAct={onDeleteAct}
            onToggleActCollapse={onToggleActCollapse}
            onOpenVolumeBlueprint={onOpenVolumeBlueprint}
            onAddChapter={onAddChapter}
            onRenameChapter={onRenameChapter}
            onDeleteChapter={onDeleteChapter}
            onMoveChapter={onMoveChapter}
            onCycleChapterStatus={onCycleChapterStatus}
            onOpenBulkImport={onOpenBulkImport}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* AI Memory Tools */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={isBusyMemory}
              onClick={onSummarizeActiveChapter}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
            >
              {isBusyMemory ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>Tóm tắt chương</span>
            </button>
            <button
              type="button"
              disabled={isBusyMemory}
              onClick={onExtractFactsFromActiveChapter}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Rút trích ký ức</span>
            </button>
          </div>

          {/* Import / Export Memories */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-stone-800 dark:text-slate-200">
              Thẻ Ký ức Dài hạn
            </span>
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportMemoriesFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-1 rounded text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
                title="Nhập ký ức (.json)"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onExportMemories}
                className="p-1 rounded text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
                title="Xuất ký ức (.json)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Add Memory Form */}
          <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/40 space-y-2">
            <textarea
              rows={2}
              value={newMemContent}
              onChange={(e) => setNewMemContent(e.target.value)}
              placeholder="Ghi sự kiện, lời hứa, bí mật cần nhớ..."
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newMemKeywords}
                onChange={(e) => setNewMemKeywords(e.target.value)}
                placeholder="Từ khóa kích hoạt..."
                className="flex-1 min-w-0 px-2 py-1 text-xs rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <select
                value={newMemCategory}
                onChange={(e) => setNewMemCategory(e.target.value as MemoryCategory)}
                className="px-2 py-1 text-xs rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {MEMORY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!newMemContent.trim()}
              onClick={handleAddMemory}
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium bg-stone-900 dark:bg-slate-800 text-white disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm ký ức</span>
            </button>
          </div>

          {/* Memory Cards */}
          <div className="space-y-2">
            {longTermMemories.map((card) => (
              <div
                key={card.id}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <label className="inline-flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={card.enabled}
                      onChange={(e) =>
                        onChangeMemories(
                          longTermMemories.map((m) =>
                            m.id === card.id ? { ...m, enabled: e.target.checked } : m
                          )
                        )
                      }
                      className="accent-amber-600"
                    />
                    <span>{card.category}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeMemories(longTermMemories.filter((m) => m.id !== card.id))
                    }
                    aria-label="Xóa ký ức"
                    className="text-stone-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-stone-800 dark:text-slate-200 leading-relaxed">
                  {card.content}
                </p>
                {card.keywords && (
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Từ khóa: {card.keywords}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Chapter Summaries */}
          <div className="pt-3 border-t border-stone-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                Tóm tắt các chương ({summaries.length})
              </span>
            </div>
            {summaries.map((sum) => (
              <div
                key={sum.id}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-800 dark:text-slate-200 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sum.enabled}
                      onChange={(e) =>
                        onChangeSummaries(
                          summaries.map((s) =>
                            s.id === sum.id ? { ...s, enabled: e.target.checked } : s
                          )
                        )
                      }
                      className="accent-amber-600 shrink-0"
                    />
                    <span className="truncate">{sum.title}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeSummaries(summaries.filter((s) => s.id !== sum.id))
                    }
                    aria-label={`Xóa ${sum.title}`}
                    className="text-stone-400 hover:text-rose-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={sum.content}
                  onChange={(e) =>
                    onChangeSummaries(
                      summaries.map((s) =>
                        s.id === sum.id ? { ...s, content: e.target.value } : s
                      )
                    )
                  }
                  className="w-full px-2 py-1 text-xs rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-stone-700 dark:text-slate-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
