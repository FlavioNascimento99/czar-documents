import type { ReactNode } from 'react';
import { Container, EmptyState, Loading, Skeleton } from '../ui';

export function DocumentSkeleton({ label = 'Loading document' }: { label?: string }) {
  return (
    <Container size="reading">
      <Loading label={label}>
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="mb-6 h-8 w-2/3" />
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 sm:p-10">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Loading>
    </Container>
  );
}

export function DocumentUnavailable({ title, description, action }: { title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <Container size="reading">
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState icon="file-text" headingLevel="h1" title={title} description={description} action={action} />
      </div>
    </Container>
  );
}
