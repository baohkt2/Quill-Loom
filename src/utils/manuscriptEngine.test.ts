import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileStoryTextFromActs,
  createAct,
  createChapter,
  findActiveChapterLocation,
  getAdjacentChapterLocations,
  getPreviousChapterTail,
} from './manuscriptEngine';
import { migrateProject } from './storage';

test('manuscriptEngine flattens Volume -> Chapter and resolves previous tail', () => {
  const c1 = createChapter('Chương 1', 'Đoạn cuối chương một.');
  const c2 = createChapter('Chương 2', '');
  const act = createAct('Quyển 1', [c1, c2]);

  const loc = findActiveChapterLocation([act], c2.id);
  assert.equal(loc?.chapter.id, c2.id);

  const tail = getPreviousChapterTail([act], c2.id, 500);
  assert.equal(tail?.chapterTitle, 'Chương 1');
  assert.equal(tail?.tailContent, 'Đoạn cuối chương một.');

  const adj = getAdjacentChapterLocations([act], c2.id);
  assert.equal(adj.prev?.chapter.id, c1.id);
  assert.equal(adj.next, null);
  assert.equal(compileStoryTextFromActs([act]), 'Đoạn cuối chương một.');
});

test('migrateProject losslessly migrates legacy scenes[] and activeSceneId into Chapters', () => {
  const legacyRaw = {
    id: 'proj_legacy',
    title: 'Truyện Cũ',
    activeSceneId: 'sc_2',
    acts: [
      {
        id: 'act_1',
        title: 'Quyển 1',
        chapters: [
          {
            id: 'chap_1',
            title: 'Chương 1',
            scenes: [
              { id: 'sc_1', title: 'Cảnh 1', content: 'Cảnh một.', beats: '- Nhịp 1' },
              { id: 'sc_2', title: 'Cảnh 2', content: 'Cảnh hai.', beats: '- Nhịp 2' },
            ],
          },
        ],
      },
    ],
  };

  const migrated = migrateProject(legacyRaw);
  assert.equal(migrated.activeChapterId, 'chap_1');
  assert.equal(migrated.acts[0].chapters[0].content, 'Cảnh một.\n\nCảnh hai.');
  assert.match(migrated.acts[0].chapters[0].beats, /Nhịp 1/);
  assert.match(migrated.acts[0].chapters[0].beats, /Nhịp 2/);
  assert.equal(Array.isArray(migrated.masterPlotBlocks), true);
  assert.equal(Array.isArray(migrated.plotThreads), true);
});
