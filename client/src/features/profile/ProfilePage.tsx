import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Avatar, Card, Container, EmptyState, Icon, Loading, Skeleton } from '../../ui';
import { NotFoundPage } from '../not-found/NotFoundPage';

// React Router 6 cannot match a partial segment like "/@:username", so the profile route
// is a single dynamic segment that only resolves to a profile when it starts with "@".
export function ProfileRoute() {
  const { handle = '' } = useParams();
  return handle.startsWith('@') && handle.length > 1 ? <ProfilePage username={handle.slice(1)} /> : <NotFoundPage />;
}

function ProfilePage({ username }: { username: string }) {
  const { data, isPending } = useQuery({ queryKey: ['profile', username], queryFn: () => api<any>('/api/@' + username) });

  if (isPending) {
    return (
      <Container size="reading">
        <Loading label="Loading profile" className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </Loading>
      </Container>
    );
  }
  if (!data) {
    return (
      <Container size="reading">
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon="user" headingLevel="h1" title={`@${username} not found`} description="This profile does not exist or is not public." />
        </div>
      </Container>
    );
  }

  const documents: any[] = data.documents || [];
  return (
    <Container size="reading">
      <header className="mb-8 flex items-start gap-4">
        <Avatar name={username} size="lg" />
        <div className="min-w-0 pt-1">
          <h1 className="break-words text-h1 text-fg">@{username}</h1>
          {data.bio && <p className="mt-1 max-w-prose text-body-lg text-fg-secondary">{data.bio}</p>}
        </div>
      </header>
      <Card flush title="Published documents" description={`${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`}>
        {documents.length === 0 ? (
          <EmptyState icon="globe" headingLevel="h3" title="Nothing published yet" description={`Documents @${username} publishes appear here.`} />
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((d: any) => (
              <li key={d.token}>
                <Link to={'/p/' + d.token} className="flex items-center gap-3 px-4 py-3 text-body font-medium text-fg transition-colors hover:bg-surface-secondary md:px-5">
                  <Icon name="file-text" className="text-fg-tertiary" />
                  <span className="min-w-0 flex-1 truncate">{d.title || 'Untitled'}</span>
                  <Icon name="chevron-right" className="text-fg-tertiary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}
