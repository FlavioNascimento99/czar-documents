import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { DocumentSkeleton, DocumentUnavailable } from '../../documents/DocumentStates';
import { ButtonLink, Container, Loading, PageHeader, Skeleton } from '../../ui';
import { TypeSelector } from './TypeSelector';

const Editor = lazy(() => import('../../editor/Editor'));

export function DocumentEditPage() {
  const { id } = useParams();
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['doc', id], queryFn: () => api<any>('/api/documents/' + id) });
  if (isPending) return <DocumentSkeleton label="Loading editor" />;
  if (!data) {
    return (
      <DocumentUnavailable
        title="Document not available"
        description={`It may have been deleted, or you no longer have access. ${errorMessage(error)}`}
        action={<ButtonLink to="/docs" icon="arrow-left">Back to documents</ButtonLink>}
      />
    );
  }
  return (
    <Container size="reading">
      <PageHeader
        breadcrumbs={[{ label: 'Documents', to: '/docs' }, { label: data.title || 'Untitled', to: '/docs/' + id }]}
        title={data.title || 'Untitled'}
        actions={<ButtonLink to={'/docs/' + id} icon="eye">View</ButtonLink>}
        className="mb-4"
      />
      <div className="mb-4">
        <TypeSelector docId={id!} value={data.document_type_id ?? null} onChanged={() => refetch()} />
      </div>
      <Suspense
        fallback={
          <Loading label="Loading editor" className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="h-11 border-b border-border bg-surface-secondary" />
            <div className="flex flex-col gap-3 p-6 sm:p-10">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Loading>
        }
      >
        <Editor id={id!} initial={data.content} />
      </Suspense>
    </Container>
  );
}
