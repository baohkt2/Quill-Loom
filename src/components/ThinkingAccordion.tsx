import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ThinkingAccordionProps {
  thinking?: string;
  isStreaming?: boolean;
  isLightCanvas?: boolean;
  defaultExpanded?: boolean;
  label?: string;
  testId?: string;
}

export const ThinkingAccordion: React.FC<ThinkingAccordionProps> = ({
  thinking = '',
  isStreaming = false,
  isLightCanvas = false,
  defaultExpanded = false,
  label = 'Quá trình suy luận (Thinking)',
  testId = 'thinking-accordion',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasContent = thinking.trim().length > 0;

  if (!hasContent && !isStreaming) {
    return null;
  }

  return (
    <div
      data-testid={testId}
      className={`rounded-md border text-[11px] transition-colors ${
        isLightCanvas
          ? 'border-stone-900/12 bg-stone-900/[0.035] text-stone-700'
          : 'border-indigo-400/20 bg-indigo-950/20 text-slate-300'
      }`}
    >
      <button
        type="button"
        data-testid={`${testId}-toggle`}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left font-medium transition-colors ${
          isLightCanvas
            ? 'text-stone-700 hover:bg-stone-900/[0.04]'
            : 'text-indigo-200/90 hover:bg-white/[0.03]'
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {isStreaming ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-400" />
          ) : (
            <Brain className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
          )}
          <span className="truncate">{label}</span>
          {isStreaming && (
            <span className="shrink-0 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-normal text-indigo-300">
              Đang suy luận...
            </span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] opacity-75">
          {hasContent && <span>{thinking.trim().length.toLocaleString()} ch</span>}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {expanded && (
        <div
          data-testid={`${testId}-body`}
          className={`border-t px-2.5 py-2 ${
            isLightCanvas ? 'border-stone-900/10' : 'border-indigo-400/15'
          }`}
        >
          {hasContent ? (
            <pre
              className={`max-h-52 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed ${
                isLightCanvas ? 'text-stone-600' : 'text-slate-300/90'
              }`}
            >
              {thinking.trim()}
            </pre>
          ) : (
            <p className="italic opacity-70">Đang khởi tạo luồng suy luận...</p>
          )}
        </div>
      )}
    </div>
  );
};
