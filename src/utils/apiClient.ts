import {
  ApiMode,
  ApiProfileChannel,
  ApiSettings,
  SamplerSettings,
  TokenUsageReport,
} from '../types/novel';
import { buildRequestPayload, ChatMessage, ContextBuildResult, parseSseDelta } from './promptBuilder';
import {
  buildThinkingPayloadExtras,
  createThinkingStreamParser,
  splitThinkingAndContent,
} from './thinkingOrchestrator';

export interface StreamHandlers {
  onToken: (token: string, fullCleanContent?: string) => void;
  onThinking?: (thinkingText: string) => void;
  onUsage?: (usage: TokenUsageReport) => void;
  onComplete: (fullAccumulated: string) => void;
  onError: (err: Error) => void;
}

export interface ApiRequestDebugInfo {
  channel: ApiProfileChannel;
  endpoint: string;
  model: string;
  enableThinking: boolean;
}

export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return trimmed || 'http://localhost:8080/v1';
}

export function resolveApiProfile(
  api: ApiSettings,
  channel: ApiProfileChannel
): ApiSettings {
  if (channel === 'architect') {
    if (api.useSeparateArchitectApi && api.architectApi?.baseUrl.trim()) {
      return {
        ...api,
        mode: 'chat',
        useAssistantPrefill: false,
        baseUrl: api.architectApi.baseUrl.trim(),
        apiKey: api.architectApi.apiKey,
        model: api.architectApi.model,
        fallbackModel: api.architectApi.fallbackModel,
        inputPricePerMillion: api.architectApi.inputPricePerMillion,
        outputPricePerMillion: api.architectApi.outputPricePerMillion,
        availableModels: api.architectApi.availableModels,
      };
    }
    return {
      ...api,
      mode: 'chat',
      useAssistantPrefill: false,
    };
  }
  return api;
}

export function calculateUsageCostUsd(
  usage: TokenUsageReport,
  api: ApiSettings
): number {
  const profile = resolveApiProfile(api, usage.channel ?? 'prose');
  const inCost = (usage.promptTokens / 1_000_000) * Math.max(0, profile.inputPricePerMillion || 0);
  const outCost = (usage.completionTokens / 1_000_000) * Math.max(0, profile.outputPricePerMillion || 0);
  return inCost + outCost;
}

function buildHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = apiKey.trim();
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    headers['HTTP-Referer'] = window.location.origin;
  }
  headers['X-Title'] = 'Quill & Loom Novel Studio';
  return headers;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export async function fetchAvailableModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string[]> {
  const root = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${root}/models`, {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Không thể tải danh sách model từ ${root}/models`);
  }
  const data = (await res.json()) as { data?: Array<{ id?: string }> };
  const models = Array.isArray(data.data)
    ? data.data.map((m) => (typeof m.id === 'string' ? m.id.trim() : '')).filter(Boolean)
    : [];
  return Array.from(new Set(models)).sort((a, b) => a.localeCompare(b));
}

export const DEFAULT_CONNECT_TIMEOUT_MS = 180_000;
export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 120_000;

function isAbortLikeError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

async function fetchWithFallback(
  endpoint: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  fallbackModel: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_CONNECT_TIMEOUT_MS
): Promise<{ response: Response; usedModel: string }> {
  const primaryModel = String(payload.model || 'default');

  const attemptFetch = async (
    targetPayload: Record<string, unknown>
  ): Promise<Response> => {
    const controller = new AbortController();
    let didTimeout = false;
    const timeoutErr = new Error(
      `Request timeout: Quá thời gian chờ phản hồi từ API (${Math.round(timeoutMs / 1000)}s).`
    );
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort(timeoutErr);
    }, timeoutMs);

    const onExternalAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('Aborted', 'AbortError');
      }
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(targetPayload),
        signal: controller.signal,
      });
    } catch (err) {
      if (didTimeout && !signal?.aborted) {
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onExternalAbort);
      }
    }
  };

  try {
    const res = await attemptFetch(payload);

    if (
      !res.ok &&
      isRetryableStatus(res.status) &&
      fallbackModel.trim() &&
      fallbackModel.trim() !== primaryModel
    ) {
      const fbPayload = { ...payload, model: fallbackModel.trim() };
      const fbRes = await attemptFetch(fbPayload);
      return { response: fbRes, usedModel: fallbackModel.trim() };
    }

    return { response: res, usedModel: primaryModel };
  } catch (err) {
    const isAbortByUser = Boolean(signal?.aborted);
    if (!isAbortByUser && fallbackModel.trim() && fallbackModel.trim() !== primaryModel) {
      const fbPayload = { ...payload, model: fallbackModel.trim() };
      const fbRes = await attemptFetch(fbPayload);
      return { response: fbRes, usedModel: fallbackModel.trim() };
    }
    throw err;
  }
}

async function readChunkWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleTimeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (!Number.isFinite(idleTimeoutMs) || idleTimeoutMs <= 0) {
    return reader.read();
  }

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let timedOutErr: Error | null = null;
  try {
    const result = await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        idleTimer = setTimeout(() => {
          timedOutErr = new Error(
            `Request timeout: Stream không nhận được dữ liệu mới sau ${Math.round(
              idleTimeoutMs / 1000
            )}s.`
          );
          reject(timedOutErr);
          reader.cancel().catch(() => {});
        }, idleTimeoutMs);
      }),
    ]);
    if (timedOutErr) {
      throw timedOutErr;
    }
    return result;
  } finally {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
  }
}

async function consumeSseOrJsonStream(
  res: Response,
  mode: ApiMode,
  usedModel: string,
  channel: ApiProfileChannel,
  handlers: StreamHandlers,
  idleTimeoutMs = DEFAULT_STREAM_IDLE_TIMEOUT_MS
): Promise<void> {
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ''}`);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const parser = createThinkingStreamParser();
  let completedCalled = false;

  const finalize = (extraUsage?: { promptTokens: number; completionTokens: number }) => {
    if (completedCalled) return;
    completedCalled = true;
    const flushed = parser.flush();
    if (flushed.contentDelta || flushed.thinkingDelta) {
      handlers.onToken(flushed.contentDelta, flushed.content);
    }
    if (flushed.thinking && handlers.onThinking) {
      handlers.onThinking(flushed.thinking);
    }
    if (extraUsage && handlers.onUsage) {
      handlers.onUsage({
        promptTokens: extraUsage.promptTokens,
        completionTokens: extraUsage.completionTokens,
        totalTokens: extraUsage.promptTokens + extraUsage.completionTokens,
        model: usedModel,
        channel,
      });
    }
    handlers.onComplete(flushed.content);
  };

  if (contentType.includes('application/json') || !res.body) {
    const data = (await res.json()) as {
      choices?: Array<{
        text?: string;
        message?: { content?: string; reasoning_content?: string; reasoning?: string };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = data.choices?.[0];
    const rawText = choice?.message?.content ?? choice?.text ?? '';
    const rawReasoning =
      choice?.message?.reasoning_content ?? choice?.message?.reasoning ?? '';
    const update = parser.push(rawText, rawReasoning);
    if (update.contentDelta || update.thinkingDelta) {
      handlers.onToken(update.contentDelta, update.content);
    }
    if (update.thinking && handlers.onThinking) {
      handlers.onThinking(update.thinking);
    }
    const usage =
      data.usage && (typeof data.usage.prompt_tokens === 'number' || typeof data.usage.completion_tokens === 'number')
        ? {
            promptTokens: Math.max(0, Number(data.usage.prompt_tokens) || 0),
            completionTokens: Math.max(0, Number(data.usage.completion_tokens) || 0),
          }
        : undefined;
    finalize(usage);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let lineBuffer = '';
  let lastUsage: { promptTokens: number; completionTokens: number } | undefined;

  while (true) {
    const { done, value } = await readChunkWithIdleTimeout(reader, idleTimeoutMs);
    if (done) break;
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const delta = parseSseDelta(line, mode);
      if (delta.usage) {
        lastUsage = delta.usage;
      }
      if (delta.done) {
        finalize(lastUsage);
        return;
      }
      if (delta.token || delta.reasoningToken) {
        const update = parser.push(delta.token, delta.reasoningToken);
        if (update.contentDelta || update.thinkingDelta) {
          handlers.onToken(update.contentDelta, update.content);
        }
        if (update.thinking && handlers.onThinking) {
          handlers.onThinking(update.thinking);
        }
      }
    }
  }

  if (lineBuffer.trim()) {
    const delta = parseSseDelta(lineBuffer, mode);
    if (delta.usage) lastUsage = delta.usage;
    if (delta.token || delta.reasoningToken) {
      const update = parser.push(delta.token, delta.reasoningToken);
      if (update.contentDelta || update.thinkingDelta) {
        handlers.onToken(update.contentDelta, update.content);
      }
      if (update.thinking && handlers.onThinking) handlers.onThinking(update.thinking);
    }
  }

  finalize(lastUsage);
}

export async function streamNovelContinuation(params: {
  api: ApiSettings;
  sampler: SamplerSettings;
  context: ContextBuildResult;
  enableThinking?: boolean;
  forceUserOnlyChat?: boolean;
  maxTokensOverride?: number;
  signal: AbortSignal;
  handlers: StreamHandlers;
}): Promise<void> {
  const channel: ApiProfileChannel = 'prose';
  const profile = resolveApiProfile(params.api, channel);
  const root = normalizeBaseUrl(profile.baseUrl);
  const endpoint =
    profile.mode === 'chat' ? `${root}/chat/completions` : `${root}/completions`;

  const payload = buildRequestPayload(
    profile.model,
    profile.mode,
    params.sampler,
    params.context,
    {
      forceUserOnlyChat: params.forceUserOnlyChat,
      includeUsage: true,
      enableThinking: Boolean(params.enableThinking),
      maxTokensOverride: params.maxTokensOverride,
    }
  );

  try {
    const { response, usedModel } = await fetchWithFallback(
      endpoint,
      buildHeaders(profile.apiKey),
      payload,
      profile.fallbackModel,
      params.signal
    );
    await consumeSseOrJsonStream(response, profile.mode, usedModel, channel, params.handlers);
  } catch (err) {
    if (params.signal.aborted || isAbortLikeError(err)) return;
    params.handlers.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function streamThinkingPromptTask(params: {
  api: ApiSettings;
  sampler: SamplerSettings;
  messages: ChatMessage[];
  enableThinking: boolean;
  channel?: ApiProfileChannel;
  maxTokens?: number;
  temperature?: number;
  signal: AbortSignal;
  handlers: StreamHandlers;
}): Promise<void> {
  const channel: ApiProfileChannel = params.channel ?? 'architect';
  const profile = resolveApiProfile(params.api, channel);
  const root = normalizeBaseUrl(profile.baseUrl);
  const endpoint = `${root}/chat/completions`;
  const thinkingExtras = buildThinkingPayloadExtras(
    params.enableThinking,
    params.maxTokens ?? params.sampler.maxTokens
  );

  const payload: Record<string, unknown> = {
    model: profile.model.trim() || 'default',
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: thinkingExtras.maxTokens,
    temperature: params.temperature ?? Math.min(0.7, params.sampler.temperature),
    top_p: params.sampler.topP,
    chat_template_kwargs: thinkingExtras.chat_template_kwargs,
    reasoning: thinkingExtras.reasoning,
    messages: params.messages,
  };

  try {
    const { response, usedModel } = await fetchWithFallback(
      endpoint,
      buildHeaders(profile.apiKey),
      payload,
      profile.fallbackModel,
      params.signal
    );
    await consumeSseOrJsonStream(response, 'chat', usedModel, channel, params.handlers);
  } catch (err) {
    if (params.signal.aborted || isAbortLikeError(err)) return;
    params.handlers.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function requestThinkingCompletion(params: {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  enableThinking: boolean;
  channel?: ApiProfileChannel;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  signal?: AbortSignal;
  onThinking?: (thinkingText: string) => void;
  onContent?: (contentText: string) => void;
  onProgress?: (stats: { thinkingChars: number; contentChars: number }) => void;
  onUsage?: (usage: TokenUsageReport) => void;
}): Promise<{ content: string; thinking: string }> {
  const channel: ApiProfileChannel = params.channel ?? 'architect';
  const profile = resolveApiProfile(params.api, channel);
  const root = normalizeBaseUrl(profile.baseUrl);
  const endpoint = `${root}/chat/completions`;
  const thinkingExtras = buildThinkingPayloadExtras(
    params.enableThinking,
    params.maxTokens ?? (params.enableThinking ? 3500 : 1200)
  );

  // Use SSE streaming internally (with automatic application/json fallback in consumeSseOrJsonStream)
  // so long-running Thinking + JSON calls never hit proxy/HTTP idle non-streaming timeouts.
  const payload: Record<string, unknown> = {
    model: profile.model.trim() || 'default',
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: thinkingExtras.maxTokens,
    temperature: params.temperature ?? 0.4,
    chat_template_kwargs: thinkingExtras.chat_template_kwargs,
    reasoning: thinkingExtras.reasoning,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
  };

  const { response, usedModel } = await fetchWithFallback(
    endpoint,
    buildHeaders(profile.apiKey),
    payload,
    profile.fallbackModel,
    params.signal,
    params.timeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
  );

  let latestContent = '';
  let latestThinking = '';

  await consumeSseOrJsonStream(
    response,
    'chat',
    usedModel,
    channel,
    {
      onToken: (tok, fullClean) => {
        latestContent = typeof fullClean === 'string' ? fullClean : latestContent + tok;
        params.onContent?.(latestContent);
        params.onProgress?.({
          thinkingChars: latestThinking.length,
          contentChars: latestContent.length,
        });
      },
      onThinking: (thinkText) => {
        latestThinking = thinkText;
        params.onThinking?.(thinkText);
        params.onProgress?.({
          thinkingChars: latestThinking.length,
          contentChars: latestContent.length,
        });
      },
      onUsage: params.onUsage,
      onComplete: (finalContent) => {
        if (typeof finalContent === 'string') {
          latestContent = finalContent;
        }
      },
      onError: (err) => {
        throw err;
      },
    },
    params.idleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS
  );

  const normalized = splitThinkingAndContent(latestContent, latestThinking);
  return {
    content: normalized.content,
    thinking: normalized.thinking || latestThinking.trim(),
  };
}

export async function requestUtilityCompletion(params: {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  channel?: ApiProfileChannel;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  onUsage?: (usage: TokenUsageReport) => void;
}): Promise<string> {
  const { content } = await requestThinkingCompletion({
    api: params.api,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    enableThinking: false,
    channel: params.channel ?? 'architect',
    maxTokens: params.maxTokens ?? 1200,
    temperature: params.temperature ?? 0.3,
    signal: params.signal,
    onUsage: params.onUsage,
  });
  return content;
}

export async function streamInlineRewrite(params: {
  api: ApiSettings;
  sampler: SamplerSettings;
  instruction: string;
  selectedText: string;
  surroundingBefore: string;
  surroundingAfter: string;
  enableThinking?: boolean;
  signal: AbortSignal;
  handlers: StreamHandlers;
}): Promise<void> {
  const systemPrompt = [
    'Bạn là Biên tập viên Văn học Tiếng Việt chuyên nghiệp.',
    'Nhiệm vụ: Viết lại ĐOẠN VĂN ĐƯỢC CHỌN theo đúng chỉ dẫn của tác giả, hòa hợp mượt mà với mạch truyện trước và sau nó.',
    'CHỈ trả về đoạn văn bản đã viết lại hoàn chỉnh, tuyệt đối KHÔNG thêm lời giải thích, dấu ngoặc kép hay ghi chú.',
  ].join('\n');

  const userPrompt = [
    params.surroundingBefore.trim()
      ? `[Đoạn văn liền trước]\n${params.surroundingBefore.trim().slice(-900)}`
      : '',
    `[Đoạn văn cần viết lại]\n${params.selectedText}`,
    params.surroundingAfter.trim()
      ? `[Đoạn văn liền sau]\n${params.surroundingAfter.trim().slice(0, 600)}`
      : '',
    `[Yêu cầu biên tập]\n${params.instruction}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  await streamThinkingPromptTask({
    api: params.api,
    sampler: params.sampler,
    channel: 'prose',
    enableThinking: Boolean(params.enableThinking),
    maxTokens: Math.max(400, params.sampler.maxTokens),
    temperature: Math.min(0.75, params.sampler.temperature),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    signal: params.signal,
    handlers: params.handlers,
  });
}

export async function streamAgentChat(params: {
  api: ApiSettings;
  sampler: SamplerSettings;
  messages: ChatMessage[];
  enableThinking?: boolean;
  signal: AbortSignal;
  handlers: StreamHandlers;
}): Promise<void> {
  await streamThinkingPromptTask({
    api: params.api,
    sampler: params.sampler,
    channel: 'architect',
    enableThinking: params.enableThinking ?? true,
    maxTokens: Math.max(2500, params.sampler.maxTokens),
    temperature: 0.6,
    messages: params.messages,
    signal: params.signal,
    handlers: params.handlers,
  });
}
