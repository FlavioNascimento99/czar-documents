import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Icon, Skeleton, cx, type IconName } from '../../ui';

type SidebarItemProps = { icon: IconName; label: string; selected: boolean; onSelect: () => void };

export function SidebarItem({ icon, label, selected, onSelect }: SidebarItemProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-body transition-colors',
        selected
          ? 'bg-primary-subtle font-medium text-primary-subtle-fg'
          : 'text-fg-secondary hover:bg-surface-secondary hover:text-fg',
      )}
    >
      <Icon name={icon} className={selected ? 'text-primary' : 'text-fg-tertiary'} />
      <span className="truncate">{label}</span>
    </button>
  );
}

type TreeProps = {
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChanged: () => void;
  parent?: string | null;
  depth?: number;
};

// Lazy-load 1 level at a time; children fetched only on expand.
export function FolderTree({ selected, onSelect, onChanged, parent = null, depth = 0 }: TreeProps) {
  const { data, isLoading } = useQuery({ queryKey: ['folders', parent ?? 'root'], queryFn: () => api<any[]>(`/api/folders${parent ? `?parent_id=${parent}` : ''}`) });
  if (isLoading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-1 py-1" style={{ paddingLeft: depth * 16 + 8 }}>
        <Skeleton className="h-5 w-32" />
        {parent === null && <Skeleton className="h-5 w-24" />}
      </div>
    );
  }
  if (!data || data.length === 0) return null;
  return <div className="flex flex-col gap-0.5">{data.map((f: any) => <FolderNode key={f.id} folder={f} depth={depth} selected={selected} onSelect={onSelect} onChanged={onChanged} />)}</div>;
}

type NodeProps = { folder: any; depth: number; selected: string | null; onSelect: (id: string | null) => void; onChanged: () => void };

function FolderNode({ folder, depth, selected, onSelect, onChanged }: NodeProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center" style={{ paddingLeft: depth * 16 }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${folder.name}`}
          className="flex h-8 w-6 shrink-0 items-center justify-center rounded-md text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg"
        >
          <Icon name="chevron-right" size={14} className={cx('transition-transform', open && 'rotate-90')} />
        </button>
        <SidebarItem
          icon={open ? 'folder-open' : 'folder'}
          label={folder.name}
          selected={selected === folder.id}
          onSelect={() => onSelect(folder.id)}
        />
      </div>
      {open && <FolderTree selected={selected} onSelect={onSelect} onChanged={onChanged} parent={folder.id} depth={depth + 1} />}
    </div>
  );
}
