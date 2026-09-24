import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Input, Label, Select } from '../../ui';

export function TypeSelector({ docId, value, onChanged }: { docId: string; value: string | null; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: types } = useQuery({ queryKey: ['doctypes'], queryFn: () => api<any[]>('/api/document-types') });
  const [newType, setNewType] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="doc-type">Type</Label>
        <Select
          id="doc-type"
          controlSize="sm"
          className="w-44"
          value={value ?? ''}
          onChange={async (e) => {
            await api(`/api/documents/${docId}`, { method: 'PATCH', body: JSON.stringify({ document_type_id: e.target.value }) });
            onChanged(); qc.invalidateQueries({ queryKey: ['docs'] });
          }}
        >
          <option value="">No type</option>
          {(types || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newType.trim()) return;
          const r = await api<{ id: string }>('/api/document-types', { method: 'POST', body: JSON.stringify({ name: newType.trim() }) });
          await api(`/api/documents/${docId}`, { method: 'PATCH', body: JSON.stringify({ document_type_id: r.id }) });
          setNewType(''); onChanged(); qc.invalidateQueries({ queryKey: ['doctypes'] }); qc.invalidateQueries({ queryKey: ['docs'] });
        }}
      >
        <Label htmlFor="new-type" srOnly>New type name</Label>
        <Input id="new-type" controlSize="sm" className="w-36" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New type..." />
        <Button type="submit" size="sm" square icon="plus" aria-label="Create type and apply it" />
      </form>
    </div>
  );
}
