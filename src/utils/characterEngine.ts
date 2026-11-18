import { CharacterCard, CharacterRole, ProtagonistProfile } from '../types/novel';
import { splitThinkingAndContent } from './thinkingOrchestrator';

export interface ActiveCharacterMatch {
  card: CharacterCard;
  matchedTerm: string;
}

export function findActiveCharacters(
  storyText: string,
  characters: CharacterCard[],
  scanWindowChars = 2000
): ActiveCharacterMatch[] {
  if (!storyText || characters.length === 0) return [];
  const tail = storyText.slice(-scanWindowChars).toLocaleLowerCase();
  const matches: ActiveCharacterMatch[] = [];

  for (const card of characters) {
    if (!card.enabled) continue;
    const terms = [card.name, ...card.aliases.split(',')]
      .map((t) => t.trim().toLocaleLowerCase())
      .filter(Boolean);

    const hit = terms.find((term) => tail.includes(term));
    if (hit) {
      matches.push({ card, matchedTerm: hit });
    }
  }
  return matches;
}

export function formatProtagonistPromptBlock(protagonist?: ProtagonistProfile): string {
  if (!protagonist) return '';
  const lines: string[] = [];
  if (protagonist.name.trim()) {
    lines.push(
      `Tên: ${protagonist.name.trim()}${protagonist.ageOrTitle.trim() ? ` (${protagonist.ageOrTitle.trim()})` : ''}`
    );
  }
  if (protagonist.realm?.trim()) lines.push(`Cảnh giới / Cấp độ: ${protagonist.realm.trim()}`);
  if (protagonist.techniques?.trim()) lines.push(`Công pháp & Thần thông: ${protagonist.techniques.trim()}`);
  if (protagonist.resources?.trim()) lines.push(`Tài nguyên / Linh thạch: ${protagonist.resources.trim()}`);
  if (protagonist.inventory?.trim()) lines.push(`Hành trang / Pháp bảo: ${protagonist.inventory.trim()}`);
  if (protagonist.appearance.trim()) lines.push(`Ngoại hình: ${protagonist.appearance.trim()}`);
  if (protagonist.personality.trim()) lines.push(`Tính cách: ${protagonist.personality.trim()}`);
  if (protagonist.background.trim()) lines.push(`Xuất thân: ${protagonist.background.trim()}`);
  if (protagonist.goal.trim()) lines.push(`Mục tiêu: ${protagonist.goal.trim()}`);

  if (lines.length === 0) return '';
  return `[Protagonist Profile & Status]\n${lines.join('\n')}`;
}

export function formatCharacterRosterBlock(matches: ActiveCharacterMatch[]): string {
  if (matches.length === 0) return '';
  const body = matches
    .map(({ card }) => {
      const details = [
        `Vai trò: ${card.role}`,
        card.appearanceAndPersonality.trim()
          ? `Ngoại hình & Tính cách: ${card.appearanceAndPersonality.trim()}`
          : '',
        card.currentStatusAndRelationship.trim()
          ? `Trạng thái & Quan hệ: ${card.currentStatusAndRelationship.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join(' | ');
      return `- ${card.name}: ${details}`;
    })
    .join('\n');

  return `[Active Characters]\n${body}`;
}

export function buildCharacterScanPrompt(params: {
  chapterText: string;
  protagonist: ProtagonistProfile;
  characters: CharacterCard[];
}): { system: string; user: string } {
  const system = [
    'Bạn là Trợ lý Kiểm tra Hồ sơ Nhân vật. Đọc chương truyện vừa viết và đề xuất cập nhật trạng thái thực tế cho Nhân vật chính (nếu cảnh giới, công pháp, linh thạch, hành trang thay đổi) và các nhân vật xuất hiện.',
    'BẮT BUỘC trả về JSON hợp lệ theo mẫu:',
    '{',
    '  "protagonistStatusUpdate": { "realm": "...", "techniques": "...", "resources": "...", "inventory": "..." },',
    '  "characterUpdates": [',
    '    { "name": "Tên nhân vật", "role": "Đối thủ|Đồng hành|Sư phụ / Tiền bối|Phản diện|Nhân vật phụ", "currentStatusAndRelationship": "Trạng thái mới", "appearanceAndPersonality": "..." }',
    '  ]',
    '}',
  ].join('\n');

  const roster = params.characters
    .map((c) => `- ${c.name} (${c.role}): ${c.currentStatusAndRelationship || c.appearanceAndPersonality}`)
    .join('\n');

  const user = [
    formatProtagonistPromptBlock(params.protagonist),
    roster ? `[Nhân vật hiện có]\n${roster}` : '',
    `[Văn bản chương]\n${params.chapterText.trim().slice(-6000)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

export interface CharacterScanSuggestion {
  protagonistStatusUpdate: Partial<
    Pick<ProtagonistProfile, 'realm' | 'techniques' | 'resources' | 'inventory'>
  > | null;
  characterUpdates: Array<{
    name: string;
    role: CharacterRole;
    currentStatusAndRelationship: string;
    appearanceAndPersonality: string;
  }>;
}

export function parseCharacterScanResponse(raw: string): CharacterScanSuggestion {
  const { content } = splitThinkingAndContent(raw);
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  let protagonistStatusUpdate: CharacterScanSuggestion['protagonistStatusUpdate'] = null;
  if (parsed.protagonistStatusUpdate && typeof parsed.protagonistStatusUpdate === 'object') {
    const p = parsed.protagonistStatusUpdate as Record<string, unknown>;
    const next: Partial<Pick<ProtagonistProfile, 'realm' | 'techniques' | 'resources' | 'inventory'>> = {};
    if (typeof p.realm === 'string' && p.realm.trim()) next.realm = p.realm.trim();
    if (typeof p.techniques === 'string' && p.techniques.trim()) next.techniques = p.techniques.trim();
    if (typeof p.resources === 'string' && p.resources.trim()) next.resources = p.resources.trim();
    if (typeof p.inventory === 'string' && p.inventory.trim()) next.inventory = p.inventory.trim();
    if (Object.keys(next).length > 0) protagonistStatusUpdate = next;
  }

  const validRoles: CharacterRole[] = [
    'Đồng hành',
    'Đối thủ',
    'Sư phụ / Tiền bối',
    'Phản diện',
    'Nhân vật phụ',
  ];
  const rawUpdates = Array.isArray(parsed.characterUpdates) ? parsed.characterUpdates : [];
  const characterUpdates = rawUpdates
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const roleStr = typeof item.role === 'string' ? item.role.trim() : '';
      const role = validRoles.includes(roleStr as CharacterRole)
        ? (roleStr as CharacterRole)
        : 'Nhân vật phụ';
      return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        role,
        currentStatusAndRelationship:
          typeof item.currentStatusAndRelationship === 'string'
            ? item.currentStatusAndRelationship.trim()
            : '',
        appearanceAndPersonality:
          typeof item.appearanceAndPersonality === 'string'
            ? item.appearanceAndPersonality.trim()
            : '',
      };
    })
    .filter((u) => u.name.length > 0);

  return { protagonistStatusUpdate, characterUpdates };
}
