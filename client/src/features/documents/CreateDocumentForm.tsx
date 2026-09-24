import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Field, Input, Select } from '../../ui';

export function CreateDocumentForm({ types, allFolders }: { types: any[] | undefined; allFolders: any[] | undefined }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [newDocFolder, setNewDocFolder] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [creating, setCreating] = useState(false);

  return (
    <form
      aria-label="New document"
      className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] lg:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
          const r = await api<{ id: string }>('/api/documents', { method: 'POST', body: JSON.stringify({ title: title || 'Untitled', folder_id: newDocFolder || undefined, document_type_id: newDocType || undefined }) });
          qc.invalidateQueries({ queryKey: ['docs'] });
          nav('/docs/' + r.id + '/edit');
        } finally {
          setCreating(false);
        }
      }}
    >
      <Field id="new-doc-title" label="New document" className="sm:col-span-2 lg:col-span-1">
        <Input id="new-doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
      </Field>
      <Field id="new-doc-folder" label="Folder">
        <Select id="new-doc-folder" value={newDocFolder} onChange={(e) => setNewDocFolder(e.target.value)}>
          <option value="">No folder</option>
          {(allFolders || []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      </Field>
      <Field id="new-doc-type" label="Type">
        <Select id="new-doc-type" value={newDocType} onChange={(e) => setNewDocType(e.target.value)}>
          <option value="">No type</option>
          {(types || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Field>
      <Button type="submit" variant="primary" icon="file-plus" loading={creating} className="h-10 sm:col-span-2 lg:col-span-1 lg:h-9">
        Create
      </Button>
    </form>
  );
}
