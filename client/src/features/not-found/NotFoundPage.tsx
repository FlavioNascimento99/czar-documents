import { ButtonLink, Container, EmptyState } from '../../ui';

export function NotFoundPage() {
  return (
    <Container size="reading">
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          icon="file-text"
          headingLevel="h1"
          title="Page not found"
          description="The address may be mistyped, or the page has moved."
          action={<ButtonLink to="/docs" icon="arrow-left">Go to documents</ButtonLink>}
        />
      </div>
    </Container>
  );
}
