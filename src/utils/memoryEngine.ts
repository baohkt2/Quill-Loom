import { LongTermMemoryCard, MemoryCategory } from '../types/novel';
import { splitThinkingAndContent } from './thinkingOrchestrator';

export interface ScoredMemoryCard {
  card: LongTermMemoryCard;
  score: number;
  matchedKeywords: string[];
}

export function retrieveRelevantMemories(
  storyText: string,
  cards: LongTermMemoryCard[],
  maxCards = 5,
  scanWindowChars = 1500
): ScoredMemoryCard[] {
  if (!cards || cards.length === 0) return [];
  const tail = storyText.slice(-scanWindowChars).toLocaleLowerCase();

  const scored: ScoredMemoryCard[] = [];
  for (const card of cards) {
    if (!card.enabled || !card.content.trim()) continue;
    const keywords = card.keywords
      .split(',')
      .map((k) => k.trim().toLocaleLowerCase())
      .filter(Boolean);

    const matchedKeywords = keywords.filter((kw) => tail.includes(kw));
    if (matchedKeywords.length > 0 || card.importance >= 4) {
      const score = matchedKeywords.length * 3 + card.importance;
      scored.push({ card, score, matchedKeywords });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, maxCards);
}

export function buildSummarizePrompt(chapterTitle: string, chapterText: string): {
  system: string;
  user: string;
} {
  return {
    system:
      'Bạn là Biên tập viên Tóm tắt tiểu thuyết. Hãy tóm tắt diễn biến chính của chương thành 3–5 gạch đầu dòng tiếng Việt ngắn gọn, giữ chính xác tên nhân vật, cảnh giới, vật phẩm và kết quả xung đột.',
    user: `Chương: ${chapterTitle}\n\n${chapterText.trim().slice(-8000)}`,
  };
}

export function buildExtractFactsPrompt(chapterTitle: string, chapterText: string): {
  system: string;
  user: string;
} {
  return {
    system: [
      'Bạn là Hệ thống Trích xuất Ký ức Dài hạn (Long-Term Memory Extractor).',
      'Hãy trích xuất 2–4 sự kiện, lời hứa, bí mật, vật phẩm hoặc bước tiến cảnh giới quan trọng cần nhớ lâu dài.',
      'CHỈ trả về một mảng JSON hợp lệ:',
      '[{ "content": "...", "keywords": "từ khóa 1, từ khóa 2", "category": "Sự kiện|Lời hứa|Mối quan hệ|Bí mật|Vật phẩm|Cảnh giới", "importance": 3 }]',
    ].join('\n'),
    user: `Chương: ${chapterTitle}\n\n${chapterText.trim().slice(-8000)}`,
  };
}

const VALID_CATEGORIES: MemoryCategory[] = [
  'Sự kiện',
  'Lời hứa',
  'Mối quan hệ',
  'Bí mật',
  'Vật phẩm',
  'Cảnh giới',
];

export function parseExtractedFactsResponse(raw: string): LongTermMemoryCard[] {
  const { content } = splitThinkingAndContent(raw);
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  const slice = arrStart !== -1 && arrEnd > arrStart ? cleaned.slice(arrStart, arrEnd + 1) : cleaned;
  const parsed = JSON.parse(slice) as unknown;
  if (!Array.isArray(parsed)) return [];

  const now = Date.now();
  return parsed
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => {
      const rawCat = typeof item.category === 'string' ? item.category.trim() : 'Sự kiện';
      const category = VALID_CATEGORIES.includes(rawCat as MemoryCategory)
        ? (rawCat as MemoryCategory)
        : 'Sự kiện';
      const impRaw = Number(item.importance);
      const importance = (
        Number.isFinite(impRaw) ? Math.min(5, Math.max(1, Math.round(impRaw))) : 3
      ) as 1 | 2 | 3 | 4 | 5;

      return {
        id: `mem_ext_${now}_${idx}`,
        content: typeof item.content === 'string' ? item.content.trim() : '',
        keywords: typeof item.keywords === 'string' ? item.keywords.trim() : '',
        category,
        importance,
        createdAt: now,
        enabled: true,
      };
    })
    .filter((card) => card.content.length > 0);
}
