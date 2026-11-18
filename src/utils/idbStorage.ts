import { ChapterSnapshot, ManuscriptChapter, StoryProject } from '../types/novel';

const DB_NAME = 'quill_loom_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_META = 'meta';
const KEY_PROJECTS_LIST = 'story_projects_v1';
const KEY_ACTIVE_PROJECT_ID = 'active_project_id_v1';

export const MAX_CHAPTER_SNAPSHOTS = 10;
export const MAX_SCENE_SNAPSHOTS = MAX_CHAPTER_SNAPSHOTS;

export function createChapterSnapshot(
  chapter: Pick<ManuscriptChapter, 'title' | 'content' | 'beats' | 'chapterGoal'>,
  label = 'Manual snapshot'
): ChapterSnapshot {
  const now = Date.now();
  return {
    id: `snap_${now}_${Math.random().toString(36).slice(2, 6)}`,
    label,
    title: chapter.title,
    content: chapter.content,
    beats: chapter.beats,
    chapterGoal: chapter.chapterGoal,
    createdAt: now,
  };
}

export const createSceneSnapshot = createChapterSnapshot;

export function appendChapterSnapshot(
  existing: ChapterSnapshot[] | undefined,
  snapshot: ChapterSnapshot,
  maxSnapshots = MAX_CHAPTER_SNAPSHOTS
): ChapterSnapshot[] {
  const current = Array.isArray(existing) ? existing : [];
  return [snapshot, ...current].slice(0, maxSnapshots);
}

export const appendSceneSnapshot = appendChapterSnapshot;

export function restoreChapterFromSnapshot(
  chapter: ManuscriptChapter,
  snapshotId: string
): ManuscriptChapter {
  const snapshots = Array.isArray(chapter.snapshots) ? chapter.snapshots : [];
  const target = snapshots.find((s) => s.id === snapshotId);
  if (!target) return chapter;

  const autoBackup = createChapterSnapshot(chapter, 'Tự lưu trước khi khôi phục');
  const nextSnapshots = appendChapterSnapshot(snapshots, autoBackup, MAX_CHAPTER_SNAPSHOTS);

  return {
    ...chapter,
    title: target.title,
    content: target.content,
    beats: target.beats,
    chapterGoal: typeof target.chapterGoal === 'string' ? target.chapterGoal : chapter.chapterGoal,
    snapshots: nextSnapshots,
    updatedAt: Date.now(),
  };
}

export const restoreSceneFromSnapshot = restoreChapterFromSnapshot;

export function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed.'));
    tx.oncomplete = () => db.close();
  });
}

async function idbSet<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('IndexedDB write failed.'));
    tx.oncomplete = () => db.close();
  });
}

export async function readProjectsFromIndexedDB(): Promise<StoryProject[] | null> {
  if (!hasIndexedDB()) return null;
  try {
    const result = await idbGet<StoryProject[]>(STORE_PROJECTS, KEY_PROJECTS_LIST);
    return Array.isArray(result) && result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

export async function writeProjectsToIndexedDB(projects: StoryProject[]): Promise<boolean> {
  if (!hasIndexedDB()) return false;
  try {
    await idbSet(STORE_PROJECTS, KEY_PROJECTS_LIST, projects);
    return true;
  } catch {
    return false;
  }
}

export async function readActiveProjectIdFromIndexedDB(): Promise<string | null> {
  if (!hasIndexedDB()) return null;
  try {
    const id = await idbGet<string>(STORE_META, KEY_ACTIVE_PROJECT_ID);
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

export async function writeActiveProjectIdToIndexedDB(id: string): Promise<boolean> {
  if (!hasIndexedDB()) return false;
  try {
    await idbSet(STORE_META, KEY_ACTIVE_PROJECT_ID, id);
    return true;
  } catch {
    return false;
  }
}
