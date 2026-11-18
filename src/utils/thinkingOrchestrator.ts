import {
  LorebookEntry,
  MasterPlotBlock,
  PlotThread,
  ProtagonistProfile,
  ThinkingModePreference,
  ThinkingTaskKind,
  VolumeBlueprint,
} from '../types/novel';
import { ActiveCharacterMatch } from './characterEngine';

export const MIN_THINKING_MAX_TOKENS = 3500;

export interface ThinkingPayloadExtras {
  maxTokens: number;
  chat_template_kwargs: { enable_thinking: boolean };
  reasoning: { effort: 'high' | 'none' };
}

/**
 * Resolves whether Thinking Mode should be active for a given task and user override.
 * - `on`: always ON
 * - `off`: always OFF
 * - `auto`: ON for outlining/syncing/agent/chapter-sync/plot-architect; OFF for prose & inline rewrite.
 */
export function resolveEffectiveThinking(
  preference: ThinkingModePreference,
  task: ThinkingTaskKind
): boolean {
  if (preference === 'on') return true;
  if (preference === 'off') return false;

  switch (task) {
    case 'generate_beats':
    case 'sync_beats':
    case 'agent_chat':
    case 'chapter_sync':
    case 'plot_architect':
      return true;
    case 'continue_story':
    case 'inline_rewrite':
    case 'utility':
    default:
      return false;
  }
}

export function cycleThinkingPreference(current: ThinkingModePreference): ThinkingModePreference {
  if (current === 'auto') return 'on';
  if (current === 'on') return 'off';
  return 'auto';
}

export function buildThinkingPayloadExtras(
  enableThinking: boolean,
  baseMaxTokens: number
): ThinkingPayloadExtras {
  const safeBase = Math.max(1, Math.round(baseMaxTokens || 450));
  return {
    maxTokens: enableThinking ? Math.max(MIN_THINKING_MAX_TOKENS, safeBase) : safeBase,
    chat_template_kwargs: { enable_thinking: enableThinking },
    reasoning: { effort: enableThinking ? 'high' : 'none' },
  };
}

/**
 * Splits explicit reasoning text and/or inline `<think>...</think>` blocks from a completed response,
 * including orphan `</think>` closings emitted when a chat template pre-opens `<think>`.
 */
export function splitThinkingAndContent(
  rawContent: string,
  explicitReasoning = ''
): { content: string; thinking: string } {
  const thinkingParts: string[] = [];
  if (explicitReasoning.trim()) {
    thinkingParts.push(explicitReasoning.trim());
  }

  let cleaned = rawContent || '';
  const closedThinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  cleaned = cleaned.replace(closedThinkRegex, (_full, inner: string) => {
    const t = inner.trim();
    if (t) thinkingParts.push(t);
    return '';
  });

  // Handle orphan closing `</think>` when template pre-opened `<think>` in prompt
  const orphanCloseIdx = cleaned.search(/<\/think>/i);
  if (orphanCloseIdx !== -1 && !/<think>/i.test(cleaned.slice(0, orphanCloseIdx))) {
    const preThink = cleaned.slice(0, orphanCloseIdx).trim();
    if (preThink) thinkingParts.push(preThink);
    cleaned = cleaned.slice(orphanCloseIdx).replace(/^<\/think>/i, '');
  }

  // Also handle an unclosed trailing <think> (e.g. if output hit max_tokens mid-thought)
  const unclosedIdx = cleaned.search(/<think>/i);
  if (unclosedIdx !== -1) {
    const tail = cleaned.slice(unclosedIdx).replace(/^<think>/i, '').trim();
    if (tail) thinkingParts.push(tail);
    cleaned = cleaned.slice(0, unclosedIdx);
  }

  return {
    content: cleaned.replace(/^\s*\n+/, '').trimEnd(),
    thinking: thinkingParts.join('\n\n').trim(),
  };
}

export interface ThinkingStreamUpdate {
  contentDelta: string;
  thinkingDelta: string;
  content: string;
  thinking: string;
}

export interface ThinkingStreamParser {
  push: (contentChunk: string | null | undefined, reasoningChunk?: string | null) => ThinkingStreamUpdate;
  flush: () => ThinkingStreamUpdate;
  getState: () => { content: string; thinking: string };
}

const OPEN_TAG = '<think>';
const CLOSE_TAG = '</think>';

function findPartialTagSuffixLength(text: string, tag: string): number {
  const lower = text.toLowerCase();
  const maxCheck = Math.min(text.length, tag.length - 1);
  for (let len = maxCheck; len >= 1; len--) {
    if (lower.endsWith(tag.slice(0, len))) {
      return len;
    }
  }
  return 0;
}

/**
 * Stateful streaming parser that separates `reasoning_content` deltas AND inline `<think>...</think>`
 * (plus orphan `</think>`) blocks across arbitrary chunk boundaries.
 */
export function createThinkingStreamParser(): ThinkingStreamParser {
  let pending = '';
  let insideThink = false;
  let content = '';
  let thinking = '';
  let stripLeadingContentNewlines = false;

  const appendContent = (piece: string): string => {
    if (!piece) return '';
    let next = piece;
    if (stripLeadingContentNewlines) {
      next = next.replace(/^[ \t\r\n]+/, '');
      if (next.length > 0) {
        stripLeadingContentNewlines = false;
      }
    }
    if (!next) return '';
    content += next;
    return next;
  };

  const appendThinking = (piece: string): string => {
    if (!piece) return '';
    thinking += piece;
    return piece;
  };

  const drainPending = (isFinalFlush: boolean): { contentDelta: string; thinkingDelta: string } => {
    let contentDelta = '';
    let thinkingDelta = '';

    while (pending.length > 0) {
      const lower = pending.toLowerCase();
      if (!insideThink) {
        const openIdx = lower.indexOf(OPEN_TAG);
        const orphanCloseIdx = lower.indexOf(CLOSE_TAG);

        // If an orphan </think> arrives before any <think>, everything accumulated so far was reasoning
        if (orphanCloseIdx !== -1 && (openIdx === -1 || orphanCloseIdx < openIdx)) {
          const preClose = pending.slice(0, orphanCloseIdx);
          const movedFromContent = content;
          content = '';
          contentDelta = '';
          const combinedReasoning = `${movedFromContent}${preClose}`.trim();
          if (combinedReasoning) {
            thinkingDelta += appendThinking(combinedReasoning);
          }
          pending = pending.slice(orphanCloseIdx + CLOSE_TAG.length);
          stripLeadingContentNewlines = true;
          continue;
        }

        if (openIdx !== -1) {
          if (openIdx > 0) {
            contentDelta += appendContent(pending.slice(0, openIdx));
          }
          pending = pending.slice(openIdx + OPEN_TAG.length);
          insideThink = true;
          continue;
        }

        if (!isFinalFlush) {
          const partialOpenLen = findPartialTagSuffixLength(pending, OPEN_TAG);
          const partialCloseLen = findPartialTagSuffixLength(pending, CLOSE_TAG);
          const partialLen = Math.max(partialOpenLen, partialCloseLen);
          if (partialLen > 0) {
            const safePrefix = pending.slice(0, pending.length - partialLen);
            if (safePrefix) {
              contentDelta += appendContent(safePrefix);
            }
            pending = pending.slice(pending.length - partialLen);
            break;
          }
        }

        contentDelta += appendContent(pending);
        pending = '';
      } else {
        const closeIdx = lower.indexOf(CLOSE_TAG);
        if (closeIdx !== -1) {
          if (closeIdx > 0) {
            thinkingDelta += appendThinking(pending.slice(0, closeIdx));
          }
          pending = pending.slice(closeIdx + CLOSE_TAG.length);
          insideThink = false;
          if (content.length === 0) {
            stripLeadingContentNewlines = true;
          }
          continue;
        }

        if (!isFinalFlush) {
          const partialLen = findPartialTagSuffixLength(pending, CLOSE_TAG);
          if (partialLen > 0) {
            const safePrefix = pending.slice(0, pending.length - partialLen);
            if (safePrefix) {
              thinkingDelta += appendThinking(safePrefix);
            }
            pending = pending.slice(pending.length - partialLen);
            break;
          }
        }

        thinkingDelta += appendThinking(pending);
        pending = '';
      }
    }

    return { contentDelta, thinkingDelta };
  };

  return {
    push(contentChunk, reasoningChunk) {
      let thinkingDelta = '';
      if (reasoningChunk) {
        thinkingDelta += appendThinking(reasoningChunk);
      }

      let contentDelta = '';
      if (contentChunk) {
        pending += contentChunk;
        const drained = drainPending(false);
        contentDelta += drained.contentDelta;
        thinkingDelta += drained.thinkingDelta;
      }

      return { contentDelta, thinkingDelta, content, thinking };
    },

    flush() {
      const drained = drainPending(true);
      return {
        contentDelta: drained.contentDelta,
        thinkingDelta: drained.thinkingDelta,
        content,
        thinking,
      };
    },

    getState() {
      return { content, thinking };
    },
  };
}

export function cleanGeneratedBeatsText(raw: string): string {
  const { content } = splitThinkingAndContent(raw);
  return content
    .replace(/^:::(?:beats|pivot_beats|rewrite_beats)\s*/i, '')
    .replace(/\s*:::$/i, '')
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * Strips accidental echoed prompt delimiter headers (such as `=== TIẾP THEO ===`,
 * `=== BẮT ĐẦU VIẾT ===`, `=== NỘI DUNG TRUYỆN ===`, `[TIẾP THEO]`) at the very start of generated prose.
 */
export function stripLeadingProseMarkers(raw: string): string {
  if (!raw) return '';
  return raw.replace(
    /^(?:\s*(?:={2,}\s*[^\n]{1,80}?\s*={2,}|-{3,}\s*(?:TIẾP THEO|BẮT ĐẦU(?:\s+VIẾT)?|NỘI DUNG TRUYỆN|MỞ ĐẦU|PHẦN TIẾP THEO)\s*-{3,}|\[(?:TIẾP THEO|ĐÃ DIỄN RA|BẮT ĐẦU(?:\s+VIẾT)?|NỘI DUNG TRUYỆN)\]|(?:\*{2}|#{1,3}\s*)(?:BẮT ĐẦU VIẾT|TIẾP THEO|NỘI DUNG TRUYỆN)(?:\*{2})?:?)\s*(?:\n+|$))+/i,
    ''
  );
}

/**
 * Merges revised `[TIẾP THEO]` beats from `:::pivot_beats` into existing Chapter Beats
 * while keeping `[ĐÃ DIỄN RA]` intact.
 */
export function mergePivotIntoSceneBeats(currentBeats: string, pivotNextBeats: string): string {
  const cleanPivot = cleanGeneratedBeatsText(pivotNextBeats);
  if (!cleanPivot) return currentBeats;

  const normalizedNextSection = /^\s*\[TIẾP THEO\]/i.test(cleanPivot)
    ? cleanPivot.trim()
    : `[TIẾP THEO]\n${cleanPivot.trim()}`;

  const currentTrimmed = currentBeats.trim();
  if (!currentTrimmed) {
    return normalizedNextSection;
  }

  const nextMarkerMatch = currentTrimmed.match(/\[TIẾP THEO\]/i);
  if (nextMarkerMatch && typeof nextMarkerMatch.index === 'number') {
    const beforeNext = currentTrimmed.slice(0, nextMarkerMatch.index).trimEnd();
    return beforeNext ? `${beforeNext}\n\n${normalizedNextSection}` : normalizedNextSection;
  }

  const pastMarkerMatch = currentTrimmed.match(/\[ĐÃ DIỄN RA\]/i);
  if (pastMarkerMatch) {
    return `${currentTrimmed}\n\n${normalizedNextSection}`;
  }

  return `[ĐÃ DIỄN RA]\n${currentTrimmed}\n\n${normalizedNextSection}`;
}

export function formatArchitectPlotContext(params: {
  masterPlotBlocks?: MasterPlotBlock[];
  volumeTitle?: string;
  volumeBlueprint?: VolumeBlueprint;
  chapterTitle?: string;
  chapterGoal?: string;
  plotThreads?: PlotThread[];
}): string {
  const parts: string[] = [];

  const activeBlocks = (params.masterPlotBlocks ?? []).filter(
    (b) => b.includeInArchitect && b.content.trim().length > 0
  );
  if (activeBlocks.length > 0) {
    parts.push(
      `[Cốt truyện chính (Master Plot — Architect)]\n${activeBlocks
        .map((b) => `### ${b.title}\n${b.content.trim()}`)
        .join('\n\n')}`
    );
  }

  const bp = params.volumeBlueprint;
  if (
    bp &&
    (bp.arcGoal.trim() || bp.keyAntagonists.trim() || bp.turningPointsAndClimax.trim())
  ) {
    const bpLines: string[] = [];
    if (bp.arcGoal.trim()) bpLines.push(`- Mục tiêu Quyển: ${bp.arcGoal.trim()}`);
    if (bp.keyAntagonists.trim()) bpLines.push(`- Thế lực & Đối thủ: ${bp.keyAntagonists.trim()}`);
    if (bp.turningPointsAndClimax.trim()) {
      bpLines.push(`- Nút thắt & Cao trào: ${bp.turningPointsAndClimax.trim()}`);
    }
    parts.push(
      `[Đại cương Quyển hiện tại${params.volumeTitle ? `: ${params.volumeTitle}` : ''}]\n${bpLines.join('\n')}`
    );
  }

  if (params.chapterGoal?.trim()) {
    parts.push(
      `[Mục tiêu Chương${params.chapterTitle ? ` (${params.chapterTitle})` : ''}]\n${params.chapterGoal.trim()}`
    );
  }

  const openThreads = (params.plotThreads ?? []).filter(
    (t) => t.status === 'Open' && t.title.trim().length > 0
  );
  if (openThreads.length > 0) {
    parts.push(
      `[Tuyến truyện & Phục bút đang mở (Open Plot Threads)]\n${openThreads
        .map(
          (t) =>
            `- ${t.title}${t.introducedChapter ? ` (từ ${t.introducedChapter})` : ''}: ${t.description.trim()}`
        )
        .join('\n')}`
    );
  }

  return parts.join('\n\n');
}

export interface ChapterBeatsPromptInput {
  projectTitle: string;
  actTitle?: string;
  chapterTitle: string;
  chapterGoal?: string;
  volumeBlueprint?: VolumeBlueprint;
  masterPlotBlocks?: MasterPlotBlock[];
  plotThreads?: PlotThread[];
  currentChapterText: string;
  existingBeats: string;
  previousChapterTail?: string;
  previousChapterTitle?: string;
  previousChapterSummary?: string;
  protagonist: ProtagonistProfile;
  activeCharacters: ActiveCharacterMatch[];
  lorebookEntries: LorebookEntry[];
}

export function buildChapterBeatsPrompt(input: ChapterBeatsPromptInput): { system: string; user: string } {
  const system = [
    'Bạn là Biên kịch & Cố vấn Cốt truyện tiểu thuyết tiếng Việt chuyên nghiệp.',
    'Nhiệm vụ: Suy luận chặt chẽ Master Plot, Đại cương Quyển, Mục tiêu Chương, logic nhân vật, cảnh giới, vật phẩm và đoạn kết chương trước để lập đúng 3–4 gạch đầu dòng diễn biến (Chapter Beats) mạch lạc, giàu xung đột cho chương hiện tại.',
    'Quy tắc đầu ra:',
    '- Xuất 3–4 gạch đầu dòng tiếng Việt ngắn gọn, súc tích (`- Nhịp 1: ...`, `- Nhịp 2: ...`, ...).',
    '- Nối tiếp tự nhiên từ kết thúc chương trước (nếu chương mới chưa có văn bản) hoặc từ câu cuối chương hiện tại.',
    '- Tập trung vào hành động cụ thể, đối thoại/xung đột then chốt và bám sát Mục tiêu Chương.',
    '- TUYỆT ĐỐI KHÔNG viết văn xuôi dài dòng, không thêm lời bình mở đầu hay kết thúc.',
  ].join('\n');

  const sections: string[] = [
    `Tác phẩm: ${input.projectTitle || 'Untitled Novel'} · ${input.actTitle ? `${input.actTitle} / ` : ''}${input.chapterTitle}`,
  ];

  const plotContext = formatArchitectPlotContext({
    masterPlotBlocks: input.masterPlotBlocks,
    volumeTitle: input.actTitle,
    volumeBlueprint: input.volumeBlueprint,
    chapterTitle: input.chapterTitle,
    chapterGoal: input.chapterGoal,
    plotThreads: input.plotThreads,
  });
  if (plotContext) {
    sections.push(plotContext);
  }

  if (input.protagonist.name.trim()) {
    sections.push(
      `[Nhân vật chính]\n${input.protagonist.name.trim()} | Cảnh giới: ${input.protagonist.realm || 'Chưa rõ'} | Tính cách: ${input.protagonist.personality || 'Chưa rõ'} | Hành trang: ${input.protagonist.inventory || 'Trống'}`
    );
  }

  if (input.activeCharacters.length > 0) {
    sections.push(
      `[Nhân vật liên quan]\n${input.activeCharacters
        .map(
          (m) =>
            `- ${m.card.name} (${m.card.role}): ${m.card.currentStatusAndRelationship || m.card.appearanceAndPersonality}`
        )
        .join('\n')}`
    );
  }

  if (input.lorebookEntries.length > 0) {
    sections.push(
      `[Lorebook / Thiết lập kích hoạt]\n${input.lorebookEntries
        .slice(0, 8)
        .map((e) => `- ${e.name}: ${e.content.trim()}`)
        .join('\n')}`
    );
  }

  if (input.previousChapterSummary?.trim()) {
    sections.push(
      `[Tóm tắt chương trước]\n${input.previousChapterSummary.trim().slice(-1200)}`
    );
  }

  if (input.previousChapterTail?.trim()) {
    sections.push(
      `[Đoạn kết chương trước${input.previousChapterTitle ? ` (${input.previousChapterTitle})` : ''}]\n${input.previousChapterTail.trim().slice(-1500)}`
    );
  }

  if (input.currentChapterText.trim()) {
    sections.push(
      `[Văn bản chương hiện tại đã viết]\n${input.currentChapterText.trim().slice(-2500)}`
    );
  }

  if (input.existingBeats.trim()) {
    sections.push(`[Ghi chú / Dàn ý sơ bộ của tác giả]\n${input.existingBeats.trim()}`);
  }

  sections.push(
    input.currentChapterText.trim()
      ? 'Hãy lập 3–4 nhịp diễn biến hợp lý nối tiếp ngay sau phần văn bản đã viết của chương này.'
      : 'Hãy lập 3–4 nhịp diễn biến mở đầu logic và cuốn hút nối tiếp ngay sau chương trước cho chương mới này.'
  );

  return {
    system,
    user: sections.join('\n\n'),
  };
}

/** Backward-compatible wrapper signature */
export const buildSceneBeatsPrompt = (input: {
  projectTitle: string;
  actTitle?: string;
  chapterTitle: string;
  sceneTitle?: string;
  chapterGoal?: string;
  volumeBlueprint?: VolumeBlueprint;
  masterPlotBlocks?: MasterPlotBlock[];
  plotThreads?: PlotThread[];
  currentSceneText?: string;
  currentChapterText?: string;
  existingBeats: string;
  previousSceneTail?: string;
  previousChapterTail?: string;
  previousChapterSummary?: string;
  protagonist: ProtagonistProfile;
  activeCharacters: ActiveCharacterMatch[];
  lorebookEntries: LorebookEntry[];
}) =>
  buildChapterBeatsPrompt({
    projectTitle: input.projectTitle,
    actTitle: input.actTitle,
    chapterTitle: input.chapterTitle,
    chapterGoal: input.chapterGoal,
    volumeBlueprint: input.volumeBlueprint,
    masterPlotBlocks: input.masterPlotBlocks,
    plotThreads: input.plotThreads,
    currentChapterText: input.currentChapterText ?? input.currentSceneText ?? '',
    existingBeats: input.existingBeats,
    previousChapterTail: input.previousChapterTail ?? input.previousSceneTail,
    previousChapterSummary: input.previousChapterSummary,
    protagonist: input.protagonist,
    activeCharacters: input.activeCharacters,
    lorebookEntries: input.lorebookEntries,
  });

export function buildSyncBeatsPrompt(input: {
  chapterTitle: string;
  chapterGoal?: string;
  volumeBlueprint?: VolumeBlueprint;
  masterPlotBlocks?: MasterPlotBlock[];
  plotThreads?: PlotThread[];
  currentChapterText: string;
  existingBeats: string;
  protagonist: ProtagonistProfile;
  activeCharacters: ActiveCharacterMatch[];
}): { system: string; user: string } {
  const system = [
    'Bạn là Biên tập viên Đồng bộ Dàn ý (Beat Synchronizer) chuyên nghiệp.',
    'Nhiệm vụ: Đọc kỹ văn bản truyện vừa được tác giả chỉnh sửa/viết trong Editor và đối chiếu với Dàn ý chương cũ, Mục tiêu chương và Master Plot để cập nhật lại dàn ý chính xác 100% với diễn biến thực tế.',
    'BẮT BUỘC xuất kết quả theo ĐÚNG cấu trúc 2 phần sau (không thêm lời dẫn ngoài lề):',
    '[ĐÃ DIỄN RA]',
    '- (1–2 gạch đầu dòng tóm tắt ngắn gọn những gì ĐÃ thực sự xảy ra trong văn bản hiện tại)',
    '',
    '[TIẾP THEO]',
    '- (2–3 gạch đầu dòng diễn biến tiếp theo hợp logic, nối thẳng từ câu kết mới nhất của văn bản; loại bỏ hoàn toàn các nhịp cũ bị mâu thuẫn hoặc đã xảy ra rồi)',
  ].join('\n');

  const parts: string[] = [`Chương đang chỉnh sửa: ${input.chapterTitle}`];

  const plotContext = formatArchitectPlotContext({
    masterPlotBlocks: input.masterPlotBlocks,
    volumeBlueprint: input.volumeBlueprint,
    chapterTitle: input.chapterTitle,
    chapterGoal: input.chapterGoal,
    plotThreads: input.plotThreads,
  });
  if (plotContext) {
    parts.push(plotContext);
  }

  if (input.protagonist.name.trim()) {
    parts.push(
      `[Nhân vật chính] ${input.protagonist.name.trim()} (${input.protagonist.realm || 'Chưa rõ'})`
    );
  }

  if (input.activeCharacters.length > 0) {
    parts.push(
      `[Nhân vật trong chương]\n${input.activeCharacters
        .map((m) => `- ${m.card.name}: ${m.card.currentStatusAndRelationship || m.card.role}`)
        .join('\n')}`
    );
  }

  parts.push(
    `[Dàn ý Chương trước khi chỉnh sửa]\n${input.existingBeats.trim() || '(Chưa có dàn ý cũ)'}`
  );
  parts.push(
    `[Văn bản thực tế hiện có trong Editor (CANON TUYỆT ĐỐI)]\n${input.currentChapterText.trim().slice(-6000)}`
  );

  return {
    system,
    user: parts.join('\n\n'),
  };
}
