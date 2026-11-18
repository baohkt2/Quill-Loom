import React from 'react';
import { X } from 'lucide-react';
import { ApiSettings } from '../types/novel';
import { resolveApiProfile } from '../utils/apiClient';
import { ContextBuildResult } from '../utils/promptBuilder';

interface PromptInspectorModalProps {
  isOpen: boolean;
  contextResult: ContextBuildResult;
  apiSettings: ApiSettings;
  totalMasterPlotBlocks: number;
  onClose: () => void;
}

export const PromptInspectorModal: React.FC<PromptInspectorModalProps> = ({
  isOpen,
  contextResult,
  apiSettings,
  totalMasterPlotBlocks,
  onClose,
}) => {
  if (!isOpen) return null;

  const archProfile = resolveApiProfile(apiSettings, 'architect');
  const { tokenBreakdown } = contextResult;
  const proseIncludedCount = contextResult.prosePlotBlocksIncluded.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Prompt Inspector"
      data-testid="prompt-inspector-modal"
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
              Kiểm tra Prompt gửi sang Prose Engine
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Prose: {apiSettings.model || 'default'} ({apiSettings.mode}) · Architect:{' '}
              {apiSettings.useSeparateArchitectApi
                ? `${archProfile.model || 'default'} (tách riêng)`
                : 'dùng chung endpoint'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Prompt Inspector"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Smart Context Routing Summary */}
          <div
            data-testid="smart-routing-summary"
            className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-stone-800 dark:text-slate-200 flex flex-wrap items-center justify-between gap-2"
          >
            <span>
              <strong>Smart Context Routing:</strong> {proseIncludedCount} / {totalMasterPlotBlocks} khối Cốt truyện chính được đưa vào Prose Context (các khối Architect-only được lọc bỏ để tránh lộ trước &amp; tiết kiệm token).
            </span>
            <span className="font-mono-tabular text-amber-800 dark:text-amber-300">
              {tokenBreakdown.totalTokens.toLocaleString('vi-VN')} /{' '}
              {tokenBreakdown.maxContextTokens.toLocaleString('vi-VN')} tok
            </span>
          </div>

          {/* Token Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-tabular">
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800">
              <div className="text-stone-500 dark:text-slate-400">Style &amp; Premise</div>
              <div className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5">
                {tokenBreakdown.systemAndPersonaTokens} tok
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800">
              <div className="text-stone-500 dark:text-slate-400">Memory &amp; Summaries</div>
              <div className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5">
                {tokenBreakdown.memoryAndSummariesTokens} tok
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800">
              <div className="text-stone-500 dark:text-slate-400">Characters &amp; Lore</div>
              <div className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5">
                {tokenBreakdown.charactersAndLoreTokens} tok
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-800">
              <div className="text-stone-500 dark:text-slate-400">Chapter &amp; Beats</div>
              <div className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5">
                {tokenBreakdown.recentStoryTokens} tok
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {contextResult.chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="px-3.5 py-2 bg-stone-100 dark:bg-slate-800/80 text-xs font-semibold text-stone-700 dark:text-slate-200 uppercase">
                  role: {msg.role}
                </div>
                <pre className="p-3.5 text-xs text-stone-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans">
                  {msg.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
