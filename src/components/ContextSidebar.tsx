import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  Loader2,
  MessageSquare,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  AgentChatMessage,
  AgentContextToggles,
  CharacterCard,
  CharacterRole,
  LorebookEntry,
  ProtagonistProfile,
  SamplerSettings,
} from '../types/novel';
import { AgentActionBlock } from '../utils/agentEngine';
import { AgentPanel } from './AgentPanel';

interface ContextSidebarProps {
  protagonist: ProtagonistProfile;
  characters: CharacterCard[];
  lorebook: LorebookEntry[];
  systemPrompt: string;
  memory: string;
  authorsNote: string;
  authorsNoteDepth: number;
  sampler: SamplerSettings;
  agentMessages: AgentChatMessage[];
  agentToggles: AgentContextToggles;
  isAgentStreaming: boolean;
  agentStreamingText: string;
  agentStreamingThinking: string;
  isScanningCharacters: boolean;
  onChangeProtagonist: (next: ProtagonistProfile) => void;
  onChangeCharacters: (next: CharacterCard[]) => void;
  onChangeLorebook: (next: LorebookEntry[]) => void;
  onChangeSystemPrompt: (val: string) => void;
  onChangeMemory: (val: string) => void;
  onChangeAuthorsNote: (val: string) => void;
  onChangeAuthorsNoteDepth: (val: number) => void;
  onChangeSampler: (next: SamplerSettings) => void;
  onChangeAgentToggles: (toggles: AgentContextToggles) => void;
  onSendAgentMessage: (text: string) => void;
  onStopAgentStreaming: () => void;
  onClearAgentHistory: () => void;
  onApplyAgentAction: (messageId: string, action: AgentActionBlock) => void;
  onScanCharactersFromChapter: () => void;
  onImportCharactersFile: (file: File) => void;
  onExportAllCharacters: () => void;
  onExportSingleCharacter: (card: CharacterCard) => void;
  onImportLorebookFile: (file: File) => void;
  onExportLorebook: () => void;
  onImportPresetsFile: (file: File) => void;
  onExportPresets: () => void;
}

const ROLES: CharacterRole[] = [
  'Đồng hành',
  'Đối thủ',
  'Sư phụ / Tiền bối',
  'Phản diện',
  'Nhân vật phụ',
];

export const ContextSidebar: React.FC<ContextSidebarProps> = ({
  protagonist,
  characters,
  lorebook,
  systemPrompt,
  memory,
  authorsNote,
  authorsNoteDepth,
  sampler,
  agentMessages,
  agentToggles,
  isAgentStreaming,
  agentStreamingText,
  agentStreamingThinking,
  isScanningCharacters,
  onChangeProtagonist,
  onChangeCharacters,
  onChangeLorebook,
  onChangeSystemPrompt,
  onChangeMemory,
  onChangeAuthorsNote,
  onChangeAuthorsNoteDepth,
  onChangeSampler,
  onChangeAgentToggles,
  onSendAgentMessage,
  onStopAgentStreaming,
  onClearAgentHistory,
  onApplyAgentAction,
  onScanCharactersFromChapter,
  onImportCharactersFile,
  onExportAllCharacters,
  onExportSingleCharacter,
  onImportLorebookFile,
  onExportLorebook,
  onImportPresetsFile,
  onExportPresets,
}) => {
  const [tab, setTab] = useState<'agent' | 'characters' | 'lorebook' | 'sampler'>('agent');
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState<CharacterRole>('Nhân vật phụ');
  const [newLoreName, setNewLoreName] = useState('');
  const [newLoreKeys, setNewLoreKeys] = useState('');
  const [newLoreContent, setNewLoreContent] = useState('');

  const charFileRef = useRef<HTMLInputElement | null>(null);
  const loreFileRef = useRef<HTMLInputElement | null>(null);
  const presetFileRef = useRef<HTMLInputElement | null>(null);

  const handleAddCharacter = () => {
    if (!newCharName.trim()) return;
    const card: CharacterCard = {
      id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newCharName.trim(),
      aliases: '',
      role: newCharRole,
      appearanceAndPersonality: '',
      currentStatusAndRelationship: '',
      notes: '',
      enabled: true,
    };
    onChangeCharacters([card, ...characters]);
    setNewCharName('');
  };

  const handleAddLore = () => {
    if (!newLoreName.trim() && !newLoreContent.trim()) return;
    const entry: LorebookEntry = {
      id: `lore_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newLoreName.trim() || 'Mục mới',
      keywords: newLoreKeys.trim() || newLoreName.trim(),
      content: newLoreContent.trim(),
      enabled: true,
    };
    onChangeLorebook([entry, ...lorebook]);
    setNewLoreName('');
    setNewLoreKeys('');
    setNewLoreContent('');
  };

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-stone-200 dark:border-slate-800">
      {/* 4 Tabs */}
      <div className="p-1.5 border-b border-stone-200 dark:border-slate-800 grid grid-cols-4 gap-1 bg-stone-50 dark:bg-slate-950/60">
        {[
          { id: 'agent' as const, label: 'AI Agent', icon: MessageSquare },
          { id: 'characters' as const, label: 'Nhân vật', icon: Users },
          { id: 'lorebook' as const, label: 'Thế giới', icon: BookOpen },
          { id: 'sampler' as const, label: 'Cấu hình', icon: Sliders },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              data-testid={`right-tab-${item.id}`}
              className={`inline-flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'agent' && (
        <div className="flex-1 min-h-0">
          <AgentPanel
            messages={agentMessages}
            toggles={agentToggles}
            isStreaming={isAgentStreaming}
            streamingText={agentStreamingText}
            streamingThinking={agentStreamingThinking}
            onChangeToggles={onChangeAgentToggles}
            onSendMessage={onSendAgentMessage}
            onStopStreaming={onStopAgentStreaming}
            onClearHistory={onClearAgentHistory}
            onApplyAction={onApplyAgentAction}
          />
        </div>
      )}

      {tab === 'characters' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-900 dark:text-slate-100">
              Nhân vật &amp; Trạng thái
            </span>
            <div className="flex items-center gap-1">
              <input
                ref={charFileRef}
                type="file"
                accept=".json,.png,application/json,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportCharactersFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => charFileRef.current?.click()}
                title="Nhập nhân vật (.json hoặc thẻ SillyTavern V2 .png)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Upload className="w-3 h-3" />
                <span>Nhập</span>
              </button>
              <button
                type="button"
                onClick={onExportAllCharacters}
                title="Xuất toàn bộ nhân vật (.json)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3 h-3" />
                <span>Xuất</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={isScanningCharacters}
            onClick={onScanCharactersFromChapter}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isScanningCharacters ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Quét chương để đề xuất cập nhật nhân vật</span>
          </button>

          {/* Protagonist + Status & Inventory Tracker */}
          <div className="p-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/40 space-y-2 text-xs">
            <div className="font-semibold text-stone-900 dark:text-slate-100">
              Nhân vật chính (Protagonist)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={protagonist.name}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, name: e.target.value })
                }
                placeholder="Tên..."
                className="px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={protagonist.ageOrTitle}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, ageOrTitle: e.target.value })
                }
                placeholder="Tuổi / Danh hiệu..."
                className="px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="pt-1 border-t border-stone-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-amber-800 dark:text-amber-300 text-[11px]">
                Bảng Trạng Thái &amp; Hành Trang
              </div>
              <input
                type="text"
                value={protagonist.realm}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, realm: e.target.value })
                }
                placeholder="Cảnh giới / Cấp độ..."
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={protagonist.techniques}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, techniques: e.target.value })
                }
                placeholder="Công pháp & Thần thông..."
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={protagonist.resources}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, resources: e.target.value })
                }
                placeholder="Linh thạch / Tài nguyên..."
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <textarea
                rows={2}
                value={protagonist.inventory}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, inventory: e.target.value })
                }
                placeholder="Túi trữ vật / Pháp bảo..."
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Add Character */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="Tên nhân vật phụ..."
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <select
              value={newCharRole}
              onChange={(e) => setNewCharRole(e.target.value as CharacterRole)}
              className="px-2 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!newCharName.trim()}
              onClick={handleAddCharacter}
              aria-label="Thêm nhân vật"
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 dark:bg-slate-800 text-white disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Character Cards */}
          <div className="space-y-2.5">
            {characters.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 font-semibold text-stone-900 dark:text-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) =>
                        onChangeCharacters(
                          characters.map((x) =>
                            x.id === c.id ? { ...x, enabled: e.target.checked } : x
                          )
                        )
                      }
                      className="accent-amber-600"
                    />
                    <span>{c.name}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-500 dark:text-slate-400">
                      {c.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => onExportSingleCharacter(c)}
                      title="Xuất thẻ nhân vật (.json)"
                      className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeCharacters(characters.filter((x) => x.id !== c.id))
                      }
                      aria-label={`Xóa ${c.name}`}
                      className="p-1 text-stone-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={c.aliases}
                  onChange={(e) =>
                    onChangeCharacters(
                      characters.map((x) =>
                        x.id === c.id ? { ...x, aliases: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Biệt danh / Từ khóa (cách dấu phẩy)..."
                  className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-[11px]"
                />
                <textarea
                  rows={2}
                  value={c.currentStatusAndRelationship}
                  onChange={(e) =>
                    onChangeCharacters(
                      characters.map((x) =>
                        x.id === c.id
                          ? { ...x, currentStatusAndRelationship: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Trạng thái hiện tại & quan hệ..."
                  className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'lorebook' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-900 dark:text-slate-100">
              Lorebook ({lorebook.length})
            </span>
            <div className="flex items-center gap-1">
              <input
                ref={loreFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportLorebookFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => loreFileRef.current?.click()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Upload className="w-3 h-3" />
                <span>Nhập</span>
              </button>
              <button
                type="button"
                onClick={onExportLorebook}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3 h-3" />
                <span>Xuất</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/40 space-y-2 text-xs">
            <input
              type="text"
              value={newLoreName}
              onChange={(e) => setNewLoreName(e.target.value)}
              placeholder="Tên địa danh / pháp bảo / môn phái..."
              className="w-full px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              value={newLoreKeys}
              onChange={(e) => setNewLoreKeys(e.target.value)}
              placeholder="Từ khóa kích hoạt (cách dấu phẩy)..."
              className="w-full px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <textarea
              rows={2}
              value={newLoreContent}
              onChange={(e) => setNewLoreContent(e.target.value)}
              placeholder="Mô tả chi tiết thiết lập..."
              className="w-full px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <button
              type="button"
              disabled={!newLoreName.trim() && !newLoreContent.trim()}
              onClick={handleAddLore}
              className="w-full py-1.5 rounded-lg bg-stone-900 dark:bg-slate-800 text-white font-medium disabled:opacity-40"
            >
              + Thêm mục Lorebook
            </button>
          </div>

          <div className="space-y-2">
            {lorebook.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 font-semibold text-stone-900 dark:text-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={(e) =>
                        onChangeLorebook(
                          lorebook.map((x) =>
                            x.id === entry.id ? { ...x, enabled: e.target.checked } : x
                          )
                        )
                      }
                      className="accent-amber-600"
                    />
                    <span>{entry.name}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeLorebook(lorebook.filter((x) => x.id !== entry.id))
                    }
                    aria-label={`Xóa ${entry.name}`}
                    className="text-stone-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={entry.keywords}
                  onChange={(e) =>
                    onChangeLorebook(
                      lorebook.map((x) =>
                        x.id === entry.id ? { ...x, keywords: e.target.value } : x
                      )
                    )
                  }
                  className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-[11px]"
                />
                <textarea
                  rows={2}
                  value={entry.content}
                  onChange={(e) =>
                    onChangeLorebook(
                      lorebook.map((x) =>
                        x.id === entry.id ? { ...x, content: e.target.value } : x
                      )
                    )
                  }
                  className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sampler' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-stone-900 dark:text-slate-100">
              Văn phong &amp; Sampler
            </span>
            <div className="flex items-center gap-1">
              <input
                ref={presetFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportPresetsFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => presetFileRef.current?.click()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Upload className="w-3 h-3" />
                <span>Nhập Preset</span>
              </button>
              <button
                type="button"
                onClick={onExportPresets}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3 h-3" />
                <span>Xuất</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 dark:text-slate-300 mb-1">
              System Style Prompt
            </label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => onChangeSystemPrompt(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block font-medium text-stone-700 dark:text-slate-300 mb-1">
              Bối cảnh nền (Memory)
            </label>
            <textarea
              rows={3}
              value={memory}
              onChange={(e) => onChangeMemory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block font-medium text-stone-700 dark:text-slate-300 mb-1">
              Author&apos;s Note (chỉ dẫn giọng văn)
            </label>
            <textarea
              rows={2}
              value={authorsNote}
              onChange={(e) => onChangeAuthorsNote(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
              <span>Độ sâu chèn (Depth):</span>
              <input
                type="number"
                min={0}
                max={10}
                value={authorsNoteDepth}
                onChange={(e) => onChangeAuthorsNoteDepth(Number(e.target.value) || 0)}
                className="w-14 px-2 py-0.5 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-slate-800 grid grid-cols-2 gap-2.5 font-mono-tabular">
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Temperature</label>
              <input
                type="number"
                step="0.05"
                min={0}
                max={2}
                value={sampler.temperature}
                onChange={(e) =>
                  onChangeSampler({ ...sampler, temperature: Number(e.target.value) || 0.8 })
                }
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Max Tokens (Prose)</label>
              <input
                type="number"
                step="50"
                min={100}
                max={8000}
                value={sampler.maxTokens}
                onChange={(e) =>
                  onChangeSampler({ ...sampler, maxTokens: Number(e.target.value) || 600 })
                }
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Top P</label>
              <input
                type="number"
                step="0.02"
                min={0}
                max={1}
                value={sampler.topP}
                onChange={(e) =>
                  onChangeSampler({ ...sampler, topP: Number(e.target.value) || 0.92 })
                }
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Rep. Penalty</label>
              <input
                type="number"
                step="0.02"
                min={1}
                max={2}
                value={sampler.repetitionPenalty}
                onChange={(e) =>
                  onChangeSampler({
                    ...sampler,
                    repetitionPenalty: Number(e.target.value) || 1.08,
                  })
                }
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] text-stone-500 mb-1">
                Context Budget (ký tự)
              </label>
              <input
                type="number"
                step="1000"
                min={2000}
                max={120000}
                value={sampler.contextBudgetChars}
                onChange={(e) =>
                  onChangeSampler({
                    ...sampler,
                    contextBudgetChars: Number(e.target.value) || 16000,
                  })
                }
                className="w-full px-2 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
