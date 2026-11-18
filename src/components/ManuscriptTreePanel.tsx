import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { ChapterStatus, ManuscriptAct } from '../types/novel';
import { countChapterWords, countTotalChapters } from '../utils/manuscriptEngine';

interface ManuscriptTreePanelProps {
  acts: ManuscriptAct[];
  activeChapterId: string;
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
}

const STATUS_BADGE_MAP: Record<ChapterStatus, { label: string; cls: string }> = {
  Draft: {
    label: 'Nháp',
    cls: 'text-stone-600 dark:text-slate-400 bg-stone-100 dark:bg-slate-800',
  },
  Revised: {
    label: 'Đã sửa',
    cls: 'text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60',
  },
  Final: {
    label: 'Hoàn',
    cls: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60',
  },
};

export const ManuscriptTreePanel: React.FC<ManuscriptTreePanelProps> = ({
  acts,
  activeChapterId,
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
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalChapters = countTotalChapters(acts);

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditingValue(current);
  };

  const commitActEdit = (actId: string) => {
    if (editingValue.trim()) {
      onRenameAct(actId, editingValue.trim());
    }
    setEditingId(null);
  };

  const commitChapterEdit = (chapterId: string) => {
    if (editingValue.trim()) {
      onRenameChapter(chapterId, editingValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Summary & Actions */}
      <div className="px-2.5 py-2.5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-1.5">
        <div className="text-[11px] text-stone-600 dark:text-slate-400 font-mono-tabular whitespace-nowrap shrink-0">
          {acts.length} quyển · {totalChapters} chương
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenBulkImport}
            title="Nhập hàng loạt từ tệp .txt / .md"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập</span>
          </button>
          <button
            type="button"
            onClick={onAddAct}
            data-testid="add-act-btn"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-stone-900 dark:bg-slate-800 text-white hover:opacity-90 whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Quyển</span>
          </button>
        </div>
      </div>

      {/* Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {acts.map((act) => {
          const isEditingAct = editingId === act.id;
          const hasBlueprint = Boolean(
            act.blueprint?.arcGoal?.trim() ||
              act.blueprint?.keyAntagonists?.trim() ||
              act.blueprint?.turningPointsAndClimax?.trim()
          );

          return (
            <div
              key={act.id}
              data-testid={`volume-node-${act.id}`}
              className="rounded-lg border border-stone-200/80 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/30 overflow-hidden"
            >
              {/* Volume Row */}
              <div className="px-2 py-2 flex items-center justify-between gap-1 bg-stone-100/70 dark:bg-slate-900/70">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleActCollapse(act.id)}
                    aria-label={act.collapsed ? `Mở rộng ${act.title}` : `Thu gọn ${act.title}`}
                    className="p-0.5 rounded text-stone-500 hover:text-stone-900 dark:hover:text-slate-100 shrink-0"
                  >
                    {act.collapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isEditingAct ? (
                    <input
                      type="text"
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => commitActEdit(act.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitActEdit(act.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 min-w-0 px-1.5 py-0.5 text-xs font-semibold rounded border border-amber-500 bg-white dark:bg-slate-950"
                    />
                  ) : (
                    <span
                      className="text-xs font-semibold text-stone-800 dark:text-slate-200 truncate"
                      title={act.title}
                    >
                      {act.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenVolumeBlueprint(act.id)}
                    data-testid={`edit-volume-blueprint-${act.id}`}
                    title="Đại cương Quyển & API Lên khung Chương"
                    aria-label={`Đại cương Quyển ${act.title}`}
                    className={`p-1 rounded hover:bg-stone-200/70 dark:hover:bg-slate-800 ${
                      hasBlueprint
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-stone-500 dark:text-slate-400'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onAddChapter(act.id)}
                    data-testid={`add-chapter-${act.id}`}
                    title="Thêm chương mới & tự động lập dàn ý nối tiếp"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Chương</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(act.id, act.title)}
                    aria-label={`Đổi tên ${act.title}`}
                    className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  {acts.length > 1 && (
                    confirmDeleteId === act.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteAct(act.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-600 text-white"
                      >
                        Xóa?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(act.id)}
                        aria-label={`Xóa ${act.title}`}
                        className="p-1 rounded text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Chapters List */}
              {!act.collapsed && (
                <div className="p-1.5 space-y-1">
                  {act.chapters.map((chapter, chapIdx) => {
                    const isActive = chapter.id === activeChapterId;
                    const isEditingChap = editingId === chapter.id;
                    const words = countChapterWords(chapter);
                    const badge = STATUS_BADGE_MAP[chapter.status];

                    return (
                      <div
                        key={chapter.id}
                        className={`group rounded-lg px-2 py-1.5 transition-colors ${
                          isActive
                            ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80'
                            : 'hover:bg-stone-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <FileText
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-stone-400 dark:text-slate-500'
                              }`}
                            />
                            {isEditingChap ? (
                              <input
                                type="text"
                                value={editingValue}
                                autoFocus
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => commitChapterEdit(chapter.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitChapterEdit(chapter.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded border border-amber-500 bg-white dark:bg-slate-950"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectChapter(chapter.id)}
                                data-testid={`chapter-item-${chapter.id}`}
                                title={chapter.chapterGoal || chapter.title}
                                className={`text-left text-xs truncate flex-1 ${
                                  isActive
                                    ? 'font-semibold text-stone-900 dark:text-slate-100'
                                    : 'font-medium text-stone-700 dark:text-slate-300'
                                }`}
                              >
                                {chapter.title}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onCycleChapterStatus(chapter.id)}
                            title="Nhấp để đổi trạng thái: Nháp -> Đã sửa -> Hoàn"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${badge.cls}`}
                          >
                            {badge.label}
                          </button>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 pl-5">
                          <span className="font-mono-tabular truncate">
                            {words.toLocaleString('vi-VN')} từ
                            {chapter.chapterGoal.trim() ? ' · Có mục tiêu' : ''}
                          </span>

                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              disabled={chapIdx === 0}
                              onClick={() => onMoveChapter(act.id, chapter.id, 'up')}
                              aria-label={`Đưa ${chapter.title} lên`}
                              className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={chapIdx === act.chapters.length - 1}
                              onClick={() => onMoveChapter(act.id, chapter.id, 'down')}
                              aria-label={`Đưa ${chapter.title} xuống`}
                              className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(chapter.id, chapter.title)}
                              aria-label={`Đổi tên ${chapter.title}`}
                              className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {(act.chapters.length > 1 || acts.length > 1) && (
                              confirmDeleteId === chapter.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteChapter(act.id, chapter.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1 rounded text-[10px] bg-rose-600 text-white"
                                >
                                  Xóa
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(chapter.id)}
                                  aria-label={`Xóa ${chapter.title}`}
                                  className="p-0.5 rounded hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
