import { DailyWordStats } from '../types/novel';

export function calculateUsageCostUsd(
  promptTokens: number,
  completionTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number
): number {
  const safePrompt = Math.max(0, Number.isFinite(promptTokens) ? promptTokens : 0);
  const safeCompletion = Math.max(0, Number.isFinite(completionTokens) ? completionTokens : 0);
  const safeInPrice = Math.max(0, Number.isFinite(inputPricePerMillion) ? inputPricePerMillion : 0);
  const safeOutPrice = Math.max(0, Number.isFinite(outputPricePerMillion) ? outputPricePerMillion : 0);

  return (safePrompt * safeInPrice + safeCompletion * safeOutPrice) / 1_000_000;
}

export function formatUsdCompact(usd: number): string {
  const safe = Math.max(0, Number.isFinite(usd) ? usd : 0);
  if (safe === 0) return '$0.000';
  if (safe < 0.01) return `$${safe.toFixed(4)}`;
  return `$${safe.toFixed(3)}`;
}

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DEFAULT_DAILY_GOAL_WORDS = 1500;

export function applyDailyWordDelta(
  current: DailyWordStats,
  deltaWords: number,
  todayKey = getLocalDateKey()
): DailyWordStats {
  const baseCount = current.date === todayKey ? current.wordsAdded : 0;
  const increment = deltaWords > 0 ? Math.round(deltaWords) : 0;
  return {
    date: todayKey,
    wordsAdded: baseCount + increment,
    ...(current.goalWords ? { goalWords: current.goalWords } : {}),
  };
}

export function setDailyGoalWords(
  current: DailyWordStats,
  goalWords: number,
  todayKey = getLocalDateKey()
): DailyWordStats {
  const clamped = Math.max(100, Math.min(50000, Math.round(goalWords || DEFAULT_DAILY_GOAL_WORDS)));
  return {
    date: current.date === todayKey ? current.date : todayKey,
    wordsAdded: current.date === todayKey ? current.wordsAdded : 0,
    goalWords: clamped,
  };
}

export function getDailyGoalProgress(
  stats: DailyWordStats,
  todayKey = getLocalDateKey()
): { wordsAdded: number; goalWords: number; percent: number; reached: boolean } {
  const wordsAdded = stats.date === todayKey ? stats.wordsAdded : 0;
  const goalWords = stats.goalWords && stats.goalWords > 0 ? stats.goalWords : DEFAULT_DAILY_GOAL_WORDS;
  const percent = Math.min(100, Math.round((wordsAdded / goalWords) * 100));
  return {
    wordsAdded,
    goalWords,
    percent,
    reached: wordsAdded >= goalWords,
  };
}

