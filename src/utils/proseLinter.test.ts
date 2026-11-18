import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBatchProseFix,
  applySingleProseFix,
  getProseFixSuggestions,
  lintVietnameseProse,
} from './proseLinter';

test('lintVietnameseProse flags forbidden modern words in red regardless of capitalization', () => {
  const prose =
    'Anh ta bước vào đình viện, nhìn cô ta một lượt rồi quay sang hỏi bọn họ.';
  const report = lintVietnameseProse(prose);

  assert.equal(report.modernWordCount, 3);
  assert.equal(report.overusedCrutchCount, 0);
  assert.deepEqual(
    report.matches.map((m) => ({ phrase: m.phrase, severity: m.severity })),
    [
      { phrase: 'anh ta', severity: 'error' },
      { phrase: 'cô ta', severity: 'error' },
      { phrase: 'bọn họ', severity: 'error' },
    ]
  );
  assert.equal(report.segments.map((s) => s.text).join(''), prose);
});

test('lintVietnameseProse highlights crutch words in amber only when count > 2 and respects word boundaries', () => {
  const prose =
    'Đột nhiên gió nổi lên. Hắn khẽ nhíu mày. Đột nhiên tiếng sấm vang, rồi đột nhiên mưa đổ xuống. Hắn khẽ thở dài, nhưng không khẽ chút nào. Không dính từ khẽo.';
  const report = lintVietnameseProse(prose);

  // "đột nhiên" = 3 (>2 -> flagged), "khẽ" = 3 (>2 -> flagged; "khẽo" must NOT match)
  const dotNhienStat = report.stats.find((s) => s.phrase === 'đột nhiên');
  const kheStat = report.stats.find((s) => s.phrase === 'khẽ');
  assert.equal(dotNhienStat?.count, 3);
  assert.equal(dotNhienStat?.flagged, true);
  assert.equal(kheStat?.count, 3);
  assert.equal(kheStat?.flagged, true);
  assert.equal(report.overusedCrutchCount, 6);
});

test('lintVietnameseProse does not highlight crutch words appearing 2 times or fewer', () => {
  const prose = 'Hắn bất giác dừng bước, khẽ gật đầu rồi lặng lẽ rời đi.';
  const report = lintVietnameseProse(prose);

  assert.equal(report.matches.length, 0);
  assert.equal(report.overusedCrutchCount, 0);
  assert.equal(report.stats.find((s) => s.phrase === 'bất giác')?.count, 1);
  assert.equal(report.stats.find((s) => s.phrase === 'bất giác')?.flagged, false);
});

test('applySingleProseFix and applyBatchProseFix preserve capitalization cleanly', () => {
  assert.deepEqual(getProseFixSuggestions('anh ta'), ['hắn', 'y']);
  assert.deepEqual(getProseFixSuggestions('cô ta'), ['nàng', 'cô']);

  const prose = 'Anh ta bước vào, rồi anh ta ngồi xuống cạnh bàn.';
  const report = lintVietnameseProse(prose);
  const firstFix = applySingleProseFix(prose, report.matches[0].start, report.matches[0].end, 'hắn');
  assert.equal(firstFix, 'Hắn bước vào, rồi anh ta ngồi xuống cạnh bàn.');

  const batch = applyBatchProseFix(prose, 'anh ta', 'y');
  assert.equal(batch.replacedCount, 2);
  assert.equal(batch.text, 'Y bước vào, rồi y ngồi xuống cạnh bàn.');
});

