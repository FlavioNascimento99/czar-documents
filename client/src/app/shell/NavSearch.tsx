import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Label } from '../../ui';

export function NavSearch({ id, className }: { id: string; className?: string }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        nav('/search?q=' + encodeURIComponent(q));
      }}
    >
      <Label htmlFor={id} srOnly>
        Search documents and people
      </Label>
      <Input id={id} type="search" icon="search" controlSize="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
    </form>
  );
}
