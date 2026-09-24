import { useState } from 'react';
import { api } from '../../lib/api';
import { Button, Field, Input, Select, hintId } from '../../ui';
import { FolderTree, SidebarItem } from './FolderTree';

type FolderSidebarProps = {
  selFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  selType: string;
  onSelectType: (slug: string) => void;
  types: any[] | undefined;
  allFolders: any[] | undefined;
  refreshFolders: () => void;
};

export function FolderSidebar({ selFolder, onSelectFolder, selType, onSelectType, types, allFolders, refreshFolders }: FolderSidebarProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const parentId = selFolder && selFolder !== '__none__' ? selFolder : undefined;
  const parentName = parentId ? (allFolders || []).find((f: any) => f.id === parentId)?.name : undefined;

  return (
    <aside aria-label="Folders and filters" className="flex flex-col gap-6">
      <section aria-labelledby="folders-heading">
        <h2 id="folders-heading" className="mb-2 px-2 text-caption font-semibold text-fg-secondary">
          Folders
        </h2>
        <div className="flex flex-col gap-0.5">
          <div className="flex">
            <SidebarItem icon="files" label="All documents" selected={selFolder === null} onSelect={() => onSelectFolder(null)} />
          </div>
          <div className="flex">
            <SidebarItem icon="inbox" label="No folder" selected={selFolder === '__none__'} onSelect={() => onSelectFolder('__none__')} />
          </div>
          <FolderTree selected={selFolder} onSelect={onSelectFolder} onChanged={refreshFolders} />
        </div>

        <form
          className="mt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newFolderName.trim()) return;
            await api('/api/folders', { method: 'POST', body: JSON.stringify({ name: newFolderName.trim(), parent_id: parentId }) });
            setNewFolderName('');
            refreshFolders();
          }}
        >
          <Field
            id="new-folder"
            label="New folder"
            hint={parentId ? <>Created inside {parentName ? <span className="font-medium text-fg">{parentName}</span> : 'the selected folder'}</> : 'Created at the top level'}
          >
            <div className="flex gap-2">
              <Input
                id="new-folder"
                controlSize="sm"
                className="min-w-0 flex-1"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                aria-describedby={hintId('new-folder')}
              />
              <Button type="submit" size="sm" square icon="folder-plus" aria-label="Create folder" />
            </div>
          </Field>
        </form>
      </section>

      <Field id="type-filter" label="Type">
        <Select id="type-filter" controlSize="sm" value={selType} onChange={(e) => onSelectType(e.target.value)}>
          <option value="">All types</option>
          {(types || []).map((t: any) => <option key={t.id} value={t.slug}>{t.name}</option>)}
        </Select>
      </Field>
    </aside>
  );
}
