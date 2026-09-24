import { toMarkdown } from '../../documents/render';

export function downloadMarkdown(title: string, content: unknown) {
  const md = toMarkdown(content);
  const blob = new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title || 'document'}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}
