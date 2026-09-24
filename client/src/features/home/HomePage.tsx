import { useAuth } from '../../auth/store';
import { ButtonLink, Container, Icon, type IconName } from '../../ui';

const flow: { icon: IconName; label: string; detail: string }[] = [
  { icon: 'pencil', label: 'Write', detail: 'A calm editor with autosave, task lists and images.' },
  { icon: 'folder', label: 'Organize', detail: 'Nested folders and document types keep things findable.' },
  { icon: 'users', label: 'Collaborate', detail: 'Invite people as editors or viewers, per document.' },
  { icon: 'globe', label: 'Publish', detail: 'Share a read-only link and list it on your profile.' },
  { icon: 'search', label: 'Search', detail: 'Find documents and people from anywhere.' },
];

export function HomePage() {
  const { username } = useAuth();
  return (
    <Container className="md:py-16">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div>
          <h1 className="max-w-xl text-display text-fg">Write. Organize. Collaborate. Publish. Search.</h1>
          <p className="mt-5 max-w-lg text-body-lg text-fg-secondary">
            Czar Documents is a focused place for your writing. Content comes first, the interface stays out of the way,
            and everything responds fast.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {username ? (
              <ButtonLink to="/docs" variant="primary" size="lg" icon="file-text">
                Open your documents
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/register" variant="primary" size="lg">
                  Create an account
                </ButtonLink>
                <ButtonLink to="/login" size="lg">
                  Log in
                </ButtonLink>
              </>
            )}
          </div>
        </div>
        <ol className="divide-y divide-border rounded-lg border border-border bg-surface shadow-card">
          {flow.map((step) => (
            <li key={step.label} className="flex items-start gap-3 px-5 py-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-subtle-fg">
                <Icon name={step.icon} />
              </span>
              <div>
                <p className="text-body font-semibold text-fg">{step.label}</p>
                <p className="text-small text-fg-secondary">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  );
}
