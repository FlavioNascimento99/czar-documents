import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useAuth } from '../../auth/store';
import { Alert, BrandMark, Button, Field, Input, hintId } from '../../ui';

type Mode = 'login' | 'register';

const copy: Record<Mode, { title: string; description: string; submit: string; switchText: string; switchLink: string; switchTo: string }> = {
  login: {
    title: 'Log in to Czar Documents',
    description: 'Welcome back. Pick up where you left off.',
    submit: 'Log in',
    switchText: 'New here?',
    switchLink: 'Create an account',
    switchTo: '/register',
  },
  register: {
    title: 'Create your account',
    description: 'Start writing, organizing and sharing documents.',
    submit: 'Create account',
    switchText: 'Already have an account?',
    switchLink: 'Log in',
    switchTo: '/login',
  },
};

export function AuthPage({ mode }: { mode: Mode }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [c, setC] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth(); const nav = useNavigate();
  const t = copy[mode];

  return (
    <div className="flex justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-4" />
          <h1 className="text-h1 text-fg">{t.title}</h1>
          <p className="mt-1 text-body text-fg-secondary">{t.description}</p>
        </div>
        <form
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              const r = mode === 'login'
                ? await api<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ login: a, password: b }) })
                : await api<any>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: a, email: b, password: c }) });
              login(r.username, r.token); nav('/docs');
            } catch (err) {
              setError(errorMessage(err));
              setSubmitting(false);
            }
          }}
        >
          {error && <Alert tone="danger">{error}</Alert>}
          {mode === 'login' ? (
            <>
              <Field id="auth-login" label="Username or email">
                <Input id="auth-login" value={a} onChange={(e) => setA(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
              </Field>
              <Field id="auth-password" label="Password">
                <Input id="auth-password" type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="current-password" required />
              </Field>
            </>
          ) : (
            <>
              <Field id="auth-username" label="Username" hint="Shown on your public profile as @username.">
                <Input id="auth-username" value={a} onChange={(e) => setA(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={hintId('auth-username')} required autoFocus />
              </Field>
              <Field id="auth-email" label="Email">
                <Input id="auth-email" type="email" value={b} onChange={(e) => setB(e.target.value)} autoComplete="email" required />
              </Field>
              <Field id="auth-new-password" label="Password" hint="At least 8 characters.">
                <Input id="auth-new-password" type="password" value={c} onChange={(e) => setC(e.target.value)} autoComplete="new-password" aria-describedby={hintId('auth-new-password')} required />
              </Field>
            </>
          )}
          <Button type="submit" variant="primary" size="lg" loading={submitting} className="mt-1 w-full">
            {t.submit}
          </Button>
        </form>
        <p className="mt-6 text-center text-body text-fg-secondary">
          {t.switchText}{' '}
          <Link to={t.switchTo} className="rounded-sm font-medium text-primary underline-offset-2 hover:underline">
            {t.switchLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
