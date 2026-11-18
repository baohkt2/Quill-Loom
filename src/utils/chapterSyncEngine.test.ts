import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChapterSyncPrompt,
  parseChapterSyncResponse,
} from './chapterSyncEngine';
import { DEFAULT_PROTAGONIST_PROFILE } from '../types/novel';

test('chapterSyncEngine parses plotThreadUpdates (new and resolve) accurately', () => {
  const raw = JSON.stringify({
    summary: '- Lâm Huyền phá giải trận pháp ngoại môn.',
    longTermFacts: [
      { content: 'Mở khóa tầng 2 Ngọc Bội', category: 'Vật phẩm', keywords: 'ngọc bội' },
    ],
    characterUpdates: [{ name: 'Triệu Phong', updatedStatus: 'Bị trọng thương và bỏ trốn' }],
    protagonistStatusUpdate: { realm: 'Luyện Khí tầng 4' },
    lorebookSuggestions: [],
    plotThreadUpdates: [
      {
        action: 'resolve',
        title: 'Âm mưu bòn rút linh thạch của Triệu Phong',
        description: 'Đã vạch trần trước trưởng lão',
        introducedChapter: 'Chương 5',
      },
      {
        action: 'new',
        title: 'Dấu ấn Huyết Sát Minh',
        description: 'Tìm thấy lệnh bài Huyết Sát Minh trong túi Triệu Phong',
        introducedChapter: 'Chương 5',
      },
    ],
  });

  const parsed = parseChapterSyncResponse(raw, {
    chapterTitle: 'Chương 5',
    existingThreads: [
      {
        id: 'pt_seed_zhao',
        title: 'Âm mưu bòn rút linh thạch của Triệu Phong',
        description: 'Thu phí bảo hộ trái phép',
        introducedChapter: 'Chương 2',
        status: 'Open',
      },
    ],
  });

  assert.equal(parsed.protagonistStatusUpdate?.realm, 'Luyện Khí tầng 4');
  assert.equal(parsed.plotThreadUpdates.length, 2);
  assert.equal(parsed.plotThreadUpdates[0].action, 'resolve');
  assert.equal(parsed.plotThreadUpdates[0].existingThreadId, 'pt_seed_zhao');
  assert.equal(parsed.plotThreadUpdates[1].action, 'new');
});

test('buildChapterSyncPrompt injects Master Plot and Open Plot Threads', () => {
  const { user } = buildChapterSyncPrompt({
    chapterTitle: 'Chương 3',
    chapterText: 'Nội dung chương 3.',
    protagonist: { ...DEFAULT_PROTAGONIST_PROFILE, name: 'Lâm Huyền' },
    characters: [],
    lorebook: [],
    plotThreads: [
      {
        id: 'pt1',
        title: 'Bí mật Ngọc Bội',
        description: 'Phát sáng ban đêm',
        introducedChapter: 'Chương 1',
        status: 'Open',
      },
    ],
  });

  assert.match(user, /Bí mật Ngọc Bội/);
  assert.match(user, /Nội dung chương 3/);
});
