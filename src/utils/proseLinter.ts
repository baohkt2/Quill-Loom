export interface ProseLintHit {
  word: string;
  severity: 'error' | 'warning';
  count: number;
  indices: number[];
}

export interface ProseLintSegment {
  text: string;
  severity?: 'error' | 'warning';
  label?: string;
}

export interface ProseLintReport {
  forbiddenHits: ProseLintHit[];
  overusedHits: ProseLintHit[];
  segments: ProseLintSegment[];
}

export const FORBIDDEN_MODERN_WORDS = [
  'anh ta',
  'cô ta',
  'bọn họ',
  'anh ấy',
  'cô ấy',
  'chúng ta',
];

export const CRUTCH_OVERUSE_WORDS = [
  'đột nhiên',
  'bất giác',
  'khẽ',
  'trong khoảnh khắc',
  'không khỏi',
  'nhất thời',
  'thầm nghĩ',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWordOccurrences(text: string, phrase: string): Array<{ start: number; end: number }> {
  const escaped = escapeRegex(phrase);
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
  const results: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({ start: match.index, end: match.index + match[0].length });
  }
  return results;
}

export function lintVietnameseProse(text: string): ProseLintReport {
  if (!text) {
    return { forbiddenHits: [], overusedHits: [], segments: [] };
  }

  const forbiddenHits: ProseLintHit[] = [];
  const overusedHits: ProseLintHit[] = [];
  const spans: Array<{ start: number; end: number; severity: 'error' | 'warning'; label: string }> = [];

  for (const word of FORBIDDEN_MODERN_WORDS) {
    const occs = findWordOccurrences(text, word);
    if (occs.length > 0) {
      forbiddenHits.push({
        word,
        severity: 'error',
        count: occs.length,
        indices: occs.map((o) => o.start),
      });
      for (const o of occs) {
        spans.push({ start: o.start, end: o.end, severity: 'error', label: `Từ hiện đại / dịch thô: "${word}"` });
      }
    }
  }

  for (const word of CRUTCH_OVERUSE_WORDS) {
    const occs = findWordOccurrences(text, word);
    if (occs.length > 2) {
      overusedHits.push({
        word,
        severity: 'warning',
        count: occs.length,
        indices: occs.map((o) => o.start),
      });
      for (const o of occs) {
        spans.push({ start: o.start, end: o.end, severity: 'warning', label: `Từ lặp (${occs.length} lần): "${word}"` });
      }
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const nonOverlapping: typeof spans = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.start >= cursor) {
      nonOverlapping.push(sp);
      cursor = sp.end;
    }
  }

  const segments: ProseLintSegment[] = [];
  let pos = 0;
  for (const sp of nonOverlapping) {
    if (sp.start > pos) {
      segments.push({ text: text.slice(pos, sp.start) });
    }
    segments.push({
      text: text.slice(sp.start, sp.end),
      severity: sp.severity,
      label: sp.label,
    });
    pos = sp.end;
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos) });
  }

  return { forbiddenHits, overusedHits, segments };
}
