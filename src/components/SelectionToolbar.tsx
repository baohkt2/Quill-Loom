import React, { useState } from 'react';
import {
  Check,
  CornerDownLeft,
  Expand,
  Loader2,
  Minimize2,
  PenLine,
  Send,
  Square,
  X,
} from 'lucide-react';
import { InlineRewriteAction } from '../utils/apiClient';

interface SelectionToolbarProps {
  top: number;
  left: number;
  selectedText: string;
  isRewriting: boolean;
  rewrittenText: string;
  rewriteError: string | null;
  hasResult: boolean;
  onRunRewrite: (action: InlineRewriteAction, customPrompt?: string) => void;
  onStopRewrite: () => void;
  onReplaceOriginal: () => void;
  onInsertBelow: () => void;
  onDiscard: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  top,
  left,
  selectedText,
  isRewriting,
  rewrittenText,
  rewriteError,
  hasResult,
  onRunRewrite,
  onStopRewrite,
  onReplaceOriginal,
  onInsertBelow,
  onDiscard,
}) => {
  const [customInstruction, setCustomInstruction] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInstruction.trim() || isRewriting) return;
    onRunRewrite('custom', customInstruction.trim());
  };

  return (
    <div
      data-testid="selection-toolbar"
      style={{ top: `${top}px`, left: `${left}px` }}
      onMouseDown={(e) => {
        // Keep textarea selection intact when clicking action buttons unless focusing custom input
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
        }
      }}
      className="absolute z-30 w-[min(460px,calc(100%-2rem))] rounded-lg border border-white/[0.14] bg-[#181a24]/98 p-2 shadow-2xl backdrop-blur-md"
    >
      {/* Quick AI Action Row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={isRewriting}
          onClick={() => onRunRewrite('polish')}
          className="flex h-8 sm:h-7 items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-[#8aa2ff]/45 hover:bg-[#6d8cff]/18 hover:text-white disabled:opacity-50 whitespace-nowrap"
        >
          <PenLine className="h-3 w-3 text-[#8aa2ff]" />
          <span>Viết lại văn phong</span>
        </button>

        <button
          type="button"
          disabled={isRewriting}
          onClick={() => onRunRewrite('expand')}
          className="flex h-8 sm:h-7 items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-[#8aa2ff]/45 hover:bg-[#6d8cff]/18 hover:text-white disabled:opacity-50 whitespace-nowrap"
        >
          <Expand className="h-3 w-3 text-emerald-400" />
          <span>Mở rộng miêu tả</span>
        </button>

        <button
          type="button"
          disabled={isRewriting}
          onClick={() => onRunRewrite('condense')}
          className="flex h-8 sm:h-7 items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-[#8aa2ff]/45 hover:bg-[#6d8cff]/18 hover:text-white disabled:opacity-50 whitespace-nowrap"
        >
          <Minimize2 className="h-3 w-3 text-amber-300" />
          <span>Rút gọn</span>
        </button>

        <button
          type="button"
          onClick={onDiscard}
          aria-label="Close selection toolbar"
          className="ml-auto flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.08] hover:text-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Custom Inline Instruction Input */}
      <form onSubmit={handleCustomSubmit} className="mt-1.5 flex items-center gap-1.5">
        <input
          type="text"
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          placeholder='Yêu cầu riêng (vd: "Đổi giọng điệu lạnh lùng hơn")...'
          aria-label="Custom edit instruction"
          className="min-w-0 flex-1 rounded border border-white/[0.1] bg-[#13141c] px-2.5 py-1.5 sm:py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
        />
        {isRewriting ? (
          <button
            type="button"
            onClick={onStopRewrite}
            className="flex h-8 sm:h-7 shrink-0 items-center gap-1 rounded bg-rose-600 px-2.5 text-[11px] font-medium text-white hover:bg-rose-500 whitespace-nowrap"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Dừng</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!customInstruction.trim()}
            aria-label="Run custom edit"
            className="flex h-8 sm:h-7 shrink-0 items-center gap-1 rounded bg-[#5e7cf2] px-2.5 text-[11px] font-medium text-white hover:bg-[#4e6ce4] disabled:opacity-45 whitespace-nowrap"
          >
            <Send className="h-3 w-3" />
            <span>Áp dụng</span>
          </button>
        )}
      </form>

      {/* Error Message */}
      {rewriteError && (
        <div
          role="alert"
          className="mt-2 rounded border border-rose-500/35 bg-rose-950/50 px-2.5 py-1.5 text-[11px] text-rose-200"
        >
          {rewriteError}
        </div>
      )}

      {/* Streaming Diff / Preview Card */}
      {(isRewriting || hasResult) && (
        <div
          data-testid="selection-preview-card"
          className="mt-2 space-y-2 rounded-md border border-white/[0.09] bg-[#13141c] p-2.5"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Bản gốc</span>
              <span className="font-mono tabular-nums">{selectedText.length} ch</span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400 line-through decoration-slate-600">
              {selectedText}
            </p>
          </div>

          <div className="space-y-1 border-t border-white/[0.06] pt-2">
            <div className="flex items-center justify-between text-[10px] font-medium text-[#a5b8ff]">
              <span className="flex items-center gap-1.5">
                {isRewriting && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Đề xuất chỉnh sửa</span>
              </span>
              <span className="font-mono tabular-nums">{rewrittenText.length} ch</span>
            </div>
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-100">
              {rewrittenText || (isRewriting ? 'Đang khởi tạo...' : '')}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-white/[0.06] pt-2">
            <button
              type="button"
              onClick={onDiscard}
              className="flex h-8 sm:h-7 items-center gap-1 rounded border border-white/[0.09] px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.06] whitespace-nowrap"
            >
              <span>Discard</span>
            </button>
            <button
              type="button"
              disabled={isRewriting || !rewrittenText.trim()}
              onClick={onInsertBelow}
              className="flex h-8 sm:h-7 items-center gap-1 rounded border border-[#8aa2ff]/35 bg-[#6d8cff]/15 px-2.5 text-[11px] font-medium text-[#dbe4ff] hover:bg-[#6d8cff]/25 disabled:opacity-45 whitespace-nowrap"
            >
              <CornerDownLeft className="h-3 w-3" />
              <span>Chèn dưới (Insert Below)</span>
            </button>
            <button
              type="button"
              disabled={isRewriting || !rewrittenText.trim()}
              onClick={onReplaceOriginal}
              className="flex h-8 sm:h-7 items-center gap-1 rounded bg-[#5e7cf2] px-2.5 text-[11px] font-semibold text-white hover:bg-[#4e6ce4] disabled:opacity-45 whitespace-nowrap"
            >
              <Check className="h-3 w-3" />
              <span>Thay thế (Replace)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
