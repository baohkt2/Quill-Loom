import {
  ChapterSyncFactItem,
  ChapterSyncLoreSuggestion,
  ChapterSyncPlotThreadUpdate,
  ChapterSyncResult,
  LorebookEntry,
  ManuscriptChapter,
  MasterPlotBlock,
  MemoryCategory,
  PlotThread,
  ProtagonistProfile,
  VolumeBlueprint,
  CharacterCard,
} from '../types/novel';
import { formatArchitectPlotContext, splitThinkingAndContent } from './thinkingOrchestrator';
import { formatProtagonistPromptBlock } from './characterEngine';

export function compileActiveChapterText(chapter: ManuscriptChapter): string {
  return chapter.content.trim();
}

export function buildChapterSyncPrompt(params: {
  chapterTitle: string;
  chapterText: string;
  chapterGoal?: string;
  volumeTitle?: string;
  volumeBlueprint?: VolumeBlueprint;
  masterPlotBlocks?: MasterPlotBlock[];
  plotThreads?: PlotThread[];
  protagonist: ProtagonistProfile;
  characters: CharacterCard[];
  lorebook: LorebookEntry[];
}): { system: string; user: string } {
  const system = [
    'Bạn là Tổng Biên tập Đồng bộ Trạng thái Tiểu thuyết (Unified Chapter Sync Engine).',
    'Hãy đọc toàn bộ chương truyện vừa hoàn thành và trả về DUY NHẤT 1 đối tượng JSON hợp lệ để đồng bộ tất cả các lớp dữ liệu cùng lúc:',
    '{',
    '  "summary": "Tóm tắt diễn biến chương thành 3-5 gạch đầu dòng ngắn gọn bằng tiếng Việt",',
    '  "longTermFacts": [',
    '    { "content": "Sự kiện / lời hứa / bí mật / vật phẩm mới cần nhớ lâu dài", "category": "Sự kiện|Lời hứa|Mối quan hệ|Bí mật|Vật phẩm|Cảnh giới", "keywords": "từ khóa 1, từ khóa 2" }',
    '  ],',
    '  "characterUpdates": [',
    '    { "name": "Tên nhân vật", "updatedStatus": "Trạng thái, tâm lý hoặc quan hệ mới sau chương này" }',
    '  ],',
    '  "protagonistStatusUpdate": {',
    '    "realm": "Cảnh giới mới (chỉ ghi nếu có thay đổi)",',
    '    "techniques": "Công pháp mới học/đột phá (nếu có)",',
    '    "resources": "Tài nguyên/linh thạch mới (nếu đổi)",',
    '    "inventory": "Vật phẩm mới thu được hoặc đã dùng mất (nếu đổi)"',
    '  },',
    '  "lorebookSuggestions": [',
    '    { "action": "new|update", "name": "Tên mục", "keys": "từ khóa, ngăn cách phẩy", "content": "Mô tả súc tích thiết lập mới/cập nhật" }',
    '  ],',
    '  "plotThreadUpdates": [',
    '    { "action": "new|resolve", "title": "Tên tuyến truyện / phục bút", "description": "Mô tả manh mối mới hoặc kết quả giải quyết", "introducedChapter": "Tên chương" }',
    '  ]',
    '}',
    'Lưu ý:',
    '- Nếu mục nào không có thay đổi (ví dụ nhân vật chính không đổi cảnh giới hay không có lore mới), để trống mảng [] hoặc bỏ qua trường không đổi.',
    '- Đối với `plotThreadUpdates`: chọn `"action": "new"` khi phát sinh bí ẩn/phục bút/ân oán dài hạn mới; chọn `"action": "resolve"` kèm đúng tên tuyến truyện đang Open nếu nút thắt đó đã được giải quyết trong chương này.',
  ].join('\n');

  const parts: string[] = [`Chương cần đồng bộ: ${params.chapterTitle}`];

  const plotContext = formatArchitectPlotContext({
    masterPlotBlocks: params.masterPlotBlocks,
    volumeTitle: params.volumeTitle,
    volumeBlueprint: params.volumeBlueprint,
    chapterTitle: params.chapterTitle,
    chapterGoal: params.chapterGoal,
    plotThreads: params.plotThreads,
  });
  if (plotContext) parts.push(plotContext);

  const protagBlock = formatProtagonistPromptBlock(params.protagonist);
  if (protagBlock) parts.push(protagBlock);

  if (params.characters.length > 0) {
    parts.push(
      `[Danh sách Nhân vật hiện có]\n${params.characters
        .map((c) => `- ${c.name} (${c.role}): ${c.currentStatusAndRelationship || c.appearanceAndPersonality}`)
        .join('\n')}`
    );
  }

  if (params.lorebook.length > 0) {
    parts.push(
      `[Lorebook keys hiện có]\n${params.lorebook
        .slice(0, 20)
        .map((e) => `- ${e.name} [${e.keywords}]`)
        .join('\n')}`
    );
  }

  parts.push(`[Nội dung Chương]\n${params.chapterText.trim().slice(-10000)}`);

  return { system, user: parts.join('\n\n') };
}

const VALID_CATEGORIES: MemoryCategory[] = [
  'Sự kiện',
  'Lời hứa',
  'Mối quan hệ',
  'Bí mật',
  'Vật phẩm',
  'Cảnh giới',
];

function extractJsonObject(raw: string): Record<string, unknown> {
  const { content } = splitThinkingAndContent(raw);
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const slice = first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  const parsed = JSON.parse(slice) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Phản hồi Chốt chương không phải đối tượng JSON hợp lệ.');
  }
  return parsed as Record<string, unknown>;
}

export function parseChapterSyncResponse(
  raw: string,
  options?: {
    chapterTitle?: string;
    existingThreads?: PlotThread[];
    thinking?: string;
  }
): ChapterSyncResult {
  const split = splitThinkingAndContent(raw, options?.thinking || '');
  const parsed = extractJsonObject(raw);
  const now = Date.now();

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

  const rawFacts = Array.isArray(parsed.longTermFacts) ? parsed.longTermFacts : [];
  const longTermFacts: ChapterSyncFactItem[] = rawFacts
    .filter((f): f is Record<string, unknown> => Boolean(f && typeof f === 'object'))
    .map((f, idx) => {
      const catStr = typeof f.category === 'string' ? f.category.trim() : 'Sự kiện';
      const category = VALID_CATEGORIES.includes(catStr as MemoryCategory)
        ? (catStr as MemoryCategory)
        : 'Sự kiện';
      return {
        id: `sync_fact_${now}_${idx}`,
        content: typeof f.content === 'string' ? f.content.trim() : '',
        category,
        keywords: typeof f.keywords === 'string' ? f.keywords.trim() : '',
      };
    })
    .filter((f) => f.content.length > 0);

  const rawCharUpdates = Array.isArray(parsed.characterUpdates) ? parsed.characterUpdates : [];
  const characterUpdates = rawCharUpdates
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((c, idx) => ({
      id: `sync_char_${now}_${idx}`,
      name: typeof c.name === 'string' ? c.name.trim() : '',
      updatedStatus: typeof c.updatedStatus === 'string' ? c.updatedStatus.trim() : '',
    }))
    .filter((c) => c.name.length > 0 && c.updatedStatus.length > 0);

  let protagonistStatusUpdate: ChapterSyncResult['protagonistStatusUpdate'] = null;
  if (parsed.protagonistStatusUpdate && typeof parsed.protagonistStatusUpdate === 'object') {
    const p = parsed.protagonistStatusUpdate as Record<string, unknown>;
    const upd: NonNullable<ChapterSyncResult['protagonistStatusUpdate']> = {};
    if (typeof p.realm === 'string' && p.realm.trim()) upd.realm = p.realm.trim();
    if (typeof p.techniques === 'string' && p.techniques.trim()) upd.techniques = p.techniques.trim();
    if (typeof p.resources === 'string' && p.resources.trim()) upd.resources = p.resources.trim();
    if (typeof p.inventory === 'string' && p.inventory.trim()) upd.inventory = p.inventory.trim();
    if (Object.keys(upd).length > 0) protagonistStatusUpdate = upd;
  }

  const rawLore = Array.isArray(parsed.lorebookSuggestions) ? parsed.lorebookSuggestions : [];
  const lorebookSuggestions: ChapterSyncLoreSuggestion[] = rawLore
    .filter((l): l is Record<string, unknown> => Boolean(l && typeof l === 'object'))
    .map((l, idx) => ({
      id: `sync_lore_${now}_${idx}`,
      action: (l.action === 'update' ? 'update' : 'new') as 'new' | 'update',
      name: typeof l.name === 'string' ? l.name.trim() : '',
      keys: typeof l.keys === 'string' ? l.keys.trim() : '',
      content: typeof l.content === 'string' ? l.content.trim() : '',
    }))
    .filter((l) => l.name.length > 0 && l.content.length > 0);

  const openThreads = (options?.existingThreads ?? []).filter((t) => t.status === 'Open');
  const rawThreads = Array.isArray(parsed.plotThreadUpdates) ? parsed.plotThreadUpdates : [];
  const plotThreadUpdates: ChapterSyncPlotThreadUpdate[] = rawThreads
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t, idx) => {
      const action: 'new' | 'resolve' = t.action === 'resolve' ? 'resolve' : 'new';
      const title = typeof t.title === 'string' ? t.title.trim() : '';
      const matchedExisting =
        action === 'resolve' && title
          ? openThreads.find(
              (ot) =>
                ot.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase() ||
                ot.title.trim().toLocaleLowerCase().includes(title.toLocaleLowerCase())
            )
          : undefined;

      return {
        id: `sync_pt_${now}_${idx}`,
        action,
        title,
        description: typeof t.description === 'string' ? t.description.trim() : '',
        introducedChapter:
          (typeof t.introducedChapter === 'string' && t.introducedChapter.trim()) ||
          options?.chapterTitle ||
          'Chương hiện tại',
        ...(matchedExisting ? { existingThreadId: matchedExisting.id } : {}),
      };
    })
    .filter((t) => t.title.length > 0);

  return {
    summary,
    longTermFacts,
    characterUpdates,
    protagonistStatusUpdate,
    lorebookSuggestions,
    plotThreadUpdates,
    ...(split.thinking ? { thinking: split.thinking } : {}),
  };
}
