import { StoryProject } from '../types/novel';
import { countWords } from './promptBuilder';

export function compileManuscriptMarkdown(project: StoryProject): string {
  const lines: string[] = [`# ${project.title || 'Untitled Novel'}`];
  if (project.protagonist.name.trim()) {
    lines.push(`*Nhân vật chính: ${project.protagonist.name.trim()}*`);
  }
  lines.push('');

  for (const act of project.acts) {
    lines.push(`## ${act.title}`);
    if (act.blueprint?.arcGoal?.trim()) {
      lines.push(`> *Mục tiêu quyển: ${act.blueprint.arcGoal.trim()}*`);
    }
    lines.push('');

    for (const chapter of act.chapters) {
      lines.push(`### ${chapter.title}`);
      lines.push('');
      const body = chapter.content.trim();
      lines.push(body || '*(Chưa có nội dung)*');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function compileManuscriptHtml(project: StoryProject): string {
  const totalWords = project.acts.reduce(
    (sum, act) =>
      sum + act.chapters.reduce((cSum, ch) => cSum + countWords(ch.content), 0),
    0
  );

  const bodyHtml = project.acts
    .map((act) => {
      const chaptersHtml = act.chapters
        .map((ch) => {
          const paragraphs = ch.content
            .trim()
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
            .join('\n');
          return `<section class="chapter">
  <h3>${escapeHtml(ch.title)}</h3>
  ${paragraphs || '<p class="empty"><em>(Chưa có nội dung)</em></p>'}
</section>`;
        })
        .join('\n');

      return `<article class="act">
  <h2>${escapeHtml(act.title)}</h2>
  ${chaptersHtml}
</article>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.title || 'Untitled Novel')}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.85; color: #1c1917; background: #faf8f5; }
  h1 { font-size: 2rem; text-align: center; margin-bottom: 0.4rem; }
  .meta { text-align: center; color: #78716c; font-size: 0.9rem; margin-bottom: 3rem; }
  h2 { font-size: 1.45rem; border-bottom: 1px solid #e7e5e4; padding-bottom: 0.4rem; margin-top: 2.5rem; }
  h3 { font-size: 1.15rem; margin-top: 1.75rem; color: #44403c; }
  p { text-indent: 1.5em; margin: 0.9rem 0; }
  .empty { text-indent: 0; color: #a8a29e; }
</style>
</head>
<body>
  <h1>${escapeHtml(project.title || 'Untitled Novel')}</h1>
  <div class="meta">${totalWords.toLocaleString('vi-VN')} từ</div>
  ${bodyHtml}
</body>
</html>`;
}
