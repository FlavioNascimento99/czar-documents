import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { Alert, Avatar, Button, Card, Container, EmptyState, Icon, Input, Label, Loading, PageHeader, Skeleton } from '../../ui';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { data, error, isFetching, isError } = useQuery({ queryKey: ['search', q], queryFn: () => api<any>('/api/search?q=' + encodeURIComponent(q)), enabled: !!q });
  const [draft, setDraft] = useState(q);
  const nav = useNavigate();
  useEffect(() => setDraft(q), [q]);

  const documents: any[] = data?.documents || [];
  const users: any[] = data?.users || [];

  const renderResults = () => {
    if (!q) {
      return (
        <EmptyState
          icon="search"
          title="Search documents and people"
          description="Type a title, a phrase from a document, or a username, then press Enter."
        />
      );
    }
    if (isFetching && !data) {
      return (
        <Loading label="Searching" className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Loading>
      );
    }
    if (isError) return <Alert tone="danger">Search failed. {errorMessage(error)}</Alert>;
    if (documents.length === 0 && users.length === 0) {
      return (
        <EmptyState
          icon="inbox"
          title={`No results for “${q}”`}
          description="Try a shorter phrase, check the spelling, or search for a username."
        />
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <Card flush title="Documents" description={`${documents.length} ${documents.length === 1 ? 'match' : 'matches'}`}>
          {documents.length === 0 ? (
            <p className="px-4 py-4 text-small text-fg-secondary md:px-5">No documents match “{q}”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((d: any) => (
                <li key={d.id}>
                  <Link to={'/docs/' + d.id} className="flex items-center gap-3 px-4 py-3 text-body font-medium text-fg transition-colors hover:bg-surface-secondary md:px-5">
                    <Icon name="file-text" className="text-fg-tertiary" />
                    <span className="min-w-0 flex-1 truncate">{d.title || 'Untitled'}</span>
                    <Icon name="chevron-right" className="text-fg-tertiary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card flush title="People" description={`${users.length} ${users.length === 1 ? 'match' : 'matches'}`}>
          {users.length === 0 ? (
            <p className="px-4 py-4 text-small text-fg-secondary md:px-5">No people match “{q}”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u: any) => (
                <li key={u.username}>
                  <Link to={'/@' + u.username} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-secondary md:px-5">
                    <Avatar name={u.username} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-fg">@{u.username}</span>
                      {u.display_name && <span className="block truncate text-small text-fg-secondary">{u.display_name}</span>}
                    </span>
                    <Icon name="chevron-right" className="text-fg-tertiary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  };

  return (
    <Container size="reading">
      <PageHeader title="Search" description={q ? <>Results for <span className="font-medium text-fg">“{q}”</span></> : 'Find documents you can open and people to share with.'} />
      <form
        role="search"
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          nav('/search?q=' + encodeURIComponent(draft));
        }}
      >
        <Label htmlFor="search-page-q" srOnly>Search documents and people</Label>
        <Input id="search-page-q" type="search" icon="search" className="flex-1" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search..." />
        <Button type="submit" variant="primary">Search</Button>
      </form>
      {renderResults()}
    </Container>
  );
}
