import { Link } from 'react-router-dom';
import { VisibilityBadge } from '../../documents/VisibilityBadge';
import { formatDate } from '../../lib/format';
import { Badge, ButtonLink, Icon, Select } from '../../ui';

type DocumentListProps = {
  docs: any[];
  allFolders: any[] | undefined;
  types: any[] | undefined;
  onMove: (id: string, folderId: string) => void;
};

export function DocumentList({ docs, allFolders, types, onMove }: DocumentListProps) {
  const typeName = (slug: string) => (types || []).find((t: any) => t.slug === slug)?.name ?? slug;
  return (
    <ul className="divide-y divide-border">
      {docs.map((d: any) => {
        const title = d.title || 'Untitled';
        const updated = d.updated_at ? formatDate(d.updated_at) : null;
        return (
          <li key={d.id} className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary/50 sm:flex-row sm:items-center md:px-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-fg-secondary">
                <Icon name="file-text" />
              </span>
              <div className="min-w-0">
                <Link to={'/docs/' + d.id} className="block truncate rounded-sm text-body font-medium text-fg transition-colors hover:text-primary">
                  {title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <VisibilityBadge visibility={d.visibility} />
                  {d.type_slug && <Badge tone="primary" icon="tag">{typeName(d.type_slug)}</Badge>}
                  {updated && <span className="text-caption font-normal text-fg-secondary">Updated {updated}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-11 sm:shrink-0 sm:pl-0">
              <Select
                controlSize="sm"
                className="w-full min-w-0 sm:w-40"
                value={d.folder_id ?? ''}
                onChange={(e) => onMove(d.id, e.target.value)}
                aria-label={`Move ${title} to folder`}
                title="Move to folder"
              >
                <option value="">No folder</option>
                {(allFolders || []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              <ButtonLink to={'/docs/' + d.id + '/edit'} variant="ghost" size="sm" icon="pencil" aria-label={`Edit ${title}`}>
                Edit
              </ButtonLink>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
