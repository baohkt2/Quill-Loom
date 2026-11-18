import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiSettings,
  ChapterSyncResult,
  CharacterCard,
  GenerationSwipeState,
  ImportCategory,
  LongTermMemoryCard,
  LorebookEntry,
  ManuscriptAct,
  ManuscriptChapter,
  MasterPlotBlock,
  PlotThread,
  ProtagonistProfile,
  SamplerSettings,
  StoryProject,
  StorySummary,
  TokenUsageReport,
  UsageStats,
  VolumeBlueprint,
} from './types/novel';
import {
  calculateUsageCostUsd,
  requestThinkingCompletion,
  requestUtilityCompletion,
  resolveApiProfile,
  streamAgentChat,
  streamInlineRewrite,
  streamNovelContinuation,
  streamThinkingPromptTask,
} from './utils/apiClient';
import {
  AgentActionBlock,
  buildAgentMessages,
} from './utils/agentEngine';
import {
  extractCharaJsonFromPngBuffer,
  mergeCharactersList,
  mergeLorebookList,
  mergeMemoriesList,
  parseImportedCharactersJson,
  parseImportedMemoriesJson,
  parseImportedPresetsJson,
  serializeCharactersJson,
  serializeLorebookJson,
  serializeMemoriesJson,
  serializePresetsJson,
  serializeSingleCharacterJson,
} from './utils/assetExchange';
import {
  buildCharacterScanPrompt,
  findActiveCharacters,
  parseCharacterScanResponse,
} from './utils/characterEngine';
import {
  buildChapterSyncPrompt,
  compileActiveChapterText,
  parseChapterSyncResponse,
} from './utils/chapterSyncEngine';
import {
  appendChapterSnapshot,
  createChapterSnapshot,
  restoreChapterFromSnapshot,
} from './utils/idbStorage';
import {
  compileManuscriptHtml,
  compileManuscriptMarkdown,
} from './utils/manuscriptCompiler';
import {
  compileStoryTextFromActs,
  createAct,
  createChapter,
  cycleChapterStatus,
  findActiveChapterLocation,
  getAdjacentChapterLocations,
  getImmediatePreviousChapter,
  getPreviousChapterTail,
  moveChapterInAct,
  updateActInActs,
  updateChapterInActs,
} from './utils/manuscriptEngine';
import {
  buildExtractFactsPrompt,
  buildSummarizePrompt,
  parseExtractedFactsResponse,
} from './utils/memoryEngine';
import {
  buildExpandPlotBlockPrompt,
  buildGenerateVolumeChaptersPrompt,
  buildGenerateVolumesPrompt,
  buildLivingPlotRealignPrompt,
  buildSeedToBiblePrompt,
  convertGeneratedChapters,
  convertGeneratedVolumes,
  GeneratedSeedBibleResult,
  LivingPlotRealignResult,
  mergeOrReplaceMasterPlot,
  parseGenerateVolumeChaptersResponse,
  parseGenerateVolumesResponse,
  parseLivingPlotRealignResponse,
  parseMasterPlotImportJson,
  parseSeedToBibleResponse,
  serializeMasterPlotJson,
} from './utils/plotArchitectEngine';
import {
  buildPromptContext,
  findTriggeredLorebookEntries,
  parseLorebookJson,
} from './utils/promptBuilder';
import {
  BackupReminderInfo,
  createBlankProject,
  loadActiveProjectId,
  loadApiSettings,
  loadBackupInfo,
  loadProjects,
  loadProjectsWithIDBMigration,
  loadUsageStats,
  migrateProject,
  saveActiveProjectId,
  saveApiSettings,
  saveBackupInfo,
  saveProjects,
  saveUsageStats,
} from './utils/storage';
import {
  buildChapterBeatsPrompt,
  buildSyncBeatsPrompt,
  cleanGeneratedBeatsText,
  mergePivotIntoSceneBeats,
  resolveEffectiveThinking,
  stripLeadingProseMarkers,
} from './utils/thinkingOrchestrator';

import { ApiSettingsModal } from './components/ApiSettingsModal';
import { BulkImportModal } from './components/BulkImportModal';
import { ChapterSyncModal } from './components/ChapterSyncModal';
import { ContextSidebar } from './components/ContextSidebar';
import { EditorCanvas } from './components/EditorCanvas';
import { ImportConflictModal } from './components/ImportConflictModal';
import { LeftStudioSidebar } from './components/LeftStudioSidebar';
import { ManuscriptSearchModal } from './components/ManuscriptSearchModal';
import { MasterPlotModal } from './components/MasterPlotModal';
import { ProjectModal } from './components/ProjectModal';
import { PromptInspectorModal } from './components/PromptInspectorModal';
import { TopBar } from './components/TopBar';
import { VolumeBlueprintModal } from './components/VolumeBlueprintModal';

type PendingImportState =
  | {
      category: 'characters';
      summaryText: string;
      characters: CharacterCard[];
      protagonistUpdate?: Partial<ProtagonistProfile> | null;
    }
  | {
      category: 'lorebook';
      summaryText: string;
      entries: LorebookEntry[];
    }
  | {
      category: 'memories';
      summaryText: string;
      memories: LongTermMemoryCard[];
    }
  | {
      category: 'presets';
      summaryText: string;
      systemPrompt?: string;
      sampler?: Partial<SamplerSettings>;
    }
  | {
      category: 'masterPlot';
      summaryText: string;
      masterPlotBlocks: MasterPlotBlock[];
      plotThreads: PlotThread[];
    };

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function App() {
  const initialProjects = useMemo(() => loadProjects(), []);
  const initialActiveId = useMemo(
    () => loadActiveProjectId(initialProjects[0].id),
    [initialProjects]
  );

  const [projects, setProjects] = useState<StoryProject[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialActiveId);
  const projectsRef = useRef<StoryProject[]>(initialProjects);
  const activeProjectIdRef = useRef<string>(initialActiveId);

  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => loadApiSettings());
  const apiSettingsRef = useRef<ApiSettings>(apiSettings);
  apiSettingsRef.current = apiSettings;

  const [usageStats, setUsageStats] = useState<UsageStats>(() => loadUsageStats());
  const [backupInfo, setBackupInfo] = useState<BackupReminderInfo>(() => loadBackupInfo());

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('quill_loom_dark_mode') === '1';
    } catch {
      return false;
    }
  });

  // Modals & Drawers
  const [showApiModal, setShowApiModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showMasterPlotModal, setShowMasterPlotModal] = useState(false);
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);

  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // Generation & Beats States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBeats, setIsGeneratingBeats] = useState(false);
  const [beatsThinking, setBeatsThinking] = useState('');
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [beatsOutOfSync, setBeatsOutOfSync] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeThinkingPreview, setActiveThinkingPreview] = useState('');

  // Undo & Swipes
  const [undoSnapshot, setUndoSnapshot] = useState<{
    chapterId: string;
    previousText: string;
  } | null>(null);
  const [swipeState, setSwipeState] = useState<GenerationSwipeState | null>(null);

  // Agent Chat States
  const [isAgentStreaming, setIsAgentStreaming] = useState(false);
  const [agentStreamingText, setAgentStreamingText] = useState('');
  const [agentStreamingThinking, setAgentStreamingThinking] = useState('');

  // Chapter Sync States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncingChapter, setIsSyncingChapter] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<ChapterSyncResult | null>(null);

  // Master Plot / Volume Architect Busy States
  const [isPlotArchitectBusy, setIsPlotArchitectBusy] = useState(false);
  const [plotArchitectBusyLabel, setPlotArchitectBusyLabel] = useState('');
  const [plotArchitectThinking, setPlotArchitectThinking] = useState('');
  const [plotArchitectChars, setPlotArchitectChars] = useState(0);
  const [plotArchitectError, setPlotArchitectError] = useState<string | null>(null);
  const [plotArchitectSaveNotice, setPlotArchitectSaveNotice] = useState<string | null>(null);
  const [seedPreview, setSeedPreview] = useState<GeneratedSeedBibleResult | null>(null);
  const [realignPreview, setRealignPreview] = useState<LivingPlotRealignResult | null>(null);

  // Memory / Character Scan Busy
  const [isBusyMemory, setIsBusyMemory] = useState(false);
  const [isScanningCharacters, setIsScanningCharacters] = useState(false);

  const proseAbortRef = useRef<AbortController | null>(null);
  const beatsAbortRef = useRef<AbortController | null>(null);
  const agentAbortRef = useRef<AbortController | null>(null);
  const plotArchitectAbortRef = useRef<AbortController | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);
  const saveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('quill_loom_dark_mode', darkMode ? '1' : '0');
    } catch {
      // Ignore
    }
  }, [darkMode]);

  // IndexedDB hydration on mount
  useEffect(() => {
    let active = true;
    loadProjectsWithIDBMigration().then(({ projects: loaded, activeProjectId: loadedActiveId }) => {
      if (!active) return;
      projectsRef.current = loaded;
      activeProjectIdRef.current = loadedActiveId;
      setProjects(loaded);
      setActiveProjectId(loadedActiveId);
    });
    return () => {
      active = false;
    };
  }, []);

  // Helper to update projects state + ref + storage synchronously
  const commitProjects = useCallback(
    (updater: (prev: StoryProject[]) => StoryProject[]) => {
      const next = updater(projectsRef.current);
      projectsRef.current = next;
      setProjects(next);
      saveProjects(next);
    },
    []
  );

  const commitActiveProjectId = useCallback((id: string) => {
    activeProjectIdRef.current = id;
    setActiveProjectId(id);
    saveActiveProjectId(id);
  }, []);

  const updateProjectById = useCallback(
    (projectId: string, updater: (p: StoryProject) => StoryProject) => {
      commitProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...updater(p), updatedAt: Date.now() } : p))
      );
    },
    [commitProjects]
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );

  const updateActiveProject = useCallback(
    (updater: (p: StoryProject) => StoryProject) => {
      updateProjectById(activeProjectIdRef.current, updater);
    },
    [updateProjectById]
  );

  const activeLocation = useMemo(
    () => findActiveChapterLocation(activeProject.acts, activeProject.activeChapterId),
    [activeProject.acts, activeProject.activeChapterId]
  );

  const activeChapter = activeLocation?.chapter ?? activeProject.acts[0].chapters[0];
  const activeAct = activeLocation?.act ?? activeProject.acts[0];

  const adjacentInfo = useMemo(
    () => getAdjacentChapterLocations(activeProject.acts, activeChapter.id),
    [activeProject.acts, activeChapter.id]
  );

  const previousChapterTail = useMemo(
    () => getPreviousChapterTail(activeProject.acts, activeChapter.id, 1500),
    [activeProject.acts, activeChapter.id]
  );

  const promptContextResult = useMemo(() => {
    return buildPromptContext(
      {
        ...activeProject,
        storyText: activeChapter.content,
      },
      {
        useAssistantPrefill: apiSettings.useAssistantPrefill,
        chapterBeats: activeChapter.beats,
        chapterGoal: activeChapter.chapterGoal,
        volumeBlueprint: activeAct.blueprint,
        previousChapterTail: previousChapterTail
          ? {
              title: previousChapterTail.chapterTitle,
              actTitle: previousChapterTail.actTitle,
              tailContent: previousChapterTail.tailContent,
            }
          : null,
      }
    );
  }, [activeProject, activeChapter, activeAct.blueprint, apiSettings.useAssistantPrefill, previousChapterTail]);

  const recordUsage = useCallback(
    (report: TokenUsageReport) => {
      const cost = calculateUsageCostUsd(report, apiSettingsRef.current);
      setUsageStats((prev) => {
        const next: UsageStats = {
          promptTokens: prev.promptTokens + report.promptTokens,
          completionTokens: prev.completionTokens + report.completionTokens,
          totalCalls: prev.totalCalls + 1,
          estimatedCostUsd: prev.estimatedCostUsd + cost,
          sessionPromptTokens: prev.sessionPromptTokens + report.promptTokens,
          sessionCompletionTokens: prev.sessionCompletionTokens + report.completionTokens,
          sessionCostUsd: prev.sessionCostUsd + cost,
        };
        saveUsageStats(next);
        return next;
      });
    },
    []
  );

  const handleSaveApiSettings = (next: ApiSettings) => {
    setApiSettings(next);
    apiSettingsRef.current = next;
    saveApiSettings(next);
  };

  // Update chapter content + compiled project storyText
  const updateChapterContentById = useCallback(
    (projectId: string, chapterId: string, newContent: string) => {
      updateProjectById(projectId, (proj) => {
        const nextActs = updateChapterInActs(proj.acts, chapterId, (ch) => ({
          ...ch,
          content: newContent,
          updatedAt: Date.now(),
        }));
        return {
          ...proj,
          acts: nextActs,
          storyText: compileStoryTextFromActs(nextActs),
        };
      });
    },
    [updateProjectById]
  );

  // Core Prose Generation (with Swipes + Empty Output Guard + Beats/Chapter Override)
  const runGeneration = useCallback(
    async (
      mode: 'append' | 'regenerate',
      overrides?: {
        beatsOverride?: string;
        chapterIdOverride?: string;
        baseTextOverride?: string;
      }
    ) => {
      const proj =
        projectsRef.current.find((p) => p.id === activeProjectIdRef.current) ??
        projectsRef.current[0];
      if (!proj) return;

      const targetLoc = findActiveChapterLocation(
        proj.acts,
        overrides?.chapterIdOverride ?? proj.activeChapterId
      );
      if (!targetLoc) return;

      const targetAct = targetLoc.act;
      const targetChapter = targetLoc.chapter;
      const targetChapterId = targetChapter.id;

      proseAbortRef.current?.abort();
      const controller = new AbortController();
      proseAbortRef.current = controller;

      setErrorMessage(null);
      setActiveThinkingPreview('');
      setIsGenerating(true);

      let baseText =
        typeof overrides?.baseTextOverride === 'string'
          ? overrides.baseTextOverride
          : targetChapter.content;
      let startOffset = baseText.length;

      if (mode === 'regenerate') {
        if (swipeState && swipeState.chapterId === targetChapterId) {
          baseText =
            targetChapter.content.slice(0, swipeState.startOffset) +
            targetChapter.content.slice(swipeState.endOffset);
          startOffset = swipeState.startOffset;
        } else if (undoSnapshot && undoSnapshot.chapterId === targetChapterId) {
          baseText = undoSnapshot.previousText;
          startOffset = baseText.length;
        }
      }

      setUndoSnapshot({ chapterId: targetChapterId, previousText: baseText });

      const needsSeparator =
        baseText.trim().length > 0 && !baseText.endsWith('\n') && !baseText.endsWith(' ');
      const prefixWithSpace =
        mode === 'append' || startOffset === baseText.length
          ? baseText + (needsSeparator ? '\n\n' : '')
          : baseText;

      const effectiveStartOffset =
        startOffset <= baseText.length && mode === 'regenerate' && swipeState?.chapterId === targetChapterId
          ? swipeState.startOffset
          : prefixWithSpace.length;

      const prevTail = getPreviousChapterTail(proj.acts, targetChapterId, 1500);
      const effectiveBeats =
        typeof overrides?.beatsOverride === 'string'
          ? overrides.beatsOverride
          : targetChapter.beats;

      const ctx = buildPromptContext(
        {
          ...proj,
          storyText: baseText,
        },
        {
          useAssistantPrefill: apiSettingsRef.current.useAssistantPrefill,
          chapterBeats: effectiveBeats,
          chapterGoal: targetChapter.chapterGoal,
          volumeBlueprint: targetAct.blueprint,
          previousChapterTail: prevTail
            ? {
                title: prevTail.chapterTitle,
                actTitle: prevTail.actTitle,
                tailContent: prevTail.tailContent,
              }
            : null,
        }
      );

      const composeText = (chunk: string) => {
        if (mode === 'regenerate' && swipeState?.chapterId === targetChapterId) {
          return (
            baseText.slice(0, effectiveStartOffset) +
            chunk +
            baseText.slice(effectiveStartOffset)
          );
        }
        return prefixWithSpace + chunk;
      };

      const enableThinking = resolveEffectiveThinking(
        apiSettingsRef.current.thinkingPreference,
        'continue_story'
      );

      const executeAttempt = async (
        attemptCtx: typeof ctx,
        opts: { forceUserOnlyChat?: boolean; maxTokensOverride?: number }
      ): Promise<{
        finalProse: string;
        rawProse: string;
        thinking: string;
        errored: boolean;
      }> => {
        let accumulated = '';
        let lastThinking = '';
        let finalProse = '';
        let rawProse = '';
        let errored = false;

        await streamNovelContinuation({
          api: apiSettingsRef.current,
          sampler: proj.sampler,
          context: attemptCtx,
          enableThinking,
          forceUserOnlyChat: opts.forceUserOnlyChat,
          maxTokensOverride: opts.maxTokensOverride,
          signal: controller.signal,
          handlers: {
            onToken: (token, fullCleanContent) => {
              accumulated =
                typeof fullCleanContent === 'string' ? fullCleanContent : accumulated + token;
              const visibleProse = stripLeadingProseMarkers(accumulated);
              const isPartialHeaderLine =
                /^\s*(?:={2,}|-{3,}|\[(?:TIẾP|BẮT ĐẦU|NỘI DUNG))[^\n]*$/i.test(visibleProse);
              if (visibleProse && !isPartialHeaderLine) {
                updateChapterContentById(proj.id, targetChapterId, composeText(visibleProse));
              }
            },
            onThinking: (thinking) => {
              lastThinking = thinking;
              setActiveThinkingPreview(thinking);
            },
            onUsage: recordUsage,
            onComplete: (finalAccumulated) => {
              rawProse =
                typeof finalAccumulated === 'string' ? finalAccumulated : accumulated;
              finalProse = stripLeadingProseMarkers(rawProse);
            },
            onError: (err) => {
              errored = true;
              setIsGenerating(false);
              setErrorMessage(err.message);
            },
          },
        });

        return { finalProse, rawProse, thinking: lastThinking, errored };
      };

      let result = await executeAttempt(ctx, {});

      if (controller.signal.aborted) {
        setIsGenerating(false);
        return;
      }
      if (result.errored) {
        return;
      }

      if (!result.finalProse.trim()) {
        const retryMessages = ctx.chatMessagesUserOnly.map((m, idx, arr) =>
          idx === arr.length - 1 && m.role === 'user'
            ? {
                ...m,
                content: `${m.content}\n\n[Lệnh viết trực tiếp]: Hãy xuất ngay 2–4 đoạn văn xuôi tiểu thuyết hoàn chỉnh bằng tiếng Việt, bắt đầu thẳng vào cảnh truyện, tuyệt đối không chỉ viết tiêu đề hay nhãn phân cách.`,
              }
            : m
        );
        const retryCtx = {
          ...ctx,
          chatMessagesUserOnly: retryMessages,
        };
        const retryMaxTokens = result.thinking.trim()
          ? Math.max(2500, proj.sampler.maxTokens)
          : Math.max(900, proj.sampler.maxTokens);

        result = await executeAttempt(retryCtx, {
          forceUserOnlyChat: true,
          maxTokensOverride: retryMaxTokens,
        });

        if (controller.signal.aborted) {
          setIsGenerating(false);
          return;
        }
        if (result.errored) {
          return;
        }
      }

      setIsGenerating(false);

      if (!result.finalProse.trim()) {
        updateChapterContentById(proj.id, targetChapterId, baseText);
        const rawSnippet = result.rawProse.trim().slice(0, 80);
        setErrorMessage(
          result.thinking.trim()
            ? `Model đã sinh ${result.thinking.trim().length.toLocaleString('vi-VN')} ký tự suy luận (<think>/reasoning) nhưng hết Max Tokens (${proj.sampler.maxTokens}) trước khi xuất văn xuôi. Hãy tăng Max Tokens hoặc dùng model không reasoning cho Prose Engine.`
            : rawSnippet
            ? `Prose Engine chỉ trả về nhãn phân cách ("${rawSnippet}") mà không viết nội dung truyện. Hãy kiểm tra lại model hoặc tắt/chỉnh Stop Sequences trong Cấu hình.`
            : 'Prose Engine trả về nội dung trống. Vui lòng kiểm tra cấu hình model hoặc Prompt.'
        );
        return;
      }

      const fullText = composeText(result.finalProse);
      updateChapterContentById(proj.id, targetChapterId, fullText);
      setBeatsOutOfSync(false);

      const endOffset = effectiveStartOffset + result.finalProse.length;
      setSwipeState((prev) => {
        if (mode === 'regenerate' && prev && prev.chapterId === targetChapterId) {
          const nextVariants = [
            ...prev.variants,
            { text: result.finalProse, thinking: result.thinking || undefined },
          ];
          return {
            chapterId: targetChapterId,
            startOffset: effectiveStartOffset,
            endOffset,
            variants: nextVariants,
            activeIndex: nextVariants.length - 1,
          };
        }
        return {
          chapterId: targetChapterId,
          startOffset: effectiveStartOffset,
          endOffset,
          variants: [{ text: result.finalProse, thinking: result.thinking || undefined }],
          activeIndex: 0,
        };
      });
    },
    [recordUsage, swipeState, undoSnapshot, updateChapterContentById]
  );

  // Step 1: Generate Chapter Beats (supports explicit targetOverride for auto-outline on + Chương)
  const handleGenerateChapterBeats = useCallback(
    async (
      andContinue: boolean,
      targetOverride?: {
        actId?: string;
        chapterId?: string;
        previousChapterTailOverride?: string;
        previousChapterTitleOverride?: string;
      }
    ) => {
      const proj =
        projectsRef.current.find((p) => p.id === activeProjectIdRef.current) ??
        projectsRef.current[0];
      if (!proj) return;

      const targetLoc = findActiveChapterLocation(
        proj.acts,
        targetOverride?.chapterId ?? proj.activeChapterId
      );
      if (!targetLoc) return;

      const targetAct = targetLoc.act;
      const targetChapter = targetLoc.chapter;

      beatsAbortRef.current?.abort();
      const controller = new AbortController();
      beatsAbortRef.current = controller;

      setBeatsError(null);
      setErrorMessage(null);
      setBeatsThinking('');
      setIsGeneratingBeats(true);

      const prevTailCtx = getPreviousChapterTail(proj.acts, targetChapter.id, 1500);
      const prevTail =
        targetOverride?.previousChapterTailOverride ?? prevTailCtx?.tailContent ?? '';
      const prevTitle =
        targetOverride?.previousChapterTitleOverride ?? prevTailCtx?.chapterTitle ?? '';

      const prevChapLoc = getImmediatePreviousChapter(proj.acts, targetChapter.id);
      const prevSummary = prevChapLoc
        ? proj.summaries.find((s) =>
            s.title.toLowerCase().includes(prevChapLoc.chapter.title.toLowerCase())
          )?.content ?? proj.summaries[proj.summaries.length - 1]?.content
        : proj.summaries[proj.summaries.length - 1]?.content;

      const scanText = `${prevTail}\n\n${targetChapter.content}`;
      const activeCharacters = findActiveCharacters(scanText, proj.characters, 2500);
      const triggeredLore = findTriggeredLorebookEntries(scanText, proj.lorebook, 2500);

      const { system, user } = buildChapterBeatsPrompt({
        projectTitle: proj.title,
        actTitle: targetAct.title,
        chapterTitle: targetChapter.title,
        chapterGoal: targetChapter.chapterGoal,
        volumeBlueprint: targetAct.blueprint,
        masterPlotBlocks: proj.masterPlotBlocks,
        plotThreads: proj.plotThreads,
        currentChapterText: targetChapter.content,
        existingBeats: targetChapter.beats,
        previousChapterTail: prevTail,
        previousChapterTitle: prevTitle,
        previousChapterSummary: prevSummary,
        protagonist: proj.protagonist,
        activeCharacters,
        lorebookEntries: triggeredLore,
      });

      const enableThinking = resolveEffectiveThinking(
        apiSettingsRef.current.thinkingPreference,
        'generate_beats'
      );

      let accumulated = '';
      let finalThinkingText = '';

      await streamThinkingPromptTask({
        api: apiSettingsRef.current,
        sampler: proj.sampler,
        channel: 'architect',
        enableThinking,
        maxTokens: Math.max(3500, proj.sampler.maxTokens),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        signal: controller.signal,
        handlers: {
          onToken: (tok, fullClean) => {
            accumulated = typeof fullClean === 'string' ? fullClean : accumulated + tok;
            const liveCleaned = cleanGeneratedBeatsText(accumulated);
            updateProjectById(proj.id, (p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, targetChapter.id, (c) => ({
                ...c,
                beats: liveCleaned,
                updatedAt: Date.now(),
              })),
            }));
          },
          onThinking: (thinkText) => {
            finalThinkingText = thinkText;
            setBeatsThinking(thinkText);
          },
          onUsage: recordUsage,
          onComplete: (finalContent) => {
            setIsGeneratingBeats(false);
            const rawBeats =
              typeof finalContent === 'string' ? finalContent : accumulated;
            const cleaned = cleanGeneratedBeatsText(rawBeats);

            if (!cleaned.trim()) {
              if (!controller.signal.aborted) {
                setBeatsError(
                  finalThinkingText.trim()
                    ? 'Architect API đã dùng hết token trong phần <think> mà chưa xuất dàn ý. Hãy tăng Max Tokens hoặc kiểm tra lại model.'
                    : 'Architect API không trả về nội dung dàn ý nào. Hãy kiểm tra kết nối và cấu hình Architect API.'
                );
              }
              return;
            }

            updateProjectById(proj.id, (p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, targetChapter.id, (c) => ({
                ...c,
                beats: cleaned,
                updatedAt: Date.now(),
              })),
            }));
            setBeatsOutOfSync(false);

            if (andContinue) {
              const latestProj =
                projectsRef.current.find((p) => p.id === proj.id) ?? proj;
              const latestChap = findActiveChapterLocation(
                latestProj.acts,
                targetChapter.id
              )?.chapter;

              void runGeneration('append', {
                beatsOverride: cleaned,
                chapterIdOverride: targetChapter.id,
                baseTextOverride: latestChap?.content ?? targetChapter.content,
              });
            }
          },
          onError: (err) => {
            setIsGeneratingBeats(false);
            setBeatsError(err.message);
          },
        },
      });
    },
    [recordUsage, runGeneration, updateProjectById]
  );

  const handleSyncBeatsToText = useCallback(async () => {
    const proj =
      projectsRef.current.find((p) => p.id === activeProjectIdRef.current) ??
      projectsRef.current[0];
    const loc = findActiveChapterLocation(proj.acts, proj.activeChapterId);
    if (!loc) return;

    beatsAbortRef.current?.abort();
    const controller = new AbortController();
    beatsAbortRef.current = controller;

    setBeatsError(null);
    setBeatsThinking('');
    setIsGeneratingBeats(true);

    const activeCharacters = findActiveCharacters(
      loc.chapter.content,
      proj.characters,
      4000
    );

    const { system, user } = buildSyncBeatsPrompt({
      chapterTitle: loc.chapter.title,
      chapterGoal: loc.chapter.chapterGoal,
      volumeBlueprint: loc.act.blueprint,
      masterPlotBlocks: proj.masterPlotBlocks,
      plotThreads: proj.plotThreads,
      currentChapterText: loc.chapter.content,
      existingBeats: loc.chapter.beats,
      protagonist: proj.protagonist,
      activeCharacters,
    });

    const enableThinking = resolveEffectiveThinking(
      apiSettingsRef.current.thinkingPreference,
      'sync_beats'
    );

    let accumulated = '';
    await streamThinkingPromptTask({
      api: apiSettingsRef.current,
      sampler: proj.sampler,
      channel: 'architect',
      enableThinking,
      maxTokens: Math.max(3500, proj.sampler.maxTokens),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      signal: controller.signal,
      handlers: {
        onToken: (tok, fullClean) => {
          accumulated = typeof fullClean === 'string' ? fullClean : accumulated + tok;
        },
        onThinking: (think) => setBeatsThinking(think),
        onUsage: recordUsage,
        onComplete: (finalText) => {
          setIsGeneratingBeats(false);
          const cleaned = cleanGeneratedBeatsText(
            typeof finalText === 'string' ? finalText : accumulated
          );
          if (!cleaned) {
            setBeatsError('Không nhận được dàn ý đồng bộ từ Architect API.');
            return;
          }
          updateProjectById(proj.id, (p) => ({
            ...p,
            acts: updateChapterInActs(p.acts, loc.chapter.id, (c) => ({
              ...c,
              beats: cleaned,
              updatedAt: Date.now(),
            })),
          }));
          setBeatsOutOfSync(false);
        },
        onError: (err) => {
          setIsGeneratingBeats(false);
          setBeatsError(err.message);
        },
      },
    });
  }, [recordUsage, updateProjectById]);

  // Create Chapter + Auto-Outline Sequential Beats!
  const handleAddChapterAndAutoOutline = useCallback(
    (actId: string) => {
      const proj =
        projectsRef.current.find((p) => p.id === activeProjectIdRef.current) ??
        projectsRef.current[0];
      if (!proj) return;

      const targetAct = proj.acts.find((a) => a.id === actId) ?? proj.acts[0];
      const nextNum = targetAct.chapters.length + 1;
      const prevChapter = targetAct.chapters[targetAct.chapters.length - 1];
      const prevTail = prevChapter?.content.trim().slice(-1500) ?? '';

      const newChap = createChapter(`Chương ${nextNum}`);
      const nextActs = proj.acts.map((a) =>
        a.id === targetAct.id
          ? { ...a, collapsed: false, chapters: [...a.chapters, newChap] }
          : a
      );

      updateProjectById(proj.id, (p) => ({
        ...p,
        acts: nextActs,
        activeChapterId: newChap.id,
        storyText: compileStoryTextFromActs(nextActs),
      }));

      setSwipeState(null);
      setUndoSnapshot(null);

      // Track backup reminder counter
      setBackupInfo((prev) => {
        const nextInfo = {
          ...prev,
          chaptersWrittenSinceBackup: prev.chaptersWrittenSinceBackup + 1,
        };
        saveBackupInfo(nextInfo);
        return nextInfo;
      });

      // Automatically trigger sequential outline generation for the newly added chapter
      void handleGenerateChapterBeats(false, {
        actId: targetAct.id,
        chapterId: newChap.id,
        previousChapterTailOverride: prevTail,
        previousChapterTitleOverride: prevChapter?.title ?? '',
      });
    },
    [handleGenerateChapterBeats, updateProjectById]
  );

  // Switch Swipe Variant
  const handleSwitchSwipeVariant = (index: number) => {
    if (!swipeState) return;
    if (index < 0 || index >= swipeState.variants.length) return;
    const targetVariant = swipeState.variants[index];
    const currentText = activeChapter.content;
    const nextText =
      currentText.slice(0, swipeState.startOffset) +
      targetVariant.text +
      currentText.slice(swipeState.endOffset);
    const nextEnd = swipeState.startOffset + targetVariant.text.length;

    updateChapterContentById(activeProject.id, activeChapter.id, nextText);
    setSwipeState({
      ...swipeState,
      endOffset: nextEnd,
      activeIndex: index,
    });
  };

  // Inline Prose Rewrite
  const handleRunInlineRewrite = async (
    instruction: string,
    start: number,
    end: number
  ) => {
    const selectedText = activeChapter.content.slice(start, end);
    if (!selectedText.trim()) return;

    const before = activeChapter.content.slice(0, start);
    const after = activeChapter.content.slice(end);
    setUndoSnapshot({ chapterId: activeChapter.id, previousText: activeChapter.content });

    proseAbortRef.current?.abort();
    const controller = new AbortController();
    proseAbortRef.current = controller;
    setIsGenerating(true);
    setErrorMessage(null);

    let acc = '';
    const enableThinking = resolveEffectiveThinking(
      apiSettingsRef.current.thinkingPreference,
      'inline_rewrite'
    );

    await streamInlineRewrite({
      api: apiSettingsRef.current,
      sampler: activeProject.sampler,
      instruction,
      selectedText,
      surroundingBefore: before,
      surroundingAfter: after,
      enableThinking,
      signal: controller.signal,
      handlers: {
        onToken: (tok, fullClean) => {
          acc = typeof fullClean === 'string' ? fullClean : acc + tok;
          const cleanSlice = stripLeadingProseMarkers(acc);
          updateChapterContentById(activeProject.id, activeChapter.id, before + cleanSlice + after);
        },
        onUsage: recordUsage,
        onComplete: (finalAcc) => {
          setIsGenerating(false);
          const rawSlice = typeof finalAcc === 'string' ? finalAcc : acc;
          const finalSlice = stripLeadingProseMarkers(rawSlice);
          if (finalSlice.trim()) {
            updateChapterContentById(
              activeProject.id,
              activeChapter.id,
              before + finalSlice + after
            );
          }
        },
        onError: (err) => {
          setIsGenerating(false);
          setErrorMessage(err.message);
        },
      },
    });
  };

  // End-of-Chapter Sync (1 call)
  const handleOpenChapterSync = async () => {
    const text = compileActiveChapterText(activeChapter);
    if (!text) return;

    syncAbortRef.current?.abort();
    const controller = new AbortController();
    syncAbortRef.current = controller;

    setShowSyncModal(true);
    setIsSyncingChapter(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const { system, user } = buildChapterSyncPrompt({
        chapterTitle: activeChapter.title,
        chapterText: text,
        chapterGoal: activeChapter.chapterGoal,
        volumeTitle: activeAct.title,
        volumeBlueprint: activeAct.blueprint,
        masterPlotBlocks: activeProject.masterPlotBlocks,
        plotThreads: activeProject.plotThreads,
        protagonist: activeProject.protagonist,
        characters: activeProject.characters,
        lorebook: activeProject.lorebook,
      });

      const enableThinking = resolveEffectiveThinking(
        apiSettingsRef.current.thinkingPreference,
        'chapter_sync'
      );

      const { content, thinking } = await requestThinkingCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        enableThinking,
        maxTokens: Math.max(4096, activeProject.sampler.maxTokens),
        temperature: 0.3,
        signal: controller.signal,
        onUsage: recordUsage,
      });

      if (controller.signal.aborted) return;

      const parsed = parseChapterSyncResponse(content, {
        chapterTitle: activeChapter.title,
        existingThreads: activeProject.plotThreads,
        thinking,
      });
      setSyncResult(parsed);
    } catch (err) {
      if (controller.signal.aborted) return;
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      if (syncAbortRef.current === controller) {
        setIsSyncingChapter(false);
      }
    }
  };

  const handleApplyChapterSync = (selection: {
    applySummary: boolean;
    selectedFactIds: string[];
    selectedCharacterIds: string[];
    applyProtagonistStatus: boolean;
    selectedLoreIds: string[];
    selectedPlotThreadIds: string[];
  }) => {
    if (!syncResult) return;

    updateActiveProject((proj) => {
      const now = Date.now();
      let nextSummaries = proj.summaries;
      if (selection.applySummary && syncResult.summary) {
        const sumTitle = `Tóm tắt ${activeChapter.title}`;
        const newSum: StorySummary = {
          id: `sum_${now}`,
          title: sumTitle,
          content: syncResult.summary,
          enabled: true,
          createdAt: now,
        };
        nextSummaries = [...proj.summaries, newSum];
      }

      const chosenFacts = syncResult.longTermFacts
        .filter((f) => selection.selectedFactIds.includes(f.id))
        .map<LongTermMemoryCard>((f, idx) => ({
          id: `mem_sync_${now}_${idx}`,
          content: f.content,
          keywords: f.keywords,
          category: f.category,
          importance: 4,
          createdAt: now,
          enabled: true,
        }));
      const nextMemories = [...chosenFacts, ...proj.longTermMemories];

      let nextChars = [...proj.characters];
      syncResult.characterUpdates
        .filter((u) => selection.selectedCharacterIds.includes(u.id))
        .forEach((u) => {
          const idx = nextChars.findIndex(
            (c) => c.name.trim().toLowerCase() === u.name.trim().toLowerCase()
          );
          if (idx !== -1) {
            nextChars[idx] = {
              ...nextChars[idx],
              currentStatusAndRelationship: u.updatedStatus,
            };
          } else {
            nextChars.push({
              id: `char_sync_${now}_${Math.random().toString(36).slice(2, 5)}`,
              name: u.name,
              aliases: '',
              role: 'Nhân vật phụ',
              appearanceAndPersonality: '',
              currentStatusAndRelationship: u.updatedStatus,
              notes: '',
              enabled: true,
            });
          }
        });

      let nextProtag = proj.protagonist;
      if (selection.applyProtagonistStatus && syncResult.protagonistStatusUpdate) {
        nextProtag = {
          ...proj.protagonist,
          ...(syncResult.protagonistStatusUpdate.realm
            ? { realm: syncResult.protagonistStatusUpdate.realm }
            : {}),
          ...(syncResult.protagonistStatusUpdate.techniques
            ? { techniques: syncResult.protagonistStatusUpdate.techniques }
            : {}),
          ...(syncResult.protagonistStatusUpdate.resources
            ? { resources: syncResult.protagonistStatusUpdate.resources }
            : {}),
          ...(syncResult.protagonistStatusUpdate.inventory
            ? { inventory: syncResult.protagonistStatusUpdate.inventory }
            : {}),
        };
      }

      let nextLore = [...proj.lorebook];
      syncResult.lorebookSuggestions
        .filter((l) => selection.selectedLoreIds.includes(l.id))
        .forEach((l) => {
          const idx = nextLore.findIndex(
            (e) => e.name.trim().toLowerCase() === l.name.trim().toLowerCase()
          );
          if (idx !== -1) {
            nextLore[idx] = {
              ...nextLore[idx],
              keywords: l.keys || nextLore[idx].keywords,
              content: l.content,
            };
          } else {
            nextLore.push({
              id: `lore_sync_${now}_${Math.random().toString(36).slice(2, 5)}`,
              name: l.name,
              keywords: l.keys || l.name,
              content: l.content,
              enabled: true,
            });
          }
        });

      let nextThreads = [...proj.plotThreads];
      syncResult.plotThreadUpdates
        .filter((t) => selection.selectedPlotThreadIds.includes(t.id))
        .forEach((t, idx) => {
          if (t.action === 'resolve') {
            const matchIdx = t.existingThreadId
              ? nextThreads.findIndex((ot) => ot.id === t.existingThreadId)
              : nextThreads.findIndex(
                  (ot) =>
                    ot.title.trim().toLowerCase() === t.title.trim().toLowerCase()
                );
            if (matchIdx !== -1) {
              nextThreads[matchIdx] = {
                ...nextThreads[matchIdx],
                status: 'Resolved',
                description: t.description
                  ? `${nextThreads[matchIdx].description}\n[Đã giải quyết tại ${activeChapter.title}: ${t.description}]`.trim()
                  : nextThreads[matchIdx].description,
              };
            }
          } else {
            nextThreads.push({
              id: `pt_sync_${now}_${idx}`,
              title: t.title,
              description: t.description,
              introducedChapter: t.introducedChapter || activeChapter.title,
              status: 'Open',
            });
          }
        });

      return {
        ...proj,
        summaries: nextSummaries,
        longTermMemories: nextMemories,
        characters: nextChars,
        protagonist: nextProtag,
        lorebook: nextLore,
        plotThreads: nextThreads,
      };
    });
  };

  // Master Plot / Tier 1 & Tier 2 Architect Actions
  const startPlotArchitectTask = (label: string): AbortController => {
    plotArchitectAbortRef.current?.abort();
    const controller = new AbortController();
    plotArchitectAbortRef.current = controller;
    setPlotArchitectError(null);
    setPlotArchitectThinking('');
    setPlotArchitectChars(0);
    setPlotArchitectBusyLabel(label);
    setIsPlotArchitectBusy(true);
    return controller;
  };

  const handleStopPlotArchitect = () => {
    plotArchitectAbortRef.current?.abort();
    plotArchitectAbortRef.current = null;
    setIsPlotArchitectBusy(false);
    setPlotArchitectBusyLabel('');
  };

  const handleExpandPlotBlock = async (blockId: string) => {
    const block = activeProject.masterPlotBlocks.find((b) => b.id === blockId);
    if (!block) return;

    const controller = startPlotArchitectTask(`Đang mở rộng "${block.title}"...`);

    try {
      const { system, user } = buildExpandPlotBlockPrompt({
        projectTitle: activeProject.title,
        targetBlock: block,
        otherBlocks: activeProject.masterPlotBlocks,
        protagonist: activeProject.protagonist,
      });

      const { content } = await requestThinkingCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        enableThinking: resolveEffectiveThinking(
          apiSettingsRef.current.thinkingPreference,
          'plot_architect'
        ),
        maxTokens: 4096,
        temperature: 0.6,
        signal: controller.signal,
        onThinking: (t) => setPlotArchitectThinking(t),
        onProgress: ({ thinkingChars, contentChars }) =>
          setPlotArchitectChars(thinkingChars + contentChars),
        onUsage: recordUsage,
      });

      if (controller.signal.aborted) return;

      if (!content.trim()) {
        throw new Error('Architect API không trả về nội dung mở rộng.');
      }

      updateActiveProject((p) => ({
        ...p,
        masterPlotBlocks: p.masterPlotBlocks.map((b) =>
          b.id === blockId ? { ...b, content: content.trim() } : b
        ),
      }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setPlotArchitectError(err instanceof Error ? err.message : String(err));
    } finally {
      if (plotArchitectAbortRef.current === controller) {
        setIsPlotArchitectBusy(false);
      }
    }
  };

  const flashPlotArchitectSaved = useCallback((message: string) => {
    setPlotArchitectSaveNotice(message);
    if (saveNoticeTimerRef.current) {
      clearTimeout(saveNoticeTimerRef.current);
    }
    saveNoticeTimerRef.current = setTimeout(() => {
      setPlotArchitectSaveNotice(null);
    }, 4500);
  }, []);

  const handleRunSeedToBible = async (premiseIdea: string, genre: string) => {
    const controller = startPlotArchitectTask('Đang kiến tạo Cốt truyện chính từ ý tưởng...');
    setPlotArchitectSaveNotice(null);

    try {
      const { system, user } = buildSeedToBiblePrompt({
        projectTitle: activeProject.title,
        premiseIdea,
        genre,
        protagonist: activeProject.protagonist,
      });

      const { content } = await requestThinkingCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        enableThinking: resolveEffectiveThinking(
          apiSettingsRef.current.thinkingPreference,
          'plot_architect'
        ),
        maxTokens: 4096,
        temperature: 0.6,
        signal: controller.signal,
        onThinking: (t) => setPlotArchitectThinking(t),
        onProgress: ({ thinkingChars, contentChars }) =>
          setPlotArchitectChars(thinkingChars + contentChars),
        onUsage: recordUsage,
      });

      if (controller.signal.aborted) return;

      const generated = parseSeedToBibleResponse(content);
      setSeedPreview(generated);
    } catch (err) {
      if (controller.signal.aborted) return;
      setPlotArchitectError(err instanceof Error ? err.message : String(err));
    } finally {
      if (plotArchitectAbortRef.current === controller) {
        setIsPlotArchitectBusy(false);
      }
    }
  };

  const handleApplySeedPreview = (
    mode: 'replace' | 'merge',
    edited: GeneratedSeedBibleResult
  ) => {
    const targetTitle = activeProject.title;
    updateActiveProject((p) => {
      const res = mergeOrReplaceMasterPlot(
        p.masterPlotBlocks,
        p.plotThreads,
        edited.blocks,
        edited.plotThreads,
        mode
      );
      return {
        ...p,
        masterPlotBlocks: res.masterPlotBlocks,
        plotThreads: res.plotThreads,
      };
    });
    setSeedPreview(null);
    flashPlotArchitectSaved(
      mode === 'replace'
        ? `Đã lưu ${edited.blocks.length} khối cốt truyện & ${edited.plotThreads.length} tuyến truyện vào "${targetTitle}" (giữ nguyên các chương đang viết). Hãy bấm "API Chia Quyển ngay" hoặc "Về Editor viết tiếp →" để sáng tác.`
        : `Đã gộp thêm cốt truyện vừa sinh vào "${targetTitle}". Hãy bấm "API Chia Quyển ngay" hoặc "Về Editor viết tiếp →" để sáng tác.`
    );
  };

  const handleCreateNewProjectFromSeed = (
    title: string,
    genre: string,
    edited: GeneratedSeedBibleResult,
    options?: { autoGenerateBeats?: boolean }
  ) => {
    const cleanTitle = title.trim() || edited.suggestedTitle?.trim() || 'Tác phẩm mới';
    const newProj = createBlankProject(cleanTitle);
    const starterAct = newProj.acts[0];
    const starterChapter = starterAct.chapters[0];
    const firstBlockSummary = edited.blocks[0]?.content?.trim() || '';
    const openingGoal = firstBlockSummary
      ? `Mở đầu câu chuyện: ${firstBlockSummary.slice(0, 180)}${firstBlockSummary.length > 180 ? '...' : ''}`
      : 'Mở đầu câu chuyện theo Cốt truyện chính.';

    const clonedBlocks = edited.blocks.map((b, i) => ({
      ...b,
      id: `mp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    }));
    const clonedThreads = edited.plotThreads.map((t, i) => ({
      ...t,
      id: `pt_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    }));

    const populatedProject: StoryProject = {
      ...newProj,
      memory: genre.trim() ? `Thể loại: ${genre.trim()}` : '',
      masterPlotBlocks: clonedBlocks,
      plotThreads: clonedThreads,
      acts: updateChapterInActs(newProj.acts, starterChapter.id, (c) => ({
        ...c,
        chapterGoal: openingGoal,
      })),
    };

    commitProjects((prev) => [populatedProject, ...prev]);
    commitActiveProjectId(populatedProject.id);

    setSeedPreview(null);
    setShowMasterPlotModal(false);
    setSwipeState(null);
    setUndoSnapshot(null);
    setBeatsError(null);
    setBeatsThinking('');
    setBeatsOutOfSync(false);
    setErrorMessage(null);
    setActiveThinkingPreview('');
    setAgentStreamingText('');
    setAgentStreamingThinking('');
    setPlotArchitectError(null);
    setPlotArchitectSaveNotice(null);

    const archProfile = resolveApiProfile(apiSettingsRef.current, 'architect');
    const hasConfiguredArchApi =
      Boolean(archProfile.baseUrl.trim()) &&
      Boolean(archProfile.model.trim() || archProfile.fallbackModel.trim());

    if (options?.autoGenerateBeats !== false && hasConfiguredArchApi) {
      void handleGenerateChapterBeats(false, {
        actId: starterAct.id,
        chapterId: starterChapter.id,
      });
    }
  };

  const handleDuplicateProject = (sourceId: string) => {
    const source = projectsRef.current.find((p) => p.id === sourceId);
    if (!source) return;
    const now = Date.now();
    const copy: StoryProject = migrateProject({
      ...JSON.parse(JSON.stringify(source)),
      id: `proj_${now}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${source.title} (Bản mới)`,
      createdAt: now,
      updatedAt: now,
    });
    commitProjects((prev) => [copy, ...prev]);
    commitActiveProjectId(copy.id);
    setShowProjectModal(false);
  };

  const handleSaveMasterPlotAndClose = () => {
    saveProjects(projectsRef.current);
    setShowMasterPlotModal(false);
  };

  const handleRunGenerateVolumes = async (desiredCount: number) => {
    const controller = startPlotArchitectTask(`Đang chia ${desiredCount} Quyển vào Mục lục...`);

    try {
      const { system, user } = buildGenerateVolumesPrompt({
        projectTitle: activeProject.title,
        masterPlotBlocks: activeProject.masterPlotBlocks,
        plotThreads: activeProject.plotThreads,
        existingActs: activeProject.acts,
        desiredCount,
      });

      const { content } = await requestThinkingCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        enableThinking: resolveEffectiveThinking(
          apiSettingsRef.current.thinkingPreference,
          'plot_architect'
        ),
        maxTokens: 4096,
        temperature: 0.5,
        signal: controller.signal,
        onThinking: (t) => setPlotArchitectThinking(t),
        onProgress: ({ thinkingChars, contentChars }) =>
          setPlotArchitectChars(thinkingChars + contentChars),
        onUsage: recordUsage,
      });

      if (controller.signal.aborted) return;

      const specs = parseGenerateVolumesResponse(content);
      const newActs = convertGeneratedVolumes(specs);

      updateActiveProject((p) => {
        const onlyEmptyStarter =
          p.acts.length === 1 &&
          p.acts[0].chapters.length === 1 &&
          !p.acts[0].chapters[0].content.trim();
        const combinedActs = onlyEmptyStarter ? newActs : [...p.acts, ...newActs];
        return {
          ...p,
          acts: combinedActs,
          activeChapterId: onlyEmptyStarter
            ? combinedActs[0].chapters[0].id
            : p.activeChapterId,
          storyText: compileStoryTextFromActs(combinedActs),
        };
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setPlotArchitectError(err instanceof Error ? err.message : String(err));
    } finally {
      if (plotArchitectAbortRef.current === controller) {
        setIsPlotArchitectBusy(false);
      }
    }
  };

  const handleGenerateVolumeChapters = async (actId: string, count: number) => {
    const targetAct = activeProject.acts.find((a) => a.id === actId);
    if (!targetAct) return;

    const controller = startPlotArchitectTask(`Đang lên khung ${count} chương cho ${targetAct.title}...`);

    try {
      const { system, user } = buildGenerateVolumeChaptersPrompt({
        projectTitle: activeProject.title,
        act: targetAct,
        masterPlotBlocks: activeProject.masterPlotBlocks,
        plotThreads: activeProject.plotThreads,
        desiredCount: count,
      });

      const { content } = await requestThinkingCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        enableThinking: resolveEffectiveThinking(
          apiSettingsRef.current.thinkingPreference,
          'plot_architect'
        ),
        maxTokens: 4096,
        temperature: 0.5,
        signal: controller.signal,
        onThinking: (t) => setPlotArchitectThinking(t),
        onProgress: ({ thinkingChars, contentChars }) =>
          setPlotArchitectChars(thinkingChars + contentChars),
        onUsage: recordUsage,
      });

      if (controller.signal.aborted) return;

      const skeletons = parseGenerateVolumeChaptersResponse(content);
      const createdChapters = convertGeneratedChapters(skeletons);

      updateActiveProject((p) => {
        const nextActs = p.acts.map((a) => {
          if (a.id !== actId) return a;
          const onlyEmptyFirst =
            a.chapters.length === 1 && !a.chapters[0].content.trim() && !a.chapters[0].chapterGoal.trim();
          return {
            ...a,
            collapsed: false,
            chapters: onlyEmptyFirst ? createdChapters : [...a.chapters, ...createdChapters],
          };
        });
        return {
          ...p,
          acts: nextActs,
          activeChapterId: createdChapters[0]?.id ?? p.activeChapterId,
          storyText: compileStoryTextFromActs(nextActs),
        };
      });
      setEditingVolumeId(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setPlotArchitectError(err instanceof Error ? err.message : String(err));
    } finally {
      if (plotArchitectAbortRef.current === controller) {
        setIsPlotArchitectBusy(false);
      }
    }
  };

  const handleRunLivingRealign = async () => {
    const controller = startPlotArchitectTask('Đang phân tích & căn chỉnh Đại cương phía sau...');

    try {
      const { system, user } = buildLivingPlotRealignPrompt({
        projectTitle: activeProject.title,
        masterPlotBlocks: activeProject.masterPlotBlocks,
        plotThreads: activeProject.plotThreads,
        summaries: activeProject.summaries,
        acts: activeProject.acts,
      });

      const { content } = await requestThinkingCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        enableThinking: resolveEffectiveThinking(
          apiSettingsRef.current.thinkingPreference,
          'plot_architect'
        ),
        maxTokens: 4096,
        temperature: 0.4,
        signal: controller.signal,
        onThinking: (t) => setPlotArchitectThinking(t),
        onProgress: ({ thinkingChars, contentChars }) =>
          setPlotArchitectChars(thinkingChars + contentChars),
        onUsage: recordUsage,
      });

      if (controller.signal.aborted) return;

      const preview = parseLivingPlotRealignResponse(content);
      setRealignPreview(preview);
    } catch (err) {
      if (controller.signal.aborted) return;
      setPlotArchitectError(err instanceof Error ? err.message : String(err));
    } finally {
      if (plotArchitectAbortRef.current === controller) {
        setIsPlotArchitectBusy(false);
      }
    }
  };

  const handleApplyLivingRealign = () => {
    if (!realignPreview) return;
    updateActiveProject((p) => {
      let nextActs = p.acts.map((act) => {
        const volUpd = realignPreview.volumeUpdates.find((v) => v.actId === act.id);
        const nextBlueprint = volUpd
          ? { ...act.blueprint, ...volUpd.blueprint }
          : act.blueprint;
        const nextChapters = act.chapters.map((ch) => {
          const chUpd = realignPreview.chapterGoalUpdates.find((u) => u.chapterId === ch.id);
          return chUpd ? { ...ch, chapterGoal: chUpd.chapterGoal } : ch;
        });
        return {
          ...act,
          blueprint: nextBlueprint,
          chapters: nextChapters,
        };
      });
      return { ...p, acts: nextActs };
    });
    setRealignPreview(null);
  };

  // AI Agent Chat Handler
  const handleSendAgentMessage = async (text: string) => {
    const proj = activeProject;
    const now = Date.now();
    const userMsg = {
      id: `msg_u_${now}`,
      role: 'user' as const,
      content: text,
      timestamp: now,
    };

    const nextHistory = [...proj.agentHistory, userMsg];
    updateActiveProject((p) => ({ ...p, agentHistory: nextHistory }));

    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;

    setIsAgentStreaming(true);
    setAgentStreamingText('');
    setAgentStreamingThinking('');

    const messages = buildAgentMessages(
      {
        projectTitle: proj.title,
        chapterTitle: activeChapter.title,
        chapterGoal: activeChapter.chapterGoal,
        chapterContent: activeChapter.content,
        chapterBeats: activeChapter.beats,
        volumeTitle: activeAct.title,
        volumeBlueprint: activeAct.blueprint,
        masterPlotBlocks: proj.masterPlotBlocks,
        plotThreads: proj.plotThreads,
        protagonist: proj.protagonist,
        characters: proj.characters,
        lorebook: proj.lorebook,
        summaries: proj.summaries,
        toggles: proj.agentContextToggles,
      },
      proj.agentHistory,
      text
    );

    let acc = '';
    let accThink = '';
    const enableThinking = resolveEffectiveThinking(
      apiSettingsRef.current.thinkingPreference,
      'agent_chat'
    );

    await streamAgentChat({
      api: apiSettingsRef.current,
      sampler: proj.sampler,
      messages,
      enableThinking,
      signal: controller.signal,
      handlers: {
        onToken: (tok) => {
          acc += tok;
          setAgentStreamingText(acc);
        },
        onThinking: (t) => {
          accThink = t;
          setAgentStreamingThinking(t);
        },
        onUsage: recordUsage,
        onComplete: (finalText) => {
          setIsAgentStreaming(false);
          const assistantMsg = {
            id: `msg_a_${Date.now()}`,
            role: 'assistant' as const,
            content: (finalText || acc).trim(),
            ...(accThink.trim() ? { thinking: accThink.trim() } : {}),
            timestamp: Date.now(),
            appliedActionIds: [],
          };
          updateActiveProject((p) => ({
            ...p,
            agentHistory: [...p.agentHistory, assistantMsg],
          }));
          setAgentStreamingText('');
          setAgentStreamingThinking('');
        },
        onError: (err) => {
          setIsAgentStreaming(false);
          const errMsg = {
            id: `msg_err_${Date.now()}`,
            role: 'assistant' as const,
            content: `Lỗi Architect API: ${err.message}`,
            timestamp: Date.now(),
          };
          updateActiveProject((p) => ({
            ...p,
            agentHistory: [...p.agentHistory, errMsg],
          }));
        },
      },
    });
  };

  const handleApplyAgentAction = (messageId: string, action: AgentActionBlock) => {
    updateActiveProject((proj) => {
      let nextActs = proj.acts;
      let nextChars = proj.characters;
      let nextLore = proj.lorebook;

      if (action.type === 'prose') {
        const current = activeChapter.content;
        const sep = current.trim() ? '\n\n' : '';
        const merged = current.trimEnd() + sep + action.content;
        nextActs = updateChapterInActs(proj.acts, activeChapter.id, (c) => ({
          ...c,
          content: merged,
          updatedAt: Date.now(),
        }));
      } else if (action.type === 'beats') {
        nextActs = updateChapterInActs(proj.acts, activeChapter.id, (c) => ({
          ...c,
          beats: action.content,
          updatedAt: Date.now(),
        }));
      } else if (action.type === 'pivot_beats') {
        nextActs = updateChapterInActs(proj.acts, activeChapter.id, (c) => ({
          ...c,
          beats: mergePivotIntoSceneBeats(c.beats, action.content),
          updatedAt: Date.now(),
        }));
      } else if (action.type === 'character') {
        const newCard: CharacterCard = {
          id: `char_ag_${Date.now()}`,
          enabled: true,
          ...action.character,
        };
        nextChars = [newCard, ...proj.characters];
      } else if (action.type === 'lorebook') {
        const newLore: LorebookEntry = {
          id: `lore_ag_${Date.now()}`,
          enabled: true,
          ...action.lorebook,
        };
        nextLore = [newLore, ...proj.lorebook];
      }

      const nextHistory = proj.agentHistory.map((m) =>
        m.id === messageId
          ? { ...m, appliedActionIds: [...(m.appliedActionIds ?? []), action.id] }
          : m
      );

      return {
        ...proj,
        acts: nextActs,
        storyText: compileStoryTextFromActs(nextActs),
        characters: nextChars,
        lorebook: nextLore,
        agentHistory: nextHistory,
      };
    });
  };

  // Memory & Character Scan Utilities
  const handleSummarizeActiveChapter = async () => {
    if (!activeChapter.content.trim()) return;
    setIsBusyMemory(true);
    try {
      const { system, user } = buildSummarizePrompt(
        activeChapter.title,
        activeChapter.content
      );
      const summary = await requestUtilityCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        onUsage: recordUsage,
      });
      if (summary.trim()) {
        const card: StorySummary = {
          id: `sum_${Date.now()}`,
          title: `Tóm tắt ${activeChapter.title}`,
          content: summary.trim(),
          enabled: true,
          createdAt: Date.now(),
        };
        updateActiveProject((p) => ({ ...p, summaries: [...p.summaries, card] }));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusyMemory(false);
    }
  };

  const handleExtractFactsFromActiveChapter = async () => {
    if (!activeChapter.content.trim()) return;
    setIsBusyMemory(true);
    try {
      const { system, user } = buildExtractFactsPrompt(
        activeChapter.title,
        activeChapter.content
      );
      const raw = await requestUtilityCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        onUsage: recordUsage,
      });
      const facts = parseExtractedFactsResponse(raw);
      if (facts.length > 0) {
        updateActiveProject((p) => ({
          ...p,
          longTermMemories: [...facts, ...p.longTermMemories],
        }));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusyMemory(false);
    }
  };

  const handleScanCharactersFromChapter = async () => {
    if (!activeChapter.content.trim()) return;
    setIsScanningCharacters(true);
    try {
      const { system, user } = buildCharacterScanPrompt({
        chapterText: activeChapter.content,
        protagonist: activeProject.protagonist,
        characters: activeProject.characters,
      });
      const raw = await requestUtilityCompletion({
        api: apiSettingsRef.current,
        channel: 'architect',
        systemPrompt: system,
        userPrompt: user,
        onUsage: recordUsage,
      });
      const suggestion = parseCharacterScanResponse(raw);
      updateActiveProject((proj) => {
        const nextProtag = suggestion.protagonistStatusUpdate
          ? { ...proj.protagonist, ...suggestion.protagonistStatusUpdate }
          : proj.protagonist;
        let nextChars = [...proj.characters];
        suggestion.characterUpdates.forEach((u) => {
          const idx = nextChars.findIndex(
            (c) => c.name.trim().toLowerCase() === u.name.trim().toLowerCase()
          );
          if (idx !== -1) {
            nextChars[idx] = {
              ...nextChars[idx],
              currentStatusAndRelationship:
                u.currentStatusAndRelationship || nextChars[idx].currentStatusAndRelationship,
            };
          } else {
            nextChars.push({
              id: `char_scan_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              name: u.name,
              aliases: '',
              role: u.role,
              appearanceAndPersonality: u.appearanceAndPersonality,
              currentStatusAndRelationship: u.currentStatusAndRelationship,
              notes: '',
              enabled: true,
            });
          }
        });
        return { ...proj, protagonist: nextProtag, characters: nextChars };
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsScanningCharacters(false);
    }
  };

  // Modular Import Handlers
  const handleImportCharactersFile = async (file: File) => {
    try {
      let jsonStr = '';
      if (file.name.toLowerCase().endsWith('.png') || file.type === 'image/png') {
        const buf = await file.arrayBuffer();
        jsonStr = extractCharaJsonFromPngBuffer(buf);
      } else {
        jsonStr = await file.text();
      }
      const res = parseImportedCharactersJson(jsonStr);
      setPendingImport({
        category: 'characters',
        summaryText: `Phát hiện ${res.characters.length} nhân vật${
          res.protagonistUpdate ? ' kèm hồ sơ Nhân vật chính' : ''
        } từ tệp "${file.name}".`,
        characters: res.characters,
        protagonistUpdate: res.protagonistUpdate,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportLorebookFile = async (file: File) => {
    try {
      const text = await file.text();
      const entries = parseLorebookJson(text);
      setPendingImport({
        category: 'lorebook',
        summaryText: `Phát hiện ${entries.length} mục Lorebook từ tệp "${file.name}".`,
        entries,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportMemoriesFile = async (file: File) => {
    try {
      const text = await file.text();
      const memories = parseImportedMemoriesJson(text);
      setPendingImport({
        category: 'memories',
        summaryText: `Phát hiện ${memories.length} thẻ Ký ức dài hạn từ tệp "${file.name}".`,
        memories,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportPresetsFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseImportedPresetsJson(text);
      setPendingImport({
        category: 'presets',
        summaryText: `Nhập Preset Văn phong & Sampler từ tệp "${file.name}".`,
        ...parsed,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportMasterPlotFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseMasterPlotImportJson(text);
      setPendingImport({
        category: 'masterPlot',
        summaryText: `Phát hiện ${parsed.masterPlotBlocks.length} khối Cốt truyện chính và ${parsed.plotThreads.length} Tuyến truyện từ tệp "${file.name}".`,
        ...parsed,
      });
    } catch (err) {
      setPlotArchitectError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleConfirmPendingImport = (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    if (pendingImport.category === 'characters') {
      updateActiveProject((p) => {
        const merged = mergeCharactersList(p.characters, pendingImport.characters, mode);
        return {
          ...p,
          characters: merged.list,
          protagonist:
            pendingImport.protagonistUpdate && mode === 'replace'
              ? { ...p.protagonist, ...pendingImport.protagonistUpdate }
              : p.protagonist,
        };
      });
    } else if (pendingImport.category === 'lorebook') {
      updateActiveProject((p) => ({
        ...p,
        lorebook: mergeLorebookList(p.lorebook, pendingImport.entries, mode).list,
      }));
    } else if (pendingImport.category === 'memories') {
      updateActiveProject((p) => ({
        ...p,
        longTermMemories: mergeMemoriesList(p.longTermMemories, pendingImport.memories, mode).list,
      }));
    } else if (pendingImport.category === 'presets') {
      updateActiveProject((p) => ({
        ...p,
        systemPrompt:
          typeof pendingImport.systemPrompt === 'string'
            ? pendingImport.systemPrompt
            : p.systemPrompt,
        sampler: pendingImport.sampler
          ? { ...p.sampler, ...pendingImport.sampler }
          : p.sampler,
      }));
    } else if (pendingImport.category === 'masterPlot') {
      updateActiveProject((p) => {
        const res = mergeOrReplaceMasterPlot(
          p.masterPlotBlocks,
          p.plotThreads,
          pendingImport.masterPlotBlocks,
          pendingImport.plotThreads,
          mode
        );
        return {
          ...p,
          masterPlotBlocks: res.masterPlotBlocks,
          plotThreads: res.plotThreads,
        };
      });
    }
    setPendingImport(null);
  };

  const handleExportFullJson = (project: StoryProject) => {
    const safeName = (project.title || 'novel').replace(/[^\p{L}\p{N}_-]+/gu, '_');
    downloadTextFile(
      `${safeName}.novel.json`,
      JSON.stringify(project, null, 2),
      'application/json'
    );
    const info: BackupReminderInfo = {
      lastBackupAt: Date.now(),
      chaptersWrittenSinceBackup: 0,
    };
    setBackupInfo(info);
    saveBackupInfo(info);
  };

  const handleImportFullProjectFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const migrated = migrateProject(parsed);
      const uniqueProj: StoryProject = {
        ...migrated,
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      };
      commitProjects((prev) => [uniqueProj, ...prev]);
      commitActiveProjectId(uniqueProj.id);
      setShowProjectModal(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const editingVolume = useMemo(
    () => activeProject.acts.find((a) => a.id === editingVolumeId) ?? null,
    [activeProject.acts, editingVolumeId]
  );

  const hasBackupWarning = backupInfo.chaptersWrittenSinceBackup >= 5;

  const leftSidebarNode = (
    <LeftStudioSidebar
      acts={activeProject.acts}
      activeChapterId={activeChapter.id}
      summaries={activeProject.summaries}
      longTermMemories={activeProject.longTermMemories}
      isBusyMemory={isBusyMemory}
      onSelectChapter={(id) => {
        updateActiveProject((p) => ({ ...p, activeChapterId: id }));
        setMobileLeftOpen(false);
      }}
      onAddAct={() => {
        const newAct = createAct(`Quyển ${activeProject.acts.length + 1}`);
        updateActiveProject((p) => {
          const nextActs = [...p.acts, newAct];
          return {
            ...p,
            acts: nextActs,
            activeChapterId: newAct.chapters[0].id,
            storyText: compileStoryTextFromActs(nextActs),
          };
        });
      }}
      onRenameAct={(actId, title) =>
        updateActiveProject((p) => ({
          ...p,
          acts: updateActInActs(p.acts, actId, (a) => ({ ...a, title })),
        }))
      }
      onDeleteAct={(actId) =>
        updateActiveProject((p) => {
          const nextActs = p.acts.filter((a) => a.id !== actId);
          if (nextActs.length === 0) return p;
          const stillExists = nextActs.some((a) =>
            a.chapters.some((c) => c.id === p.activeChapterId)
          );
          return {
            ...p,
            acts: nextActs,
            activeChapterId: stillExists ? p.activeChapterId : nextActs[0].chapters[0].id,
            storyText: compileStoryTextFromActs(nextActs),
          };
        })
      }
      onToggleActCollapse={(actId) =>
        updateActiveProject((p) => ({
          ...p,
          acts: updateActInActs(p.acts, actId, (a) => ({ ...a, collapsed: !a.collapsed })),
        }))
      }
      onOpenVolumeBlueprint={(actId) => {
        setPlotArchitectError(null);
        setEditingVolumeId(actId);
      }}
      onAddChapter={handleAddChapterAndAutoOutline}
      onRenameChapter={(chapterId, title) =>
        updateActiveProject((p) => ({
          ...p,
          acts: updateChapterInActs(p.acts, chapterId, (c) => ({ ...c, title })),
        }))
      }
      onDeleteChapter={(actId, chapterId) =>
        updateActiveProject((p) => {
          const nextActs = p.acts.map((a) =>
            a.id === actId
              ? { ...a, chapters: a.chapters.filter((c) => c.id !== chapterId) }
              : a
          );
          const cleanedActs = nextActs.filter((a) => a.chapters.length > 0);
          if (cleanedActs.length === 0) return p;
          const stillExists = cleanedActs.some((a) =>
            a.chapters.some((c) => c.id === p.activeChapterId)
          );
          return {
            ...p,
            acts: cleanedActs,
            activeChapterId: stillExists
              ? p.activeChapterId
              : cleanedActs[0].chapters[0].id,
            storyText: compileStoryTextFromActs(cleanedActs),
          };
        })
      }
      onMoveChapter={(actId, chapterId, dir) =>
        updateActiveProject((p) => {
          const nextActs = moveChapterInAct(p.acts, actId, chapterId, dir);
          return {
            ...p,
            acts: nextActs,
            storyText: compileStoryTextFromActs(nextActs),
          };
        })
      }
      onCycleChapterStatus={(chapterId) =>
        updateActiveProject((p) => ({
          ...p,
          acts: updateChapterInActs(p.acts, chapterId, (c) => ({
            ...c,
            status: cycleChapterStatus(c.status),
          })),
        }))
      }
      onOpenBulkImport={() => setShowBulkImportModal(true)}
      onChangeSummaries={(summaries) =>
        updateActiveProject((p) => ({ ...p, summaries }))
      }
      onChangeMemories={(longTermMemories) =>
        updateActiveProject((p) => ({ ...p, longTermMemories }))
      }
      onSummarizeActiveChapter={handleSummarizeActiveChapter}
      onExtractFactsFromActiveChapter={handleExtractFactsFromActiveChapter}
      onExportMemories={() =>
        downloadTextFile(
          'memories.json',
          serializeMemoriesJson(activeProject.longTermMemories),
          'application/json'
        )
      }
      onImportMemoriesFile={handleImportMemoriesFile}
    />
  );

  const rightSidebarNode = (
    <ContextSidebar
      protagonist={activeProject.protagonist}
      characters={activeProject.characters}
      lorebook={activeProject.lorebook}
      systemPrompt={activeProject.systemPrompt}
      memory={activeProject.memory}
      authorsNote={activeProject.authorsNote}
      authorsNoteDepth={activeProject.authorsNoteDepth}
      sampler={activeProject.sampler}
      agentMessages={activeProject.agentHistory}
      agentToggles={activeProject.agentContextToggles}
      isAgentStreaming={isAgentStreaming}
      agentStreamingText={agentStreamingText}
      agentStreamingThinking={agentStreamingThinking}
      isScanningCharacters={isScanningCharacters}
      onChangeProtagonist={(protagonist) =>
        updateActiveProject((p) => ({ ...p, protagonist }))
      }
      onChangeCharacters={(characters) =>
        updateActiveProject((p) => ({ ...p, characters }))
      }
      onChangeLorebook={(lorebook) =>
        updateActiveProject((p) => ({ ...p, lorebook }))
      }
      onChangeSystemPrompt={(systemPrompt) =>
        updateActiveProject((p) => ({ ...p, systemPrompt }))
      }
      onChangeMemory={(memory) => updateActiveProject((p) => ({ ...p, memory }))}
      onChangeAuthorsNote={(authorsNote) =>
        updateActiveProject((p) => ({ ...p, authorsNote }))
      }
      onChangeAuthorsNoteDepth={(authorsNoteDepth) =>
        updateActiveProject((p) => ({ ...p, authorsNoteDepth }))
      }
      onChangeSampler={(sampler) => updateActiveProject((p) => ({ ...p, sampler }))}
      onChangeAgentToggles={(agentContextToggles) =>
        updateActiveProject((p) => ({ ...p, agentContextToggles }))
      }
      onSendAgentMessage={handleSendAgentMessage}
      onStopAgentStreaming={() => {
        agentAbortRef.current?.abort();
        setIsAgentStreaming(false);
      }}
      onClearAgentHistory={() =>
        updateActiveProject((p) => ({ ...p, agentHistory: [] }))
      }
      onApplyAgentAction={handleApplyAgentAction}
      onScanCharactersFromChapter={handleScanCharactersFromChapter}
      onImportCharactersFile={handleImportCharactersFile}
      onExportAllCharacters={() =>
        downloadTextFile(
          'characters.json',
          serializeCharactersJson(activeProject.characters, activeProject.protagonist),
          'application/json'
        )
      }
      onExportSingleCharacter={(card) =>
        downloadTextFile(
          `${card.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.card.json`,
          serializeSingleCharacterJson(card),
          'application/json'
        )
      }
      onImportLorebookFile={handleImportLorebookFile}
      onExportLorebook={() =>
        downloadTextFile(
          'lorebook.json',
          serializeLorebookJson(activeProject.lorebook),
          'application/json'
        )
      }
      onImportPresetsFile={handleImportPresetsFile}
      onExportPresets={() =>
        downloadTextFile(
          'presets.json',
          serializePresetsJson(activeProject.systemPrompt, activeProject.sampler),
          'application/json'
        )
      }
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#FAF8F5] dark:bg-slate-950 text-stone-900 dark:text-slate-100">
      <TopBar
        projectTitle={activeProject.title}
        apiSettings={apiSettings}
        darkMode={darkMode}
        hasBackupWarning={hasBackupWarning}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenProjects={() => setShowProjectModal(true)}
        onOpenMasterPlot={() => {
          setPlotArchitectError(null);
          setShowMasterPlotModal(true);
        }}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenPromptInspector={() => setShowPromptInspector(true)}
        onOpenApiSettings={() => setShowApiModal(true)}
        onExportQuickBackup={() => handleExportFullJson(activeProject)}
        onToggleMobileLeft={() => setMobileLeftOpen((v) => !v)}
        onToggleMobileRight={() => setMobileRightOpen((v) => !v)}
      />

      {/* Main 3-Column Studio */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Desktop Left Sidebar */}
        <div className="hidden lg:block w-72 shrink-0 h-full overflow-hidden">
          {leftSidebarNode}
        </div>

        {/* Center Editor Canvas */}
        <EditorCanvas
          actTitle={activeAct.title}
          chapterId={activeChapter.id}
          chapterTitle={activeChapter.title}
          chapterGoal={activeChapter.chapterGoal}
          chapterStatus={activeChapter.status}
          chapterBeats={activeChapter.beats}
          chapterSnapshots={activeChapter.snapshots}
          previousChapterTail={previousChapterTail?.tailContent ?? null}
          prevChapterTitle={adjacentInfo.prev?.chapter.title ?? null}
          nextChapterTitle={adjacentInfo.next?.chapter.title ?? null}
          chapterPositionLabel={`${adjacentInfo.index + 1}/${adjacentInfo.total}`}
          storyText={activeChapter.content}
          isGenerating={isGenerating}
          isGeneratingBeats={isGeneratingBeats}
          isSyncingChapter={isSyncingChapter}
          beatsThinking={beatsThinking}
          beatsError={beatsError}
          beatsOutOfSync={beatsOutOfSync}
          errorMessage={errorMessage}
          canUndoAi={Boolean(undoSnapshot && undoSnapshot.chapterId === activeChapter.id)}
          canRegenerate={Boolean(
            (swipeState && swipeState.chapterId === activeChapter.id) ||
              (undoSnapshot && undoSnapshot.chapterId === activeChapter.id)
          )}
          swipeState={swipeState}
          activeThinkingPreview={activeThinkingPreview}
          totalBudgetTokens={promptContextResult.tokenBreakdown.totalTokens}
          maxContextTokens={promptContextResult.tokenBreakdown.maxContextTokens}
          onSelectPrevChapter={() => {
            if (adjacentInfo.prev) {
              updateActiveProject((p) => ({
                ...p,
                activeChapterId: adjacentInfo.prev!.chapter.id,
              }));
            }
          }}
          onSelectNextChapter={() => {
            if (adjacentInfo.next) {
              updateActiveProject((p) => ({
                ...p,
                activeChapterId: adjacentInfo.next!.chapter.id,
              }));
            }
          }}
          onCreateNextChapter={() => handleAddChapterAndAutoOutline(activeAct.id)}
          onChangeChapterTitle={(title) =>
            updateActiveProject((p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, activeChapter.id, (c) => ({ ...c, title })),
            }))
          }
          onChangeChapterGoal={(chapterGoal) =>
            updateActiveProject((p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, activeChapter.id, (c) => ({
                ...c,
                chapterGoal,
              })),
            }))
          }
          onCycleChapterStatus={() =>
            updateActiveProject((p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, activeChapter.id, (c) => ({
                ...c,
                status: cycleChapterStatus(c.status),
              })),
            }))
          }
          onChangeChapterBeats={(beats) =>
            updateActiveProject((p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, activeChapter.id, (c) => ({ ...c, beats })),
            }))
          }
          onChangeStoryText={(text) => {
            updateChapterContentById(activeProject.id, activeChapter.id, text);
            if (activeChapter.beats.trim()) {
              setBeatsOutOfSync(true);
            }
          }}
          onGenerateContinue={() => void runGeneration('append')}
          onRegenerateLast={() => void runGeneration('regenerate')}
          onStopGeneration={() => {
            proseAbortRef.current?.abort();
            setIsGenerating(false);
          }}
          onUndoLastAi={() => {
            if (undoSnapshot && undoSnapshot.chapterId === activeChapter.id) {
              updateChapterContentById(
                activeProject.id,
                activeChapter.id,
                undoSnapshot.previousText
              );
              setUndoSnapshot(null);
              setSwipeState(null);
            }
          }}
          onGenerateBeats={(andContinue) => void handleGenerateChapterBeats(andContinue)}
          onSyncBeatsToText={() => void handleSyncBeatsToText()}
          onOpenChapterSync={() => void handleOpenChapterSync()}
          onSaveSnapshot={(label) => {
            const snap = createChapterSnapshot(activeChapter, label);
            updateActiveProject((p) => ({
              ...p,
              acts: updateChapterInActs(p.acts, activeChapter.id, (c) => ({
                ...c,
                snapshots: appendChapterSnapshot(c.snapshots, snap),
              })),
            }));
          }}
          onRestoreSnapshot={(snapshotId) => {
            updateActiveProject((p) => {
              const nextActs = updateChapterInActs(p.acts, activeChapter.id, (c) =>
                restoreChapterFromSnapshot(c, snapshotId)
              );
              return {
                ...p,
                acts: nextActs,
                storyText: compileStoryTextFromActs(nextActs),
              };
            });
          }}
          onSwitchSwipeVariant={handleSwitchSwipeVariant}
          onDismissSwipes={() => setSwipeState(null)}
          onRunInlineRewrite={(instruction, start, end) =>
            void handleRunInlineRewrite(instruction, start, end)
          }
        />

        {/* Desktop Right Sidebar */}
        <div className="hidden lg:block w-84 shrink-0 h-full overflow-hidden">
          {rightSidebarNode}
        </div>

        {/* Mobile Left Drawer */}
        {mobileLeftOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-stone-950/50"
              onClick={() => setMobileLeftOpen(false)}
            />
            <div className="relative z-10 w-80 max-w-[85vw] h-full shadow-2xl">
              {leftSidebarNode}
            </div>
          </div>
        )}

        {/* Mobile Right Drawer */}
        {mobileRightOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex justify-end">
            <div
              className="fixed inset-0 bg-stone-950/50"
              onClick={() => setMobileRightOpen(false)}
            />
            <div className="relative z-10 w-84 max-w-[88vw] h-full shadow-2xl">
              {rightSidebarNode}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <MasterPlotModal
        isOpen={showMasterPlotModal}
        projectTitle={activeProject.title}
        blocks={activeProject.masterPlotBlocks}
        plotThreads={activeProject.plotThreads}
        acts={activeProject.acts}
        isBusy={isPlotArchitectBusy}
        busyActionLabel={plotArchitectBusyLabel}
        streamingThinking={plotArchitectThinking}
        receivedChars={plotArchitectChars}
        errorMessage={plotArchitectError}
        saveNotice={plotArchitectSaveNotice}
        seedPreview={seedPreview}
        realignPreview={realignPreview}
        onClose={() => setShowMasterPlotModal(false)}
        onSaveAndClose={handleSaveMasterPlotAndClose}
        onCancelBusy={handleStopPlotArchitect}
        onChangeBlocks={(masterPlotBlocks) =>
          updateActiveProject((p) => ({ ...p, masterPlotBlocks }))
        }
        onChangeThreads={(plotThreads) =>
          updateActiveProject((p) => ({ ...p, plotThreads }))
        }
        onExpandBlock={(blockId) => void handleExpandPlotBlock(blockId)}
        onRunSeedToBible={(premise, genre) => void handleRunSeedToBible(premise, genre)}
        onCreateNewProjectFromSeed={handleCreateNewProjectFromSeed}
        onApplySeedPreview={handleApplySeedPreview}
        onDiscardSeedPreview={() => setSeedPreview(null)}
        onExportSeedPreview={(edited) =>
          downloadTextFile(
            'master_plot_generated.json',
            serializeMasterPlotJson(edited.blocks, edited.plotThreads),
            'application/json'
          )
        }
        onRunGenerateVolumes={(count) => void handleRunGenerateVolumes(count)}
        onRunLivingRealign={() => void handleRunLivingRealign()}
        onApplyLivingRealign={handleApplyLivingRealign}
        onDiscardLivingRealign={() => setRealignPreview(null)}
        onExportMasterPlot={() =>
          downloadTextFile(
            'master_plot.json',
            serializeMasterPlotJson(
              activeProject.masterPlotBlocks,
              activeProject.plotThreads
            ),
            'application/json'
          )
        }
        onImportMasterPlotFile={handleImportMasterPlotFile}
      />

      <VolumeBlueprintModal
        act={editingVolume}
        isBusy={isPlotArchitectBusy}
        errorMessage={plotArchitectError}
        onClose={() => setEditingVolumeId(null)}
        onSaveBlueprint={(actId, blueprint: VolumeBlueprint, title: string) =>
          updateActiveProject((p) => ({
            ...p,
            acts: updateActInActs(p.acts, actId, (a) => ({
              ...a,
              title,
              blueprint,
            })),
          }))
        }
        onGenerateVolumeChapters={(actId, count) =>
          void handleGenerateVolumeChapters(actId, count)
        }
      />

      <ApiSettingsModal
        isOpen={showApiModal}
        settings={apiSettings}
        usageStats={usageStats}
        onClose={() => setShowApiModal(false)}
        onSave={handleSaveApiSettings}
        onResetUsageStats={(scope) => {
          setUsageStats((prev) => {
            const next: UsageStats =
              scope === 'session'
                ? {
                    ...prev,
                    sessionPromptTokens: 0,
                    sessionCompletionTokens: 0,
                    sessionCostUsd: 0,
                  }
                : {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalCalls: 0,
                    estimatedCostUsd: 0,
                    sessionPromptTokens: 0,
                    sessionCompletionTokens: 0,
                    sessionCostUsd: 0,
                  };
            saveUsageStats(next);
            return next;
          });
        }}
      />

      <ChapterSyncModal
        isOpen={showSyncModal}
        chapterTitle={activeChapter.title}
        isLoading={isSyncingChapter}
        error={syncError}
        result={syncResult}
        onClose={() => {
          syncAbortRef.current?.abort();
          setIsSyncingChapter(false);
          setShowSyncModal(false);
        }}
        onApply={handleApplyChapterSync}
      />

      <ManuscriptSearchModal
        isOpen={showSearchModal}
        acts={activeProject.acts}
        onClose={() => setShowSearchModal(false)}
        onJumpToChapter={(chapterId) =>
          updateActiveProject((p) => ({ ...p, activeChapterId: chapterId }))
        }
        onReplaceAll={(nextActs) =>
          updateActiveProject((p) => ({
            ...p,
            acts: nextActs,
            storyText: compileStoryTextFromActs(nextActs),
          }))
        }
      />

      <PromptInspectorModal
        isOpen={showPromptInspector}
        contextResult={promptContextResult}
        apiSettings={apiSettings}
        totalMasterPlotBlocks={activeProject.masterPlotBlocks.length}
        onClose={() => setShowPromptInspector(false)}
      />

      <ProjectModal
        isOpen={showProjectModal}
        projects={projects}
        activeProjectId={activeProject.id}
        onClose={() => setShowProjectModal(false)}
        onSelectProject={(id) => commitActiveProjectId(id)}
        onCreateProject={(title) => {
          const created = createBlankProject(title);
          commitProjects((prev) => [created, ...prev]);
          commitActiveProjectId(created.id);
        }}
        onDuplicateProject={handleDuplicateProject}
        onRenameProject={(id, title) =>
          updateProjectById(id, (p) => ({ ...p, title }))
        }
        onDeleteProject={(id) => {
          commitProjects((prev) => {
            const remaining = prev.filter((p) => p.id !== id);
            if (remaining.length === 0) return prev;
            if (activeProjectIdRef.current === id) {
              commitActiveProjectId(remaining[0].id);
            }
            return remaining;
          });
        }}
        onExportFullJson={handleExportFullJson}
        onExportMarkdown={(proj) =>
          downloadTextFile(
            `${(proj.title || 'novel').replace(/[^\p{L}\p{N}_-]+/gu, '_')}.md`,
            compileManuscriptMarkdown(proj),
            'text/markdown;charset=utf-8'
          )
        }
        onExportHtml={(proj) =>
          downloadTextFile(
            `${(proj.title || 'novel').replace(/[^\p{L}\p{N}_-]+/gu, '_')}.html`,
            compileManuscriptHtml(proj),
            'text/html;charset=utf-8'
          )
        }
        onImportFullProjectFile={handleImportFullProjectFile}
      />

      <BulkImportModal
        isOpen={showBulkImportModal}
        acts={activeProject.acts}
        onClose={() => setShowBulkImportModal(false)}
        onImportChapters={(targetActId, chapters) =>
          updateActiveProject((p) => {
            const nextActs = p.acts.map((a) =>
              a.id === targetActId
                ? { ...a, collapsed: false, chapters: [...a.chapters, ...chapters] }
                : a
            );
            return {
              ...p,
              acts: nextActs,
              activeChapterId: chapters[0]?.id ?? p.activeChapterId,
              storyText: compileStoryTextFromActs(nextActs),
            };
          })
        }
      />

      <ImportConflictModal
        isOpen={Boolean(pendingImport)}
        category={pendingImport?.category ?? 'characters'}
        summaryText={pendingImport?.summaryText ?? ''}
        onCancel={() => setPendingImport(null)}
        onConfirm={handleConfirmPendingImport}
      />
    </div>
  );
}
