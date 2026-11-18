import {
  ChapterStatus,
  DEFAULT_VOLUME_BLUEPRINT,
  ManuscriptAct,
  ManuscriptChapter,
  VolumeBlueprint,
} from '../types/novel';
import { countWords } from './promptBuilder';

export interface ChapterLocation {
  actIndex: number;
  chapterIndex: number;
  act: ManuscriptAct;
  chapter: ManuscriptChapter;
}

export interface PreviousChapterContext {
  actId: string;
  actTitle: string;
  chapterId: string;
  chapterTitle: string;
  tailContent: string;
  fullContent: string;
}

export function createChapter(
  title = 'Chương 1',
  content = '',
  beats = '',
  status: ChapterStatus = 'Draft',
  chapterGoal = ''
): ManuscriptChapter {
  const now = Date.now();
  return {
    id: `chap_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    content,
    beats,
    chapterGoal,
    status,
    snapshots: [],
    updatedAt: now,
  };
}

export function createAct(
  title = 'Quyển 1',
  chapters?: ManuscriptChapter[],
  blueprint?: Partial<VolumeBlueprint>
): ManuscriptAct {
  const now = Date.now();
  const initialChapters = chapters && chapters.length > 0 ? chapters : [createChapter('Chương 1')];
  return {
    id: `act_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    blueprint: {
      ...DEFAULT_VOLUME_BLUEPRINT,
      ...(blueprint ?? {}),
    },
    chapters: initialChapters,
    collapsed: false,
  };
}

export function flattenChapters(acts: ManuscriptAct[]): ChapterLocation[] {
  const list: ChapterLocation[] = [];
  acts.forEach((act, actIndex) => {
    act.chapters.forEach((chapter, chapterIndex) => {
      list.push({
        actIndex,
        chapterIndex,
        act,
        chapter,
      });
    });
  });
  return list;
}

export function findActiveChapterLocation(
  acts: ManuscriptAct[],
  activeChapterId: string
): ChapterLocation | null {
  const flat = flattenChapters(acts);
  if (flat.length === 0) return null;
  const found = flat.find((loc) => loc.chapter.id === activeChapterId);
  return found ?? flat[0];
}

export function getImmediatePreviousChapter(
  acts: ManuscriptAct[],
  activeChapterId: string
): ChapterLocation | null {
  const flat = flattenChapters(acts);
  const idx = flat.findIndex((loc) => loc.chapter.id === activeChapterId);
  if (idx <= 0) return null;
  return flat[idx - 1];
}

export function getPreviousChapterTail(
  acts: ManuscriptAct[],
  activeChapterId: string,
  maxChars = 1500
): PreviousChapterContext | null {
  const flat = flattenChapters(acts);
  const idx = flat.findIndex((loc) => loc.chapter.id === activeChapterId);
  if (idx <= 0) return null;

  for (let i = idx - 1; i >= 0; i--) {
    const prev = flat[i];
    const trimmed = prev.chapter.content.trim();
    if (trimmed.length > 0) {
      return {
        actId: prev.act.id,
        actTitle: prev.act.title,
        chapterId: prev.chapter.id,
        chapterTitle: prev.chapter.title,
        tailContent: trimmed.slice(-maxChars),
        fullContent: trimmed,
      };
    }
  }
  return null;
}

export function compileStoryTextFromActs(acts: ManuscriptAct[]): string {
  return flattenChapters(acts)
    .map((loc) => loc.chapter.content.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function countChapterWords(chapter: ManuscriptChapter): number {
  return countWords(chapter.content);
}

export function countTotalChapters(acts: ManuscriptAct[]): number {
  return acts.reduce((sum, act) => sum + act.chapters.length, 0);
}

export function updateChapterInActs(
  acts: ManuscriptAct[],
  chapterId: string,
  updater: (chapter: ManuscriptChapter) => ManuscriptChapter
): ManuscriptAct[] {
  return acts.map((act) => ({
    ...act,
    chapters: act.chapters.map((chap) =>
      chap.id === chapterId ? updater(chap) : chap
    ),
  }));
}

export function updateActInActs(
  acts: ManuscriptAct[],
  actId: string,
  updater: (act: ManuscriptAct) => ManuscriptAct
): ManuscriptAct[] {
  return acts.map((act) => (act.id === actId ? updater(act) : act));
}

export function moveChapterInAct(
  acts: ManuscriptAct[],
  actId: string,
  chapterId: string,
  direction: 'up' | 'down'
): ManuscriptAct[] {
  return acts.map((act) => {
    if (act.id !== actId) return act;
    const idx = act.chapters.findIndex((c) => c.id === chapterId);
    if (idx === -1) return act;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= act.chapters.length) return act;
    const copy = [...act.chapters];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    return { ...act, chapters: copy };
  });
}

export function cycleChapterStatus(status: ChapterStatus): ChapterStatus {
  if (status === 'Draft') return 'Revised';
  if (status === 'Revised') return 'Final';
  return 'Draft';
}

export function getAdjacentChapterLocations(
  acts: ManuscriptAct[],
  activeChapterId: string
): {
  prev: ChapterLocation | null;
  next: ChapterLocation | null;
  index: number;
  total: number;
} {
  const flat = flattenChapters(acts);
  const index = flat.findIndex((loc) => loc.chapter.id === activeChapterId);
  if (index === -1) {
    return { prev: null, next: null, index: 0, total: flat.length };
  }
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
    index,
    total: flat.length,
  };
}
