import {
  DEFAULT_EDITOR_PREFERENCES,
  EditorFontFamily,
  EditorPageWidth,
  EditorPreferences,
  EditorThemeId,
} from '../types/novel';

export interface NovelThemePreset {
  id: Exclude<EditorThemeId, 'custom'>;
  name: string;
  backgroundColor: string;
  textColor: string;
}

export interface NovelFontOption {
  id: EditorFontFamily;
  label: string;
  category: 'Serif' | 'Sans' | 'Mono';
  cssStack: string;
}

export const NOVEL_THEMES: NovelThemePreset[] = [
  {
    id: 'midnight-ink',
    name: 'Midnight Ink',
    backgroundColor: '#13141c',
    textColor: '#e2e8f0',
  },
  {
    id: 'obsidian-slate',
    name: 'Obsidian Night',
    backgroundColor: '#0c0e13',
    textColor: '#cbd5e1',
  },
  {
    id: 'forest-dusk',
    name: 'Trúc Lâm (Jade Night)',
    backgroundColor: '#111a17',
    textColor: '#dbe7df',
  },
  {
    id: 'warm-charcoal',
    name: 'Warm Charcoal',
    backgroundColor: '#1c1917',
    textColor: '#e7e0d6',
  },
  {
    id: 'sepia-parchment',
    name: 'Sepia Parchment',
    backgroundColor: '#f4ecd8',
    textColor: '#3b2f26',
  },
  {
    id: 'ivory-paper',
    name: 'Ivory Book',
    backgroundColor: '#faf8f4',
    textColor: '#1e2430',
  },
];

export const NOVEL_FONTS: NovelFontOption[] = [
  {
    id: 'lora',
    label: 'Lora',
    category: 'Serif',
    cssStack: '"Lora", ui-serif, Georgia, serif',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    category: 'Serif',
    cssStack: '"Merriweather", ui-serif, Georgia, serif',
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    category: 'Serif',
    cssStack: '"EB Garamond", ui-serif, Georgia, serif',
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    category: 'Serif',
    cssStack: '"Source Serif 4", ui-serif, Georgia, serif',
  },
  {
    id: 'be-vietnam',
    label: 'Be Vietnam Pro',
    category: 'Sans',
    cssStack: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'plus-jakarta',
    label: 'Plus Jakarta Sans',
    category: 'Sans',
    cssStack: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    category: 'Mono',
    cssStack: '"JetBrains Mono", ui-monospace, monospace',
  },
];

export const PAGE_WIDTH_MAP: Record<EditorPageWidth, string> = {
  narrow: '56ch',
  book: '72ch',
  wide: '88ch',
  full: '100%',
};

export function getFontStack(fontId: EditorFontFamily): string {
  return NOVEL_FONTS.find((f) => f.id === fontId)?.cssStack ?? NOVEL_FONTS[0].cssStack;
}

/**
 * Computes perceived luminance (0..1) from a 6-digit hex color to decide
 * whether adaptive canvas chrome (placeholders, title underline) should use dark or light ink.
 */
export function isLightHexColor(hex: string): boolean {
  const cleaned = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return false;

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.52;
}

const LEGACY_FONT_MAP: Record<string, EditorFontFamily> = {
  serif: 'lora',
  sans: 'plus-jakarta',
  mono: 'jetbrains-mono',
};

export function normalizeEditorPreferences(raw: unknown): EditorPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EDITOR_PREFERENCES };
  }

  const obj = raw as Record<string, unknown>;
  const rawFont = typeof obj.fontFamily === 'string' ? obj.fontFamily : 'lora';
  const mappedFont = LEGACY_FONT_MAP[rawFont] ?? rawFont;
  const validFont = NOVEL_FONTS.some((f) => f.id === mappedFont)
    ? (mappedFont as EditorFontFamily)
    : DEFAULT_EDITOR_PREFERENCES.fontFamily;

  const fontSize =
    typeof obj.fontSize === 'number' && Number.isFinite(obj.fontSize)
      ? Math.min(28, Math.max(14, obj.fontSize))
      : DEFAULT_EDITOR_PREFERENCES.fontSize;

  const lineHeight =
    typeof obj.lineHeight === 'number' && Number.isFinite(obj.lineHeight)
      ? Math.min(2.3, Math.max(1.35, obj.lineHeight))
      : DEFAULT_EDITOR_PREFERENCES.lineHeight;

  const letterSpacing =
    typeof obj.letterSpacing === 'number' && Number.isFinite(obj.letterSpacing)
      ? Math.min(0.08, Math.max(-0.03, obj.letterSpacing))
      : DEFAULT_EDITOR_PREFERENCES.letterSpacing;

  const paragraphSpacing =
    typeof obj.paragraphSpacing === 'number' && Number.isFinite(obj.paragraphSpacing)
      ? Math.min(2.4, Math.max(0.4, obj.paragraphSpacing))
      : DEFAULT_EDITOR_PREFERENCES.paragraphSpacing;

  const firstLineIndent =
    typeof obj.firstLineIndent === 'boolean'
      ? obj.firstLineIndent
      : DEFAULT_EDITOR_PREFERENCES.firstLineIndent;

  const textAlign =
    obj.textAlign === 'left' || obj.textAlign === 'justify' || obj.textAlign === 'center'
      ? obj.textAlign
      : DEFAULT_EDITOR_PREFERENCES.textAlign;

  const pageWidth =
    obj.pageWidth === 'narrow' ||
    obj.pageWidth === 'book' ||
    obj.pageWidth === 'wide' ||
    obj.pageWidth === 'full'
      ? obj.pageWidth
      : DEFAULT_EDITOR_PREFERENCES.pageWidth;

  const themeId =
    typeof obj.themeId === 'string' &&
    (obj.themeId === 'custom' || NOVEL_THEMES.some((t) => t.id === obj.themeId))
      ? (obj.themeId as EditorThemeId)
      : DEFAULT_EDITOR_PREFERENCES.themeId;

  const backgroundColor =
    typeof obj.backgroundColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(obj.backgroundColor)
      ? obj.backgroundColor
      : DEFAULT_EDITOR_PREFERENCES.backgroundColor;

  const textColor =
    typeof obj.textColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(obj.textColor)
      ? obj.textColor
      : DEFAULT_EDITOR_PREFERENCES.textColor;

  return {
    themeId,
    backgroundColor,
    textColor,
    fontFamily: validFont,
    fontSize,
    lineHeight,
    letterSpacing,
    paragraphSpacing,
    firstLineIndent,
    textAlign,
    pageWidth,
  };
}
