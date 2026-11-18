import {
  AgentChatMessage,
  AgentContextToggles,
  CharacterCard,
  CharacterRole,
  LorebookEntry,
  MasterPlotBlock,
  PlotThread,
  ProtagonistProfile,
  StorySummary,
  VolumeBlueprint,
} from '../types/novel';
import { formatArchitectPlotContext } from './thinkingOrchestrator';
import { formatProtagonistPromptBlock } from './characterEngine';
import { ChatMessage } from './promptBuilder';

export interface AgentContextInput {
  projectTitle: string;
  chapterTitle?: string;
  sceneTitle?: string;
  chapterGoal?: string;
  chapterContent?: string;
  sceneContent?: string;
  chapterBeats?: string;
  sceneBeats?: string;
  volumeTitle?: string;
  volumeBlueprint?: VolumeBlueprint;
  masterPlotBlocks?: MasterPlotBlock[];
  plotThreads?: PlotThread[];
  protagonist: ProtagonistProfile;
  characters: CharacterCard[];
  lorebook: LorebookEntry[];
  summaries: StorySummary[];
  toggles: AgentContextToggles;
}

export type AgentActionBlock =
  | { id: string; type: 'prose'; title: string; content: string }
  | { id: string; type: 'beats'; title: string; content: string }
  | { id: string; type: 'pivot_beats'; title: string; content: string }
  | {
      id: string;
      type: 'character';
      title: string;
      rawJson: string;
      character: Omit<CharacterCard, 'id' | 'enabled'>;
    }
  | {
      id: string;
      type: 'lorebook';
      title: string;
      rawJson: string;
      lorebook: Omit<LorebookEntry, 'id' | 'enabled'>;
    };

export const AGENT_QUICK_PROMPTS = [
  {
    id: 'plot_ideas',
    label: 'Gợi ý hướng đi tiếp theo (Plot Ideas)',
    prompt:
      'Dựa trên diễn biến chương hiện tại và cốt truyện chính, hãy đề xuất 3 hướng đi tiếp theo giàu kịch tính (kèm hệ quả cho từng hướng).',
  },
  {
    id: 'critique',
    label: 'Soi lỗi logic & mâu thuẫn (Critique)',
    prompt:
      'Hãy rà soát chương hiện tại để chỉ ra lỗi logic, mâu thuẫn cảnh giới/vật phẩm, nhịp truyện bị hẫng hoặc câu văn sượng và gợi ý cách sửa.',
  },
  {
    id: 'beats',
    label: 'Lập dàn ý 4 nhịp cho chương này (Generate Beats)',
    prompt:
      'Hãy lập dàn ý 4 nhịp súc tích cho chương hiện tại nằm trong block `:::beats ... :::` để tôi có thể áp dụng ngay.',
  },
  {
    id: 'create_char',
    label: 'Tạo nhân vật phụ mới (Create Character)',
    prompt:
      'Hãy thiết kế 1 nhân vật phụ mới phù hợp với bối cảnh hiện tại (kèm vai trò, tính cách, động cơ) và xuất thêm block `:::character { ... } :::` để thêm vào Studio.',
  },
];

export function buildAgentSystemPrompt(): string {
  return [
    'Bạn là Cố vấn Sáng tác & Biên tập viên Tiểu thuyết (AI Agent) trong Quill & Loom Studio.',
    'Trả lời tự nhiên bằng tiếng Việt, súc tích, bám sát bối cảnh tác phẩm.',
    'Khi người dùng cần áp dụng nội dung trực tiếp vào Studio, bạn có thể gói phần xuất ra bằng các block có cấu trúc sau:',
    '1. Đoạn văn xuôi để chèn vào chương:',
    ':::prose\n(văn xuôi tiểu thuyết thuần túy)\n:::',
    '2. Dàn ý toàn chương:',
    ':::beats\n- Nhịp 1: ...\n- Nhịp 2: ...\n:::',
    '3. Rẽ nhánh lại phần [TIẾP THEO] khi giữ nguyên những gì đã viết:',
    ':::pivot_beats\n[TIẾP THEO]\n- Nhịp mới 1: ...\n:::',
    '4. Tạo nhân vật mới:',
    ':::character\n{ "name": "...", "aliases": "...", "role": "Đồng hành|Đối thủ|Sư phụ / Tiền bối|Phản diện|Nhân vật phụ", "appearanceAndPersonality": "...", "currentStatusAndRelationship": "...", "notes": "..." }\n:::',
    '5. Thêm mục Lorebook mới:',
    ':::lorebook\n{ "name": "...", "keywords": "từ khóa 1, từ khóa 2", "content": "..." }\n:::',
  ].join('\n');
}

export function buildAgentAttachedContext(input: AgentContextInput): string {
  const effectiveChapterTitle = input.chapterTitle ?? input.sceneTitle ?? 'Chương hiện tại';
  const effectiveContent = input.chapterContent ?? input.sceneContent ?? '';
  const effectiveBeats = input.chapterBeats ?? input.sceneBeats ?? '';

  const parts: string[] = [
    `[Tác phẩm: ${input.projectTitle || 'Untitled Novel'} · Chương: ${effectiveChapterTitle}]`,
  ];

  const plotContext = formatArchitectPlotContext({
    masterPlotBlocks: input.masterPlotBlocks,
    volumeTitle: input.volumeTitle,
    volumeBlueprint: input.volumeBlueprint,
    chapterTitle: effectiveChapterTitle,
    chapterGoal: input.chapterGoal,
    plotThreads: input.plotThreads,
  });
  if (plotContext) {
    parts.push(plotContext);
  }

  if (input.toggles.includeBeats && effectiveBeats.trim()) {
    parts.push(`[Chapter Beats (Dàn ý chương)]\n${effectiveBeats.trim()}`);
  }

  if (input.toggles.includeChapter && effectiveContent.trim()) {
    parts.push(`[Nội dung Chương hiện tại]\n${effectiveContent.trim().slice(-6000)}`);
  }

  if (input.toggles.includeCharactersAndLore) {
    const protagBlock = formatProtagonistPromptBlock(input.protagonist);
    if (protagBlock) parts.push(protagBlock);

    const enabledChars = input.characters.filter((c) => c.enabled);
    if (enabledChars.length > 0) {
      parts.push(
        `[Nhân vật]\n${enabledChars
          .slice(0, 12)
          .map((c) => `- ${c.name} (${c.role}): ${c.currentStatusAndRelationship || c.appearanceAndPersonality}`)
          .join('\n')}`
      );
    }

    const enabledLore = input.lorebook.filter((l) => l.enabled);
    if (enabledLore.length > 0) {
      parts.push(
        `[Lorebook]\n${enabledLore
          .slice(0, 12)
          .map((l) => `- ${l.name} [${l.keywords}]: ${l.content.trim()}`)
          .join('\n')}`
      );
    }
  }

  if (input.toggles.includeSummaries) {
    const enabledSums = input.summaries.filter((s) => s.enabled && s.content.trim());
    if (enabledSums.length > 0) {
      parts.push(
        `[Tóm tắt các chương trước]\n${enabledSums
          .slice(-8)
          .map((s) => `${s.title}:\n${s.content.trim()}`)
          .join('\n\n')}`
      );
    }
  }

  return parts.join('\n\n');
}

export function buildAgentMessages(
  contextInput: AgentContextInput,
  history: AgentChatMessage[],
  userMessage: string
): ChatMessage[] {
  const attached = buildAgentAttachedContext(contextInput);
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${buildAgentSystemPrompt()}\n\n${attached}`,
    },
  ];

  for (const msg of history.slice(-10)) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

const VALID_ROLES: CharacterRole[] = [
  'Đồng hành',
  'Đối thủ',
  'Sư phụ / Tiền bối',
  'Phản diện',
  'Nhân vật phụ',
];

export function parseAgentActionBlocks(messageId: string, content: string): AgentActionBlock[] {
  const blocks: AgentActionBlock[] = [];
  const regex = /:::(prose|beats|pivot_beats|character|lorebook)\s*\n([\s\S]*?)\n:::/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(content)) !== null) {
    const kind = match[1].toLowerCase();
    const body = match[2].trim();
    const blockId = `${messageId}_act_${idx++}`;
    if (!body) continue;

    if (kind === 'prose') {
      blocks.push({ id: blockId, type: 'prose', title: 'Đoạn văn đề xuất', content: body });
    } else if (kind === 'beats') {
      blocks.push({ id: blockId, type: 'beats', title: 'Dàn ý Chương mới', content: body });
    } else if (kind === 'pivot_beats') {
      blocks.push({
        id: blockId,
        type: 'pivot_beats',
        title: 'Rẽ nhánh [TIẾP THEO]',
        content: body,
      });
    } else if (kind === 'character') {
      try {
        const cleanJson = body.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanJson) as Record<string, unknown>;
        const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
        if (!name) continue;
        const rawRole = typeof parsed.role === 'string' ? parsed.role.trim() : '';
        const role = VALID_ROLES.includes(rawRole as CharacterRole)
          ? (rawRole as CharacterRole)
          : 'Nhân vật phụ';
        blocks.push({
          id: blockId,
          type: 'character',
          title: name,
          rawJson: cleanJson,
          character: {
            name,
            aliases: typeof parsed.aliases === 'string' ? parsed.aliases.trim() : '',
            role,
            appearanceAndPersonality:
              typeof parsed.appearanceAndPersonality === 'string'
                ? parsed.appearanceAndPersonality.trim()
                : '',
            currentStatusAndRelationship:
              typeof parsed.currentStatusAndRelationship === 'string'
                ? parsed.currentStatusAndRelationship.trim()
                : '',
            notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : '',
          },
        });
      } catch {
        // Ignore malformed JSON block
      }
    } else if (kind === 'lorebook') {
      try {
        const cleanJson = body.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanJson) as Record<string, unknown>;
        const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
        const loreContent = typeof parsed.content === 'string' ? parsed.content.trim() : '';
        if (!name && !loreContent) continue;
        blocks.push({
          id: blockId,
          type: 'lorebook',
          title: name || 'Lorebook mới',
          rawJson: cleanJson,
          lorebook: {
            name: name || 'Mục thế giới mới',
            keywords:
              typeof parsed.keywords === 'string'
                ? parsed.keywords.trim()
                : typeof parsed.keys === 'string'
                ? parsed.keys.trim()
                : name,
            content: loreContent,
          },
        });
      } catch {
        // Ignore malformed JSON block
      }
    }
  }

  return blocks;
}
