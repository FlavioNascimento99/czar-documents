import { Badge, type IconName, type Tone } from '../ui';

const styles: Record<string, { label: string; tone: Tone; icon: IconName }> = {
  private: { label: 'Private', tone: 'neutral', icon: 'lock' },
  shared: { label: 'Shared', tone: 'info', icon: 'users' },
  public: { label: 'Public', tone: 'success', icon: 'globe' },
};

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const s = styles[visibility] ?? { label: visibility, tone: 'neutral', icon: 'lock' };
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
