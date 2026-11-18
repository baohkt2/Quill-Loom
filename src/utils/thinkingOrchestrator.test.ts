import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChapterBeatsPrompt,
  buildSyncBeatsPrompt,
  cleanGeneratedBeatsText,
  createThinkingStreamParser,
  MIN_THINKING_MAX_TOKENS,
  resolveEffectiveThinking,
  splitThinkingAndContent,
  stripLeadingProseMarkers,
} from './thinkingOrchestrator';
import { DEFAULT_PROTAGONIST_PROFILE } from '../types/novel';

test('splitThinkingAndContent handles inline <think>, explicit reasoning, and orphan </think>', () => {
  const res1 = splitThinkingAndContent('<think>suy nghĩ kỹ</think>\n\n- Nhịp 1: Mở đầu');
  assert.equal(res1.thinking, 'suy nghĩ kỹ');
  assert.equal(res1.content, '- Nhịp 1: Mở đầu');

  // Orphan closing tag when template pre-opened <think>
  const res2 = splitThinkingAndContent('phân tích nội bộ trước</think>\n\nĐoạn văn xuôi thật.');
  assert.equal(res2.thinking, 'phân tích nội bộ trước');
  assert.equal(res2.content, 'Đoạn văn xuôi thật.');
});

test('createThinkingStreamParser moves pre-close accumulated text to thinking on orphan </think>', () => {
  const parser = createThinkingStreamParser();
  const u1 = parser.push('phân tích nhịp 1 ');
  assert.equal(u1.content, 'phân tích nhịp 1 ');

  const u2 = parser.push('phân tích nhịp 2</th');
  const u3 = parser.push('ink>\n\n- Nhịp 1: Khởi đầu');
  const final = parser.flush();

  assert.equal(final.thinking, 'phân tích nhịp 1 phân tích nhịp 2');
  assert.equal(final.content, '- Nhịp 1: Khởi đầu');
});

test('resolveEffectiveThinking routes Architect tasks ON and Prose tasks OFF in Auto mode', () => {
  assert.equal(resolveEffectiveThinking('auto', 'generate_beats'), true);
  assert.equal(resolveEffectiveThinking('auto', 'sync_beats'), true);
  assert.equal(resolveEffectiveThinking('auto', 'agent_chat'), true);
  assert.equal(resolveEffectiveThinking('auto', 'chapter_sync'), true);
  assert.equal(resolveEffectiveThinking('auto', 'plot_architect'), true);

  assert.equal(resolveEffectiveThinking('auto', 'continue_story'), false);
  assert.equal(resolveEffectiveThinking('auto', 'inline_rewrite'), false);
  assert.equal(MIN_THINKING_MAX_TOKENS >= 3500, true);
});

test('buildChapterBeatsPrompt injects Master Plot, Volume Blueprint, Chapter Goal, and Open Plot Threads', () => {
  const prompt = buildChapterBeatsPrompt({
    projectTitle: 'Thanh Đồng Kiếm Đạo',
    actTitle: 'Quyển 1',
    chapterTitle: 'Chương 3',
    chapterGoal: 'Lâm Huyền thoát khỏi bẫy của Triệu Phong',
    volumeBlueprint: {
      arcGoal: 'Đạt Trúc Cơ tại ngoại môn',
      keyAntagonists: 'Triệu Phong',
      turningPointsAndClimax: 'Phản sát trong bí cảnh',
    },
    masterPlotBlocks: [
      {
        id: 'b1',
        title: 'Tiền đề',
        content: 'Nhặt ngọc bội thanh đồng',
        includeInArchitect: true,
        includeInProse: false,
      },
      {
        id: 'b2',
        title: 'Khối tắt',
        content: 'Không được đưa vào Architect',
        includeInArchitect: false,
        includeInProse: false,
      },
    ],
    plotThreads: [
      {
        id: 't1',
        title: 'Mảnh ngọc cổ',
        description: 'Cần tìm mảnh thứ hai',
        introducedChapter: 'Chương 1',
        status: 'Open',
      },
      {
        id: 't2',
        title: 'Tuyến đã đóng',
        description: 'Đã xong',
        introducedChapter: 'Chương 1',
        status: 'Resolved',
      },
    ],
    currentChapterText: '',
    existingBeats: '',
    previousChapterTail: 'Triệu Phong cười lạnh bước tới.',
    protagonist: { ...DEFAULT_PROTAGONIST_PROFILE, name: 'Lâm Huyền', realm: 'Luyện Khí tầng 3' },
    activeCharacters: [],
    lorebookEntries: [],
  });

  assert.match(prompt.user, /Nhặt ngọc bội thanh đồng/);
  assert.doesNotMatch(prompt.user, /Không được đưa vào Architect/);
  assert.match(prompt.user, /Đạt Trúc Cơ tại ngoại môn/);
  assert.match(prompt.user, /Lâm Huyền thoát khỏi bẫy của Triệu Phong/);
  assert.match(prompt.user, /Mảnh ngọc cổ/);
  assert.doesNotMatch(prompt.user, /Tuyến đã đóng/);
  assert.match(prompt.user, /Triệu Phong cười lạnh bước tới/);
});

test('cleanGeneratedBeatsText strips markdown fences and think tags cleanly', () => {
  const cleaned = cleanGeneratedBeatsText('<think>hmm</think>\n```markdown\n- Nhịp 1: A\n```');
  assert.equal(cleaned, '- Nhịp 1: A');
});

test('buildSyncBeatsPrompt requires [ĐÃ DIỄN RA] and [TIẾP THEO]', () => {
  const { system, user } = buildSyncBeatsPrompt({
    chapterTitle: 'Chương 2',
    currentChapterText: 'Lâm Huyền lùi lại hai bước.',
    existingBeats: '- Nhịp cũ',
    protagonist: { ...DEFAULT_PROTAGONIST_PROFILE, name: 'Lâm Huyền' },
    activeCharacters: [],
  });
  assert.match(system, /\[ĐÃ DIỄN RA\]/);
  assert.match(system, /\[TIẾP THEO\]/);
  assert.match(user, /Lâm Huyền lùi lại hai bước/);
});

test('stripLeadingProseMarkers removes echoed === TIẾP THEO === and === BẮT ĐẦU VIẾT === headers without touching real prose', () => {
  assert.equal(
    stripLeadingProseMarkers('=== TIẾP THEO ===\n\nÁnh trăng lạnh lẽo phủ lên phiến đá.'),
    'Ánh trăng lạnh lẽo phủ lên phiến đá.'
  );
  assert.equal(
    stripLeadingProseMarkers('=== BẮT ĐẦU VIẾT ===\n\nSương sớm giăng đầy sườn núi.'),
    'Sương sớm giăng đầy sườn núi.'
  );
  assert.equal(stripLeadingProseMarkers('=== BẮT ĐẦU VIẾT ==='), '');
  assert.equal(stripLeadingProseMarkers('=== TIẾP THEO ===\n'), '');
  assert.equal(
    stripLeadingProseMarkers('— Ngươi là ai? — Lâm Huyền khẽ hỏi.'),
    '— Ngươi là ai? — Lâm Huyền khẽ hỏi.'
  );

  const parser = createThinkingStreamParser();
  parser.push('=== TIẾP THEO ===\n');
  parser.push('<think>đang suy nghĩ dài...</think>');
  const flushed = parser.flush();
  assert.equal(stripLeadingProseMarkers(flushed.content), '');
  assert.equal(flushed.thinking, 'đang suy nghĩ dài...');
});
