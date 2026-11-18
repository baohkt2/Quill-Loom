import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getManualSummarizeRange,
  getNextAutoSummarizeRange,
  parseExtractedFactsResponse,
  retrieveRelevantMemories,
  tokenizeForRetrieval,
} from './memoryEngine';
import { LongTermMemoryCard } from '../types/novel';

test('tokenizeForRetrieval handles Vietnamese diacritics and filters stop words', () => {
  const tokens = tokenizeForRetrieval('Mirei giữ chiếc Ngọc Bội cổ trong xưởng và nhìn về phía Hải Đăng.');
  assert.ok(tokens.includes('mirei'));
  assert.ok(tokens.includes('ngọc'));
  assert.ok(tokens.includes('bội'));
  assert.ok(tokens.includes('hải'));
  assert.ok(tokens.includes('đăng'));
  assert.ok(!tokens.includes('và'));
  assert.ok(!tokens.includes('trong'));
});

test('retrieveRelevantMemories ranks relevant BM25 cards and returns at most top 5', () => {
  const cards: LongTermMemoryCard[] = [
    {
      id: 'm1',
      category: 'item',
      content: 'Mirei carries the tarnished Astrolabe of Tides recovered from the sunken aqueduct.',
      keywords: 'astrolabe, aqueduct',
      enabled: true,
      createdAt: 1,
    },
    {
      id: 'm2',
      category: 'promise',
      content: 'Captain Kestrel swore an oath to protect the lower harbor guild.',
      keywords: 'kestrel, oath, harbor',
      enabled: true,
      createdAt: 2,
    },
    {
      id: 'm3',
      category: 'relationship',
      content: 'Thẩm phán Trần nghi ngờ nguồn gốc của mảnh Ngọc Bội Hoàng Thành.',
      keywords: 'ngọc bội, hoàng thành',
      enabled: true,
      createdAt: 3,
    },
    {
      id: 'm4',
      category: 'fact',
      content: 'The northern mountain pass freezes every November.',
      keywords: 'mountain, snow',
      enabled: true,
      createdAt: 4,
    },
    {
      id: 'm5',
      category: 'event',
      content: 'A disabled memory about the Astrolabe that must not appear.',
      keywords: 'astrolabe',
      enabled: false,
      createdAt: 5,
    },
    {
      id: 'm6',
      category: 'fact',
      content: 'Tide bells ring twice when harbor chains lift.',
      keywords: 'tide, bell, harbor',
      enabled: true,
      createdAt: 6,
    },
    {
      id: 'm7',
      category: 'fact',
      content: 'Prismite glows amber near the harbor reef.',
      keywords: 'prismite, harbor',
      enabled: true,
      createdAt: 7,
    },
    {
      id: 'm8',
      category: 'event',
      content: 'Kestrel inspected the harbor locks before midnight.',
      keywords: 'kestrel, harbor',
      enabled: true,
      createdAt: 8,
    },
  ];

  const recentStory =
    'Mirei raised the Astrolabe toward the harbor bell as Captain Kestrel stepped onto the wet planks, clutching the Ngọc Bội.';
  const recalled = retrieveRelevantMemories(recentStory, cards, 5);

  assert.ok(recalled.length <= 5);
  assert.ok(recalled.length >= 3);
  assert.ok(!recalled.some((r) => r.card.id === 'm5'));
  assert.ok(!recalled.some((r) => r.card.id === 'm4'));
  assert.ok(recalled.some((r) => r.card.id === 'm1'));
  assert.ok(recalled.some((r) => r.card.id === 'm2'));
  assert.ok(recalled.some((r) => r.card.id === 'm3'));
});

test('getNextAutoSummarizeRange triggers only when story exceeds contextBudgetChars', () => {
  const shortStory = 'Short paragraph.\n\nAnother short paragraph.';
  assert.equal(getNextAutoSummarizeRange(shortStory, 24000, 0), null);

  const para = 'The storm hammered the brass aqueducts as lantern boats drifted past the spire. '.repeat(25);
  const longStory = Array.from({ length: 14 }, (_, i) => `Section ${i}: ${para}`).join('\n\n');
  const range = getNextAutoSummarizeRange(longStory, 12000, 0);

  assert.ok(range !== null);
  assert.equal(range.startChar, 0);
  assert.ok(range.endChar >= 3500 && range.endChar <= 6500);
  assert.ok(range.chunkText.length > 2000);
});

test('getManualSummarizeRange handles custom ranges and latest unsummarized chunks', () => {
  const story = 'First chapter prose.\n\nSecond chapter prose.\n\nThird chapter prose.';
  const custom = getManualSummarizeRange(story, 0, 22, 43);
  assert.ok(custom !== null);
  assert.equal(custom.chunkText, 'Second chapter prose.');

  const next = getManualSummarizeRange(story, 22);
  assert.ok(next !== null);
  assert.equal(next.startChar, 22);
  assert.ok(next.chunkText.includes('Third chapter prose.'));
});

test('parseExtractedFactsResponse parses JSON fenced output and bullet fallback', () => {
  const fencedJson = `Here are the facts:
\`\`\`json
[
  {"category": "item", "content": "Mirei obtained a cracked Prismite lens.", "keywords": "prismite, lens"},
  {"category": "promise", "content": "Kestrel promised to return before dawn.", "keywords": "kestrel, dawn"}
]
\`\`\``;
  const parsedJson = parseExtractedFactsResponse(fencedJson);
  assert.equal(parsedJson.length, 2);
  assert.equal(parsedJson[0].category, 'item');
  assert.equal(parsedJson[1].category, 'promise');

  const bullets = `- [relationship] Mirei trusts Captain Kestrel despite the debt.\n- [item] The Astrolabe rings glowed near the harbor.`;
  const parsedBullets = parseExtractedFactsResponse(bullets);
  assert.equal(parsedBullets.length, 2);
  assert.equal(parsedBullets[0].category, 'relationship');
  assert.equal(parsedBullets[1].category, 'item');
});
