import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { DocumentSkeleton, DocumentUnavailable } from '../../documents/DocumentStates';
import { ProseView } from '../../documents/ProseView';
import { VisibilityBadge } from '../../documents/VisibilityBadge';
import { Button, ButtonLink, Container, PageHeader } from '../../ui';
import { downloadMarkdown } from './downloadMarkdown';
import { SharePanel } from './SharePanel';

export function DocumentViewPage() {
  const { id } = useParams();
  const { data, error, isPending } = useQuery({ queryKey: ['doc', id], queryFn: () => api<any>('/api/documents/' + id) });
  if (isPending) return <DocumentSkeleton />;
  if (!data) {
    return (
      <DocumentUnavailable
        title="Document not available"
        description={`It may have been deleted, or you no longer have access. ${errorMessage(error)}`}
        action={<ButtonLink to="/docs" icon="arrow-left">Back to documents</ButtonLink>}
      />
    );
  }
  const isOwner = data.role === 'owner';
  const updated = data.updated_at ? formatDate(data.updated_at) : null;
  const isEmpty = !data.content?.content?.length;

  return (
    <Container size="reading">
      <PageHeader
        breadcrumbs={[{ label: 'Documents', to: '/docs' }]}
        title={data.title || 'Untitled'}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <VisibilityBadge visibility={data.visibility} />
            {!isOwner && <span className="text-small">Shared with you as {data.role}.</span>}
            {updated && <span className="text-small">Updated {updated}</span>}
          </div>
        }
        actions={
          <>
            <ButtonLink to={'/docs/' + id + '/edit'} variant="primary" icon="pencil">
              Edit
            </ButtonLink>
            <Button type="button" icon="download" onClick={() => downloadMarkdown(data.title, data.content)}>
              Export .md
            </Button>
          </>
        }
      />
      <article className="rounded-lg border border-border bg-surface px-5 py-6 shadow-card sm:px-10 sm:py-10">
        {isEmpty ? (
          <p className="text-body text-fg-secondary">This document is empty. Choose Edit to start writing.</p>
        ) : (
          <ProseView content={data.content} className="mx-auto" />
        )}
      </article>
      {isOwner && (
        <div className="mt-8">
          <SharePanel docId={id!} />
        </div>
      )}
    </Container>
  );
}
