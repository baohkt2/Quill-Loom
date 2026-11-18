import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_AGENT_CONTEXT_FLAGS } from '../types/novel';
import {
  buildAgentChatPayload,
  parseAgentResponseSegments,
} from './agentEngine';

test('buildAgentChatPayload builds standard turn-based system/user/assistant messages without assistant prefill', () => {
  const result = buildAgentChatPayload({
    contextInput: {
      projectTitle: 'Thanh Vân Vấn Đạo',
      sceneTitle: 'Cảnh 1: Ngọc bội dị động',
      sceneContent: 'Lâm Huyền ngồi dưới tán cổ tùng lắng nghe tiếng bước chân.',
      sceneBeats: '- Thu hồi linh thạch\n- Quan sát kẻ lạ mặt',
      protagonist: {
        name: 'Lâm Huyền',
        povStyle: 'Third-Person Limited',
        personality: 'Cẩn trọng',
        abilitiesAndState: 'Luyện Khí tầng 3',
        realm: 'Luyện Khí tầng 3',
        techniques: 'Thanh Vân Dưỡng Khí Quyết',
        resources: '12 hạ phẩm linh thạch',
        inventory: 'Thanh Vân kiếm',
      },
      memory: 'Thế giới Cửu Châu.',
      characters: [],
      activeCharacters: [],
      lorebook: [],
      triggeredLorebook: [],
      summaries: [
        {
          id: 's1',
          title: 'Chương 0',
          content: 'Hồi tưởng tông môn.',
          enabled: true,
          startChar: 0,
          endChar: 100,
          createdAt: 1,
        },
      ],
      flags: {
        ...DEFAULT_AGENT_CONTEXT_FLAGS,
        includeSummaries: false,
      },
    },
    history: [
      { id: 'm1', role: 'user', content: 'Cảnh này mở đầu ổn chưa?', createdAt: 1 },
      { id: 'm2', role: 'assistant', content: 'Không khí tĩnh mịch rất tốt.', createdAt: 2 },
    ],
    userMessage: 'Hãy lập dàn ý 4 nhịp tiếp theo.',
  });

  assert.equal(result.messages[0].role, 'system');
  assert.ok(result.messages[0].content.includes('Cảnh đang mở: Cảnh 1: Ngọc bội dị động'));
  assert.ok(result.messages[0].content.includes('Lâm Huyền ngồi dưới tán cổ tùng'));
  assert.ok(result.messages[0].content.includes('- Thu hồi linh thạch'));
  // Story Summaries was toggled OFF
  assert.equal(result.messages[0].content.includes('Hồi tưởng tông môn'), false);

  // Strict alternating turn-based chat ending in 'user', never trailing 'assistant' prefill
  assert.equal(result.messages[1].role, 'user');
  assert.equal(result.messages[2].role, 'assistant');
  assert.equal(result.messages[result.messages.length - 1].role, 'user');
  assert.equal(result.messages[result.messages.length - 1].content, 'Hãy lập dàn ý 4 nhịp tiếp theo.');
});

test('buildAgentChatPayload respects context attachment toggles', () => {
  const result = buildAgentChatPayload({
    contextInput: {
      projectTitle: 'Test Novel',
      sceneTitle: 'Scene 2',
      sceneContent: 'SECRET_SCENE_PROSE',
      sceneBeats: 'SECRET_BEATS_OUTLINE',
      protagonist: {
        name: '',
        povStyle: 'Third-Person',
        personality: '',
        abilitiesAndState: '',
        realm: '',
        techniques: '',
        resources: '',
        inventory: '',
      },
      memory: '',
      characters: [
        {
          id: 'c1',
          name: 'Triệu Phong',
          aliases: 'triệu phong',
          role: 'Antagonist',
          appearanceAndPersonality: 'Áo lam lạnh lùng',
          speechStyleAndPronouns: 'ta - ngươi',
          currentStatusAndRelationship: 'Tuần đêm',
          inScene: true,
          updatedAt: 1,
        },
      ],
      activeCharacters: [],
      lorebook: [],
      triggeredLorebook: [],
      summaries: [
        {
          id: 'sum1',
          title: 'Hồi 1',
          content: 'SUMMARY_ARC_ONE',
          enabled: true,
          startChar: 0,
          endChar: 200,
          createdAt: 1,
        },
      ],
      flags: {
        includeScene: false,
        includeBeats: false,
        includeCharactersAndLore: false,
        includeSummaries: true,
      },
    },
    history: [],
    userMessage: 'Tóm lại hồi 1 có gì cần lưu ý?',
  });

  const sys = result.messages[0].content;
  assert.equal(sys.includes('SECRET_SCENE_PROSE'), false);
  assert.equal(sys.includes('SECRET_BEATS_OUTLINE'), false);
  assert.equal(sys.includes('Áo lam lạnh lùng'), false);
  assert.ok(sys.includes('SUMMARY_ARC_ONE'));
});

test('parseAgentResponseSegments extracts :::beats, :::card (character & lorebook), and :::prose blocks cleanly', () => {
  const sample = [
    'Dưới đây là đề xuất cho cảnh tiếp theo:',
    '',
    ':::beats',
    '- Nhịp 1: Triệu Phong bước ra khỏi màn sương.',
    '- Nhịp 2: Lâm Huyền giấu mảnh ngọc vào tay áo.',
    ':::',
    '',
    'Kèm theo nhân vật mới:',
    ':::card {"type":"character","name":"Trần Hạo","role":"Ally","keys":"trần hạo, trần sư huynh","appearance":"Dáng vẻ thư sinh, đeo hồ lô đồng","speechStyle":"Ôn hòa, gọi sư đệ","content":"Đệ tử ngoại môn giữ cổng kho dược liệu"} :::',
    '',
    ':::prose',
    'Gió đêm lùa qua kẽ lá trúc, mang theo mùi hương ngai ngái của rêu đá.',
    ':::',
  ].join('\n');

  const segments = parseAgentResponseSegments(sample);
  assert.equal(segments.length, 5);
  assert.equal(segments[0].type, 'text');
  assert.equal(segments[1].type, 'beats');
  if (segments[1].type === 'beats') {
    assert.ok(segments[1].content.includes('Nhịp 1: Triệu Phong'));
  }
  assert.equal(segments[2].type, 'text');
  assert.equal(segments[3].type, 'card');
  if (segments[3].type === 'card') {
    assert.equal(segments[3].card.type, 'character');
    assert.equal(segments[3].card.name, 'Trần Hạo');
    assert.equal(segments[3].card.role, 'Ally');
    assert.equal(segments[3].card.keys, 'trần hạo, trần sư huynh');
    assert.equal(segments[3].card.speechStyle, 'Ôn hòa, gọi sư đệ');
  }
  assert.equal(segments[4].type, 'prose');
});

test('parseAgentResponseSegments strips <think> blocks and extracts :::pivot_beats and :::rewrite_beats', () => {
  const sample = [
    '<think>Cân nhắc hai hướng: giữ nguyên đoạn đầu hoặc viết lại từ đầu.</think>',
    'Có thể điều chỉnh hướng tiếp theo như sau:',
    '',
    ':::pivot_beats',
    '- Nhịp tiếp 1: Mưa lớn bất ngờ ập xuống đỉnh núi.',
    '- Nhịp tiếp 2: Lâm Huyền phát hiện dấu ấn ẩn sau phiến đá.',
    ':::',
    '',
    'Hoặc viết lại cả cảnh:',
    ':::rewrite_beats',
    '[TIẾP THEO]',
    '- Nhịp 1: Mở cảnh ngay tại đại điện tông môn.',
    ':::',
  ].join('\n');

  const segments = parseAgentResponseSegments(sample);
  assert.equal(segments.length, 4);
  assert.equal(segments[0].type, 'text');
  if (segments[0].type === 'text') {
    assert.equal(segments[0].content.includes('<think>'), false);
    assert.equal(segments[0].content.includes('Cân nhắc hai hướng'), false);
  }
  assert.equal(segments[1].type, 'pivot_beats');
  if (segments[1].type === 'pivot_beats') {
    assert.ok(segments[1].content.includes('Mưa lớn bất ngờ'));
  }
  assert.equal(segments[2].type, 'text');
  assert.equal(segments[3].type, 'rewrite_beats');
  if (segments[3].type === 'rewrite_beats') {
    assert.ok(segments[3].content.includes('Mở cảnh ngay tại đại điện'));
  }
});
