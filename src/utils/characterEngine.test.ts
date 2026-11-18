import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCharacterUpdatePrompt,
  findActiveCharacters,
  formatCharacterRosterBlock,
  formatProtagonistPromptBlock,
  parseCharactersJson,
  parseCharacterUpdateSuggestions,
  serializeCharactersJson,
} from './characterEngine';
import { CharacterCard, ProtagonistProfile } from '../types/novel';

const sampleProtagonist: ProtagonistProfile = {
  name: 'Lâm Huyền',
  povStyle: 'Third-Person Limited (Ngôi thứ ba hạn chế)',
  personality: 'Cẩn trọng, trầm tĩnh, trọng ân nghĩa.',
  abilitiesAndState: 'Đang bế quan tại Hậu Sơn.',
  realm: 'Luyện Khí tầng 3',
  techniques: 'Thanh Vân Dẫn Khí Quyết',
  resources: '1 viên hạ phẩm linh thạch',
  inventory: 'Mảnh Ngọc Bội Thanh Đồng',
};

const sampleRoster: CharacterCard[] = [
  {
    id: 'c_pinned',
    name: 'Tô Thanh Y',
    aliases: 'thanh y, tiểu sư muội',
    role: 'Ally',
    appearanceAndPersonality: 'Thanh tú, bình tĩnh.',
    speechStyleAndPronouns: 'Nói chuyện nhẹ nhàng, gọi Lâm Huyền là "Lâm sư huynh".',
    currentStatusAndRelationship: 'Đang canh giữ ngoài động phủ, tin tưởng Lâm Huyền.',
    inScene: true,
    updatedAt: 1,
  },
  {
    id: 'c_alias',
    name: 'Triệu Phong',
    aliases: 'triệu sư huynh, chấp sự',
    role: 'Antagonist',
    appearanceAndPersonality: 'Ánh mắt sắc lạnh, mặc trường bào nội môn.',
    speechStyleAndPronouns: 'Ngạo mạn, tự xưng "ta", gọi ngoại môn đệ tử là "ngươi".',
    currentStatusAndRelationship: 'Đang tuần tra Hậu Sơn, nghi ngờ có người trộm linh khí.',
    inScene: false,
    updatedAt: 2,
  },
  {
    id: 'c_far',
    name: 'Huyền Cơ Trưởng Lão',
    aliases: 'huyền cơ, trưởng lão',
    role: 'Supporting',
    appearanceAndPersonality: 'Râu bạc dài.',
    speechStyleAndPronouns: 'Trang nghiêm, xưng "lão phu".',
    currentStatusAndRelationship: 'Bế quan tại Đan Phong.',
    inScene: false,
    updatedAt: 3,
  },
];

test('formatProtagonistPromptBlock omits blank profile and formats populated profile with status & inventory', () => {
  assert.equal(
    formatProtagonistPromptBlock({
      name: '',
      povStyle: 'Third-Person Limited',
      personality: '',
      abilitiesAndState: '',
      realm: '',
      techniques: '',
      resources: '',
      inventory: '',
    }),
    ''
  );

  const formatted = formatProtagonistPromptBlock(sampleProtagonist);
  assert.ok(formatted.startsWith('[Protagonist / POV]'));
  assert.ok(formatted.includes('Name: Lâm Huyền'));
  assert.ok(formatted.includes('Cultivation Realm / Level: Luyện Khí tầng 3'));
  assert.ok(formatted.includes('Inventory / Artifacts: Mảnh Ngọc Bội Thanh Đồng'));
});

test('findActiveCharacters activates In-Scene pinned cards and Auto-Mentioned cards within last 2000 chars', () => {
  const oldPrefix = `huyền cơ trưởng lão ${'x'.repeat(2100)}`; // outside 2000-char tail window
  const story = `${oldPrefix} Dưới bóng trúc, giọng nói lạnh lẽo của vị chấp sự vang lên.`;

  const active = findActiveCharacters(story, sampleRoster, 2000);
  assert.equal(active.length, 2);
  assert.equal(active[0].card.id, 'c_pinned');
  assert.equal(active[0].reason, 'in_scene');
  assert.equal(active[1].card.id, 'c_alias');
  assert.equal(active[1].reason, 'mentioned');
  assert.equal(active[1].matchedTerm, 'chấp sự');

  const block = formatCharacterRosterBlock(active);
  assert.ok(block.includes('[Active Characters]'));
  assert.ok(block.includes('Tô Thanh Y (Ally)'));
  assert.ok(block.includes('Speech Style & Pronouns:'));
  assert.ok(!block.includes('Huyền Cơ Trưởng Lão'));
});

test('serializeCharactersJson and parseCharactersJson round-trip protagonist and cast cards', () => {
  const json = serializeCharactersJson(sampleProtagonist, sampleRoster);
  const parsed = parseCharactersJson(json);

  assert.equal(parsed.protagonist?.name, 'Lâm Huyền');
  assert.equal(parsed.protagonist?.realm, 'Luyện Khí tầng 3');
  assert.equal(parsed.protagonist?.inventory, 'Mảnh Ngọc Bội Thanh Đồng');
  assert.equal(parsed.characters.length, 3);
  assert.equal(parsed.characters[0].inScene, true);
  assert.equal(parsed.characters[1].role, 'Antagonist');
});

test('buildCharacterUpdatePrompt and parseCharacterUpdateSuggestions handle active NPCs and protagonist realm/inventory', () => {
  const activeOnly = [sampleRoster[0], sampleRoster[1]];
  const prompt = buildCharacterUpdatePrompt(
    'Lâm Huyền đột phá Luyện Khí tầng 4 và thu hồi túi trữ vật của Triệu Phong.',
    sampleProtagonist,
    activeOnly
  );
  assert.ok(prompt.user.includes('__protagonist__'));
  assert.ok(prompt.user.includes('c_alias'));
  assert.ok(!prompt.user.includes('c_far'));

  const llmReply = `\`\`\`json
[
  {
    "characterId": "__protagonist__",
    "characterName": "Lâm Huyền",
    "suggestedRealm": "Luyện Khí tầng 4",
    "suggestedResources": "5 viên hạ phẩm linh thạch",
    "reason": "Hấp thu linh khí từ ngọc bội và thu chiến lợi phẩm."
  },
  {
    "characterId": "c_alias",
    "characterName": "Triệu Phong",
    "suggestedStatus": "Bị kiếm khí làm sượt vai trái, cảnh giác và căm tức Lâm Huyền hơn.",
    "reason": "Trúng thương trong giao chiến tại rừng trúc."
  },
  {
    "characterId": "c_far",
    "characterName": "Huyền Cơ Trưởng Lão",
    "suggestedStatus": "Không nên xuất hiện vì không có mặt."
  },
  {
    "characterId": "c_pinned",
    "characterName": "Tô Thanh Y",
    "suggestedStatus": "Đang canh giữ ngoài động phủ, tin tưởng Lâm Huyền."
  }
]
\`\`\``;

  const suggestions = parseCharacterUpdateSuggestions(llmReply, activeOnly, sampleProtagonist);
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].targetType, 'protagonist');
  assert.equal(suggestions[0].suggestedRealm, 'Luyện Khí tầng 4');
  assert.equal(suggestions[0].suggestedResources, '5 viên hạ phẩm linh thạch');
  assert.equal(suggestions[1].characterId, 'c_alias');
  assert.ok(suggestions[1].suggestedStatus.includes('sượt vai trái'));
});
