import test from 'node:test';
import assert from 'node:assert/strict';
import { compileManuscriptHtml, compileManuscriptMarkdown } from './manuscriptCompiler';
import { DEFAULT_EDITOR_PREFERENCES, StoryProject } from '../types/novel';

const mockProject: Pick<StoryProject, 'title' | 'acts' | 'storyText' | 'protagonist'> = {
  title: 'Thanh Vân Vấn Đạo',
  storyText: '',
  protagonist: {
    name: 'Lâm Huyền',
    povStyle: 'Third-Person Limited',
    personality: '',
    abilitiesAndState: '',
    realm: '',
    techniques: '',
    resources: '',
    inventory: '',
  },
  acts: [
    {
      id: 'a1',
      title: 'Quyển 1: Ngoại Môn',
      expanded: true,
      chapters: [
        {
          id: 'c1',
          title: 'Chương 1: Rừng Trúc',
          expanded: true,
          scenes: [
            {
              id: 's1',
              title: 'Cảnh 1',
              content: 'Đoạn một.\n\nĐoạn hai.',
              beats: '',
              status: 'Final',
              updatedAt: 1,
            },
            {
              id: 's2',
              title: 'Cảnh 2',
              content: 'Đoạn ba <nguy hiểm>.',
              beats: '',
              status: 'Revised',
              updatedAt: 2,
            },
          ],
        },
      ],
    },
  ],
};

test('compileManuscriptMarkdown outputs structured headings and scene dividers in order', () => {
  const md = compileManuscriptMarkdown(mockProject);
  assert.ok(md.startsWith('# Thanh Vân Vấn Đạo'));
  assert.ok(md.includes('## Quyển 1: Ngoại Môn'));
  assert.ok(md.includes('### Chương 1: Rừng Trúc'));
  assert.ok(md.includes('* * *'));
  assert.ok(md.includes('Đoạn một.\n\nĐoạn hai.'));
  assert.ok(md.includes('Đoạn ba <nguy hiểm>.'));
});

test('compileManuscriptHtml outputs print-ready book HTML with escaped entities and TOC', () => {
  const html = compileManuscriptHtml(mockProject, {
    ...DEFAULT_EDITOR_PREFERENCES,
    firstLineIndent: true,
    paragraphSpacing: 1.25,
  });
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('<title>Thanh Vân Vấn Đạo</title>'));
  assert.ok(html.includes('Mục lục'));
  assert.ok(html.includes('Chương 1: Rừng Trúc'));
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('text-indent: 2em;'));
  assert.ok(html.includes('&lt;nguy hiểm&gt;'));
});
