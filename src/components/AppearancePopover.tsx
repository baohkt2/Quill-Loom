import React from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  Check,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  DEFAULT_EDITOR_PREFERENCES,
  EditorPageWidth,
  EditorPreferences,
  EditorTextAlign,
} from '../types/novel';
import { NOVEL_FONTS, NOVEL_THEMES } from '../utils/editorThemes';

interface AppearancePopoverProps {
  isOpen: boolean;
  prefs: EditorPreferences;
  onChange: (prefs: EditorPreferences) => void;
  onClose: () => void;
}

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({
  isOpen,
  prefs,
  onChange,
  onClose,
}) => {
  if (!isOpen) return null;

  const alignOptions: Array<{
    value: EditorTextAlign;
    label: string;
    icon: React.ReactNode;
  }> = [
    { value: 'left', label: 'Trái', icon: <AlignLeft className="h-3.5 w-3.5" /> },
    { value: 'justify', label: 'Đều', icon: <AlignJustify className="h-3.5 w-3.5" /> },
    { value: 'center', label: 'Giữa', icon: <AlignCenter className="h-3.5 w-3.5" /> },
  ];

  const widthOptions: Array<{ value: EditorPageWidth; label: string }> = [
    { value: 'narrow', label: 'Hẹp' },
    { value: 'book', label: 'Sách' },
    { value: 'wide', label: 'Rộng' },
    { value: 'full', label: 'Đầy' },
  ];

  return (
    <>
      {/* Transparent click-away layer so the canvas remains clearly visible while tuning */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Novel Appearance Settings"
        className="fixed top-14 right-3 z-50 max-h-[calc(100dvh-4.5rem)] w-[calc(100vw-1.5rem)] max-w-[360px] overflow-y-auto rounded-lg border border-white/[0.12] bg-[#181a24] p-4 shadow-2xl sm:right-4"
      >
        <div className="mb-3.5 flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <h2 className="text-sm font-semibold text-slate-100">
            Giao diện đọc &amp; viết Novel
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_EDITOR_PREFERENCES })}
              aria-label="Reset appearance to defaults"
              className="flex h-9 sm:h-7 items-center gap-1 rounded px-2.5 sm:px-2 text-[11px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Mặc định</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close appearance settings"
              className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Theme / Background Color Presets */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-300">
              Màu nền &amp; Chủ đề
            </span>
            <div className="grid grid-cols-3 gap-2">
              {NOVEL_THEMES.map((theme) => {
                const selected = prefs.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...prefs,
                        themeId: theme.id,
                        backgroundColor: theme.backgroundColor,
                        textColor: theme.textColor,
                      })
                    }
                    className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${
                      selected
                        ? 'border-[#8aa2ff] ring-1 ring-[#8aa2ff]/40'
                        : 'border-white/[0.1] hover:border-white/[0.25]'
                    }`}
                    style={{
                      backgroundColor: theme.backgroundColor,
                      color: theme.textColor,
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-serif text-sm font-semibold">Aa</span>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <span className="mt-1 w-full truncate text-[10px] font-medium opacity-85">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Background & Text Color Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-white/[0.09] bg-[#13141c] px-2.5 py-1.5 text-xs text-slate-300">
                <span>Màu nền</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-slate-400">
                    {prefs.backgroundColor}
                  </span>
                  <input
                    type="color"
                    aria-label="Custom background color"
                    value={prefs.backgroundColor}
                    onChange={(e) =>
                      onChange({
                        ...prefs,
                        themeId: 'custom',
                        backgroundColor: e.target.value,
                      })
                    }
                    className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </span>
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-md border border-white/[0.09] bg-[#13141c] px-2.5 py-1.5 text-xs text-slate-300">
                <span>Màu chữ</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-slate-400">
                    {prefs.textColor}
                  </span>
                  <input
                    type="color"
                    aria-label="Custom text color"
                    value={prefs.textColor}
                    onChange={(e) =>
                      onChange({
                        ...prefs,
                        themeId: 'custom',
                        textColor: e.target.value,
                      })
                    }
                    className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Font Family Selector */}
          <div className="space-y-1.5 border-t border-white/[0.07] pt-3">
            <label htmlFor="novel-font-select" className="block text-xs font-medium text-slate-300">
              Phông chữ tiểu thuyết
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {NOVEL_FONTS.map((font) => {
                const active = prefs.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => onChange({ ...prefs, fontFamily: font.id })}
                    style={{ fontFamily: font.cssStack }}
                    className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-[#8aa2ff]/60 bg-[#8aa2ff]/15 text-white'
                        : 'border-white/[0.08] bg-[#13141c] text-slate-300 hover:border-white/[0.18] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{font.label}</span>
                    <span className="ml-1 shrink-0 font-sans text-[10px] text-slate-400">
                      {font.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size, Line Height, Letter Spacing */}
          <div className="space-y-3 border-t border-white/[0.07] pt-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pref-font-size" className="font-medium text-slate-300">
                  Cỡ chữ
                </label>
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  {prefs.fontSize} px
                </span>
              </div>
              <input
                id="pref-font-size"
                type="range"
                min={14}
                max={28}
                step={1}
                value={prefs.fontSize}
                onChange={(e) =>
                  onChange({ ...prefs, fontSize: parseInt(e.target.value, 10) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pref-line-height" className="font-medium text-slate-300">
                  Giãn dòng (Line Height)
                </label>
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  {prefs.lineHeight.toFixed(2)}
                </span>
              </div>
              <input
                id="pref-line-height"
                type="range"
                min={1.35}
                max={2.3}
                step={0.05}
                value={prefs.lineHeight}
                onChange={(e) =>
                  onChange({ ...prefs, lineHeight: parseFloat(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pref-letter-spacing" className="font-medium text-slate-300">
                  Giãn chữ (Tracking)
                </label>
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  {prefs.letterSpacing.toFixed(3)} em
                </span>
              </div>
              <input
                id="pref-letter-spacing"
                type="range"
                min={-0.02}
                max={0.06}
                step={0.005}
                value={prefs.letterSpacing}
                onChange={(e) =>
                  onChange({ ...prefs, letterSpacing: parseFloat(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pref-paragraph-spacing" className="font-medium text-slate-300">
                  Giãn đoạn (Book / Zen)
                </label>
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  {prefs.paragraphSpacing.toFixed(2)} em
                </span>
              </div>
              <input
                id="pref-paragraph-spacing"
                type="range"
                min={0.4}
                max={2.2}
                step={0.05}
                value={prefs.paragraphSpacing}
                onChange={(e) =>
                  onChange({ ...prefs, paragraphSpacing: parseFloat(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-white/[0.08] bg-[#13141c] px-3 py-2 text-xs text-slate-200">
              <span>Thụt đầu dòng (First-line indent)</span>
              <input
                type="checkbox"
                checked={prefs.firstLineIndent}
                onChange={(e) =>
                  onChange({ ...prefs, firstLineIndent: e.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-white/20 bg-[#181a24] accent-[#6d8cff]"
              />
            </label>
          </div>

          {/* Alignment & Page Width */}
          <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-3">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-300">
                Căn lề chữ
              </span>
              <div
                className="grid grid-cols-3 gap-1 rounded-md border border-white/[0.08] bg-[#13141c] p-1"
                role="group"
                aria-label="Text alignment"
              >
                {alignOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...prefs, textAlign: opt.value })}
                    aria-label={`Align ${opt.value}`}
                    title={opt.label}
                    className={`flex h-7 items-center justify-center rounded transition-colors ${
                      prefs.textAlign === opt.value
                        ? 'bg-[#6d8cff]/25 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-300">
                Khổ trang
              </span>
              <div
                className="grid grid-cols-4 gap-1 rounded-md border border-white/[0.08] bg-[#13141c] p-1"
                role="group"
                aria-label="Page width"
              >
                {widthOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...prefs, pageWidth: opt.value })}
                    className={`h-7 rounded text-[11px] font-medium transition-colors ${
                      prefs.pageWidth === opt.value
                        ? 'bg-[#6d8cff]/25 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
