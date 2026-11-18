import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPresetToProject,
  BUILTIN_PROMPT_PRESETS,
  extractCharaJsonFromPng,
  mergeOrReplaceCharacters,
  mergeOrReplaceCustomPresets,
  mergeOrReplaceLorebook,
  mergeOrReplaceMemories,
  mergeOrReplaceSummaries,
  parseMemoriesJson,
  parseMultiFormatCharacterImport,
  parsePresetsJson,
  parseSummariesJson,
  serializeLorebookJson,
  serializeMemoriesJson,
  serializePresetJson,
  serializeSingleCharacterJson,
  serializeSummariesJson,
} from './assetExchange';
import { createTuTienSeedProject } from './storage';

function buildMinimalPngWithChara(jsonString: string): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const b64 = Buffer.from(jsonString, 'utf-8').toString('base64');
  const textPayload = Buffer.concat([
    Buffer.from('chara', 'latin1'),
    Buffer.from([0]),
    Buffer.from(b64, 'latin1'),
  ]);

  const makeChunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(4 + 4 + data.length + 4);
    const len = data.length;
    out[0] = (len >>> 24) & 0xff;
    out[1] = (len >>> 16) & 0xff;
    out[2] = (len >>> 8) & 0xff;
    out[3] = len & 0xff;
    out.set(Buffer.from(type, 'latin1'), 4);
    out.set(data, 8);
    // 4-byte dummy CRC (not checked by parser)
    return out;
  };

  const ihdr = makeChunk('IHDR', new Uint8Array(13));
  const textChunk = makeChunk('tEXt', textPayload);
  const iend = makeChunk('IEND', new Uint8Array(0));

  const combined = new Uint8Array(sig.length + ihdr.length + textChunk.length + iend.length);
  let pos = 0;
  for (const part of [sig, ihdr, textChunk, iend]) {
    combined.set(part, pos);
    pos += part.length;
  }
  return combined;
}

test('extractCharaJsonFromPng and parseMultiFormatCharacterImport decode SillyTavern V2 PNG with embedded character_book', () => {
  const v2Card = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: 'Bạch Lăng Sương',
      description: 'Kiếm tu áo trắng lạnh lùng trên Tuyết Sơn.',
      personality: 'Ít nói, trọng hứa.',
      scenario: 'Đang giữ cổng Băng Cung.',
      mes_example: '<START>\n{{char}}: Kiếm xuất vô hồi.\n{{user}}: Xin đa tạ.',
      tags: ['kiếm tu', 'bạch y', 'tuyết sơn'],
      character_book: {
        entries: {
          '0': {
            key: ['tuyết sơn', 'băng cung'],
            content: 'Thánh địa của Kiếm Tông phương Bắc.',
            comment: 'Tuyết Sơn Băng Cung',
          },
        },
      },
    },
  };

  const pngBytes = buildMinimalPngWithChara(JSON.stringify(v2Card));
  const decodedJson = extractCharaJsonFromPng(pngBytes);
  const bundle = parseMultiFormatCharacterImport(decodedJson, 'png');

  assert.equal(bundle.format, 'sillytavern_png');
  assert.equal(bundle.characters.length, 1);
  assert.equal(bundle.characters[0].name, 'Bạch Lăng Sương');
  assert.ok(bundle.characters[0].aliases.includes('kiếm tu'));
  assert.ok(bundle.characters[0].appearanceAndPersonality.includes('Kiếm tu áo trắng'));
  assert.ok(bundle.characters[0].speechStyleAndPronouns.includes('Kiếm xuất vô hồi'));
  assert.equal(bundle.embeddedLorebook.length, 1);
  assert.equal(bundle.embeddedLorebook[0].name, 'Tuyết Sơn Băng Cung');
});

test('mergeOrReplaceCharacters handles skipping exact duplicates and renaming conflicting names', () => {
  const existing = createTuTienSeedProject().characters; // contains Triệu Phong, Tô Thanh Y
  const incomingSame = { ...existing[0], id: 'new_1' };
  const incomingDiffContent = {
    ...existing[0],
    id: 'new_2',
    appearanceAndPersonality: 'Phiên bản Ma Đạo sau khi nhập ma.',
  };

  const merged = mergeOrReplaceCharacters(existing, [incomingSame, incomingDiffContent], 'merge');
  assert.equal(merged.skippedDuplicates, 1);
  assert.equal(merged.addedCount, 1);
  assert.ok(merged.characters.some((c) => c.name === 'Triệu Phong (2)'));

  const replaced = mergeOrReplaceCharacters(existing, [incomingDiffContent], 'replace');
  assert.equal(replaced.characters.length, 1);
  assert.equal(replaced.characters[0].name, 'Triệu Phong');
});

test('single character and lorebook round-trip serialization + Merge/Replace', () => {
  const seed = createTuTienSeedProject();
  const singleJson = serializeSingleCharacterJson(seed.characters[0]);
  const parsedSingle = parseMultiFormatCharacterImport(singleJson, 'json');
  assert.equal(parsedSingle.format, 'native');
  assert.equal(parsedSingle.characters[0].name, seed.characters[0].name);

  const loreJson = serializeLorebookJson(seed.lorebook);
  assert.ok(loreJson.includes('"keys"'));
  const mergedLore = mergeOrReplaceLorebook(seed.lorebook, seed.lorebook, 'merge');
  assert.equal(mergedLore.skippedDuplicates, seed.lorebook.length);
});

test('Summaries and Long-Term Memories serialize, parse, and Merge/Replace cleanly', () => {
  const sumJson = serializeSummariesJson([
    { id: 's1', title: 'Chương 1', content: '- Đột phá Luyện Khí', enabled: true, startChar: 0, endChar: 200, createdAt: 1 },
  ]);
  const parsedSum = parseSummariesJson(sumJson);
  assert.equal(parsedSum.length, 1);
  const sumMerged = mergeOrReplaceSummaries(parsedSum, [
    { id: 's2', title: 'Chương 1', content: '- Nội dung khác', enabled: true, startChar: 200, endChar: 400, createdAt: 2 },
  ], 'merge');
  assert.equal(sumMerged.summaries.length, 2);
  assert.equal(sumMerged.summaries[1].title, 'Chương 1 (2)');

  const memJson = serializeMemoriesJson([
    { id: 'm1', category: 'item', content: 'Giữ Ngọc Bội', keywords: 'ngọc bội', enabled: true, createdAt: 1 },
  ]);
  const parsedMem = parseMemoriesJson(memJson);
  assert.equal(parsedMem.length, 1);
  const memReplaced = mergeOrReplaceMemories(parsedMem, [], 'replace');
  assert.equal(memReplaced.cards.length, 0);
});

test('Prompt & Sampler Presets serialize, parse, merge, and apply to project cleanly', () => {
  const preset = BUILTIN_PROMPT_PRESETS[1]; // Đô Thị
  const json = serializePresetJson(preset);
  const parsed = parsePresetsJson(json);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].temperature, preset.temperature);
  assert.equal(parsed[0].contextBudget, preset.contextBudget);

  const mergedPresets = mergeOrReplaceCustomPresets([], parsed, 'merge');
  assert.equal(mergedPresets.presets.length, 1);
  assert.ok(mergedPresets.presets[0].name.includes('(2)')); // renamed because built-in already took exact name

  const project = createTuTienSeedProject();
  const applied = applyPresetToProject(project, preset);
  assert.equal(applied.systemPrompt, preset.systemPrompt);
  assert.equal(applied.authorsNote, preset.defaultAuthorsNote);
  assert.equal(applied.sampler.temperature, preset.temperature);
  assert.equal(applied.sampler.contextBudgetChars, preset.contextBudget);
});
