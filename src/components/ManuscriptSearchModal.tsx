import React, { useMemo, useState } from 'react';
import { Replace, Search, X } from 'lucide-react';
import { ManuscriptAct } from '../types/novel';
import {
  replaceAcrossManuscript,
  searchAcrossManuscript,
} from '../utils/manuscriptSearch';

interface ManuscriptSearchModalProps {
  isOpen: boolean;
  acts: ManuscriptAct[];
  onClose: () => void;
  onJumpToChapter: (chapterId: string) => void;
  onReplaceAll: (
    nextActs: ManuscriptAct[],
    replacedCount: number,
    modifiedChaptersCount: number
  ) => void;
}

export const ManuscriptSearchModal: React.FC<ManuscriptSearchModalProps> = ({
  isOpen,
  acts,
  onClose,
  onJumpToChapter,
  onReplaceAll,
}) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const results = useMemo(
    () => searchAcrossManuscript(acts, query, { matchCase, wholeWord }),
    [acts, query, matchCase, wholeWord]
  );

  if (!isOpen) return null;

  const handleReplace = () => {
    if (!query || results.totalMatches === 0) return;
    const res = replaceAcrossManuscript(acts, query, replacement, { matchCase, wholeWord });
    onReplaceAll(res.acts, res.replacedCount, res.modifiedChaptersCount);
    setFeedback(
      `Đã thay thế ${res.replacedCount} vị trí trong ${res.modifiedChaptersCount} chương.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm và thay thế toàn bản thảo"
      data-testid="manuscript-search-modal"
    >
      <div className="w-full max-w-2xl max-h-[88vh] bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
            Tìm kiếm &amp; Thay thế toàn bản thảo
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tìm kiếm"
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-stone-200 dark:border-slate-800 space-y-3 bg-stone-50/70 dark:bg-slate-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFeedback(null);
                }}
                placeholder="Tìm cụm từ hoặc tên nhân vật..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Thay thế bằng..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                disabled={!query || results.totalMatches === 0}
                onClick={handleReplace}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 whitespace-nowrap"
              >
                <Replace className="w-3.5 h-3.5" />
                <span>Thay tất cả</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="accent-amber-600"
                />
                <span>Phân biệt HOA/thường</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                  className="accent-amber-600"
                />
                <span>Nguyên từ</span>
              </label>
            </div>

            <span className="font-mono-tabular">
              {results.totalMatches} kết quả · {results.matchedChaptersCount} chương
            </span>
          </div>

          {feedback && (
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {feedback}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!query ? (
            <p className="text-xs text-stone-500 dark:text-slate-400 text-center py-8">
              Nhập từ khóa để tìm kiếm xuyên suốt mọi Quyển và Chương.
            </p>
          ) : results.matches.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-slate-400 text-center py-8">
              Không tìm thấy kết quả phù hợp.
            </p>
          ) : (
            results.matches.slice(0, 120).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onJumpToChapter(m.chapterId);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors space-y-1"
              >
                <div className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                  {m.actTitle} · {m.chapterTitle}
                </div>
                <div className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  <span>{m.prefix}</span>
                  <mark className="bg-amber-200 dark:bg-amber-900/70 text-stone-900 dark:text-amber-100 px-0.5 rounded font-medium">
                    {m.matchedText}
                  </mark>
                  <span>{m.suffix}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
