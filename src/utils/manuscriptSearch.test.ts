import assert from 'node:assert/strict';
import test from 'node:test';
import { ManuscriptAct } from '../types/novel';
import { replaceAllInActs, searchManuscript } from './manuscriptSearch';

const mockActs: ManuscriptAct[] = [
  {
    id: 'a1',
    title: 'Quyển 1: Khởi Đầu',
    expanded: true,
    chapters: [
      {
        id: 'ch1',
        title: 'Chương 1: Rừng Trúc',
        expanded: true,
        scenes: [
          {
            id: 's1',
            title: 'Cảnh 1',
            content: 'Lâm Huyền bước vào rừng trúc. Lâm Huyền nhìn mảnh ngọc bội.',
            beats: '',
            status: 'Draft',
            updatedAt: 100,
          },
          {
            id: 's2',
            title: 'Cảnh 2',
            content: 'Triệu Phong đứng đợi ở bìa rừng.',
            beats: '',
            status: 'Draft',
            updatedAt: 100,
          },
        ],
      },
    ],
  },
  {
    id: 'a2',
    title: 'Quyển 2: Bí Cảnh',
    expanded: true,
    chapters: [
      {
        id: 'ch2',
        title: 'Chương 2: Cổng Đá',
        expanded: true,
        scenes: [
          {
            id: 's3',
            title: 'Cảnh 1',
            content: 'Tại cổng đá, lâm huyền rút thanh kiếm cổ.',
            beats: '',
            status: 'Revised',
            updatedAt: 100,
          },
        ],
      },
    ],
  },
];

test('searchManuscript finds matches across all volumes, chapters, and scenes with snippet context', () => {
  const res = searchManuscript(mockActs, 'Lâm Huyền');
  assert.equal(res.totalOccurrences, 3);
  assert.equal(res.matchedScenesCount, 2);
  assert.equal(res.matches.length, 3);
  assert.equal(res.matches[0].chapterTitle, 'Chương 1: Rừng Trúc');
  assert.equal(res.matches[2].actTitle, 'Quyển 2: Bí Cảnh');
  assert.equal(res.matches[2].matchedText, 'lâm huyền');

  const sensitive = searchManuscript(mockActs, 'Lâm Huyền', { caseSensitive: true });
  assert.equal(sensitive.totalOccurrences, 2);
  assert.equal(sensitive.matchedScenesCount, 1);
});

test('replaceAllInActs replaces all occurrences safely across volumes and preserves unmodified scenes', () => {
  const result = replaceAllInActs(mockActs, 'Lâm Huyền', 'Trần Huyền');
  assert.equal(result.replacedCount, 3);
  assert.equal(result.modifiedScenesCount, 2);
  assert.equal(
    result.nextActs[0].chapters[0].scenes[0].content,
    'Trần Huyền bước vào rừng trúc. Trần Huyền nhìn mảnh ngọc bội.'
  );
  assert.equal(
    result.nextActs[0].chapters[0].scenes[1].updatedAt,
    100
  );
  assert.equal(
    result.nextActs[1].chapters[0].scenes[0].content,
    'Tại cổng đá, Trần Huyền rút thanh kiếm cổ.'
  );
  assert.ok(result.compiledStoryText.includes('Trần Huyền rút thanh kiếm cổ.'));
});
