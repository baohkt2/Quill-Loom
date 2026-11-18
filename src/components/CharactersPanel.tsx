import React, { useRef, useState } from 'react';
import {
  Backpack,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CharacterCard,
  CharacterRole,
  CharacterStatusSuggestion,
  LorebookEntry,
  ProtagonistProfile,
} from '../types/novel';
import {
  extractCharaJsonFromPng,
  ImportResolutionMode,
  mergeOrReplaceCharacters,
  parseMultiFormatCharacterImport,
  serializeSingleCharacterJson,
} from '../utils/assetExchange';
import {
  ActiveCharacterMatch,
  serializeCharactersJson,
} from '../utils/characterEngine';
import { sanitizeFilename, triggerFileDownload } from '../utils/storage';
import { PendingImportPrompt } from './ImportConflictModal';

interface CharactersPanelProps {
  projectTitle: string;
  storyLength: number;
  protagonist: ProtagonistProfile;
  characters: CharacterCard[];
  activeMatches: ActiveCharacterMatch[];
  isSuggestingUpdates: boolean;
  suggestError: string | null;
  suggestions: CharacterStatusSuggestion[];
  onChangeProtagonist: (profile: ProtagonistProfile) => void;
  onChangeCharacters: (cards: CharacterCard[]) => void;
  onImportLorebookEntries: (entries: LorebookEntry[], mode: ImportResolutionMode) => void;
  onRequestImportConflict: (prompt: PendingImportPrompt) => void;
  onSuggestUpdates: () => void;
  onApplySuggestion: (characterId: string) => void;
  onIgnoreSuggestion: (characterId: string) => void;
  onDismissSuggestError: () => void;
}

const ROLE_OPTIONS: CharacterRole[] = ['Main', 'Ally', 'Antagonist', 'Supporting'];

const ROLE_STYLES: Record<CharacterRole, string> = {
  Main: 'border-[#8aa2ff]/35 bg-[#8aa2ff]/12 text-[#c7d4ff]',
  Ally: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  Antagonist: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
  Supporting: 'border-slate-500/35 bg-white/[0.04] text-slate-300',
};

export const CharactersPanel: React.FC<CharactersPanelProps> = ({
  projectTitle,
  storyLength,
  protagonist,
  characters,
  activeMatches,
  isSuggestingUpdates,
  suggestError,
  suggestions,
  onChangeProtagonist,
  onChangeCharacters,
  onImportLorebookEntries,
  onRequestImportConflict,
  onSuggestUpdates,
  onApplySuggestion,
  onIgnoreSuggestion,
  onDismissSuggestError,
}) => {
  const [protagExpanded, setProtagExpanded] = useState(true);
  const [statusExpanded, setStatusExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draftName, setDraftName] = useState('');
  const [draftAliases, setDraftAliases] = useState('');
  const [draftRole, setDraftRole] = useState<CharacterRole>('Supporting');
  const [draftAppearance, setDraftAppearance] = useState('');
  const [draftSpeech, setDraftSpeech] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [draftInScene, setDraftInScene] = useState(false);

  const [ioNotice, setIoNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMap = new Map(activeMatches.map((m) => [m.card.id, m]));
  const inSceneCount = characters.filter((c) => c.inScene).length;

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setDraftName('');
    setDraftAliases('');
    setDraftRole('Supporting');
    setDraftAppearance('');
    setDraftSpeech('');
    setDraftStatus('');
    setDraftInScene(false);
    setIoNotice(null);
  };

  const startEdit = (card: CharacterCard) => {
    setIsCreating(false);
    setEditingId(card.id);
    setDraftName(card.name);
    setDraftAliases(card.aliases);
    setDraftRole(card.role);
    setDraftAppearance(card.appearanceAndPersonality);
    setDraftSpeech(card.speechStyleAndPronouns);
    setDraftStatus(card.currentStatusAndRelationship);
    setDraftInScene(card.inScene);
    setIoNotice(null);
  };

  const cancelEditor = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim()) return;

    const now = Date.now();
    if (isCreating) {
      const created: CharacterCard = {
        id: `char_${now}_${Math.random().toString(36).slice(2, 6)}`,
        name: draftName.trim(),
        aliases: draftAliases.trim(),
        role: draftRole,
        appearanceAndPersonality: draftAppearance.trim(),
        speechStyleAndPronouns: draftSpeech.trim(),
        currentStatusAndRelationship: draftStatus.trim(),
        inScene: draftInScene,
        updatedAt: now,
      };
      onChangeCharacters([created, ...characters]);
      setIsCreating(false);
    } else if (editingId) {
      onChangeCharacters(
        characters.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: draftName.trim(),
                aliases: draftAliases.trim(),
                role: draftRole,
                appearanceAndPersonality: draftAppearance.trim(),
                speechStyleAndPronouns: draftSpeech.trim(),
                currentStatusAndRelationship: draftStatus.trim(),
                inScene: draftInScene,
                updatedAt: now,
              }
            : c
        )
      );
      setEditingId(null);
    }
  };

  const toggleInScene = (id: string) => {
    onChangeCharacters(
      characters.map((c) =>
        c.id === id ? { ...c, inScene: !c.inScene, updatedAt: Date.now() } : c
      )
    );
  };

  const deleteCard = (id: string) => {
    onChangeCharacters(characters.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleExportCharacters = () => {
    const filename = `${sanitizeFilename(projectTitle)}_characters.json`;
    const json = serializeCharactersJson(protagonist, characters);
    triggerFileDownload(filename, json, 'application/json;charset=utf-8');
  };

  const handleExportSingleCharacter = (card: CharacterCard) => {
    const filename = `${sanitizeFilename(card.name || 'character')}.character.json`;
    const json = serializeSingleCharacterJson(card);
    triggerFileDownload(filename, json, 'application/json;charset=utf-8');
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIoNotice(null);

    try {
      const isPng =
        file.name.toLowerCase().endsWith('.png') || file.type === 'image/png';
      const rawJson = isPng
        ? extractCharaJsonFromPng(await file.arrayBuffer())
        : await file.text();
      const bundle = parseMultiFormatCharacterImport(rawJson, isPng ? 'png' : 'json');

      if (bundle.characters.length === 0 && !bundle.protagonist) {
        setIoNotice({
          type: 'error',
          text: 'Không tìm thấy dữ liệu nhân vật hợp lệ trong tệp đã chọn.',
        });
        return;
      }

      const formatLabel =
        bundle.format === 'sillytavern_png'
          ? 'Thẻ nhân vật SillyTavern V2 (PNG)'
          : bundle.format === 'sillytavern_v2'
          ? 'Thẻ nhân vật SillyTavern V1/V2 (JSON)'
          : 'Danh sách Nhân vật (Studio JSON)';

      onRequestImportConflict({
        categoryLabel: 'Nhân vật (Characters)',
        fileName: file.name,
        incomingCount: bundle.characters.length || (bundle.protagonist ? 1 : 0),
        existingCount: characters.length,
        previewNames: bundle.characters.map((c) => c.name),
        embeddedLoreCount: bundle.embeddedLorebook.length,
        extraNote: `${formatLabel}${bundle.protagonist ? ' · Có kèm hồ sơ Protagonist / POV.' : ''}`,
        onResolve: (mode, includeEmbeddedLore) => {
          if (bundle.protagonist) {
            onChangeProtagonist({
              ...protagonist,
              ...bundle.protagonist,
            });
          }

          let summaryText = '';
          if (bundle.characters.length > 0) {
            const res = mergeOrReplaceCharacters(characters, bundle.characters, mode);
            onChangeCharacters(res.characters);
            summaryText =
              mode === 'replace'
                ? `Đã ghi đè bằng ${res.addedCount} nhân vật mới.`
                : `Đã gộp thêm ${res.addedCount} nhân vật${
                    res.skippedDuplicates > 0 ? ` (bỏ qua ${res.skippedDuplicates} trùng lặp)` : ''
                  }.`;
          } else if (bundle.protagonist) {
            summaryText = 'Đã cập nhật hồ sơ Nhân vật chính (Protagonist).';
          }

          if (includeEmbeddedLore && bundle.embeddedLorebook.length > 0) {
            onImportLorebookEntries(bundle.embeddedLorebook, mode);
            summaryText += ` Đã nhập thêm ${bundle.embeddedLorebook.length} mục Lorebook.`;
          }

          setIoNotice({ type: 'success', text: summaryText.trim() });
        },
      });
    } catch (err) {
      setIoNotice({
        type: 'error',
        text: (err as Error).message || 'Không thể đọc tệp nhân vật (.json / .png).',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Pinned Protagonist / POV Card */}
      <section
        aria-label="Protagonist and POV Profile"
        className="rounded-md border border-[#8aa2ff]/30 bg-[#13141c] p-3"
      >
        <button
          type="button"
          onClick={() => setProtagExpanded((v) => !v)}
          aria-expanded={protagExpanded}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#8aa2ff]" />
              <span className="text-xs font-semibold text-slate-100">
                Protagonist / POV
              </span>
              {!protagExpanded && protagonist.name.trim() && (
                <span className="truncate text-xs text-slate-400">
                  · {protagonist.name}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Pinned right after System Prompt
            </p>
          </div>
          {protagExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          )}
        </button>

        {protagExpanded && (
          <div className="mt-3 space-y-2.5 border-t border-white/[0.07] pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="protag-name" className="block text-[11px] font-medium text-slate-400">
                  Name
                </label>
                <input
                  id="protag-name"
                  type="text"
                  value={protagonist.name}
                  onChange={(e) =>
                    onChangeProtagonist({ ...protagonist, name: e.target.value })
                  }
                  placeholder="e.g., Lâm Huyền"
                  className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="protag-pov" className="block text-[11px] font-medium text-slate-400">
                  POV Style
                </label>
                <input
                  id="protag-pov"
                  type="text"
                  list="pov-style-presets"
                  value={protagonist.povStyle}
                  onChange={(e) =>
                    onChangeProtagonist({ ...protagonist, povStyle: e.target.value })
                  }
                  placeholder="Third-Person Limited"
                  className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
                />
                <datalist id="pov-style-presets">
                  <option value="Third-Person Limited" />
                  <option value="First-Person" />
                  <option value="Third-Person Omniscient" />
                  <option value="Third-Person Limited (Ngôi thứ ba hạn chế)" />
                  <option value="First-Person (Ngôi thứ nhất)" />
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="protag-personality" className="block text-[11px] font-medium text-slate-400">
                Core Personality &amp; Principles
              </label>
              <textarea
                id="protag-personality"
                rows={2}
                value={protagonist.personality}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, personality: e.target.value })
                }
                placeholder="Temperament, moral code, decision habits..."
                className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="protag-abilities" className="block text-[11px] font-medium text-slate-400">
                Abilities / Current State
              </label>
              <textarea
                id="protag-abilities"
                rows={2}
                value={protagonist.abilitiesAndState}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, abilitiesAndState: e.target.value })
                }
                placeholder="Current state, injuries, immediate focus..."
                className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* 1b. Protagonist Status & Inventory Tracker (Bảng Trạng Thái & Hành Trang) */}
      <section
        data-testid="protagonist-status-panel"
        aria-label="Protagonist Status and Inventory"
        className="rounded-md border border-emerald-500/25 bg-[#13141c] p-3"
      >
        <button
          type="button"
          onClick={() => setStatusExpanded((v) => !v)}
          aria-expanded={statusExpanded}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Backpack className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-100">
                Status &amp; Inventory (Trạng thái &amp; Hành trang)
              </span>
            </div>
            {!statusExpanded && protagonist.realm?.trim() && (
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {protagonist.realm}
              </p>
            )}
          </div>
          {statusExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          )}
        </button>

        {statusExpanded && (
          <div className="mt-3 space-y-2.5 border-t border-white/[0.07] pt-3">
            <div className="space-y-1">
              <label htmlFor="protag-realm" className="block text-[11px] font-medium text-slate-400">
                Cultivation Realm / Level (Cảnh giới)
              </label>
              <input
                id="protag-realm"
                type="text"
                value={protagonist.realm ?? ''}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, realm: e.target.value })
                }
                placeholder="e.g., Luyện Khí tầng 3"
                className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="protag-techniques" className="block text-[11px] font-medium text-slate-400">
                Techniques &amp; Abilities (Công pháp &amp; Thần thông)
              </label>
              <textarea
                id="protag-techniques"
                rows={2}
                value={protagonist.techniques ?? ''}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, techniques: e.target.value })
                }
                placeholder="e.g., Thanh Vân Dẫn Khí Quyết, Lăng Ba Bộ..."
                className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="protag-resources" className="block text-[11px] font-medium text-slate-400">
                Currency / Resources (Linh thạch / Tài nguyên)
              </label>
              <input
                id="protag-resources"
                type="text"
                value={protagonist.resources ?? ''}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, resources: e.target.value })
                }
                placeholder="e.g., 1 viên hạ phẩm linh thạch, 12 bạc vụn"
                className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="protag-inventory" className="block text-[11px] font-medium text-slate-400">
                Inventory / Artifacts (Túi trữ vật / Pháp bảo)
              </label>
              <textarea
                id="protag-inventory"
                rows={2}
                value={protagonist.inventory ?? ''}
                onChange={(e) =>
                  onChangeProtagonist({ ...protagonist, inventory: e.target.value })
                }
                placeholder="e.g., Mảnh Ngọc Bội Thanh Đồng, 2 lá An Thần Thảo..."
                className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* 2. Cast Actions + AI Status Updater */}
      <div className="space-y-2 border-t border-white/[0.07] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={startCreate}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#6d8cff]/15 px-2.5 text-xs font-medium text-[#b4c4ff] transition-colors hover:bg-[#6d8cff]/25 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Character</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="import-characters-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Import Characters JSON or PNG"
              title="Nhập .json hoặc thẻ nhân vật .png (SillyTavern V2)"
              className="flex h-8 items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.03] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.07] whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import</span>
            </button>
            <button
              type="button"
              data-testid="export-characters-btn"
              onClick={handleExportCharacters}
              aria-label="Export All Characters JSON"
              title="Xuất toàn bộ dàn nhân vật (.json)"
              className="flex h-8 items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.03] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.07] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
            <input
              ref={fileInputRef}
              data-testid="characters-import-input"
              type="file"
              accept=".json,.png,application/json,image/png"
              onChange={handleImportFileChange}
              className="hidden"
              aria-label="Import Characters JSON or PNG file"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={isSuggestingUpdates || storyLength === 0}
          onClick={onSuggestUpdates}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#5e7cf2] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4e6ce4] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
        >
          {isSuggestingUpdates ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Scanning Recent Scene...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Suggest Character Updates</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span>
            {characters.length} character{characters.length === 1 ? '' : 's'}
          </span>
          <span>
            <strong className="font-mono font-medium text-[#b4c4ff]">
              {activeMatches.length}
            </strong>{' '}
            active ({inSceneCount} pinned · {activeMatches.length - inSceneCount} mentioned)
          </span>
        </div>
      </div>

      {/* Import/Export Notice */}
      {ioNotice && (
        <div
          role={ioNotice.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs ${
            ioNotice.type === 'error'
              ? 'border-rose-500/35 bg-rose-950/40 text-rose-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          <span>{ioNotice.text}</span>
          <button
            type="button"
            onClick={() => setIoNotice(null)}
            aria-label="Dismiss character notice"
            className="opacity-80 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* AI Update Error */}
      {suggestError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-md border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
        >
          <span>{suggestError}</span>
          <button
            type="button"
            onClick={onDismissSuggestError}
            aria-label="Dismiss suggestion error"
            className="text-rose-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Human-in-the-Loop AI Status Suggestions */}
      {suggestions.length > 0 && (
        <section
          aria-label="Proposed Character Status Updates"
          className="space-y-2.5 rounded-md border border-amber-400/35 bg-amber-400/[0.05] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-200">
              Proposed Status Updates ({suggestions.length})
            </span>
          </div>

          <ul className="space-y-2.5">
            {suggestions.map((sug) => (
              <li
                key={sug.characterId}
                data-testid={`char-suggestion-${sug.characterId}`}
                className="space-y-1.5 rounded border border-white/[0.09] bg-[#13141c] p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    {sug.characterName}
                  </span>
                </div>
                {sug.reason && (
                  <p className="text-[11px] text-slate-400">{sug.reason}</p>
                )}
                {sug.currentStatus && (
                  <p className="text-[11px] leading-snug text-slate-500 line-through">
                    {sug.currentStatus}
                  </p>
                )}
                {sug.targetType === 'protagonist' ? (
                  <div className="space-y-1 text-xs leading-relaxed text-amber-100">
                    {sug.suggestedRealm && (
                      <p>
                        <span className="text-slate-400">Cảnh giới: </span>
                        {sug.suggestedRealm}
                      </p>
                    )}
                    {sug.suggestedTechniques && (
                      <p>
                        <span className="text-slate-400">Công pháp: </span>
                        {sug.suggestedTechniques}
                      </p>
                    )}
                    {sug.suggestedResources && (
                      <p>
                        <span className="text-slate-400">Tài nguyên: </span>
                        {sug.suggestedResources}
                      </p>
                    )}
                    {sug.suggestedInventory && (
                      <p>
                        <span className="text-slate-400">Hành trang: </span>
                        {sug.suggestedInventory}
                      </p>
                    )}
                    {sug.suggestedStatus && (
                      <p>{sug.suggestedStatus}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-amber-100">
                    {sug.suggestedStatus}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onIgnoreSuggestion(sug.characterId)}
                    className="rounded px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplySuggestion(sug.characterId)}
                    className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                  >
                    <Check className="h-3 w-3" />
                    <span>Apply</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Create / Edit Character Card Form */}
      {(isCreating || editingId) && (
        <form
          onSubmit={handleSaveCard}
          className="space-y-2.5 rounded-md border border-[#8aa2ff]/35 bg-[#13141c] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              {isCreating ? 'New Character Card' : 'Edit Character Card'}
            </span>
            <button
              type="button"
              onClick={cancelEditor}
              aria-label="Cancel character editing"
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="char-name" className="block text-[11px] font-medium text-slate-400">
                Name
              </label>
              <input
                id="char-name"
                type="text"
                required
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g., Triệu Phong"
                className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="char-role" className="block text-[11px] font-medium text-slate-400">
                Role Badge
              </label>
              <select
                id="char-role"
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value as CharacterRole)}
                className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 focus:border-[#8aa2ff] focus:outline-none"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="char-aliases" className="block text-[11px] font-medium text-slate-400">
              Aliases / Trigger Names (comma-separated)
            </label>
            <input
              id="char-aliases"
              type="text"
              value={draftAliases}
              onChange={(e) => setDraftAliases(e.target.value)}
              placeholder="e.g., triệu sư huynh, chấp sự"
              className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="char-appearance" className="block text-[11px] font-medium text-slate-400">
              Appearance &amp; Core Personality
            </label>
            <textarea
              id="char-appearance"
              rows={2}
              value={draftAppearance}
              onChange={(e) => setDraftAppearance(e.target.value)}
              placeholder="Distinctive traits, demeanor, static personality..."
              className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="char-speech" className="block text-[11px] font-medium text-slate-400">
              Speech Style &amp; Pronouns (Giọng điệu &amp; Xưng hô)
            </label>
            <input
              id="char-speech"
              type="text"
              value={draftSpeech}
              onChange={(e) => setDraftSpeech(e.target.value)}
              placeholder='e.g., Cold/arrogant, uses "bản tọa - ngươi"'
              className="w-full rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="char-status" className="block text-[11px] font-medium text-slate-400">
              Current Status &amp; Relationship (Trạng thái hiện tại)
            </label>
            <textarea
              id="char-status"
              rows={2}
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
              placeholder="Current location, injuries, attitude toward protagonist..."
              className="w-full resize-y rounded border border-white/[0.1] bg-[#161822] px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-[#8aa2ff] focus:outline-none"
            />
          </div>

          <label
            htmlFor="char-in-scene"
            className="flex cursor-pointer items-center gap-2 rounded border border-white/[0.08] bg-[#161822] px-2.5 py-2 text-xs text-slate-200"
          >
            <input
              id="char-in-scene"
              type="checkbox"
              checked={draftInScene}
              onChange={(e) => setDraftInScene(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-[#181a24] accent-[#6d8cff]"
            />
            <span>Có mặt trong cảnh (In Scene — always inject)</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelEditor}
              className="rounded px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[#6d8cff] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5b7bf5]"
            >
              Save Character
            </button>
          </div>
        </form>
      )}

      {/* 3. Character Roster List */}
      {characters.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/[0.1] px-4 py-6 text-center">
          <p className="text-xs leading-relaxed text-slate-400">
            No supporting characters yet. Click <strong>New Character</strong> or import a <code>.json</code> cast file.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5" aria-label="Character roster">
          {characters.map((card) => {
            const match = activeMap.get(card.id);
            const isActive = Boolean(match);

            return (
              <li
                key={card.id}
                data-testid={`character-card-${card.id}`}
                data-active={isActive ? 'true' : 'false'}
                className={`rounded-md border p-3 transition-colors ${
                  card.inScene
                    ? 'border-[#8aa2ff]/45 bg-[#8aa2ff]/[0.06]'
                    : match?.reason === 'mentioned'
                    ? 'border-amber-400/40 bg-amber-400/[0.04]'
                    : 'border-white/[0.08] bg-[#13141c]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-slate-100">
                        {card.name}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${ROLE_STYLES[card.role]}`}
                      >
                        {card.role}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      {card.aliases && (
                        <span className="truncate font-mono text-[10px] text-slate-400">
                          {card.aliases}
                        </span>
                      )}
                      {match?.reason === 'mentioned' && (
                        <>
                          {card.aliases && (
                            <span className="text-slate-600" aria-hidden="true">
                              ·
                            </span>
                          )}
                          <span className="font-medium text-amber-300">
                            Mentioned ({match.matchedTerm})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleInScene(card.id)}
                      aria-pressed={card.inScene}
                      aria-label={`Toggle In Scene for ${card.name}`}
                      title="Có mặt trong cảnh (Always inject)"
                      className={`flex h-7 items-center gap-1 rounded border px-2 text-[10px] font-medium transition-colors whitespace-nowrap ${
                        card.inScene
                          ? 'border-[#8aa2ff]/50 bg-[#6d8cff]/25 text-white'
                          : 'border-white/[0.1] bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      <span>In Scene</span>
                    </button>

                    <button
                      type="button"
                      data-testid={`export-char-${card.id}`}
                      onClick={() => handleExportSingleCharacter(card)}
                      aria-label={`Export ${card.name} JSON`}
                      title="Xuất thẻ nhân vật này (.json)"
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      aria-label={`Edit ${card.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCard(card.id)}
                      aria-label={`Delete ${card.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-1 text-[11px] leading-relaxed">
                  {card.speechStyleAndPronouns && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Xưng hô: </span>
                      {card.speechStyleAndPronouns}
                    </p>
                  )}
                  {card.currentStatusAndRelationship && (
                    <p className="text-slate-200">
                      <span className="text-slate-500">Trạng thái: </span>
                      {card.currentStatusAndRelationship}
                    </p>
                  )}
                  {card.appearanceAndPersonality && (
                    <p className="line-clamp-2 text-slate-400">
                      {card.appearanceAndPersonality}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
