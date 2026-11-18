import { ManuscriptAct } from '../types/novel';
import { flattenChapters } from './manuscriptEngine';

export interface ManuscriptSearchOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
}

export interface ManuscriptSearchMatch {
  id: string;
  actId: string;
  actTitle: string;
  chapterId: string;
  chapterTitle: string;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  prefix: string;
  suffix: string;
  matchCountInChapter: number;
}

export interface ManuscriptSearchResult {
  matches: ManuscriptSearchMatch[];
  totalMatches: number;
  matchedChaptersCount: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchRegex(query: string, options?: ManuscriptSearchOptions): RegExp | null {
  const trimmed = query;
  if (!trimmed) return null;
  const escaped = escapeRegex(trimmed);
  const pattern = options?.wholeWord
    ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
    : escaped;
  const flags = options?.matchCase ? 'gu' : 'giu';
  return new RegExp(pattern, flags);
}

export function searchAcrossManuscript(
  acts: ManuscriptAct[],
  query: string,
  options?: ManuscriptSearchOptions
): ManuscriptSearchResult {
  const regex = buildSearchRegex(query, options);
  if (!regex) {
    return { matches: [], totalMatches: 0, matchedChaptersCount: 0 };
  }

  const matches: ManuscriptSearchMatch[] = [];
  const chaptersWithHits = new Set<string>();
  const flat = flattenChapters(acts);

  for (const loc of flat) {
    const content = loc.chapter.content;
    if (!content) continue;
    regex.lastIndex = 0;
    const chapterHits: Array<{ start: number; end: number; text: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      if (m[0].length === 0) break;
      chapterHits.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }

    if (chapterHits.length > 0) {
      chaptersWithHits.add(loc.chapter.id);
      chapterHits.forEach((hit, idx) => {
        const prefixStart = Math.max(0, hit.start - 36);
        const suffixEnd = Math.min(content.length, hit.end + 48);
        matches.push({
          id: `${loc.chapter.id}_${idx}_${hit.start}`,
          actId: loc.act.id,
          actTitle: loc.act.title,
          chapterId: loc.chapter.id,
          chapterTitle: loc.chapter.title,
          startIndex: hit.start,
          endIndex: hit.end,
          matchedText: hit.text,
          prefix: (prefixStart > 0 ? '…' : '') + content.slice(prefixStart, hit.start),
          suffix: content.slice(hit.end, suffixEnd) + (suffixEnd < content.length ? '…' : ''),
          matchCountInChapter: chapterHits.length,
        });
      });
    }
  }

  return {
    matches,
    totalMatches: matches.length,
    matchedChaptersCount: chaptersWithHits.size,
  };
}

export function replaceAcrossManuscript(
  acts: ManuscriptAct[],
  query: string,
  replacement: string,
  options?: ManuscriptSearchOptions
): {
  acts: ManuscriptAct[];
  replacedCount: number;
  modifiedChaptersCount: number;
} {
  const regex = buildSearchRegex(query, options);
  if (!regex) {
    return { acts, replacedCount: 0, modifiedChaptersCount: 0 };
  }

  let replacedCount = 0;
  let modifiedChaptersCount = 0;
  const now = Date.now();

  const updatedActs = acts.map((act) => ({
    ...act,
    chapters: act.chapters.map((chapter) => {
      if (!chapter.content) return chapter;
      regex.lastIndex = 0;
      let countInChapter = 0;
      const nextContent = chapter.content.replace(regex, () => {
        countInChapter += 1;
        return replacement;
      });
      if (countInChapter === 0) return chapter;
      replacedCount += countInChapter;
      modifiedChaptersCount += 1;
      return {
        ...chapter,
        content: nextContent,
        updatedAt: now,
      };
    }),
  }));

  return { acts: updatedActs, replacedCount, modifiedChaptersCount };
}
