import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { requestThinkingCompletion } from './apiClient';
import { DEFAULT_API_SETTINGS } from '../types/novel';

function startMockServer(
  handler: (req: http.IncomingMessage, body: Record<string, unknown>, res: http.ServerResponse) => void
): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        handler(req, parsed, res);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        throw new Error('Failed to bind test server');
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}/v1`,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

test('requestThinkingCompletion streams SSE thinking + JSON content and usage', async () => {
  let receivedPayload: Record<string, unknown> = {};
  const srv = await startMockServer((_req, body, res) => {
    receivedPayload = body;
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
    res.write(
      `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'Phân tích tiền đề. ' } }] })}\n\n`
    );
    setTimeout(() => {
      res.write(
        `data: ${JSON.stringify({ choices: [{ delta: { content: '<think>Kiểm tra logic</think>\n{"blocks":[{"title":"Tiền đề","content":"OK"}]}' } }] })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 120, completion_tokens: 80 } })}\n\n`
      );
      res.write('data: [DONE]\n\n');
      res.end();
    }, 30);
  });

  try {
    let latestThinking = '';
    let latestProgressChars = 0;
    let recordedUsageTotal = 0;

    const result = await requestThinkingCompletion({
      api: { ...DEFAULT_API_SETTINGS, baseUrl: srv.url, model: 'test-thinker' },
      systemPrompt: 'sys',
      userPrompt: 'usr',
      enableThinking: true,
      maxTokens: 4096,
      onThinking: (t) => {
        latestThinking = t;
      },
      onProgress: ({ thinkingChars, contentChars }) => {
        latestProgressChars = thinkingChars + contentChars;
      },
      onUsage: (u) => {
        recordedUsageTotal = u.totalTokens;
      },
    });

    assert.equal(receivedPayload.stream, true);
    assert.equal(result.content, '{"blocks":[{"title":"Tiền đề","content":"OK"}]}');
    assert.match(result.thinking, /Phân tích tiền đề\./);
    assert.match(result.thinking, /Kiểm tra logic/);
    assert.ok(latestThinking.includes('Phân tích tiền đề.'));
    assert.ok(latestProgressChars > 0);
    assert.equal(recordedUsageTotal, 200);
  } finally {
    await srv.close();
  }
});

test('requestThinkingCompletion handles application/json fallback response cleanly', async () => {
  const srv = await startMockServer((_req, _body, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              reasoning_content: 'Suy luận JSON',
              content: '{"blocks":[{"title":"A","content":"B"}]}',
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      })
    );
  });

  try {
    const res = await requestThinkingCompletion({
      api: { ...DEFAULT_API_SETTINGS, baseUrl: srv.url, model: 'test-json' },
      systemPrompt: 'sys',
      userPrompt: 'usr',
      enableThinking: true,
    });
    assert.equal(res.thinking, 'Suy luận JSON');
    assert.equal(res.content, '{"blocks":[{"title":"A","content":"B"}]}');
  } finally {
    await srv.close();
  }
});

test('requestThinkingCompletion throws descriptive timeout error when headers exceed timeoutMs', async () => {
  const srv = await startMockServer((_req, _body, res) => {
    // Deliberately delay headers longer than timeoutMs
    setTimeout(() => {
      if (!res.writableEnded) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      }
    }, 300);
  });

  try {
    await assert.rejects(
      () =>
        requestThinkingCompletion({
          api: { ...DEFAULT_API_SETTINGS, baseUrl: srv.url, model: 'slow-model' },
          systemPrompt: 'sys',
          userPrompt: 'usr',
          enableThinking: true,
          timeoutMs: 60,
        }),
      /Request timeout/i
    );
  } finally {
    await srv.close();
  }
});

test('requestThinkingCompletion throws descriptive timeout error when SSE stream stalls mid-generation', async () => {
  let serverRes: http.ServerResponse | null = null;
  const srv = await startMockServer((_req, _body, res) => {
    serverRes = res;
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'Đang nghĩ...' } }] })}\n\n`);
    // Stall permanently without ending
  });

  try {
    await assert.rejects(
      () =>
        requestThinkingCompletion({
          api: { ...DEFAULT_API_SETTINGS, baseUrl: srv.url, model: 'stalled-stream' },
          systemPrompt: 'sys',
          userPrompt: 'usr',
          enableThinking: true,
          idleTimeoutMs: 80,
        }),
      /Request timeout: Stream/i
    );
  } finally {
    serverRes?.end();
    await srv.close();
  }
});
