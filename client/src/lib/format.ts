const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDate(value: string): string | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : dateFormat.format(d);
}
