import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBulkChapters } from './bulkImporter';

test('parseBulkChapters splits Vietnamese and Markdown Chapter headings cleanly', () => {
  const text = `
Chương 1: Khởi đầu tại Thanh Vân
Sương phủ kín đỉnh núi. Lâm Huyền bắt đầu tu luyện.

## Chương 2 - Rừng trúc đêm khuya
Tiếng bước chân vang lên từ phía sau.

Chapter 3: The Trial
Rain fell across the stone courtyard.
`;

  const res = parseBulkChapters(text);
  assert.equal(res.chapters.length, 3);
  assert.equal(res.chapters[0].title, 'Chương 1: Khởi đầu tại Thanh Vân');
  assert.ok(res.chapters[0].scenes[0].content.includes('Sương phủ kín đỉnh núi.'));
  assert.equal(res.chapters[1].title, 'Chương 2 - Rừng trúc đêm khuya');
  assert.ok(res.chapters[1].scenes[0].content.includes('Tiếng bước chân'));
  assert.equal(res.chapters[2].title, 'Chapter 3: The Trial');
  assert.ok(res.totalWords > 20);
});

test('parseBulkChapters preserves leading prologue and falls back cleanly on single-chapter text', () => {
  const withPrologue = `Ngày xửa ngày xưa nơi chân núi.\n\nChương 1: Nhập môn\nHắn bước qua sơn môn.`;
  const res1 = parseBulkChapters(withPrologue);
  assert.equal(res1.chapters.length, 2);
  assert.equal(res1.chapters[0].title, 'Mở đầu');
  assert.equal(res1.chapters[1].title, 'Chương 1: Nhập môn');

  const plainText = 'Một đoạn truyện ngắn không có tiêu đề chương.';
  const res2 = parseBulkChapters(plainText, 'Chương Nhập');
  assert.equal(res2.chapters.length, 1);
  assert.equal(res2.chapters[0].title, 'Chương Nhập');
  assert.equal(res2.chapters[0].scenes[0].content, plainText);
});
