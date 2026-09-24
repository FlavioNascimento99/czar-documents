import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Alert, Avatar, Button, Card, Field, Input, Select } from '../../ui';

// Owner-only: list/add/change-role/remove collaborators + publish/revoke.
export function SharePanel({ docId }: { docId: string }) {
  const qc = useQueryClient();
  const { data: shares } = useQuery({ queryKey: ['shares', docId], queryFn: () => api<any[]>(`/api/documents/${docId}/shares`), retry: false });
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [pubUrl, setPubUrl] = useState<string | null>(null);
  if (shares === undefined) return null; // not owner or loading: hide dialog
  const refresh = () => qc.invalidateQueries({ queryKey: ['shares', docId] });

  return (
    <Card title="Share" description="Invite people to edit or view this document, or publish a read-only link.">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="share-people-heading">
          <h3 id="share-people-heading" className="mb-2 text-h3 text-fg">People with access</h3>
          {(shares || []).length === 0 ? (
            <p className="text-small text-fg-secondary">Only you can open this document right now.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {(shares || []).map((s: any) => (
                <li key={s.user_id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <Avatar name={s.username} />
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">@{s.username}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      controlSize="sm"
                      className="w-28"
                      aria-label={`Role for @${s.username}`}
                      value={s.role}
                      onChange={async (e) => {
                        await api(`/api/documents/${docId}/shares`, { method: 'POST', body: JSON.stringify({ username: s.username, role: e.target.value }) });
                        refresh();
                      }}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger-soft"
                      aria-label={`Remove @${s.username}`}
                      onClick={async () => { await api(`/api/documents/${docId}/shares/${s.user_id}`, { method: 'DELETE' }); refresh(); }}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await api(`/api/documents/${docId}/shares`, { method: 'POST', body: JSON.stringify({ username: name.trim(), role }) });
              setName('');
              refresh();
            }}
          >
            <Field id="share-username" label="Add people">
              <Input id="share-username" value={name} onChange={(e) => setName(e.target.value)} placeholder="@username or email" autoComplete="off" />
            </Field>
            <Field id="share-role" label="Role">
              <Select id="share-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </Select>
            </Field>
            <Button type="submit" icon="user-plus">Add</Button>
          </form>
        </section>

        <section aria-labelledby="share-publish-heading" className="border-t border-border pt-6">
          <h3 id="share-publish-heading" className="text-h3 text-fg">Public link</h3>
          <p className="mt-1 text-small text-fg-secondary">
            Publishing creates a read-only page that anyone with the link can open. It is also listed on your public profile.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              icon="globe"
              onClick={async () => {
                const r = await api<any>(`/api/documents/${docId}/public-link`, { method: 'POST', body: JSON.stringify({ show_on_profile: true }) });
                setPubUrl('/p/' + r.token);
              }}
            >
              Publish or update link
            </Button>
            <Button
              type="button"
              variant="danger-soft"
              icon="x"
              onClick={async () => {
                await api(`/api/documents/${docId}/public-link`, { method: 'DELETE' });
                setPubUrl(null);
              }}
            >
              Revoke link
            </Button>
          </div>
          {pubUrl && (
            <Alert tone="success" className="mt-3">
              Published at{' '}
              <Link to={pubUrl} className="break-all font-medium text-primary underline underline-offset-2">
                {pubUrl}
              </Link>
            </Alert>
          )}
        </section>
      </div>
    </Card>
  );
}
