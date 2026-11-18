import React, { useRef, useState } from 'react';
import { Check, Download, RotateCcw, Save, Upload, X } from 'lucide-react';
import {
  DEFAULT_SAMPLER_SETTINGS,
  PromptPreset,
  SamplerSettings,
} from '../types/novel';
import { parsePresetsJson } from '../utils/assetExchange';

interface SamplerSidebarProps {
  sampler: SamplerSettings;
  presets: PromptPreset[];
  activePresetId: string;
  onChange: (updated: SamplerSettings) => void;
  onSelectPreset: (presetId: string) => void;
  onSavePreset: (name: string) => void;
  onExportPreset: () => void;
  onImportPresets: (incoming: PromptPreset[], fileName: string) => void;
  onCloseMobile: () => void;
  embedded?: boolean;
}

interface SliderRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  id,
  label,
  value,
  min,
  max,
  step,
  hint,
  onChange,
}) => {
  const handleNumericChange = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-300">
          {label}
        </label>
        <input
          id={`${id}-num`}
          type="number"
          aria-label={`${label} numeric value`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleNumericChange(e.target.value)}
          className="w-20 rounded border border-white/[0.09] bg-[#13141c] px-2 py-1 text-right font-mono text-xs tabular-nums text-slate-200 focus:border-[#8aa2ff] focus:outline-none"
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-slider w-full"
      />
      {hint && <p className="text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
};

export const SamplerSidebar: React.FC<SamplerSidebarProps> = ({
  sampler,
  presets,
  activePresetId,
  onChange,
  onSelectPreset,
  onSavePreset,
  onExportPreset,
  onImportPresets,
  onCloseMobile,
  embedded = false,
}) => {
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState('');
  const [presetError, setPresetError] = useState<string | null>(null);
  const presetFileRef = useRef<HTMLInputElement>(null);

  const builtInPresets = presets.filter((p) => p.isBuiltIn);
  const customPresets = presets.filter((p) => !p.isBuiltIn);

  const handleConfirmSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = presetNameDraft.trim();
    if (!clean) return;
    onSavePreset(clean);
    setPresetNameDraft('');
    setIsSavingPreset(false);
    setPresetError(null);
  };

  const handlePresetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPresetError(null);
    try {
      const raw = await file.text();
      const incoming = parsePresetsJson(raw);
      onImportPresets(incoming, file.name);
    } catch (err) {
      setPresetError((err as Error).message || 'Không thể đọc tệp Preset JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const applyPreset = (preset: 'balanced' | 'creative' | 'precise') => {
    if (preset === 'balanced') {
      onChange({ ...sampler, temperature: 0.9, minP: 0.06, topP: 0.95, repetitionPenalty: 1.08 });
    } else if (preset === 'creative') {
      onChange({ ...sampler, temperature: 1.12, minP: 0.04, topP: 0.98, repetitionPenalty: 1.05 });
    } else {
      onChange({ ...sampler, temperature: 0.45, minP: 0.1, topP: 0.85, repetitionPenalty: 1.12 });
    }
  };

  return (
    <aside
      aria-label="Sampler and Generation Parameters"
      className={`flex h-full w-full flex-col bg-[#161822] ${
        embedded ? '' : 'border-r border-white/[0.07]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
        <h2 className="text-xs font-semibold tracking-wide text-slate-200">
          Sampler Parameters
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_SAMPLER_SETTINGS })}
            title="Reset sampler parameters to defaults"
            aria-label="Reset sampler parameters to defaults"
            className="flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
          {!embedded && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close sampler sidebar"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-3">
        {/* Prompt & Sampler Presets Switcher + IO */}
        <div className="space-y-2 rounded-md border border-[#8aa2ff]/25 bg-[#13141c] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="preset-select-sidebar"
              className="text-[11px] font-semibold text-slate-200"
            >
              Prompt &amp; Genre Preset
            </label>
            <span className="text-[10px] text-slate-500">
              {builtInPresets.length + customPresets.length} mẫu
            </span>
          </div>

          <select
            id="preset-select-sidebar"
            data-testid="preset-select-sidebar"
            value={activePresetId}
            onChange={(e) => {
              if (e.target.value) onSelectPreset(e.target.value);
            }}
            className="w-full rounded border border-white/[0.1] bg-[#161822] px-2 py-1.5 text-xs text-slate-100 focus:border-[#8aa2ff] focus:outline-none"
          >
            <option value="">-- Tùy chỉnh hiện tại (Custom) --</option>
            <optgroup label="Thể loại mặc định">
              {builtInPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            {customPresets.length > 0 && (
              <optgroup label="Preset đã lưu">
                {customPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              data-testid="save-preset-btn"
              onClick={() => {
                setPresetNameDraft('');
                setIsSavingPreset((v) => !v);
                setPresetError(null);
              }}
              className="flex h-7 items-center justify-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] text-[11px] font-medium text-slate-200 hover:bg-white/[0.08]"
            >
              <Save className="h-3 w-3 text-[#8aa2ff]" />
              <span>Save</span>
            </button>
            <button
              type="button"
              data-testid="import-preset-btn"
              onClick={() => presetFileRef.current?.click()}
              className="flex h-7 items-center justify-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] text-[11px] font-medium text-slate-200 hover:bg-white/[0.08]"
            >
              <Upload className="h-3 w-3" />
              <span>Import</span>
            </button>
            <button
              type="button"
              data-testid="export-preset-btn"
              onClick={onExportPreset}
              className="flex h-7 items-center justify-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] text-[11px] font-medium text-slate-200 hover:bg-white/[0.08]"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>
            <input
              ref={presetFileRef}
              data-testid="preset-import-input"
              type="file"
              accept=".json,application/json"
              onChange={handlePresetFileChange}
              className="hidden"
              aria-label="Import Prompt Preset JSON file"
            />
          </div>

          {isSavingPreset && (
            <form onSubmit={handleConfirmSavePreset} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                data-testid="new-preset-name-input"
                autoFocus
                required
                value={presetNameDraft}
                onChange={(e) => setPresetNameDraft(e.target.value)}
                placeholder="Tên preset mới..."
                className="min-w-0 flex-1 rounded border border-white/[0.12] bg-[#161822] px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
              <button
                type="submit"
                data-testid="confirm-save-preset-btn"
                aria-label="Confirm save preset"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#6d8cff] text-white hover:bg-[#5b7bf5]"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsSavingPreset(false)}
                aria-label="Cancel save preset"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/[0.07] hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          )}

          {presetError && (
            <p className="text-[11px] text-rose-300" role="alert">
              {presetError}
            </p>
          )}
        </div>

        {/* Quick Presets */}
        <div className="space-y-1">
          <span className="block text-[11px] font-medium text-slate-400">
            Tone Presets
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-white/[0.08] bg-[#13141c] p-1">
            <button
              type="button"
              onClick={() => applyPreset('balanced')}
              className="rounded py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => applyPreset('creative')}
              className="rounded py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Vivid
            </button>
            <button
              type="button"
              onClick={() => applyPreset('precise')}
              className="rounded py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Focused
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-3 space-y-3">
          <SliderRow
            id="sampler-max-tokens"
            label="Max Output Tokens"
            value={sampler.maxTokens}
            min={50}
            max={4100}
            step={10}
            onChange={(val) => onChange({ ...sampler, maxTokens: Math.round(val) })}
          />

          <SliderRow
            id="sampler-context-budget"
            label="Context Budget (Chars)"
            value={sampler.contextBudgetChars}
            min={2000}
            max={64000}
            step={500}
            hint="Trims oldest story paragraphs while keeping Memory, active Lorebook, and Author's Note."
            onChange={(val) => onChange({ ...sampler, contextBudgetChars: Math.round(val) })}
          />
        </div>

        <div className="border-t border-white/[0.06] pt-3 space-y-3">
          <SliderRow
            id="sampler-temperature"
            label="Temperature"
            value={sampler.temperature}
            min={0.0}
            max={2.0}
            step={0.01}
            onChange={(val) => onChange({ ...sampler, temperature: Number(val.toFixed(2)) })}
          />

          <SliderRow
            id="sampler-min-p"
            label="Min P"
            value={sampler.minP}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={(val) => onChange({ ...sampler, minP: Number(val.toFixed(2)) })}
          />

          <SliderRow
            id="sampler-top-p"
            label="Top P"
            value={sampler.topP}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={(val) => onChange({ ...sampler, topP: Number(val.toFixed(2)) })}
          />
        </div>

        <div className="border-t border-white/[0.06] pt-3 space-y-3">
          <SliderRow
            id="sampler-rep-penalty"
            label="Repetition Penalty"
            value={sampler.repetitionPenalty}
            min={1.0}
            max={1.5}
            step={0.01}
            onChange={(val) => onChange({ ...sampler, repetitionPenalty: Number(val.toFixed(2)) })}
          />

          <SliderRow
            id="sampler-presence-penalty"
            label="Presence Penalty"
            value={sampler.presencePenalty}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={(val) => onChange({ ...sampler, presencePenalty: Number(val.toFixed(2)) })}
          />

          <SliderRow
            id="sampler-frequency-penalty"
            label="Frequency Penalty"
            value={sampler.frequencyPenalty}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={(val) => onChange({ ...sampler, frequencyPenalty: Number(val.toFixed(2)) })}
          />
        </div>

        <div className="border-t border-white/[0.06] pt-3 space-y-3">
          <span className="block text-[11px] font-medium text-slate-400">
            Anti-Repetition (llama.cpp DRY)
          </span>
          <SliderRow
            id="sampler-dry-multiplier"
            label="DRY Multiplier"
            value={sampler.dryMultiplier ?? 0.8}
            min={0.0}
            max={2.0}
            step={0.05}
            onChange={(val) => onChange({ ...sampler, dryMultiplier: Number(val.toFixed(2)) })}
          />

          <SliderRow
            id="sampler-dry-base"
            label="DRY Base"
            value={sampler.dryBase ?? 1.75}
            min={1.0}
            max={3.0}
            step={0.05}
            onChange={(val) => onChange({ ...sampler, dryBase: Number(val.toFixed(2)) })}
          />

          <SliderRow
            id="sampler-dry-allowed-length"
            label="DRY Allowed Length"
            value={sampler.dryAllowedLength ?? 2}
            min={1}
            max={10}
            step={1}
            onChange={(val) => onChange({ ...sampler, dryAllowedLength: Math.round(val) })}
          />
        </div>

        <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
          <label htmlFor="sampler-stop-sequences" className="block text-xs font-medium text-slate-300">
            Stop Sequences
          </label>
          <input
            id="sampler-stop-sequences"
            type="text"
            value={sampler.stopSequences}
            onChange={(e) => onChange({ ...sampler, stopSequences: e.target.value })}
            placeholder="###, END, \n---"
            className="w-full rounded-md border border-white/[0.09] bg-[#13141c] px-2.5 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
          />
          <p className="text-[11px] text-slate-500">
            Comma-separated strings where generation halts.
          </p>
        </div>
      </div>
    </aside>
  );
};
