import test from 'node:test';
import assert from 'node:assert/strict';
import { createAct, createChapter } from './manuscriptEngine';
import { replaceAcrossManuscript, searchAcrossManuscript } from './manuscriptSearch';
import { parseBulkChapters } from './bulkImporter';
import { lintVietnameseProse } from './proseLinter';
import { parseImportedCharactersJson, mergeCharactersList } from './assetExchange';

test('searchAcrossManuscript and replaceAcrossManuscript operate cleanly on Volume -> Chapter', () => {
  const c1 = createChapter('Chương 1', 'Lâm Huyền cầm kiếm. Lâm Huyền nhìn mây.');
  const c2 = createChapter('Chương 2', 'Triệu Phong cười lạnh với Lâm Huyền.');
  const act = createAct('Quyển 1', [c1, c2]);

  const found = searchAcrossManuscript([act], 'Lâm Huyền');
  assert.equal(found.totalMatches, 3);
  assert.equal(found.matchedChaptersCount, 2);

  const replaced = replaceAcrossManuscript([act], 'Lâm Huyền', 'Lâm Thanh');
  assert.equal(replaced.replacedCount, 3);
  assert.equal(replaced.modifiedChaptersCount, 2);
  assert.match(replaced.acts[0].chapters[0].content, /Lâm Thanh cầm kiếm/);
});

test('parseBulkChapters splits text directly into ManuscriptChapter[]', () => {
  const raw = 'Chương 1: Khởi Đầu\nNội dung một.\n\nChương 2: Đột Phá\nNội dung hai.';
  const chaps = parseBulkChapters(raw);
  assert.equal(chaps.length, 2);
  assert.equal(chaps[0].title, 'Chương 1: Khởi Đầu');
  assert.equal(chaps[1].content, 'Nội dung hai.');
});

test('lintVietnameseProse flags forbidden modern pronouns and >2 repeated crutch words', () => {
  const report = lintVietnameseProse(
    'Anh ta đột nhiên đứng dậy. Đột nhiên gió thổi mạnh, rồi đột nhiên mưa rơi.'
  );
  assert.equal(report.forbiddenHits.length, 1);
  assert.equal(report.forbiddenHits[0].word.toLowerCase(), 'anh ta');
  assert.equal(report.overusedHits.length, 1);
  assert.equal(report.overusedHits[0].word, 'đột nhiên');
  assert.equal(report.overusedHits[0].count, 3);
});

test('parseImportedCharactersJson supports SillyTavern V2 schema and Merge deduplication', () => {
  const stV2 = JSON.stringify({
    spec: 'chara_card_v2',
    data: {
      name: 'Bạch Lăng',
      description: 'Kiếm tu áo trắng',
      personality: 'Lạnh lùng',
      scenario: 'Đang bế quan tại Hậu Sơn',
      tags: ['kiếm tu', 'đồng hành'],
    },
  });
  const parsed = parseImportedCharactersJson(stV2);
  assert.equal(parsed.characters.length, 1);
  assert.equal(parsed.characters[0].name, 'Bạch Lăng');

  const merged = mergeCharactersList(parsed.characters, parsed.characters, 'merge');
  assert.equal(merged.list.length, 1);
  assert.equal(merged.addedCount, 0);
});
