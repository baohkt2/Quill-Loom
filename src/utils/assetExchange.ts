import {
  CharacterCard,
  CharacterRole,
  DEFAULT_PROTAGONIST_PROFILE,
  DEFAULT_SAMPLER_SETTINGS,
  LongTermMemoryCard,
  LorebookEntry,
  MemoryCategory,
  ProtagonistProfile,
  SamplerSettings,
} from '../types/novel';

export interface ImportedCharactersResult {
  characters: CharacterCard[];
  protagonistUpdate?: Partial<ProtagonistProfile> | null;
}

export interface StudioPresetBundle {
  schema: 'quill_loom_presets_v1';
  systemPrompt: string;
  sampler: SamplerSettings;
}

const VALID_ROLES: CharacterRole[] = [
  'Đồng hành',
  'Đối thủ',
  'Sư phụ / Tiền bối',
  'Phản diện',
  'Nhân vật phụ',
];

const VALID_MEM_CATS: MemoryCategory[] = [
  'Sự kiện',
  'Lời hứa',
  'Mối quan hệ',
  'Bí mật',
  'Vật phẩm',
  'Cảnh giới',
];

function cleanStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export function extractCharaJsonFromPngBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < pngSig.length; i++) {
    if (bytes[i] !== pngSig[i]) {
      throw new Error('Tệp PNG không hợp lệ.');
    }
  }

  let offset = 8;
  const view = new DataView(buffer);
  const decoder = new TextDecoder('latin1');

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > bytes.length) break;

    if (type === 'tEXt') {
      const chunkBytes = bytes.slice(dataStart, dataEnd);
      const nullIdx = chunkBytes.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = decoder.decode(chunkBytes.slice(0, nullIdx)).trim().toLowerCase();
        if (keyword === 'chara' || keyword === 'ccv3') {
          const b64 = decoder.decode(chunkBytes.slice(nullIdx + 1));
          return decodeBase64Utf8(b64);
        }
      }
    }

    offset = dataEnd + 4; // skip CRC
  }

  throw new Error('Không tìm thấy metadata `chara` (SillyTavern V2) bên trong tệp PNG.');
}

function mapSingleCharacterObject(
  rec: Record<string, unknown>,
  idx: number
): CharacterCard | null {
  // Handle SillyTavern V2 wrapper { spec: "chara_card_v2", data: { ... } }
  const data =
    rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)
      ? (rec.data as Record<string, unknown>)
      : rec;

  const name = cleanStr(data.name);
  if (!name) return null;

  const rawRole = cleanStr(data.role);
  const role = VALID_ROLES.includes(rawRole as CharacterRole)
    ? (rawRole as CharacterRole)
    : 'Nhân vật phụ';

  const desc = cleanStr(data.description);
  const pers = cleanStr(data.personality);
  const combinedAppearance =
    cleanStr(data.appearanceAndPersonality) ||
    [desc, pers].filter(Boolean).join('\n');

  const scenario = cleanStr(data.scenario);
  const status =
    cleanStr(data.currentStatusAndRelationship) ||
    scenario ||
    cleanStr(data.first_mes);

  const notes =
    cleanStr(data.notes) ||
    cleanStr(data.creator_notes) ||
    cleanStr(data.mes_example);

  const aliases = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t).trim()).filter(Boolean).join(', ')
    : cleanStr(data.aliases);

  return {
    id: `char_imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    aliases,
    role,
    appearanceAndPersonality: combinedAppearance,
    currentStatusAndRelationship: status,
    notes,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
  };
}

export function parseImportedCharactersJson(rawJson: string): ImportedCharactersResult {
  const parsed = JSON.parse(rawJson) as unknown;
  const characters: CharacterCard[] = [];
  let protagonistUpdate: Partial<ProtagonistProfile> | null = null;

  if (Array.isArray(parsed)) {
    parsed.forEach((item, idx) => {
      if (item && typeof item === 'object') {
        const card = mapSingleCharacterObject(item as Record<string, unknown>, idx);
        if (card) characters.push(card);
      }
    });
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (obj.protagonist && typeof obj.protagonist === 'object') {
      const p = obj.protagonist as Record<string, unknown>;
      protagonistUpdate = {
        ...DEFAULT_PROTAGONIST_PROFILE,
        name: cleanStr(p.name),
        ageOrTitle: cleanStr(p.ageOrTitle),
        personality: cleanStr(p.personality),
        background: cleanStr(p.background),
        appearance: cleanStr(p.appearance),
        goal: cleanStr(p.goal),
        realm: cleanStr(p.realm),
        techniques: cleanStr(p.techniques),
        resources: cleanStr(p.resources),
        inventory: cleanStr(p.inventory),
      };
    }

    if (Array.isArray(obj.characters)) {
      obj.characters.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          const card = mapSingleCharacterObject(item as Record<string, unknown>, idx);
          if (card) characters.push(card);
        }
      });
    } else {
      const card = mapSingleCharacterObject(obj, 0);
      if (card) characters.push(card);
    }
  }

  if (characters.length === 0 && !protagonistUpdate) {
    throw new Error('Không tìm thấy dữ liệu nhân vật hợp lệ trong tệp JSON.');
  }

  return { characters, protagonistUpdate };
}

export function parseImportedMemoriesJson(rawJson: string): LongTermMemoryCard[] {
  const parsed = JSON.parse(rawJson) as unknown;
  const rawList = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).memories)
    ? ((parsed as Record<string, unknown>).memories as unknown[])
    : parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Record<string, unknown>).longTermMemories)
    ? ((parsed as Record<string, unknown>).longTermMemories as unknown[])
    : [];

  const now = Date.now();
  const cards: LongTermMemoryCard[] = rawList
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m, idx) => {
      const catRaw = cleanStr(m.category);
      const category = VALID_MEM_CATS.includes(catRaw as MemoryCategory)
        ? (catRaw as MemoryCategory)
        : 'Sự kiện';
      const impRaw = Number(m.importance);
      const importance = (
        Number.isFinite(impRaw) ? Math.min(5, Math.max(1, Math.round(impRaw))) : 3
      ) as 1 | 2 | 3 | 4 | 5;

      return {
        id: `mem_imp_${now}_${idx}`,
        content: cleanStr(m.content || m.text),
        keywords: cleanStr(m.keywords || m.keys),
        category,
        importance,
        createdAt: typeof m.createdAt === 'number' ? m.createdAt : now,
        enabled: typeof m.enabled === 'boolean' ? m.enabled : true,
      };
    })
    .filter((c) => c.content.length > 0);

  if (cards.length === 0) {
    throw new Error('Không tìm thấy thẻ ký ức hợp lệ trong tệp JSON.');
  }
  return cards;
}

export function parseImportedPresetsJson(rawJson: string): {
  systemPrompt?: string;
  sampler?: Partial<SamplerSettings>;
} {
  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tệp Preset không phải đối tượng JSON hợp lệ.');
  }

  const systemPrompt =
    typeof parsed.systemPrompt === 'string'
      ? parsed.systemPrompt
      : typeof parsed.system_prompt === 'string'
      ? parsed.system_prompt
      : undefined;

  const rawSampler =
    parsed.sampler && typeof parsed.sampler === 'object'
      ? (parsed.sampler as Record<string, unknown>)
      : parsed;

  const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;

  const sampler: Partial<SamplerSettings> = {
    temperature: num(rawSampler.temperature ?? rawSampler.temp, DEFAULT_SAMPLER_SETTINGS.temperature),
    topP: num(rawSampler.topP ?? rawSampler.top_p, DEFAULT_SAMPLER_SETTINGS.topP),
    minP: num(rawSampler.minP ?? rawSampler.min_p, DEFAULT_SAMPLER_SETTINGS.minP),
    repetitionPenalty: num(
      rawSampler.repetitionPenalty ?? rawSampler.repeat_penalty ?? rawSampler.rep_pen,
      DEFAULT_SAMPLER_SETTINGS.repetitionPenalty
    ),
    presencePenalty: num(rawSampler.presencePenalty ?? rawSampler.presence_penalty, DEFAULT_SAMPLER_SETTINGS.presencePenalty),
    frequencyPenalty: num(rawSampler.frequencyPenalty ?? rawSampler.frequency_penalty, DEFAULT_SAMPLER_SETTINGS.frequencyPenalty),
    dryMultiplier: num(rawSampler.dryMultiplier ?? rawSampler.dry_multiplier, DEFAULT_SAMPLER_SETTINGS.dryMultiplier),
    dryBase: num(rawSampler.dryBase ?? rawSampler.dry_base, DEFAULT_SAMPLER_SETTINGS.dryBase),
    dryAllowedLength: num(
      rawSampler.dryAllowedLength ?? rawSampler.dry_allowed_length,
      DEFAULT_SAMPLER_SETTINGS.dryAllowedLength
    ),
    maxTokens: num(rawSampler.maxTokens ?? rawSampler.max_tokens, DEFAULT_SAMPLER_SETTINGS.maxTokens),
    contextBudgetChars: num(rawSampler.contextBudgetChars, DEFAULT_SAMPLER_SETTINGS.contextBudgetChars),
    stopSequences:
      typeof rawSampler.stopSequences === 'string'
        ? rawSampler.stopSequences
        : DEFAULT_SAMPLER_SETTINGS.stopSequences,
  };

  return { systemPrompt, sampler };
}

export function mergeCharactersList(
  existing: CharacterCard[],
  incoming: CharacterCard[],
  mode: 'merge' | 'replace'
): { list: CharacterCard[]; addedCount: number } {
  if (mode === 'replace') {
    return { list: incoming, addedCount: incoming.length };
  }
  const existingNames = new Set(existing.map((c) => c.name.trim().toLocaleLowerCase()));
  const uniqueIncoming = incoming.filter(
    (c) => !existingNames.has(c.name.trim().toLocaleLowerCase())
  );
  return {
    list: [...existing, ...uniqueIncoming],
    addedCount: uniqueIncoming.length,
  };
}

export function mergeLorebookList(
  existing: LorebookEntry[],
  incoming: LorebookEntry[],
  mode: 'merge' | 'replace'
): { list: LorebookEntry[]; addedCount: number } {
  if (mode === 'replace') {
    return { list: incoming, addedCount: incoming.length };
  }
  const existingNames = new Set(existing.map((e) => e.name.trim().toLocaleLowerCase()));
  const uniqueIncoming = incoming.filter(
    (e) => !existingNames.has(e.name.trim().toLocaleLowerCase())
  );
  return {
    list: [...existing, ...uniqueIncoming],
    addedCount: uniqueIncoming.length,
  };
}

export function mergeMemoriesList(
  existing: LongTermMemoryCard[],
  incoming: LongTermMemoryCard[],
  mode: 'merge' | 'replace'
): { list: LongTermMemoryCard[]; addedCount: number } {
  if (mode === 'replace') {
    return { list: incoming, addedCount: incoming.length };
  }
  const existingTexts = new Set(existing.map((m) => m.content.trim().toLocaleLowerCase()));
  const uniqueIncoming = incoming.filter(
    (m) => !existingTexts.has(m.content.trim().toLocaleLowerCase())
  );
  return {
    list: [...existing, ...uniqueIncoming],
    addedCount: uniqueIncoming.length,
  };
}

export function serializeCharactersJson(
  characters: CharacterCard[],
  protagonist?: ProtagonistProfile
): string {
  return JSON.stringify(
    {
      schema: 'quill_loom_characters_v1',
      protagonist,
      characters,
    },
    null,
    2
  );
}

export function serializeSingleCharacterJson(character: CharacterCard): string {
  return JSON.stringify(
    {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: character.name,
        description: character.appearanceAndPersonality,
        personality: character.role,
        scenario: character.currentStatusAndRelationship,
        creator_notes: character.notes,
        tags: character.aliases
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        role: character.role,
        aliases: character.aliases,
        appearanceAndPersonality: character.appearanceAndPersonality,
        currentStatusAndRelationship: character.currentStatusAndRelationship,
        notes: character.notes,
      },
    },
    null,
    2
  );
}

export function serializeLorebookJson(entries: LorebookEntry[]): string {
  return JSON.stringify(
    {
      schema: 'quill_loom_lorebook_v1',
      entries: entries.map((e) => ({
        name: e.name,
        keys: e.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        content: e.content,
        enabled: e.enabled,
      })),
    },
    null,
    2
  );
}

export function serializeMemoriesJson(memories: LongTermMemoryCard[]): string {
  return JSON.stringify(
    {
      schema: 'quill_loom_memories_v1',
      memories,
    },
    null,
    2
  );
}

export function serializePresetsJson(
  systemPrompt: string,
  sampler: SamplerSettings
): string {
  const bundle: StudioPresetBundle = {
    schema: 'quill_loom_presets_v1',
    systemPrompt,
    sampler,
  };
  return JSON.stringify(bundle, null, 2);
}
