import { renderNode } from './render';
import { cx } from '../ui';

export function ProseView({ content, className }: { content: unknown; className?: string }) {
  return <div className={cx('prose-view', className)} dangerouslySetInnerHTML={{ __html: renderNode(content) }} />;
}
