import { ManuscriptChapter } from '../types/novel';
import { createChapter } from './manuscriptEngine';
import { countWords } from './promptBuilder';

export interface BulkImportPreviewItem {
  title: string;
  content: string;
  wordCount: number;
}

const CHAPTER_HEADER_REGEX =
  /^\s*(?:#{1,3}\s*)?((?:Chương|Hồi|Chapter|Quyển)\s+\d+[^\n]*)$/im;

export function parseBulkChaptersPreview(rawText: string): BulkImportPreviewItem[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const buckets: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:#{1,3}\s*)?((?:Chương|Hồi|Chapter)\s+\d+.*)$/i);
    if (match) {
      if (current) {
        buckets.push(current);
      }
      current = {
        title: match[1].trim(),
        lines: [],
      };
    } else {
      if (!current) {
        if (!trimmed) continue;
        current = {
          title: 'Chương 1',
          lines: [line],
        };
      } else {
        current.lines.push(line);
      }
    }
  }

  if (current) {
    buckets.push(current);
  }

  if (buckets.length === 0 && normalized) {
    return [
      {
        title: 'Chương 1',
        content: normalized,
        wordCount: countWords(normalized),
      },
    ];
  }

  return buckets
    .map((b, idx) => {
      const content = b.lines.join('\n').trim();
      return {
        title: b.title || `Chương ${idx + 1}`,
        content,
        wordCount: countWords(content),
      };
    })
    .filter((b) => b.content.length > 0 || b.title.length > 0);
}

export function parseBulkChapters(rawText: string): ManuscriptChapter[] {
  const items = parseBulkChaptersPreview(rawText);
  return items.map((item) => createChapter(item.title, item.content, '', 'Draft'));
}

export function hasBulkChapterHeaders(rawText: string): boolean {
  return CHAPTER_HEADER_REGEX.test(rawText);
}
