import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DocumentSkeleton, DocumentUnavailable } from '../../documents/DocumentStates';
import { ProseView } from '../../documents/ProseView';
import { Avatar, ButtonLink, Container } from '../../ui';

export function PublicDocPage() {
  const { token } = useParams();
  const { data, isPending } = useQuery({ queryKey: ['pub', token], queryFn: () => api<any>('/api/p/' + token) });
  if (isPending) return <DocumentSkeleton />;
  if (!data) {
    return (
      <DocumentUnavailable
        title="This link is not available"
        description="The document may have been unpublished, or the link is incorrect."
        action={<ButtonLink to="/" icon="arrow-left">Go to the home page</ButtonLink>}
      />
    );
  }
  return (
    <Container size="reading">
      <article>
        <header className="mb-8">
          <h1 className="break-words text-h1 text-fg sm:text-[2rem] sm:leading-tight">{data.title || 'Untitled'}</h1>
          <Link to={'/@' + data.author} className="mt-4 inline-flex items-center gap-2 rounded-full pr-2 text-body text-fg-secondary transition-colors hover:text-fg">
            <Avatar name={data.author || ''} />
            <span>by <span className="font-medium text-fg">@{data.author}</span></span>
          </Link>
        </header>
        <ProseView content={typeof data.content === 'string' ? JSON.parse(data.content) : data.content} />
      </article>
    </Container>
  );
}
