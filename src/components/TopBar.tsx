import React from 'react';
import {
  BookOpen,
  Compass,
  Download,
  Eye,
  FolderOpen,
  Menu,
  Moon,
  PanelRight,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { ApiSettings } from '../types/novel';
import { resolveApiProfile } from '../utils/apiClient';

interface TopBarProps {
  projectTitle: string;
  apiSettings: ApiSettings;
  darkMode: boolean;
  hasBackupWarning: boolean;
  onToggleDarkMode: () => void;
  onOpenProjects: () => void;
  onOpenMasterPlot: () => void;
  onOpenSearch: () => void;
  onOpenPromptInspector: () => void;
  onOpenApiSettings: () => void;
  onExportQuickBackup: () => void;
  onToggleMobileLeft: () => void;
  onToggleMobileRight: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle,
  apiSettings,
  darkMode,
  hasBackupWarning,
  onToggleDarkMode,
  onOpenProjects,
  onOpenMasterPlot,
  onOpenSearch,
  onOpenPromptInspector,
  onOpenApiSettings,
  onExportQuickBackup,
  onToggleMobileLeft,
  onToggleMobileRight,
}) => {
  const proseModel = apiSettings.model.trim() || 'chưa chọn';
  const archProfile = resolveApiProfile(apiSettings, 'architect');
  const archModel = archProfile.model.trim() || 'chưa chọn';
  const dualActive = Boolean(apiSettings.useSeparateArchitectApi);

  return (
    <header className="h-13 shrink-0 border-b border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-2.5 sm:px-3 lg:px-4 flex items-center justify-between gap-2 sm:gap-3">
      {/* Zone 1: Brand + Mobile Left Drawer + Project Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileLeft}
          aria-label="Mở mục lục bản thảo"
          className="lg:hidden p-1.5 sm:p-2 rounded-lg text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline font-semibold text-sm tracking-tight text-stone-900 dark:text-slate-100 whitespace-nowrap">
            Quill &amp; Loom
          </span>
        </div>

        <span className="hidden sm:inline text-stone-300 dark:text-slate-700" aria-hidden="true">
          /
        </span>

        <button
          type="button"
          onClick={onOpenProjects}
          data-testid="project-switcher-btn"
          title="Quản lý & chuyển tác phẩm"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors max-w-[180px] truncate"
        >
          <FolderOpen className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 shrink-0" />
          <span className="truncate">{projectTitle || 'Untitled Novel'}</span>
        </button>
      </div>

      {/* Zone 2: Core Studio Navigation Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={onOpenMasterPlot}
          data-testid="master-plot-btn"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap shrink-0"
        >
          <Compass className="w-3.5 h-3.5 shrink-0" />
          <span className="sm:hidden">Cốt truyện</span>
          <span className="hidden sm:inline">Cốt truyện chính</span>
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          data-testid="global-search-btn"
          aria-label="Tìm kiếm toàn bản thảo"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Tìm &amp; Thay</span>
        </button>

        <button
          type="button"
          onClick={onOpenPromptInspector}
          data-testid="prompt-inspector-btn"
          aria-label="Kiểm tra Prompt"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">Prompt</span>
        </button>

        <button
          type="button"
          onClick={onExportQuickBackup}
          data-testid="quick-backup-btn"
          title="Sao lưu toàn bộ tác phẩm (.novel.json)"
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            hasBackupWarning
              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
          }`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">{hasBackupWarning ? 'Nên sao lưu' : 'Sao lưu'}</span>
        </button>
      </div>

      {/* Zone 3: Dual-API Status Pill + API Settings + Theme + Mobile Right Drawer */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenApiSettings}
          data-testid="api-settings-btn"
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/80 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          title="Cấu hình Dual-API Prose & Architect"
        >
          <Settings className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 shrink-0" />
          <span className="hidden xl:inline font-mono-tabular text-[11px] max-w-[230px] truncate" data-testid="dual-api-status">
            {dualActive ? `Prose: ${proseModel} · Arch: ${archModel}` : `API: ${proseModel}`}
          </span>
          <span className="xl:hidden">API</span>
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="p-2 rounded-lg text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleMobileRight}
          aria-label="Mở bảng nhân vật, cố vấn và thế giới"
          className="lg:hidden p-2 rounded-lg text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
