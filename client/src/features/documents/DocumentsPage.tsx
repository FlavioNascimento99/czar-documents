import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useAuth } from '../../auth/store';
import { Alert, Button, ButtonLink, Card, Container, EmptyState, Loading, PageHeader, Skeleton } from '../../ui';
import { CreateDocumentForm } from './CreateDocumentForm';
import { DocumentList } from './DocumentList';
import { FolderSidebar } from './FolderSidebar';

export function DocumentsPage() {
  const qc = useQueryClient();
  const { username } = useAuth();
  const docsQuery = useQuery({ queryKey: ['docs'], queryFn: () => api<any[]>('/api/documents') });
  const { data: docs } = docsQuery;
  const { data: types } = useQuery({ queryKey: ['doctypes'], queryFn: () => api<any[]>('/api/document-types') });
  // Flat folder list (BFS over lazy levels) for move dropdowns.
  const { data: allFolders } = useQuery({
    queryKey: ['allFolders'],
    queryFn: async () => {
      const out: any[] = [];
      let queue: (string | null)[] = [null];
      while (queue.length) {
        const parent = queue.shift()!;
        const kids: any[] = await api(`/api/folders${parent ? `?parent_id=${parent}` : ''}`);
        for (const k of kids) { out.push({ ...k, parent_id: parent }); queue.push(k.id); }
      }
      return out;
    },
  });
  const [selFolder, setSelFolder] = useState<string | null>(null); // null = all
  const [selType, setSelType] = useState(''); // slug or '' = all
  const refreshFolders = () => { qc.invalidateQueries({ queryKey: ['folders'] }); qc.invalidateQueries({ queryKey: ['allFolders'] }); };
  const filtered = (docs || []).filter((d: any) =>
    (selFolder === null || (d.folder_id ?? null) === selFolder) &&
    (selType === '' || d.type_slug === selType));
  const moveDoc = async (id: string, folder_id: string) => {
    await api(`/api/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ folder_id }) });
    qc.invalidateQueries({ queryKey: ['docs'] });
  };

  const scopeLabel =
    selFolder === null ? 'All documents'
      : selFolder === '__none__' ? 'No folder'
        : (allFolders || []).find((f: any) => f.id === selFolder)?.name ?? 'Folder';
  const typeLabel = selType ? (types || []).find((t: any) => t.slug === selType)?.name ?? selType : null;
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'document' : 'documents'}${typeLabel ? ` of type ${typeLabel}` : ''}`;

  const renderBody = () => {
    if (!username && !docs) {
      return (
        <EmptyState
          headingLevel="h3"
          icon="lock"
          title="Log in to see your documents"
          description="Your documents, folders and shared files appear here once you are signed in."
          action={<><ButtonLink to="/login" variant="primary">Log in</ButtonLink><ButtonLink to="/register">Create an account</ButtonLink></>}
        />
      );
    }
    if (docsQuery.isPending) {
      return (
        <Loading label="Loading documents">
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
                <Skeleton className="h-8 w-8" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </Loading>
      );
    }
    if (docsQuery.isError) {
      return (
        <div className="p-4 md:p-5">
          <Alert tone="danger">
            <p>Could not load your documents. {errorMessage(docsQuery.error)}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => docsQuery.refetch()}>
              Try again
            </Button>
          </Alert>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (docs || []).length === 0 ? (
        <EmptyState
          headingLevel="h3"
          icon="file-plus"
          title="No documents yet"
          description="Give your first document a title above and press Create. It opens straight in the editor."
        />
      ) : (
        <EmptyState
          headingLevel="h3"
          icon="inbox"
          title="Nothing matches this view"
          description="No documents match the current folder and type filters. Pick another filter, or create a document above."
          action={<Button type="button" variant="secondary" onClick={() => { setSelFolder(null); setSelType(''); }}>Show all documents</Button>}
        />
      );
    }
    return <DocumentList docs={filtered} allFolders={allFolders} types={types} onMove={moveDoc} />;
  };

  return (
    <Container>
      <PageHeader title="Documents" description="Write, organize and share your documents." />
      <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <FolderSidebar
          selFolder={selFolder}
          onSelectFolder={setSelFolder}
          selType={selType}
          onSelectType={setSelType}
          types={types}
          allFolders={allFolders}
          refreshFolders={refreshFolders}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <CreateDocumentForm types={types} allFolders={allFolders} />
          <Card flush title={scopeLabel} description={docs ? countLabel : undefined}>
            {renderBody()}
          </Card>
        </div>
      </div>
    </Container>
  );
}
