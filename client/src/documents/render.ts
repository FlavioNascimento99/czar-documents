// Lightweight view renderer: no editor loaded. Renders Tiptap JSON read-only with minimal DOM.
export function renderNode(n: any): string {
  if (!n) return '';
  const kids = (n.content || []).map(renderNode).join('');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  switch (n.type) {
    case 'doc': return kids;
    case 'paragraph': return `<p>${kids || '<br/>'}</p>`;
    case 'heading': return `<h${n.attrs?.level || 1}>${kids}</h${n.attrs?.level || 1}>`;
    case 'bulletList': return `<ul>${kids}</ul>`;
    case 'orderedList': return `<ol>${kids}</ol>`;
    case 'listItem': return `<li>${kids}</li>`;
    case 'taskList': return `<ul>${kids}</ul>`;
    case 'taskItem': return `<li>${n.attrs?.checked ? '☑ ' : '☐ '}${kids}</li>`;
    case 'blockquote': return `<blockquote>${kids}</blockquote>`;
    case 'codeBlock': return `<pre>${esc(kids)}</pre>`;
    case 'horizontalRule': return `<hr/>`;
    case 'image': return `<img src="${n.attrs?.src || ''}" class="max-w-full rounded"/>`;
    case 'text': {
      let t = esc(n.text || '');
      for (const m of n.marks || []) {
        if (m.type === 'bold') t = `<strong>${t}</strong>`;
        if (m.type === 'italic') t = `<em>${t}</em>`;
        if (m.type === 'strike') t = `<s>${t}</s>`;
        if (m.type === 'code') t = `<code>${t}</code>`;
        if (m.type === 'link') t = `<a class="underline" href="${m.attrs?.href}">${t}</a>`;
      }
      return t;
    }
    default: return kids;
  }
}

export function toMarkdown(n: any): string {
  if (!n) return '';
  const kids = (n.content || []).map(toMarkdown).join('');
  switch (n.type) {
    case 'doc': return (n.content || []).map(toMarkdown).join('\n\n');
    case 'paragraph': return kids;
    case 'heading': return `${'#'.repeat(n.attrs?.level || 1)} ${kids}`;
    case 'bulletList': return kids;
    case 'listItem': return `- ${kids}`;
    case 'blockquote': return `> ${kids}`;
    case 'codeBlock': return '```\n' + kids + '\n```';
    case 'text': {
      let t = n.text || '';
      for (const m of n.marks || []) {
        if (m.type === 'bold') t = `**${t}**`;
        if (m.type === 'italic') t = `*${t}*`;
        if (m.type === 'code') t = `\`${t}\``;
        if (m.type === 'link') t = `[${t}](${m.attrs?.href})`;
      }
      return t;
    }
    default: return kids;
  }
}
