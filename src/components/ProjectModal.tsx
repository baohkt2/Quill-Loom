import React, { useRef, useState } from 'react';
import {
  Copy,
  Download,
  FileCode2,
  FileText,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { StoryProject } from '../types/novel';
import { countTotalChapters } from '../utils/manuscriptEngine';
import { countWords } from '../utils/promptBuilder';

interface ProjectModalProps {
  isOpen: boolean;
  projects: StoryProject[];
  activeProjectId: string;
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onCreateProject: (title: string) => void;
  onDuplicateProject?: (id: string) => void;
  onRenameProject: (id: string, title: string) => void;
  onDeleteProject: (id: string) => void;
  onExportFullJson: (project: StoryProject) => void;
  onExportMarkdown: (project: StoryProject) => void;
  onExportHtml: (project: StoryProject) => void;
  onImportFullProjectFile: (file: File) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  projects,
  activeProjectId,
  onClose,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onRenameProject,
  onDeleteProject,
  onExportFullJson,
  onExportMarkdown,
  onExportHtml,
  onImportFullProjectFile,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Quản lý tác phẩm & Sao lưu"
      data-testid="project-modal"
    >
      <div className="w-full max-w-2xl max-h-[88vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
              Quản lý Tác phẩm &amp; Xuất bản
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Sao lưu đầy đủ (.novel.json) giữ nguyên 3 tầng Cốt truyện, Quyển, Chương, Nhân vật &amp; Ký ức
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng quản lý tác phẩm"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Create / Import Bar */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tên tác phẩm mới..."
              className="flex-1 min-w-[180px] px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => {
                onCreateProject(newTitle.trim() || 'Tác phẩm mới');
                setNewTitle('');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo truyện mới</span>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".json,.novel.json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFullProjectFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập .novel.json</span>
            </button>
          </div>

          {/* Projects List */}
          <div className="space-y-2.5">
            {projects.map((p) => {
              const isActive = p.id === activeProjectId;
              const chaptersCount = countTotalChapters(p.acts);
              const words = countWords(p.storyText);

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
                    isActive
                      ? 'border-amber-400 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-stone-200 dark:border-slate-800 bg-stone-50/40 dark:bg-slate-950/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      type="text"
                      value={p.title}
                      onChange={(e) => onRenameProject(p.id, e.target.value)}
                      className="flex-1 min-w-[160px] text-sm font-semibold text-stone-900 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
                        {p.acts.length} quyển · {chaptersCount} chương · {words.toLocaleString('vi-VN')} từ
                      </span>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(p.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-stone-900 dark:bg-slate-800 text-white"
                        >
                          Mở
                        </button>
                      )}
                      {projects.length > 1 && (
                        confirmDeleteId === p.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteProject(p.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded-md text-xs bg-rose-600 text-white"
                          >
                            Xác nhận xóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            aria-label={`Xóa tác phẩm ${p.title}`}
                            className="p-1 text-stone-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onExportFullJson(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3 h-3" />
                      <span>Sao lưu .novel.json</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportMarkdown(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Xuất Markdown (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportHtml(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
                    >
                      <FileCode2 className="w-3 h-3" />
                      <span>Xuất Sách HTML</span>
                    </button>
                    {onDuplicateProject && (
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(p.id)}
                        data-testid={`duplicate-project-btn-${p.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Lưu thành tác phẩm mới</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
