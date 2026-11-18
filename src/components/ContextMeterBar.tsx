import React from 'react';
import { Eye } from 'lucide-react';
import { TokenBudgetBreakdown } from '../utils/promptBuilder';

interface ContextMeterBarProps {
  breakdown: TokenBudgetBreakdown;
  isLightCanvas: boolean;
  onOpenPromptInspector: () => void;
}

export const ContextMeterBar: React.FC<ContextMeterBarProps> = ({
  breakdown,
  isLightCanvas,
  onOpenPromptInspector,
}) => {
  const maxTokens = Math.max(1, breakdown.maxContextTokens);
  const pct = (tokens: number) => Math.min(100, (tokens / maxTokens) * 100);

  const sysPct = pct(breakdown.systemAndPersonaTokens);
  const memPct = pct(breakdown.memoryAndSummariesTokens);
  const charPct = pct(breakdown.charactersAndLoreTokens);
  const storyPct = pct(breakdown.recentStoryTokens);
  const totalPct = Math.min(100, Math.round((breakdown.totalTokens / maxTokens) * 100));

  return (
    <div
      data-testid="context-meter-bar"
      className={`shrink-0 border-b px-3 py-1.5 sm:px-6 sm:py-2 ${
        isLightCanvas
          ? 'border-stone-900/10 bg-stone-100/75 text-stone-700'
          : 'border-white/[0.06] bg-[#161822]/75 text-slate-300'
      }`}
    >
      <div className="mx-auto flex max-w-[82ch] flex-col gap-1 sm:gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span className="truncate font-mono font-semibold">
              {breakdown.totalTokens.toLocaleString()} / {breakdown.maxContextTokens.toLocaleString()} tok
              <span className={isLightCanvas ? 'ml-1.5 text-stone-500' : 'ml-1.5 text-slate-500'}>
                ({totalPct}%)
              </span>
            </span>

            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-2 w-2 rounded-xs bg-[#6d8cff]" aria-hidden="true" />
              <span>System {breakdown.systemAndPersonaTokens}</span>
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-2 w-2 rounded-xs bg-emerald-500" aria-hidden="true" />
              <span>Memory {breakdown.memoryAndSummariesTokens}</span>
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-2 w-2 rounded-xs bg-amber-400" aria-hidden="true" />
              <span>Cast &amp; Lore {breakdown.charactersAndLoreTokens}</span>
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-2 w-2 rounded-xs bg-sky-400" aria-hidden="true" />
              <span>Story {breakdown.recentStoryTokens}</span>
            </span>
          </div>

          <button
            type="button"
            data-testid="inspect-prompt-btn"
            onClick={onOpenPromptInspector}
            aria-label="Inspect raw prompt payload"
            className={`flex h-7 items-center gap-1.5 rounded border px-2 sm:px-2.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
              isLightCanvas
                ? 'border-stone-900/15 bg-white text-stone-700 hover:bg-stone-50'
                : 'border-white/[0.1] bg-white/[0.04] text-slate-200 hover:bg-white/[0.09]'
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-[#8aa2ff]" />
            <span className="sm:hidden">Prompt</span>
            <span className="hidden sm:inline">Inspect Prompt</span>
          </button>
        </div>

        {/* Multi-segment visual meter bar */}
        <div
          role="progressbar"
          aria-label="Context token budget usage"
          aria-valuenow={breakdown.totalTokens}
          aria-valuemin={0}
          aria-valuemax={breakdown.maxContextTokens}
          className={`flex h-1.5 w-full overflow-hidden rounded-full ${
            isLightCanvas ? 'bg-stone-900/10' : 'bg-white/[0.07]'
          }`}
        >
          {sysPct > 0 && (
            <div
              style={{ width: `${sysPct}%` }}
              title={`System & Persona: ~${breakdown.systemAndPersonaTokens} tok`}
              className="h-full bg-[#6d8cff] transition-[width] duration-150"
            />
          )}
          {memPct > 0 && (
            <div
              style={{ width: `${memPct}%` }}
              title={`Memory & Summaries: ~${breakdown.memoryAndSummariesTokens} tok`}
              className="h-full bg-emerald-500 transition-[width] duration-150"
            />
          )}
          {charPct > 0 && (
            <div
              style={{ width: `${charPct}%` }}
              title={`Active Characters & Lorebook: ~${breakdown.charactersAndLoreTokens} tok`}
              className="h-full bg-amber-400 transition-[width] duration-150"
            />
          )}
          {storyPct > 0 && (
            <div
              style={{ width: `${storyPct}%` }}
              title={`Recent Story & Beats: ~${breakdown.recentStoryTokens} tok`}
              className="h-full bg-sky-400 transition-[width] duration-150"
            />
          )}
        </div>
      </div>
    </div>
  );
};
