import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Square,
  Trash2,
} from 'lucide-react';
import {
  AgentChatMessage,
  AgentContextToggles,
} from '../types/novel';
import {
  AGENT_QUICK_PROMPTS,
  AgentActionBlock,
  parseAgentActionBlocks,
} from '../utils/agentEngine';

interface AgentPanelProps {
  messages: AgentChatMessage[];
  toggles: AgentContextToggles;
  isStreaming: boolean;
  streamingText: string;
  streamingThinking: string;
  onChangeToggles: (toggles: AgentContextToggles) => void;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onClearHistory: () => void;
  onApplyAction: (messageId: string, action: AgentActionBlock) => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  messages,
  toggles,
  isStreaming,
  streamingText,
  streamingThinking,
  onChangeToggles,
  onSendMessage,
  onStopStreaming,
  onClearHistory,
  onApplyAction,
}) => {
  const [input, setInput] = useState('');
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});
  const [showLiveThinking, setShowLiveThinking] = useState(false);

  const toggleThinking = (id: string) => {
    setExpandedThinkingIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    setShowLiveThinking(false);
    onSendMessage(input.trim());
    setInput('');
  };

  const renderActionCards = (msgId: string, content: string, appliedIds: string[] = []) => {
    const actions = parseAgentActionBlocks(msgId, content);
    if (actions.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {actions.map((action) => {
          const isApplied = appliedIds.includes(action.id);
          const buttonLabel =
            action.type === 'prose'
              ? 'Chèn vào cuối chương'
              : action.type === 'beats'
              ? 'Áp dụng dàn ý chương'
              : action.type === 'pivot_beats'
              ? 'Cập nhật phần [TIẾP THEO]'
              : action.type === 'character'
              ? `Thêm nhân vật "${action.title}"`
              : `Thêm Lore "${action.title}"`;

          return (
            <div
              key={action.id}
              className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/30 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                  {action.title}
                </span>
                <button
                  type="button"
                  disabled={isApplied}
                  onClick={() => onApplyAction(msgId, action)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
                    isApplied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {isApplied && <Check className="w-3 h-3" />}
                  <span>{isApplied ? 'Đã áp dụng' : buttonLabel}</span>
                </button>
              </div>
              <pre className="text-[11px] text-stone-700 dark:text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto font-sans">
                {action.type === 'character' || action.type === 'lorebook'
                  ? action.rawJson
                  : action.content}
              </pre>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">
          Cố vấn &amp; Biên tập (Architect)
        </span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-rose-600"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa chat</span>
          </button>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !isStreaming && (
          <div className="text-xs text-stone-500 dark:text-slate-400 space-y-2 py-4 text-center">
            <p>
              Hỏi cố vấn về hướng đi cốt truyện, soi lỗi logic hoặc yêu cầu viết nháp phân đoạn.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isThinkingOpen = Boolean(expandedThinkingIds[msg.id]);
          return (
            <div
              key={msg.id}
              className={`rounded-xl p-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-stone-900 dark:bg-amber-900/50 text-white ml-6'
                  : 'bg-stone-100 dark:bg-slate-800/80 text-stone-800 dark:text-slate-200 mr-2'
              }`}
            >
              {msg.thinking && (
                <div className="mb-2 rounded-lg border border-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleThinking(msg.id)}
                    aria-expanded={isThinkingOpen}
                    data-testid={`agent-thinking-toggle-${msg.id}`}
                    className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-100/80 dark:hover:bg-slate-800/70"
                  >
                    <span>
                      Quá trình suy luận (Thinking · {msg.thinking.length.toLocaleString('vi-VN')} ký tự)
                    </span>
                    {isThinkingOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                  {isThinkingOpen && (
                    <pre
                      data-testid={`agent-thinking-body-${msg.id}`}
                      className="px-2.5 py-2 whitespace-pre-wrap text-[11px] text-stone-500 dark:text-slate-400 max-h-48 overflow-y-auto border-t border-stone-200 dark:border-slate-700 font-sans"
                    >
                      {msg.thinking}
                    </pre>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' &&
                renderActionCards(msg.id, msg.content, msg.appliedActionIds)}
            </div>
          );
        })}

        {isStreaming && (
          <div className="rounded-xl p-3 text-xs bg-stone-100 dark:bg-slate-800/80 text-stone-800 dark:text-slate-200 mr-2 space-y-2">
            {streamingThinking && (
              <div className="rounded-lg border border-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLiveThinking((v) => !v)}
                  aria-expanded={showLiveThinking}
                  data-testid="agent-live-thinking-toggle"
                  className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-100/80 dark:hover:bg-slate-800/70"
                >
                  <span>
                    Đang suy luận ({streamingThinking.length.toLocaleString('vi-VN')} ký tự)
                  </span>
                  {showLiveThinking ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
                {showLiveThinking && (
                  <pre className="px-2.5 py-2 whitespace-pre-wrap text-[11px] text-stone-500 dark:text-slate-400 max-h-40 overflow-y-auto border-t border-stone-200 dark:border-slate-700 font-sans">
                    {streamingThinking}
                  </pre>
                )}
              </div>
            )}
            <div className="whitespace-pre-wrap">
              {streamingText || (
                <span className="inline-flex items-center gap-1.5 text-stone-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{streamingThinking ? 'Đang tổng hợp câu trả lời...' : 'Đang phản hồi...'}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts & Context Toggles & Input */}
      <div className="p-2.5 border-t border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/50 space-y-2">
        {/* Context Pills */}
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            { key: 'includeChapter' as const, label: 'Chương hiện tại' },
            { key: 'includeBeats' as const, label: 'Dàn ý' },
            { key: 'includeCharactersAndLore' as const, label: 'Nhân vật & Lore' },
            { key: 'includeSummaries' as const, label: 'Tóm tắt' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                onChangeToggles({ ...toggles, [item.key]: !toggles[item.key] })
              }
              className={`px-2 py-0.5 rounded-md border font-medium transition-colors ${
                toggles[item.key]
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-500 dark:text-slate-400'
              }`}
            >
              {toggles[item.key] ? '✓ ' : ''}
              {item.label}
            </button>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {AGENT_QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.id}
              type="button"
              disabled={isStreaming}
              onClick={() => {
                setShowLiveThinking(false);
                onSendMessage(qp.prompt);
              }}
              className="px-2 py-1 rounded-md text-[11px] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              {qp.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhắn với Cố vấn Biên tập..."
            className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Dừng Agent"
              className="p-2 rounded-lg bg-rose-600 text-white shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Gửi tin nhắn"
              className="p-2 rounded-lg bg-stone-900 dark:bg-amber-600 text-white disabled:opacity-40 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
