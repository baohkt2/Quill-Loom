export type ApiMode = 'chat' | 'completions';
export type ApiProfileChannel = 'prose' | 'architect';
export type ThinkingModePreference = 'auto' | 'on' | 'off';
export type ThinkingTaskKind =
  | 'continue_story'
  | 'generate_beats'
  | 'sync_beats'
  | 'agent_chat'
  | 'chapter_sync'
  | 'inline_rewrite'
  | 'plot_architect'
  | 'utility';

export type ChapterStatus = 'Draft' | 'Revised' | 'Final';
export type SceneStatus = ChapterStatus;

export interface ChapterSnapshot {
  id: string;
  label: string;
  title: string;
  content: string;
  beats: string;
  chapterGoal?: string;
  createdAt: number;
}

export type SceneSnapshot = ChapterSnapshot;

export interface LegacyManuscriptScene {
  id: string;
  title: string;
  content: string;
  beats?: string;
  status?: ChapterStatus;
  snapshots?: ChapterSnapshot[];
  updatedAt?: number;
}

export interface ManuscriptChapter {
  id: string;
  title: string;
  content: string;
  beats: string;
  chapterGoal: string;
  status: ChapterStatus;
  snapshots: ChapterSnapshot[];
  updatedAt: number;
}

export interface VolumeBlueprint {
  arcGoal: string;
  keyAntagonists: string;
  turningPointsAndClimax: string;
}

export const DEFAULT_VOLUME_BLUEPRINT: VolumeBlueprint = {
  arcGoal: '',
  keyAntagonists: '',
  turningPointsAndClimax: '',
};

export interface ManuscriptAct {
  id: string;
  title: string;
  blueprint: VolumeBlueprint;
  chapters: ManuscriptChapter[];
  collapsed?: boolean;
}

export interface MasterPlotBlock {
  id: string;
  title: string;
  content: string;
  includeInArchitect: boolean;
  includeInProse: boolean;
}

export type PlotThreadStatus = 'Open' | 'Resolved';

export interface PlotThread {
  id: string;
  title: string;
  description: string;
  introducedChapter: string;
  status: PlotThreadStatus;
}

export interface LorebookEntry {
  id: string;
  name: string;
  keywords: string;
  content: string;
  enabled: boolean;
}

export interface ProtagonistProfile {
  name: string;
  ageOrTitle: string;
  personality: string;
  background: string;
  appearance: string;
  goal: string;
  realm: string;
  techniques: string;
  resources: string;
  inventory: string;
}

export type CharacterRole =
  | 'Đồng hành'
  | 'Đối thủ'
  | 'Sư phụ / Tiền bối'
  | 'Phản diện'
  | 'Nhân vật phụ';

export interface CharacterCard {
  id: string;
  name: string;
  aliases: string;
  role: CharacterRole;
  appearanceAndPersonality: string;
  currentStatusAndRelationship: string;
  notes: string;
  enabled: boolean;
}

export type MemoryCategory =
  | 'Sự kiện'
  | 'Lời hứa'
  | 'Mối quan hệ'
  | 'Bí mật'
  | 'Vật phẩm'
  | 'Cảnh giới';

export interface LongTermMemoryCard {
  id: string;
  content: string;
  keywords: string;
  category: MemoryCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  enabled: boolean;
}

export interface StorySummary {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: number;
}

export interface AgentContextToggles {
  includeChapter: boolean;
  includeBeats: boolean;
  includeCharactersAndLore: boolean;
  includeSummaries: boolean;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
  appliedActionIds?: string[];
}

export interface SamplerSettings {
  temperature: number;
  topP: number;
  minP: number;
  repetitionPenalty: number;
  presencePenalty: number;
  frequencyPenalty: number;
  dryMultiplier: number;
  dryBase: number;
  dryAllowedLength: number;
  maxTokens: number;
  contextBudgetChars: number;
  stopSequences: string;
}

export interface ArchitectApiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  fallbackModel: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  availableModels: string[];
}

export interface ApiSettings {
  mode: ApiMode;
  baseUrl: string;
  apiKey: string;
  model: string;
  fallbackModel: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  availableModels: string[];
  useAssistantPrefill: boolean;
  thinkingPreference: ThinkingModePreference;
  useSeparateArchitectApi: boolean;
  architectApi: ArchitectApiSettings;
}

export interface TokenUsageReport {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  channel?: ApiProfileChannel;
}

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalCalls: number;
  estimatedCostUsd: number;
  sessionPromptTokens: number;
  sessionCompletionTokens: number;
  sessionCostUsd: number;
}

export interface GenerationSwipeVariant {
  text: string;
  thinking?: string;
}

export interface GenerationSwipeState {
  chapterId: string;
  startOffset: number;
  endOffset: number;
  variants: GenerationSwipeVariant[];
  activeIndex: number;
}

export interface StoryProject {
  id: string;
  title: string;
  acts: ManuscriptAct[];
  activeChapterId: string;
  storyText: string;
  systemPrompt: string;
  memory: string;
  authorsNote: string;
  authorsNoteDepth: number;
  lorebook: LorebookEntry[];
  protagonist: ProtagonistProfile;
  characters: CharacterCard[];
  longTermMemories: LongTermMemoryCard[];
  summaries: StorySummary[];
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
  agentHistory: AgentChatMessage[];
  agentContextToggles: AgentContextToggles;
  sampler: SamplerSettings;
  updatedAt: number;
}

export interface ChapterSyncFactItem {
  id: string;
  content: string;
  category: MemoryCategory;
  keywords: string;
}

export interface ChapterSyncCharacterUpdate {
  id: string;
  name: string;
  updatedStatus: string;
}

export interface ChapterSyncProtagonistUpdate {
  realm?: string;
  techniques?: string;
  resources?: string;
  inventory?: string;
}

export interface ChapterSyncLoreSuggestion {
  id: string;
  action: 'new' | 'update';
  name: string;
  keys: string;
  content: string;
}

export interface ChapterSyncPlotThreadUpdate {
  id: string;
  action: 'new' | 'resolve';
  title: string;
  description: string;
  introducedChapter: string;
  existingThreadId?: string;
}

export interface ChapterSyncResult {
  summary: string;
  longTermFacts: ChapterSyncFactItem[];
  characterUpdates: ChapterSyncCharacterUpdate[];
  protagonistStatusUpdate: ChapterSyncProtagonistUpdate | null;
  lorebookSuggestions: ChapterSyncLoreSuggestion[];
  plotThreadUpdates: ChapterSyncPlotThreadUpdate[];
  thinking?: string;
}

export type ImportCategory = 'characters' | 'lorebook' | 'memories' | 'presets' | 'masterPlot';

export const DEFAULT_ARCHITECT_API_SETTINGS: ArchitectApiSettings = {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: '',
  fallbackModel: '',
  inputPricePerMillion: 0,
  outputPricePerMillion: 0,
  availableModels: [],
};

export const DEFAULT_API_SETTINGS: ApiSettings = {
  mode: 'chat',
  baseUrl: 'http://localhost:8080/v1',
  apiKey: '',
  model: '',
  fallbackModel: '',
  inputPricePerMillion: 0,
  outputPricePerMillion: 0,
  availableModels: [],
  useAssistantPrefill: true,
  thinkingPreference: 'auto',
  useSeparateArchitectApi: false,
  architectApi: { ...DEFAULT_ARCHITECT_API_SETTINGS },
};

export const DEFAULT_SAMPLER_SETTINGS: SamplerSettings = {
  temperature: 0.8,
  topP: 0.92,
  minP: 0.05,
  repetitionPenalty: 1.08,
  presencePenalty: 0.15,
  frequencyPenalty: 0.15,
  dryMultiplier: 0.8,
  dryBase: 1.75,
  dryAllowedLength: 2,
  maxTokens: 600,
  contextBudgetChars: 16000,
  stopSequences: '',
};

export const DEFAULT_AGENT_CONTEXT_TOGGLES: AgentContextToggles = {
  includeChapter: true,
  includeBeats: true,
  includeCharactersAndLore: true,
  includeSummaries: false,
};

export const DEFAULT_PROTAGONIST_PROFILE: ProtagonistProfile = {
  name: '',
  ageOrTitle: '',
  personality: '',
  background: '',
  appearance: '',
  goal: '',
  realm: '',
  techniques: '',
  resources: '',
  inventory: '',
};

export const DEFAULT_USAGE_STATS: UsageStats = {
  promptTokens: 0,
  completionTokens: 0,
  totalCalls: 0,
  estimatedCostUsd: 0,
  sessionPromptTokens: 0,
  sessionCompletionTokens: 0,
  sessionCostUsd: 0,
};
