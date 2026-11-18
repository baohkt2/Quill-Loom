import {
  ApiMode,
  LorebookEntry,
  MasterPlotBlock,
  SamplerSettings,
  StoryProject,
  StorySummary,
  VolumeBlueprint,
} from '../types/novel';
import {
  ActiveCharacterMatch,
  findActiveCharacters,
  formatCharacterRosterBlock,
  formatProtagonistPromptBlock,
} from './characterEngine';
import { retrieveRelevantMemories, ScoredMemoryCard } from './memoryEngine';
import { buildThinkingPayloadExtras } from './thinkingOrchestrator';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const REFERENCE_HEADER =
  '[BỐI CẢNH & TƯ LIỆU THAM KHẢO — Chỉ dùng làm nền, không sao chép nguyên văn vào truyện]';

export const CHAT_CONTINUE_INSTRUCTION =
  'Hãy viết tiếp diễn biến tiếp theo của câu chuyện dưới đây bằng văn xuôi tiểu thuyết liền mạch, giàu chi tiết, không lặp lại bất kỳ câu hay ý nào đã viết. Bắt đầu trực tiếp ngay bằng câu văn nối tiếp tự nhiên, không thêm tiêu đề, nhãn phân cách hay lời bình.';

export const CHAT_BEGIN_INSTRUCTION =
  'Hãy khởi đầu chương truyện dựa trên bối cảnh và dàn ý trên bằng văn xuôi tiểu thuyết liền mạch, giàu hình ảnh và chi tiết. Bắt đầu trực tiếp ngay từ câu văn đầu tiên của cảnh truyện, không thêm tiêu đề chương, nhãn phân cách hay lời dẫn.';

export interface TokenBudgetBreakdown {
  systemAndPersonaTokens: number;
  memoryAndSummariesTokens: number;
  charactersAndLoreTokens: number;
  recentStoryTokens: number;
  totalTokens: number;
  maxContextTokens: number;
}

export interface PreviousChapterTailInput {
  title: string;
  actTitle?: string;
  tailContent: string;
}

export interface ContextBuildResult {
  triggeredEntries: LorebookEntry[];
  activeCharacters: ActiveCharacterMatch[];
  enabledSummaries: StorySummary[];
  recalledMemories: ScoredMemoryCard[];
  trimmedStory: string;
  storyWithAuthorsNote: string;
  chatMessages: ChatMessage[];
  chatMessagesUserOnly: ChatMessage[];
  rawCompletionPrompt: string;
  totalContextChars: number;
  storyBudgetRemaining: number;
  previousChapterTail: PreviousChapterTailInput | null;
  prosePlotBlocksIncluded: MasterPlotBlock[];
  tokenBreakdown: TokenBudgetBreakdown;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 3.8));
}

export function estimateTokensFromChars(chars: number): number {
  if (chars <= 0) return 0;
  return Math.max(1, Math.round(chars / 3.8));
}

export function parseKeywords(keywordsStr: string): string[] {
  return keywordsStr
    .split(',')
    .map((k) => k.trim().toLocaleLowerCase())
    .filter(Boolean);
}

export function findTriggeredLorebookEntries(
  storyText: string,
  entries: LorebookEntry[],
  scanWindowChars = 2000
): LorebookEntry[] {
  if (!storyText || entries.length === 0) return [];
  const tail = storyText.slice(-scanWindowChars).toLocaleLowerCase();

  return entries.filter((entry) => {
    if (!entry.enabled) return false;
    const keywords = parseKeywords(entry.keywords);
    if (keywords.length === 0) return false;
    return keywords.some((kw) => tail.includes(kw));
  });
}

export function trimStoryToBudget(storyText: string, budgetChars: number): string {
  if (budgetChars <= 0) return '';
  if (storyText.length <= budgetChars) return storyText;

  const paragraphs = storyText.split(/\n\s*\n/);
  if (paragraphs.length === 1) {
    const slice = storyText.slice(-budgetChars);
    const firstSpace = slice.search(/\s/);
    if (firstSpace > 0 && firstSpace < slice.length * 0.25) {
      return slice.slice(firstSpace + 1);
    }
    return slice;
  }

  const kept: string[] = [];
  let currentLength = 0;

  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const para = paragraphs[i];
    const separatorLen = kept.length > 0 ? 2 : 0;
    if (currentLength + para.length + separatorLen <= budgetChars) {
      kept.unshift(para);
      currentLength += para.length + separatorLen;
    } else {
      break;
    }
  }

  if (kept.length === 0) {
    const newest = paragraphs[paragraphs.length - 1];
    const slice = newest.slice(-budgetChars);
    const firstSpace = slice.search(/\s/);
    if (firstSpace > 0 && firstSpace < slice.length * 0.25) {
      return slice.slice(firstSpace + 1);
    }
    return slice;
  }

  return kept.join('\n\n');
}

export function injectAuthorsNote(
  storyText: string,
  authorsNote: string,
  depthParagraphs: number
): string {
  const note = authorsNote.trim();
  if (!note) return storyText;

  const formattedNote = `[Author's Note: ${note}]`;
  if (!storyText.trim()) return formattedNote;

  const depth = Math.max(0, Math.floor(depthParagraphs));
  if (depth === 0) {
    return `${storyText.trimEnd()}\n\n${formattedNote}`;
  }

  const paragraphs = storyText.split(/\n\s*\n/);
  if (paragraphs.length <= depth) {
    return `${formattedNote}\n\n${storyText}`;
  }

  const insertIndex = paragraphs.length - depth;
  const updated = [
    ...paragraphs.slice(0, insertIndex),
    formattedNote,
    ...paragraphs.slice(insertIndex),
  ];
  return updated.join('\n\n');
}

function compactSingleLine(text: string, maxChars = 220): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}…` : clean;
}

/**
 * Builds both Chat Completions messages and Text Completions raw prompt for PROSE generation.
 * Enforces Smart Context Routing:
 * - Only Master Plot blocks explicitly toggled `includeInProse === true` are injected.
 * - Active Volume Arc Goal & Chapter Goal are injected as a compact 2-line steering summary
 *   (keeping full future spoilers and Architect-only threads out of prose).
 */
export function buildPromptContext(
  project: Pick<
    StoryProject,
    'storyText' | 'systemPrompt' | 'memory' | 'authorsNote' | 'authorsNoteDepth' | 'lorebook' | 'sampler'
  > & {
    protagonist?: StoryProject['protagonist'];
    characters?: StoryProject['characters'];
    summaries?: StoryProject['summaries'];
    longTermMemories?: StoryProject['longTermMemories'];
    masterPlotBlocks?: StoryProject['masterPlotBlocks'];
  },
  options?: {
    useAssistantPrefill?: boolean;
    chapterBeats?: string;
    sceneBeats?: string;
    chapterGoal?: string;
    volumeBlueprint?: VolumeBlueprint;
    previousChapterTail?: PreviousChapterTailInput | null;
    previousSceneTail?: { title: string; chapterTitle?: string; tailContent: string } | null;
  }
): ContextBuildResult {
  const useAssistantPrefill = options?.useAssistantPrefill ?? true;

  const rawPrev = options?.previousChapterTail ?? options?.previousSceneTail ?? null;
  const previousChapterTail: PreviousChapterTailInput | null =
    rawPrev && rawPrev.tailContent.trim()
      ? {
          title: rawPrev.title,
          actTitle:
            'actTitle' in rawPrev
              ? rawPrev.actTitle
              : 'chapterTitle' in rawPrev
              ? rawPrev.chapterTitle
              : undefined,
          tailContent: rawPrev.tailContent.trim().slice(-1500),
        }
      : null;

  const scanText = previousChapterTail
    ? `${previousChapterTail.tailContent}\n\n${project.storyText}`
    : project.storyText;

  const triggeredEntries = findTriggeredLorebookEntries(scanText, project.lorebook, 2000);
  const activeCharacters = findActiveCharacters(scanText, project.characters ?? [], 2000);
  const enabledSummaries = (project.summaries ?? []).filter(
    (s) => s.enabled && s.content.trim().length > 0
  );
  const recalledMemories = retrieveRelevantMemories(
    scanText,
    project.longTermMemories ?? [],
    5,
    1500
  );

  // Smart Context Routing for Prose: ONLY blocks explicitly marked `includeInProse`
  const prosePlotBlocksIncluded = (project.masterPlotBlocks ?? []).filter(
    (b) => b.includeInProse && b.content.trim().length > 0
  );

  const systemStyleBlock = project.systemPrompt.trim()
    ? `[System Style Prompt]\n${project.systemPrompt.trim()}`
    : '';
  const protagonistBlock = formatProtagonistPromptBlock(project.protagonist);
  const activeCharactersBlock = formatCharacterRosterBlock(activeCharacters);

  const memoryBlock = project.memory.trim()
    ? `[Memory]\n${project.memory.trim()}`
    : '';

  const prosePlotBlock =
    prosePlotBlocksIncluded.length > 0
      ? `[World & Story Premise]\n${prosePlotBlocksIncluded
          .map((b) => `${b.title}: ${b.content.trim()}`)
          .join('\n\n')}`
      : '';

  const summariesBlock =
    enabledSummaries.length > 0
      ? `[Story Summaries]\n${enabledSummaries
          .map((s) => `${s.title ? `${s.title}:\n` : ''}${s.content.trim()}`)
          .join('\n\n')}`
      : '';

  const recalledMemoryBlock =
    recalledMemories.length > 0
      ? `[Recalled Long-Term Memories]\n${recalledMemories
          .map((m) => `- (${m.card.category}) ${m.card.content.trim()}`)
          .join('\n')}`
      : '';

  const lorebookBlock =
    triggeredEntries.length > 0
      ? `[World Info]\n${triggeredEntries
          .map((e) => `${e.name ? `${e.name}: ` : ''}${e.content.trim()}`)
          .join('\n\n')}`
      : '';

  const previousChapterBlock = previousChapterTail
    ? `[Previous Chapter Context: ${previousChapterTail.actTitle ? `${previousChapterTail.actTitle} — ` : ''}${previousChapterTail.title}]\n${previousChapterTail.tailContent}`
    : '';

  // Compact 2-line Volume & Chapter Goal summary for Prose steering
  const goalSummaryLines: string[] = [];
  const compactArcGoal = options?.volumeBlueprint?.arcGoal
    ? compactSingleLine(options.volumeBlueprint.arcGoal, 200)
    : '';
  const compactChapterGoal = options?.chapterGoal
    ? compactSingleLine(options.chapterGoal, 220)
    : '';
  if (compactArcGoal) {
    goalSummaryLines.push(`Mục tiêu Quyển: ${compactArcGoal}`);
  }
  if (compactChapterGoal) {
    goalSummaryLines.push(`Mục tiêu Chương: ${compactChapterGoal}`);
  }

  const effectiveBeats = (options?.chapterBeats ?? options?.sceneBeats ?? '').trim();

  // Combine Author's Note, compact Arc/Chapter Goal, and Chapter Beats into steering slot
  const steeringParts: string[] = [];
  if (project.authorsNote.trim()) {
    steeringParts.push(project.authorsNote.trim());
  }
  if (goalSummaryLines.length > 0) {
    steeringParts.push(goalSummaryLines.join('\n'));
  }
  if (effectiveBeats) {
    steeringParts.push(
      `Chapter Beats (Dàn ý chương hiện tại):\n${effectiveBeats}\n\n[Prompt Priority Guardrail]\nThe existing story text in the editor is absolute canon. Continue seamlessly from the final sentence and only execute upcoming beats that have not yet occurred. Văn bản hiện có trong Editor là chân lý tuyệt đối; viết thẳng văn xuôi tiểu thuyết nối tiếp các nhịp chưa diễn ra, không lặp lại nhãn dàn ý hay thêm tiêu đề phân cách.`
    );
  }
  const authorsNoteBlock =
    steeringParts.length > 0 ? `[Author's Note]\n${steeringParts.join('\n\n')}` : '';

  const referenceSections: string[] = [];
  if (systemStyleBlock) referenceSections.push(systemStyleBlock);
  if (protagonistBlock) referenceSections.push(protagonistBlock);
  if (prosePlotBlock) referenceSections.push(prosePlotBlock);
  if (memoryBlock) referenceSections.push(memoryBlock);
  if (summariesBlock) referenceSections.push(summariesBlock);
  if (recalledMemoryBlock) referenceSections.push(recalledMemoryBlock);
  if (activeCharactersBlock) referenceSections.push(activeCharactersBlock);
  if (lorebookBlock) referenceSections.push(lorebookBlock);
  if (previousChapterBlock) referenceSections.push(previousChapterBlock);
  if (authorsNoteBlock) referenceSections.push(authorsNoteBlock);

  const wrappedReferenceBlock =
    referenceSections.length > 0
      ? `${REFERENCE_HEADER}\n\n${referenceSections.join('\n\n')}`
      : '';

  const reservedChars =
    wrappedReferenceBlock.length +
    CHAT_CONTINUE_INSTRUCTION.length +
    120;

  const storyBudgetRemaining = Math.max(500, project.sampler.contextBudgetChars - reservedChars);
  const trimmedStory = trimStoryToBudget(project.storyText, storyBudgetRemaining);

  const hasStory = trimmedStory.trim().length > 0;
  const chatMessagesWithPrefill: ChatMessage[] = [];
  if (wrappedReferenceBlock) {
    chatMessagesWithPrefill.push({
      role: 'system',
      content: wrappedReferenceBlock,
    });
  }
  chatMessagesWithPrefill.push({
    role: 'user',
    content: hasStory ? CHAT_CONTINUE_INSTRUCTION : CHAT_BEGIN_INSTRUCTION,
  });
  if (hasStory) {
    chatMessagesWithPrefill.push({
      role: 'assistant',
      content: trimmedStory.trimEnd(),
    });
  }

  const chatMessagesUserOnly: ChatMessage[] = [];
  if (wrappedReferenceBlock) {
    chatMessagesUserOnly.push({
      role: 'system',
      content: wrappedReferenceBlock,
    });
  }
  chatMessagesUserOnly.push({
    role: 'user',
    content: hasStory
      ? `${CHAT_CONTINUE_INSTRUCTION}\n\n[BẢN THẢO HIỆN TẠI]\n${trimmedStory.trimEnd()}`
      : CHAT_BEGIN_INSTRUCTION,
  });

  const chatMessages = useAssistantPrefill ? chatMessagesWithPrefill : chatMessagesUserOnly;

  const cleanStoryTail = trimmedStory.trimEnd();
  const rawCompletionPrompt = wrappedReferenceBlock
    ? `${wrappedReferenceBlock}\n***\n${cleanStoryTail}`
    : cleanStoryTail;

  const totalContextChars = chatMessages.reduce((sum, m) => sum + m.content.length, 0);

  const systemAndPersonaTokens = estimateTokensFromChars(
    systemStyleBlock.length + protagonistBlock.length + prosePlotBlock.length
  );
  const memoryAndSummariesTokens = estimateTokensFromChars(
    memoryBlock.length + summariesBlock.length + recalledMemoryBlock.length
  );
  const charactersAndLoreTokens = estimateTokensFromChars(
    activeCharactersBlock.length + lorebookBlock.length
  );
  const recentStoryTokens = estimateTokensFromChars(
    previousChapterBlock.length + trimmedStory.length + authorsNoteBlock.length
  );
  const totalTokens =
    systemAndPersonaTokens +
    memoryAndSummariesTokens +
    charactersAndLoreTokens +
    recentStoryTokens;
  const maxContextTokens = Math.max(500, Math.round(project.sampler.contextBudgetChars / 3.8));

  return {
    triggeredEntries,
    activeCharacters,
    enabledSummaries,
    recalledMemories,
    trimmedStory,
    storyWithAuthorsNote: trimmedStory,
    chatMessages,
    chatMessagesUserOnly,
    rawCompletionPrompt,
    totalContextChars,
    storyBudgetRemaining,
    previousChapterTail,
    prosePlotBlocksIncluded,
    tokenBreakdown: {
      systemAndPersonaTokens,
      memoryAndSummariesTokens,
      charactersAndLoreTokens,
      recentStoryTokens,
      totalTokens,
      maxContextTokens,
    },
  };
}

export function parseLorebookJson(rawJson: string): LorebookEntry[] {
  const parsed: unknown = JSON.parse(rawJson);

  let rawItems: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (parsed && typeof parsed === 'object' && 'entries' in parsed) {
    const entriesField = (parsed as { entries: unknown }).entries;
    if (Array.isArray(entriesField)) {
      rawItems = entriesField;
    } else if (entriesField && typeof entriesField === 'object') {
      rawItems = Object.values(entriesField as Record<string, unknown>);
    }
  } else {
    throw new Error('Unrecognized Lorebook JSON structure. Expected an array or an "entries" field.');
  }

  const normalized: LorebookEntry[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;

    const rawKeys = rec.keys ?? rec.key ?? rec.keywords ?? [];
    let keywords = '';
    if (Array.isArray(rawKeys)) {
      keywords = rawKeys.map((k) => String(k).trim()).filter(Boolean).join(', ');
    } else if (typeof rawKeys === 'string') {
      keywords = rawKeys;
    }

    const content =
      typeof rec.content === 'string'
        ? rec.content
        : typeof rec.text === 'string'
        ? rec.text
        : '';

    if (!content.trim() && !keywords.trim()) continue;

    const name =
      (typeof rec.name === 'string' && rec.name) ||
      (typeof rec.comment === 'string' && rec.comment) ||
      (typeof rec.displayName === 'string' && rec.displayName) ||
      (typeof rec.title === 'string' && rec.title) ||
      keywords.split(',')[0]?.trim() ||
      `Entry ${i + 1}`;

    let enabled = true;
    if (typeof rec.enabled === 'boolean') {
      enabled = rec.enabled;
    } else if (typeof rec.disable === 'boolean') {
      enabled = !rec.disable;
    } else if (typeof rec.disabled === 'boolean') {
      enabled = !rec.disabled;
    }

    normalized.push({
      id: `lore_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      keywords: keywords.trim(),
      content: content.trim(),
      enabled,
    });
  }

  return normalized;
}

export function parseStopSequences(stopStr: string): string[] {
  return stopStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SseDeltaResult {
  token: string | null;
  reasoningToken?: string | null;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export function parseSseDelta(line: string, mode: ApiMode): SseDeltaResult {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data:')) {
    return { token: null, done: false };
  }

  const payload = trimmed.slice(5).trim();
  if (payload === '[DONE]') {
    return { token: null, done: true };
  }

  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{
        text?: string;
        delta?: {
          content?: string | Array<{ type?: string; text?: string }>;
          text?: string;
          reasoning_content?: string;
          reasoning?: string;
          reasoning_details?: Array<{ text?: string }>;
        };
        message?: {
          content?: string;
          reasoning_content?: string;
          reasoning?: string;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    };

    const usage =
      json.usage &&
      (typeof json.usage.prompt_tokens === 'number' ||
        typeof json.usage.completion_tokens === 'number')
        ? {
            promptTokens: Math.max(0, Number(json.usage.prompt_tokens) || 0),
            completionTokens: Math.max(0, Number(json.usage.completion_tokens) || 0),
          }
        : undefined;

    const choice = json.choices?.[0];
    if (!choice) {
      return { token: null, done: false, ...(usage ? { usage } : {}) };
    }

    const detailsText = Array.isArray(choice.delta?.reasoning_details)
      ? choice.delta?.reasoning_details.map((d) => d?.text ?? '').join('')
      : '';

    const reasoningToken =
      choice.delta?.reasoning_content ??
      choice.delta?.reasoning ??
      (detailsText || null) ??
      choice.message?.reasoning_content ??
      choice.message?.reasoning ??
      null;

    const deltaContent = Array.isArray(choice.delta?.content)
      ? choice.delta?.content.map((part) => part?.text ?? '').join('')
      : choice.delta?.content;

    if (mode === 'chat') {
      const token =
        deltaContent ??
        choice.delta?.text ??
        choice.message?.content ??
        choice.text ??
        null;
      return {
        token: token ?? null,
        ...(reasoningToken ? { reasoningToken } : {}),
        done: false,
        ...(usage ? { usage } : {}),
      };
    } else {
      const token = choice.text ?? choice.delta?.text ?? deltaContent ?? null;
      return {
        token: token ?? null,
        ...(reasoningToken ? { reasoningToken } : {}),
        done: false,
        ...(usage ? { usage } : {}),
      };
    }
  } catch {
    return { token: null, done: false };
  }
}

export function buildRequestPayload(
  model: string,
  mode: ApiMode,
  sampler: SamplerSettings,
  context: ContextBuildResult,
  options?: {
    forceUserOnlyChat?: boolean;
    includeUsage?: boolean;
    enableThinking?: boolean;
    omitThinkingFields?: boolean;
    maxTokensOverride?: number;
  }
): Record<string, unknown> {
  const stop = parseStopSequences(sampler.stopSequences);
  const enableThinking = Boolean(options?.enableThinking);
  const effectiveMaxTokens =
    typeof options?.maxTokensOverride === 'number' && options.maxTokensOverride > 0
      ? options.maxTokensOverride
      : sampler.maxTokens;
  const thinkingExtras = buildThinkingPayloadExtras(enableThinking, effectiveMaxTokens);

  const sharedParams: Record<string, unknown> = {
    model: model.trim() || 'default',
    stream: true,
    max_tokens: thinkingExtras.maxTokens,
    temperature: sampler.temperature,
    top_p: sampler.topP,
    min_p: sampler.minP,
    repeat_penalty: sampler.repetitionPenalty,
    repetition_penalty: sampler.repetitionPenalty,
    presence_penalty: sampler.presencePenalty,
    frequency_penalty: sampler.frequencyPenalty,
    dry_multiplier: sampler.dryMultiplier ?? 0.8,
    dry_base: sampler.dryBase ?? 1.75,
    dry_allowed_length: sampler.dryAllowedLength ?? 2,
    ...(!options?.omitThinkingFields
      ? {
          chat_template_kwargs: thinkingExtras.chat_template_kwargs,
          reasoning: thinkingExtras.reasoning,
        }
      : {}),
    ...(stop.length > 0 ? { stop } : {}),
  };

  if (mode === 'chat') {
    return {
      ...sharedParams,
      ...(options?.includeUsage ? { stream_options: { include_usage: true } } : {}),
      messages: options?.forceUserOnlyChat
        ? context.chatMessagesUserOnly
        : context.chatMessages,
    };
  }

  return {
    ...sharedParams,
    prompt: context.rawCompletionPrompt,
  };
}
