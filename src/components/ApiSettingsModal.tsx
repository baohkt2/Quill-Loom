import React, { useEffect, useState } from 'react';
import { Brain, Cpu, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';
import {
  ApiSettings,
  DEFAULT_ARCHITECT_API_SETTINGS,
  ThinkingModePreference,
  UsageStats,
} from '../types/novel';
import { fetchAvailableModels } from '../utils/apiClient';

interface ApiSettingsModalProps {
  isOpen: boolean;
  settings: ApiSettings;
  usageStats: UsageStats;
  onClose: () => void;
  onSave: (next: ApiSettings) => void;
  onResetUsageStats: (scope: 'session' | 'all') => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  settings,
  usageStats,
  onClose,
  onSave,
  onResetUsageStats,
}) => {
  const [draft, setDraft] = useState<ApiSettings>(settings);
  const [fetchingProse, setFetchingProse] = useState(false);
  const [fetchingArch, setFetchingArch] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft({
        ...settings,
        architectApi: {
          ...DEFAULT_ARCHITECT_API_SETTINGS,
          ...(settings.architectApi ?? {}),
        },
      });
      setFetchError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleFetchProseModels = async () => {
    setFetchingProse(true);
    setFetchError(null);
    try {
      const models = await fetchAvailableModels(draft.baseUrl, draft.apiKey);
      setDraft((prev) => ({
        ...prev,
        availableModels: models,
        model: prev.model || models[0] || '',
      }));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingProse(false);
    }
  };

  const handleFetchArchModels = async () => {
    setFetchingArch(true);
    setFetchError(null);
    try {
      const models = await fetchAvailableModels(
        draft.architectApi.baseUrl,
        draft.architectApi.apiKey
      );
      setDraft((prev) => ({
        ...prev,
        architectApi: {
          ...prev.architectApi,
          availableModels: models,
          model: prev.architectApi.model || models[0] || '',
        },
      }));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingArch(false);
    }
  };

  const thinkingOptions: Array<{ value: ThinkingModePreference; label: string; desc: string }> = [
    {
      value: 'auto',
      label: 'Tự động (Khuyên dùng)',
      desc: 'Thinking ON cho Dàn ý, Agent, Chốt chương & Architect; Thinking OFF cho viết văn xuôi.',
    },
    { value: 'on', label: 'Luôn bật Thinking ON', desc: 'Ép mọi tác vụ dùng max_tokens >= 3500.' },
    { value: 'off', label: 'Tắt Thinking OFF', desc: 'Tắt suy luận để tối ưu tốc độ phản hồi.' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Cấu hình Dual-API & Thinking"
      data-testid="api-settings-modal"
    >
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
              Cấu hình API &amp; Dual-Profile Routing
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Tách biệt Prose Engine (viết văn xuôi) và Architect API (cốt truyện, dàn ý, đồng bộ)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cấu hình API"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {fetchError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200">
              {fetchError}
            </div>
          )}

          {/* Profile 1: Prose Engine */}
          <section className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                1. Prose Engine (Viết văn xuôi &amp; Viết lại đoạn)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Endpoint Base URL
                </label>
                <input
                  type="text"
                  value={draft.baseUrl}
                  onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                  data-testid="prose-base-url-input"
                  placeholder="http://localhost:8080/v1"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  API Key (tùy chọn cho local)
                </label>
                <input
                  type="password"
                  value={draft.apiKey}
                  onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-700 dark:text-slate-300">
                    Prose Model ID
                  </label>
                  <button
                    type="button"
                    disabled={fetchingProse}
                    onClick={handleFetchProseModels}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    {fetchingProse ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>Tải Models</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  data-testid="prose-model-input"
                  list="prose-models-list"
                  placeholder="vd: qwen2.5-14b-instruct"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
                <datalist id="prose-models-list">
                  {draft.availableModels.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Fallback Model ID (tự thử lại khi 429/502/503)
                </label>
                <input
                  type="text"
                  value={draft.fallbackModel}
                  onChange={(e) => setDraft({ ...draft, fallbackModel: e.target.value })}
                  placeholder="vd: google/gemini-2.0-flash-001"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  API Mode
                </label>
                <select
                  value={draft.mode}
                  onChange={(e) =>
                    setDraft({ ...draft, mode: e.target.value as 'chat' | 'completions' })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="chat">Chat Completions</option>
                  <option value="completions">Text Completions</option>
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.useAssistantPrefill}
                    onChange={(e) =>
                      setDraft({ ...draft, useAssistantPrefill: e.target.checked })
                    }
                    className="accent-amber-600"
                  />
                  <span>Assistant Prefill</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Input $/1M tok
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={draft.inputPricePerMillion}
                  onChange={(e) =>
                    setDraft({ ...draft, inputPricePerMillion: Number(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Output $/1M tok
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={draft.outputPricePerMillion}
                  onChange={(e) =>
                    setDraft({ ...draft, outputPricePerMillion: Number(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                />
              </div>
            </div>
          </section>

          {/* Toggle Dual-Profile */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3">
            <div>
              <label
                htmlFor="separate-architect-toggle"
                className="text-sm font-medium text-stone-900 dark:text-slate-100 cursor-pointer"
              >
                Use separate API for Plotting &amp; Analysis
              </label>
              <p className="text-xs text-stone-600 dark:text-slate-400">
                Dùng model riêng (ví dụ OpenRouter / Gemini / DeepSeek R1) cho Lập dàn ý, Cốt truyện chính, Agent &amp; Chốt chương
              </p>
            </div>
            <input
              id="separate-architect-toggle"
              type="checkbox"
              data-testid="separate-architect-api-toggle"
              checked={draft.useSeparateArchitectApi}
              onChange={(e) =>
                setDraft({ ...draft, useSeparateArchitectApi: e.target.checked })
              }
              className="w-4 h-4 accent-amber-600 cursor-pointer shrink-0"
            />
          </div>

          {/* Profile 2: Architect API */}
          {draft.useSeparateArchitectApi && (
            <section
              data-testid="architect-api-section"
              className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-950/40 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                    2. Architect API (Cốt truyện, Dàn ý &amp; Sync)
                  </h3>
                </div>
                <span className="text-[11px] text-stone-500 dark:text-slate-400">
                  Luôn dùng Chat Mode (không prefill)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Architect Base URL
                  </label>
                  <input
                    type="text"
                    value={draft.architectApi.baseUrl}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        architectApi: { ...draft.architectApi, baseUrl: e.target.value },
                      })
                    }
                    data-testid="architect-base-url-input"
                    placeholder="https://openrouter.ai/api/v1"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Architect API Key
                  </label>
                  <input
                    type="password"
                    value={draft.architectApi.apiKey}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        architectApi: { ...draft.architectApi, apiKey: e.target.value },
                      })
                    }
                    placeholder="sk-or-..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-700 dark:text-slate-300">
                      Architect Model ID
                    </label>
                    <button
                      type="button"
                      disabled={fetchingArch}
                      onClick={handleFetchArchModels}
                      data-testid="fetch-architect-models-btn"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      {fetchingArch ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Tải Models</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={draft.architectApi.model}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        architectApi: { ...draft.architectApi, model: e.target.value },
                      })
                    }
                    data-testid="architect-model-input"
                    list="architect-models-list"
                    placeholder="vd: deepseek/deepseek-r1"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                  />
                  <datalist id="architect-models-list">
                    {draft.architectApi.availableModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Architect Fallback Model ID
                  </label>
                  <input
                    type="text"
                    value={draft.architectApi.fallbackModel}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        architectApi: { ...draft.architectApi, fallbackModel: e.target.value },
                      })
                    }
                    placeholder="tùy chọn"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Architect Input $/1M tok
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={draft.architectApi.inputPricePerMillion}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        architectApi: {
                          ...draft.architectApi,
                          inputPricePerMillion: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                    Architect Output $/1M tok
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={draft.architectApi.outputPricePerMillion}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        architectApi: {
                          ...draft.architectApi,
                          outputPricePerMillion: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Dual-Mode Thinking Override */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
              Chế độ Suy luận (Dual-Mode Thinking Orchestrator)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {thinkingOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft({ ...draft, thinkingPreference: opt.value })}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    draft.thinkingPreference === opt.value
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
                      : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-xs font-semibold text-stone-900 dark:text-slate-100">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Real Usage Cost Tracker */}
          <section className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-700 dark:text-slate-300 space-y-0.5 font-mono-tabular">
              <div>
                Phiên hiện tại: {(usageStats.sessionPromptTokens + usageStats.sessionCompletionTokens).toLocaleString('vi-VN')} tok · ${usageStats.sessionCostUsd.toFixed(4)}
              </div>
              <div className="text-stone-500 dark:text-slate-400">
                Tổng tích lũy ({usageStats.totalCalls} lượt): {(usageStats.promptTokens + usageStats.completionTokens).toLocaleString('vi-VN')} tok · ${usageStats.estimatedCostUsd.toFixed(4)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onResetUsageStats('session')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset phiên</span>
              </button>
              <button
                type="button"
                onClick={() => onResetUsageStats('all')}
                className="px-2.5 py-1 rounded-md text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                Xóa tất cả
              </button>
            </div>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-stone-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            data-testid="save-api-settings-btn"
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-stone-900 dark:bg-amber-600 text-white hover:opacity-90"
          >
            Lưu cấu hình API
          </button>
        </div>
      </div>
    </div>
  );
};
