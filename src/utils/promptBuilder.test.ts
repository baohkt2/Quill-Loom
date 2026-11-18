import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPromptContext,
  buildRequestPayload,
  parseSseDelta,
} from './promptBuilder';
import { DEFAULT_SAMPLER_SETTINGS } from '../types/novel';

test('Smart Context Routing: buildPromptContext excludes Architect-only Master Plot blocks from Prose', () => {
  const result = buildPromptContext(
    {
      storyText: 'Gió thổi qua rừng trúc.',
      systemPrompt: 'Văn phong tiên hiệp.',
      memory: '',
      authorsNote: '',
      authorsNoteDepth: 2,
      lorebook: [],
      sampler: DEFAULT_SAMPLER_SETTINGS,
      masterPlotBlocks: [
        {
          id: 'b_arch_only',
          title: 'Spoiler Kết Truyện',
          content: 'Sư phụ thật ra là phản diện cuối cùng.',
          includeInArchitect: true,
          includeInProse: false,
        },
        {
          id: 'b_prose_yes',
          title: 'Bối cảnh Tông môn',
          content: 'Thanh Vân Tông nằm trên đỉnh Vân Vụ Sơn.',
          includeInArchitect: true,
          includeInProse: true,
        },
      ],
    },
    {
      chapterGoal: 'Vào dược điền thu thập linh thảo',
      volumeBlueprint: {
        arcGoal: 'Đột phá Trúc Cơ',
        keyAntagonists: 'Triệu Phong',
        turningPointsAndClimax: 'Tỷ thí ngoại môn',
      },
      chapterBeats: '- Nhịp 1: Quan sát dược điền',
    }
  );

  assert.equal(result.prosePlotBlocksIncluded.length, 1);
  assert.equal(result.prosePlotBlocksIncluded[0].id, 'b_prose_yes');

  const systemContent = result.chatMessages[0].content;
  assert.match(systemContent, /Thanh Vân Tông nằm trên đỉnh Vân Vụ Sơn/);
  assert.doesNotMatch(systemContent, /Sư phụ thật ra là phản diện cuối cùng/);
  assert.match(systemContent, /Mục tiêu Quyển: Đột phá Trúc Cơ/);
  assert.match(systemContent, /Mục tiêu Chương: Vào dược điền/);
});

test('parseSseDelta supports delta.content, delta.text, reasoning_content, and usage', () => {
  const d1 = parseSseDelta(
    'data: {"choices":[{"delta":{"text":"Xin chào","reasoning_content":"suy nghĩ"}}],"usage":{"prompt_tokens":12,"completion_tokens":5}}',
    'chat'
  );
  assert.equal(d1.token, 'Xin chào');
  assert.equal(d1.reasoningToken, 'suy nghĩ');
  assert.deepEqual(d1.usage, { promptTokens: 12, completionTokens: 5 });

  const done = parseSseDelta('data: [DONE]', 'chat');
  assert.equal(done.done, true);
});

test('buildRequestPayload enforces thinking kwargs and >=3500 max_tokens when thinking enabled', () => {
  const ctx = buildPromptContext({
    storyText: 'Đoạn mở đầu.',
    systemPrompt: '',
    memory: '',
    authorsNote: '',
    authorsNoteDepth: 2,
    lorebook: [],
    sampler: { ...DEFAULT_SAMPLER_SETTINGS, maxTokens: 500 },
  });

  const payloadOff = buildRequestPayload('prose-model', 'chat', DEFAULT_SAMPLER_SETTINGS, ctx, {
    enableThinking: false,
  });
  assert.equal(payloadOff.max_tokens, 600);
  assert.deepEqual(payloadOff.chat_template_kwargs, { enable_thinking: false });

  const payloadOn = buildRequestPayload('arch-model', 'chat', DEFAULT_SAMPLER_SETTINGS, ctx, {
    enableThinking: true,
  });
  assert.equal(Number(payloadOn.max_tokens) >= 3500, true);
  assert.deepEqual(payloadOn.chat_template_kwargs, { enable_thinking: true });

  const payloadRetry = buildRequestPayload('prose-model', 'chat', DEFAULT_SAMPLER_SETTINGS, ctx, {
    enableThinking: false,
    maxTokensOverride: 2500,
    forceUserOnlyChat: true,
  });
  assert.equal(payloadRetry.max_tokens, 2500);
  assert.equal(Array.isArray(payloadRetry.messages), true);
  assert.doesNotMatch(JSON.stringify(payloadRetry.messages), /===/);
});
