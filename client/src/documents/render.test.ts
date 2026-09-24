import { describe, expect, it } from 'vitest';
import { renderNode } from './render';

const task = (checked: boolean, text: string) => ({
  type: 'taskItem',
  attrs: { checked },
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('renderNode task lists', () => {
  it('renders task lists with the same data-type hook the editor uses', () => {
    const html = renderNode({ type: 'taskList', content: [task(false, 'Draft')] });
    expect(html.startsWith('<ul data-type="taskList">')).toBe(true);
  });

  it('renders a disabled checkbox reflecting the checked state', () => {
    expect(renderNode(task(true, 'Done'))).toBe(
      '<li data-checked="true"><label><input type="checkbox" disabled checked aria-label="Completed"/></label><div><p>Done</p></div></li>',
    );
    expect(renderNode(task(false, 'Todo'))).toBe(
      '<li data-checked="false"><label><input type="checkbox" disabled aria-label="Not completed"/></label><div><p>Todo</p></div></li>',
    );
  });

  it('still escapes text content inside task items', () => {
    expect(renderNode(task(false, '<b>x</b>'))).toContain('<p>&lt;b>x&lt;/b></p>');
  });
});
